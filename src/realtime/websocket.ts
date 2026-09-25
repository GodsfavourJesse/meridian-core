import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

import {
    getRoomPresence,
    removeParticipantPresence,
    setParticipantPresence,
} from "./presence.service";

type SocketParticipant = {
    socket: WebSocket;
    roomId: string;
    participantId: string;
    displayName: string;
    role: "host" | "guest";
};

const connections =
    new Map<string, SocketParticipant>();

function send(
    socket: WebSocket,
    message: unknown,
) {
    if (
        socket.readyState ===
        socket.OPEN
    ) {
        socket.send(
            JSON.stringify(message),
        );
    }
}

function broadcastToRoom(
    roomId: string,
    message: unknown,
    exceptParticipantId?: string,
) {
    for (
        const participant
        of connections.values()
    ) {
        if (
            participant.roomId !== roomId
        ) {
            continue;
        }

        if (
            participant.participantId ===
            exceptParticipantId
        ) {
            continue;
        }

        send(
            participant.socket,
            message,
        );
    }
}

export async function registerRealtime(
    app: FastifyInstance,
) {
    app.get(
        "/ws",
        {
            websocket: true,
        },
        (socket, request) => {
            let participant:
                SocketParticipant | null =
                null;

            socket.on(
                "message",
                async (raw) => {
                    try {
                        const message =
                            JSON.parse(
                                raw.toString(),
                            );

                        if (
                            message.type ===
                            "JOIN_ROOM"
                        ) {
                            // We will wire authentication
                            // here in the next step.
                            //
                            // For now this validates
                            // the basic room join message.
                            if (
                                participant
                            ) {
                                return;
                            }

                            const {
                                roomId,
                                participantId,
                                displayName,
                                role,
                            } = message;

                            if (
                                typeof roomId !==
                                    "string" ||
                                typeof participantId !==
                                    "string" ||
                                typeof displayName !==
                                    "string" ||
                                (
                                    role !==
                                        "host" &&
                                    role !==
                                        "guest"
                                )
                            ) {
                                send(
                                    socket,
                                    {
                                        type: "ERROR",
                                        message:
                                            "Invalid room join.",
                                    },
                                );

                                socket.close();

                                return;
                            }

                            participant = {
                                socket,
                                roomId,
                                participantId,
                                displayName,
                                role,
                            };

                            connections.set(
                                participantId,
                                participant,
                            );

                            await setParticipantPresence(
                                {
                                    participantId,
                                    roomId,
                                    displayName,
                                    role,
                                    status: "joined",
                                    connectionId:
                                        participantId,
                                    joinedAt:
                                        new Date().toISOString(),
                                },
                            );

                            const existing =
                                await getRoomPresence(
                                    roomId,
                                );

                            send(
                                socket,
                                {
                                    type:
                                        "ROOM_PRESENCE",
                                    participants:
                                        existing
                                            .filter(
                                                (
                                                    item,
                                                ) =>
                                                    item.participantId !==
                                                    participantId,
                                            )
                                            .map(
                                                (
                                                    item,
                                                ) => ({
                                                    participantId:
                                                        item.participantId,
                                                    displayName:
                                                        item.displayName,
                                                    role:
                                                        item.role,
                                                }),
                                            ),
                                },
                            );

                            broadcastToRoom(
                                roomId,
                                {
                                    type:
                                        "ROOM_JOINED",
                                    participant: {
                                        participantId,
                                        displayName,
                                        role,
                                    },
                                },
                                participantId,
                            );

                            return;
                        }

                        if (
                            !participant
                        ) {
                            send(
                                socket,
                                {
                                    type: "ERROR",
                                    message:
                                        "Join the room first.",
                                },
                            );

                            return;
                        }

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
                                    message.target,
                                );

                            if (
                                !target ||
                                target.roomId !==
                                    participant.roomId
                            ) {
                                return;
                            }

                            send(
                                target.socket,
                                {
                                    ...message,
                                    from:
                                        participant.participantId,
                                },
                            );

                            return;
                        }

                        if (
                            message.type ===
                            "LEAVE_ROOM"
                        ) {
                            socket.close();

                            return;
                        }
                    } catch {
                        send(
                            socket,
                            {
                                type: "ERROR",
                                message:
                                    "Invalid realtime message.",
                            },
                        );
                    }
                },
            );

            socket.on(
                "close",
                async () => {
                    if (!participant) {
                        return;
                    }

                    connections.delete(
                        participant.participantId,
                    );

                    await removeParticipantPresence(
                        participant.roomId,
                        participant.participantId,
                    );

                    broadcastToRoom(
                        participant.roomId,
                        {
                            type: "ROOM_LEFT",
                            participant: {
                                participantId:
                                    participant.participantId,
                                displayName:
                                    participant.displayName,
                            },
                        },
                    );
                },
            );
        },
    );
}