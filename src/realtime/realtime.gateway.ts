import type { FastifyInstance } from "fastify";
import WebSocket from "ws";


import {
    realtimeConnections,
} from "./realtime.connection";

import type {
    RealtimeClientEvent,
    RealtimeConnection,
} from "./realtime.types";
import { findActiveSession } from "../modules/auth/sessions";
import { findUserById } from "../modules/auth/auth.repository";
import { isConversationMember } from "../modules/conversations/conversations.repository";
import { handleWebRTCSignaling } from "./realtime.signaling";

/*
 * --------------------------------------------------------------------------
 * Client event parsing
 * --------------------------------------------------------------------------
 */

function parseClientEvent(
    raw: string,
): RealtimeClientEvent | null {
    try {
        const parsed: unknown = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return null;
        }

        const event =
            parsed as Record<string, unknown>;

        if (typeof event.type !== "string") {
            return null;
        }

        switch (event.type) {
            case "PING":
                return {
                    type: "PING",
                };

            case "SUBSCRIBE_CONVERSATION":
            case "UNSUBSCRIBE_CONVERSATION": {
                if (
                    typeof event.conversationId !==
                    "string"
                ) {
                    return null;
                }

                const conversationId =
                    event.conversationId.trim();

                if (!conversationId) {
                    return null;
                }

                return {
                    type: event.type,
                    conversationId,
                };
            }

            case "OFFER": {
                if (
                    typeof event.callId !== "string" ||
                    typeof event.sdp !== "string"
                ) {
                    return null;
                }

                const callId = event.callId.trim();

                if (!callId || !event.sdp) {
                    return null;
                }

                return {
                    type: "OFFER",
                    callId,
                    sdp: event.sdp,
                };
            }

            case "ANSWER": {
                if (
                    typeof event.callId !== "string" ||
                    typeof event.sdp !== "string"
                ) {
                    return null;
                }

                const callId = event.callId.trim();

                if (!callId || !event.sdp) {
                    return null;
                }

                return {
                    type: "ANSWER",
                    callId,
                    sdp: event.sdp,
                };
            }

            case "ICE_CANDIDATE": {
                if (
                    typeof event.callId !== "string" ||
                    !event.candidate ||
                    typeof event.candidate !== "object"
                ) {
                    return null;
                }

                const callId = event.callId.trim();

                if (!callId) {
                    return null;
                }

                const candidate =
                    event.candidate as Record<
                        string,
                        unknown
                    >;

                /*
                 * candidate
                 * ----------------------------------------------------------------
                 */

                if (
                    typeof candidate.candidate !==
                    "string"
                ) {
                    return null;
                }

                /*
                 * sdpMid
                 * ----------------------------------------------------------------
                 *
                 * WebRTC allows this to be null.
                 * If omitted by the client, normalize it
                 * to null for our internal protocol.
                 */

                let sdpMid: string | null = null;

                if (
                    candidate.sdpMid !== undefined &&
                    candidate.sdpMid !== null
                ) {
                    if (
                        typeof candidate.sdpMid !==
                        "string"
                    ) {
                        return null;
                    }

                    sdpMid = candidate.sdpMid;
                }

                /*
                 * sdpMLineIndex
                 * ----------------------------------------------------------------
                 */

                let sdpMLineIndex: number | null =
                    null;

                if (
                    candidate.sdpMLineIndex !==
                        undefined &&
                    candidate.sdpMLineIndex !== null
                ) {
                    if (
                        typeof candidate.sdpMLineIndex !==
                        "number"
                    ) {
                        return null;
                    }

                    sdpMLineIndex =
                        candidate.sdpMLineIndex;
                }

                /*
                 * usernameFragment
                 * ----------------------------------------------------------------
                 *
                 * This field is optional.
                 *
                 * IMPORTANT:
                 * With exactOptionalPropertyTypes enabled,
                 * we must NOT return:
                 *
                 * usernameFragment: undefined
                 *
                 * Instead, only add the property when
                 * the client actually supplied it.
                 */

                let usernameFragment:
                    | string
                    | null
                    | undefined;

                if (
                    candidate.usernameFragment !==
                        undefined &&
                    candidate.usernameFragment !==
                        null
                ) {
                    if (
                        typeof candidate.usernameFragment !==
                        "string"
                    ) {
                        return null;
                    }

                    usernameFragment =
                        candidate.usernameFragment;
                } else if (
                    candidate.usernameFragment === null
                ) {
                    usernameFragment = null;
                }

                const parsedCandidate = {
                    candidate:
                        candidate.candidate,
                    sdpMid,
                    sdpMLineIndex,
                    ...(usernameFragment !== undefined
                        ? {
                              usernameFragment,
                          }
                        : {}),
                };

                return {
                    type: "ICE_CANDIDATE",
                    callId,
                    candidate: parsedCandidate,
                };
            }

            default:
                return null;
        }
    } catch {
        return null;
    }
}

/*
 * --------------------------------------------------------------------------
 * Gateway registration
 * --------------------------------------------------------------------------
 */

