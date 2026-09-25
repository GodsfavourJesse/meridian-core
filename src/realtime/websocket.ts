import {
    randomUUID,
} from "node:crypto";

import type {
    FastifyInstance,
} from "fastify";

import {
    WebSocket,
} from "ws";

import {
    and,
    eq,
} from "drizzle-orm";

import {
    db,
} from "../database";

import {
    participants,
    rooms,
    users,
} from "../database/schema";

import {
    getSession,
    SESSION_COOKIE_NAME,
} from "../modules/auth/sessions";


import {
    getRoomPresence,
    removeParticipantPresence,
    setParticipantPresence,
} from "./presence.service";

import type {
    ParticipantRole,
} from "./realtime.types";
import { authenticateGuestParticipant } from "../modules/participants/participant.service";

type SocketParticipant = {
    socket: WebSocket;

    roomId: string;

    participantId: string;

    displayName: string;

    role: ParticipantRole;

    connectionId: string;
};

type JoinRoomMessage = {
    type: "JOIN_ROOM";

    roomId: string;

    participantId?: string;

    guestToken?: string;
};

type SignalMessage = {
    type:
        | "OFFER"
        | "ANSWER"
        | "ICE_CANDIDATE";

    targetParticipantId: string;

    data: unknown;
};

type LeaveRoomMessage = {
    type: "LEAVE_ROOM";
};

type ClientMessage =
    | JoinRoomMessage
    | SignalMessage
    | LeaveRoomMessage;

const connections = new Map<
    string,
    SocketParticipant
>();

function sendMessage(
    socket: WebSocket,
    message: unknown,
) {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return;
    }

    socket.send(
        JSON.stringify(message),
    );
}

function broadcastToRoom(
    roomId: string,
    message: unknown,
    excludeParticipantId?: string,
) {
    for (
        const participant
        of connections.values()
    ) {
        if (
            participant.roomId !==
            roomId
        ) {
            continue;
        }

        if (
            excludeParticipantId &&
            participant.participantId ===
                excludeParticipantId
        ) {
            continue;
        }

        sendMessage(
            participant.socket,
            message,
        );
    }
}

async function authenticateHost(
    roomId: string,
    sessionToken: string,
) {
    const session =
        await getSession(
            sessionToken,
        );

    if (!session) {
        return null;
    }

    const [room] =
        await db
            .select({
                id:
                    rooms.id,

                hostId:
                    rooms.hostId,

                status:
                    rooms.status,
            })
            .from(rooms)
            .where(
                and(
                    eq(
                        rooms.id,
                        roomId,
                    ),

                    eq(
                        rooms.hostId,
                        session.userId,
                    ),
                ),
            )
            .limit(1);

    if (!room) {
        return null;
    }

    if (
        room.status !==
        "active"
    ) {
        return null;
    }

    const [user] =
        await db
            .select({
                id:
                    users.id,

                name:
                    users.name,
            })
            .from(users)
            .where(
                eq(
                    users.id,
                    session.userId,
                ),
            )
            .limit(1);

    if (!user) {
        return null;
    }

    return {
        roomId:
            room.id,

        participantId:
            user.id,

        displayName:
            user.name,

        role:
            "host" as const,
    };
}

async function authenticateParticipant(
    message: JoinRoomMessage,
    sessionToken?: string,
) {
    /*
     * Guest authentication takes precedence
     * whenever guest credentials are supplied.
     */
    if (
        message.participantId &&
        message.guestToken
    ) {
        return authenticateGuestParticipant(
            message.roomId,
            message.participantId,
            message.guestToken,
        );
    }

    /*
     * Otherwise authenticate as the
     * registered host using the session cookie.
     */
    if (sessionToken) {
        return authenticateHost(
            message.roomId,
            sessionToken,
        );
    }

    return null;
}