export function registerRealtimeWebSocket(
    app: FastifyInstance,
) {
    app.get(
        "/ws",
        {
            websocket: true,
        },
        (socket, request) => {
            request.log.info(
                {
                    url: request.url,
                    hasCookie:
                        Boolean(
                            request.cookies?.[
                                "miyor_session"
                            ],
                        ),
                },
                "[Realtime WS] Upgrade accepted",
            );

            void handleConnection(
                socket,
                request,
            ).catch((error) => {
                request.log.error(
                    error,
                    "Realtime WebSocket connection handler failed",
                );

                realtimeConnections.removeBySocket(
                    socket,
                );

                try {
                    if (
                        socket.readyState ===
                        WebSocket.OPEN
                    ) {
                        socket.close(
                            1011,
                            "Internal server error",
                        );
                    }
                } catch {
                    // Socket may already be closed.
                }
            });
        },
    );
}

/*
 * --------------------------------------------------------------------------
 * Authentication + connection lifecycle
 * --------------------------------------------------------------------------
 */

async function handleConnection(
    socket: WebSocket,
    request: {
        cookies: Record<
            string,
            string | undefined
        >;
        log: {
            info?: (
                object: unknown,
                message?: string,
            ) => void;

            error: (
                error: unknown,
                message?: string,
            ) => void;
        };
    },
) {
    const sessionCookie =
        request.cookies[
            "miyor_session"
        ];

    if (!sessionCookie) {
        request.log.info?.(
            {},
            "[Realtime WS] Rejected: missing session cookie.",
        );

        socket.close(
            1008,
            "Authentication required",
        );

        return;
    }

    const session =
        await findActiveSession(
            sessionCookie,
        );

    if (!session) {
        request.log.info?.(
            {},
            "[Realtime WS] Rejected: invalid session.",
        );

        socket.close(
            1008,
            "Session expired or invalid",
        );

        return;
    }

    const user =
        await findUserById(
            session.userId,
        );

    if (!user) {
        request.log.info?.(
            {},
            "[Realtime WS] Rejected: user not found.",
        );

        socket.close(
            1008,
            "User account not found",
        );

        return;
    }

    const connection: RealtimeConnection =
        {
            socket,
            userId: user.id,
            conversationIds:
                new Set(),
        };

    realtimeConnections.add(
        connection,
    );

    console.log(
        "[Realtime WS] Connected:",
        {
            userId: user.id,
            activeConnections:
                realtimeConnections.size,
        },
    );

    realtimeConnections.send(
        socket,
        {
            type: "CONNECTED",
            userId: user.id,
        },
    );

    socket.on(
        "message",
        (raw) => {
            void handleClientMessage(
                connection,
                raw.toString(),
                request,
            ).catch((error) => {
                request.log.error(
                    error,
                    "Realtime WebSocket message handler failed",
                );

                realtimeConnections.sendError(
                    connection.socket,
                    "INTERNAL_ERROR",
                    "Unable to process WebSocket event.",
                );
            });
        },
    );

    socket.on(
        "close",
        (code, reason) => {
            console.log(
                "[Realtime WS] Closed:",
                {
                    userId:
                        connection.userId,
                    code,
                    reason:
                        reason.toString(),
                },
            );

            realtimeConnections.remove(
                connection,
            );
        },
    );

    socket.on(
        "error",
        (error) => {
            request.log.error(
                error,
                "Realtime WebSocket error",
            );

            realtimeConnections.remove(
                connection,
            );
        },
    );
}

/*
 * --------------------------------------------------------------------------
 * Client event handling
 * --------------------------------------------------------------------------
 */

async function handleClientMessage(
    connection: RealtimeConnection,
    raw: string,
    request: {
        log: {
            error: (
                error: unknown,
                message?: string,
            ) => void;
        };
    },
) {
    const event = parseClientEvent(raw);

    if (!event) {
        realtimeConnections.sendError(
            connection.socket,
            "INVALID_EVENT",
            "Invalid WebSocket event.",
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * Heartbeat
     * ----------------------------------------------------------------------
     */

    if (event.type === "PING") {
        realtimeConnections.send(
            connection.socket,
            {
                type: "PONG",
            },
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * Conversation subscription
     * ----------------------------------------------------------------------
     */

    if (
        event.type ===
        "SUBSCRIBE_CONVERSATION"
    ) {
        const isMember =
            await isConversationMember(
                event.conversationId,
                connection.userId,
            );

        if (!isMember) {
            realtimeConnections.sendError(
                connection.socket,
                "CONVERSATION_ACCESS_DENIED",
                "You do not have access to this conversation.",
            );

            return;
        }

        connection.conversationIds.add(
            event.conversationId,
        );

        realtimeConnections.send(
            connection.socket,
            {
                type: "SUBSCRIBED",
                conversationId:
                    event.conversationId,
            },
        );

        return;
    }

    if (
        event.type ===
        "UNSUBSCRIBE_CONVERSATION"
    ) {
        connection.conversationIds.delete(
            event.conversationId,
        );

        realtimeConnections.send(
            connection.socket,
            {
                type: "UNSUBSCRIBED",
                conversationId:
                    event.conversationId,
            },
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * WebRTC signaling
     * ----------------------------------------------------------------------
     *
     * Intentionally not implemented in this slice.
     *
     * The event parser already understands the
     * protocol, but signaling must perform
     * call authorization before forwarding
     * anything to another user.
     *
     * That logic is Phase 6E.
     */

    if (
        event.type === "OFFER" ||
        event.type === "ANSWER" ||
        event.type === "ICE_CANDIDATE"
    ) {
        await handleWebRTCSignaling(
            connection,
            event,
        );

        return;
    }
}