export async function registerRealtime(
    app: FastifyInstance,
) {
    app.get(
        "/ws",
        {
            websocket: true,
        },
        (
            socket,
            request,
        ) => {
            let participant:
                | SocketParticipant
                | null = null;

            let closing = false;

            socket.on(
                "message",
                async (
                    raw,
                ) => {
                    if (closing) {
                        return;
                    }

                    let message:
                        | ClientMessage;

                    try {
                        message =
                            JSON.parse(
                                raw.toString(),
                            ) as ClientMessage;
                    } catch {
                        sendMessage(
                            socket,
                            {
                                type:
                                    "ERROR",
                                message:
                                    "Invalid message.",
                            },
                        );

                        return;
                    }

                    try {
                        /*
                         * JOIN_ROOM
                         */
                        if (
                            message.type ===
                            "JOIN_ROOM"
                        ) {
                            if (
                                participant
                            ) {
                                sendMessage(
                                    socket,
                                    {
                                        type:
                                            "ERROR",
                                        message:
                                            "Already joined a room.",
                                    },
                                );

                                return;
                            }

                            if (
                                !message.roomId
                            ) {
                                sendMessage(
                                    socket,
                                    {
                                        type:
                                            "ERROR",
                                        message:
                                            "Room ID is required.",
                                    },
                                );

                                return;
                            }

                            const sessionToken =
                                request
                                    .cookies[
                                    SESSION_COOKIE_NAME
                                ];

                            const authenticated =
                                await authenticateParticipant(
                                    message,
                                    sessionToken,
                                );

                            if (
                                !authenticated
                            ) {
                                sendMessage(
                                    socket,
                                    {
                                        type:
                                            "AUTH_ERROR",
                                        message:
                                            "Unable to authenticate for this room.",
                                    },
                                );

                                socket.close(
                                    1008,
                                    "Authentication failed",
                                );

                                return;
                            }

                            const connectionId =
                                randomUUID();

                            participant = {
                                socket,

                                roomId:
                                    authenticated.roomId,

                                participantId:
                                    authenticated.participantId,

                                displayName:
                                    authenticated.displayName,

                                role:
                                    authenticated.role,

                                connectionId,
                            };

                            /*
                             * Prevent two active WebSocket
                             * connections for the same participant.
                             */
                            const existingConnection =
                                connections.get(
                                    participant.participantId,
                                );

                            if (
                                existingConnection
                            ) {
                                sendMessage(
                                    socket,
                                    {
                                        type:
                                            "ERROR",
                                        message:
                                            "Participant is already connected.",
                                    },
                                );

                                participant =
                                    null;

                                socket.close(
                                    1008,
                                    "Already connected",
                                );

                                return;
                            }

                            connections.set(
                                participant.participantId,
                                participant,
                            );

                            /*
                             * Redis presence.
                             */
                            await setParticipantPresence(
                                {
                                    participantId:
                                        participant.participantId,

                                    roomId:
                                        participant.roomId,

                                    displayName:
                                        participant.displayName,

                                    role:
                                        participant.role,

                                    status:
                                        "joined",

                                    connectionId,

                                    joinedAt:
                                        new Date().toISOString(),
                                },
                            );

                            /*
                             * Confirm successful authentication.
                             */
                            sendMessage(
                                socket,
                                {
                                    type:
                                        "CONNECTED",

                                    participant: {
                                        participantId:
                                            participant.participantId,

                                        displayName:
                                            participant.displayName,

                                        role:
                                            participant.role,
                                    },
                                },
                            );

                            /*
                             * Send current room presence
                             * to the newly connected participant.
                             */
                            const presence =
                                await getRoomPresence(
                                    participant.roomId,
                                );

                            sendMessage(
                                socket,
                                {
                                    type:
                                        "ROOM_PRESENCE",

                                    participants:
                                        presence,
                                },
                            );

                            /*
                             * Tell everyone else that this
                             * participant has joined.
                             */
                            broadcastToRoom(
                                participant.roomId,
                                {
                                    type:
                                        "ROOM_JOINED",

                                    participant: {
                                        participantId:
                                            participant.participantId,

                                        displayName:
                                            participant.displayName,

                                        role:
                                            participant.role,
                                    },
                                },
                                participant.participantId,
                            );

                            return;
                        }

                        /*
                         * Everything after JOIN_ROOM requires
                         * an authenticated participant.
                         */
                        if (
                            !participant
                        ) {
                            sendMessage(
                                socket,
                                {
                                    type:
                                        "ERROR",
                                    message:
                                        "Join a room first.",
                                },
                            );

                            return;
                        }

                        /*
                         * WebRTC signaling.
                         */
                        if (
                            message.type ===
                                "OFFER" ||
                            message.type ===
                                "ANSWER" ||
                            message.type ===
                                "ICE_CANDIDATE"
                        ) {
                            const target =
                                connections.get(
                                    message.targetParticipantId,
                                );

                            if (
                                !target ||
                                target.roomId !==
                                    participant.roomId
                            ) {
                                sendMessage(
                                    socket,
                                    {
                                        type:
                                            "ERROR",
                                        message:
                                            "Target participant is not connected to this room.",
                                    },
                                );

                                return;
                            }

                            sendMessage(
                                target.socket,
                                {
                                    type:
                                        message.type,

                                    fromParticipantId:
                                        participant.participantId,

                                    data:
                                        message.data,
                                },
                            );

                            return;
                        }

                        /*
                         * LEAVE_ROOM
                         */
                        if (
                            message.type ===
                            "LEAVE_ROOM"
                        ) {
                            closing = true;

                            socket.close(
                                1000,
                                "Left room",
                            );

                            return;
                        }

                        sendMessage(
                            socket,
                            {
                                type:
                                    "ERROR",
                                message:
                                    "Unsupported message type.",
                            },
                        );
                    } catch (
                        error
                    ) {
                        app.log.error(
                            error,
                            "Realtime message handling failed",
                        );

                        sendMessage(
                            socket,
                            {
                                type:
                                    "ERROR",
                                message:
                                    "Realtime request failed.",
                            },
                        );
                    }
                },
            );

            socket.on(
                "close",
                async () => {
                    if (
                        !participant
                    ) {
                        return;
                    }

                    const current =
                        connections.get(
                            participant.participantId,
                        );

                    /*
                     * Ignore a stale socket closing
                     * after a newer connection replaced it.
                     */
                    if (
                        current?.socket !==
                        socket
                    ) {
                        return;
                    }

                    connections.delete(
                        participant.participantId,
                    );

                    try {
                        await removeParticipantPresence(
                            participant.roomId,
                            participant.participantId,
                        );
                    } catch (
                        error
                    ) {
                        app.log.error(
                            error,
                            "Failed to remove realtime presence",
                        );
                    }

                    broadcastToRoom(
                        participant.roomId,
                        {
                            type:
                                "ROOM_LEFT",

                            participant: {
                                participantId:
                                    participant.participantId,

                                displayName:
                                    participant.displayName,

                                role:
                                    participant.role,
                            },
                        },
                        participant.participantId,
                    );

                    participant =
                        null;
                },
            );
        },
    );
}