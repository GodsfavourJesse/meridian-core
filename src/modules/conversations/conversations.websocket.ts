import type { FastifyInstance } from "fastify";
import WebSocket from "ws";

import {
    findActiveSession,
} from "../auth/sessions";

import {
    findUserById,
} from "../auth/auth.repository";

import {
    isConversationMember,
} from "./conversations.repository";

export const CONVERSATION_WS_EVENT = {
    CONNECTED: "CONNECTED",
    SUBSCRIBED: "SUBSCRIBED",
    UNSUBSCRIBED: "UNSUBSCRIBED",

    MESSAGE_NEW: "MESSAGE_NEW",
    MESSAGE_READ: "MESSAGE_READ",

    ERROR: "ERROR",
} as const;

export type ConversationWebSocketEvent =
    | {
          type: "CONNECTED";
          userId: string;
      }
    | {
          type: "SUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "MESSAGE_NEW";
          message: unknown;
      }
    | {
          type: "MESSAGE_READ";
          conversationId: string;
          readerId: string;
          messageIds: string[];
          readAt: string;
      }
    | {
          type: "ERROR";
          code: string;
          message: string;
      };

export type ConversationWebSocketClientEvent =
    | {
          type: "SUBSCRIBE_CONVERSATION";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBE_CONVERSATION";
          conversationId: string;
      };

type Connection = {
    socket: WebSocket;
    userId: string;
    conversationIds: Set<string>;
};

const connections = new Set<Connection>();

function send(
    socket: WebSocket,
    event: ConversationWebSocketEvent,
) {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return false;
    }

    try {
        socket.send(
            JSON.stringify(event),
        );

        return true;
    } catch {
        return false;
    }
}

function sendError(
    socket: WebSocket,
    code: string,
    message: string,
) {
    send(socket, {
        type: "ERROR",
        code,
        message,
    });
}

function removeConnection(
    connection: Connection,
) {
    connections.delete(connection);
}

function removeConnectionBySocket(
    socket: WebSocket,
) {
    for (const connection of connections) {
        if (connection.socket === socket) {
            connections.delete(connection);
            return;
        }
    }
}

/**
 * Broadcast a realtime event to every
 * connected user who is subscribed to
 * the conversation.
 *
 * The sender can optionally be excluded.
 *
 * Returns the number of sockets that
 * successfully received the event.
 */
export function broadcastConversationEvent(
    conversationId: string,
    event:
        | Extract<
              ConversationWebSocketEvent,
              {
                  type: "MESSAGE_NEW";
              }
          >
        | Extract<
              ConversationWebSocketEvent,
              {
                  type: "MESSAGE_READ";
              }
          >,
    excludeUserId?: string,
) {
    let deliveredCount = 0;

    for (const connection of connections) {
        /*
         * Remove dead sockets while iterating.
         */
        if (
            connection.socket.readyState !==
            WebSocket.OPEN
        ) {
            removeConnection(
                connection,
            );

            continue;
        }

        /*
         * Do not send the event back to
         * the user who generated it.
         *
         * The sender receives the REST
         * response directly.
         */
        if (
            excludeUserId &&
            connection.userId ===
                excludeUserId
        ) {
            continue;
        }

        /*
         * Only users who explicitly subscribed
         * to this conversation receive events.
         */
        if (
            !connection.conversationIds.has(
                conversationId,
            )
        ) {
            continue;
        }

        const delivered = send(
            connection.socket,
            event,
        );

        if (delivered) {
            deliveredCount++;
        } else {
            removeConnection(
                connection,
            );
        }
    }

    console.log(
        "[Conversation WS] Broadcast:",
        {
            event: event.type,
            conversationId,
            deliveredCount,
            activeConnections:
                connections.size,
        },
    );

    return deliveredCount;
}

function parseClientEvent(
    raw: string,
):
    | ConversationWebSocketClientEvent
    | null {
    try {
        const parsed: unknown =
            JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return null;
        }

        const event =
            parsed as Record<
                string,
                unknown
            >;

        if (
            typeof event.type !==
            "string"
        ) {
            return null;
        }

        if (
            event.type ===
                "SUBSCRIBE_CONVERSATION" ||
            event.type ===
                "UNSUBSCRIBE_CONVERSATION"
        ) {
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

        return null;
    } catch {
        return null;
    }
}

export function registerConversationWebSocket(
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
                "[Conversation WS] Upgrade accepted",
            );

            void handleConnection(
                socket,
                request,
            ).catch((error) => {
                request.log.error(
                    error,
                    "Conversation WebSocket connection handler failed",
                );

                removeConnectionBySocket(
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
    try {
        const sessionCookie =
            request.cookies[
                "miyor_session"
            ];

        /*
         * WebSocket authentication cannot use
         * the normal HTTP requireAuth preHandler,
         * so we authenticate manually from the
         * session cookie.
         */
        if (!sessionCookie) {
            console.warn(
                "[Conversation WS] Rejected: missing session cookie.",
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
            console.warn(
                "[Conversation WS] Rejected: invalid session.",
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
            console.warn(
                "[Conversation WS] Rejected: user not found.",
            );

            socket.close(
                1008,
                "User account not found",
            );

            return;
        }

        const connection: Connection = {
            socket,
            userId: user.id,
            conversationIds:
                new Set(),
        };

        connections.add(connection);

        console.log(
            "[Conversation WS] Connected:",
            {
                userId: user.id,
                activeConnections:
                    connections.size,
            },
        );

        send(socket, {
            type: "CONNECTED",
            userId: user.id,
        });

        socket.on(
            "message",
            (raw) => {
                void handleClientMessage(
                    connection,
                    raw.toString(),
                ).catch((error) => {
                    request.log.error(
                        error,
                        "Conversation WebSocket message handler failed",
                    );

                    sendError(
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
                    "[Conversation WS] Closed:",
                    {
                        userId:
                            connection.userId,
                        code,
                        reason:
                            reason.toString(),
                    },
                );

                removeConnection(
                    connection,
                );
            },
        );

        socket.on(
            "error",
            (error) => {
                request.log.error(
                    error,
                    "Conversation WebSocket error",
                );

                removeConnection(
                    connection,
                );
            },
        );
    } catch (error) {
        request.log.error(
            error,
            "Conversation WebSocket authentication/connection failed",
        );

        removeConnectionBySocket(
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
    }
}

async function handleClientMessage(
    connection: Connection,
    raw: string,
) {
    const event =
        parseClientEvent(raw);

    if (!event) {
        sendError(
            connection.socket,
            "INVALID_EVENT",
            "Invalid WebSocket event.",
        );

        return;
    }

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
            console.warn(
                "[Conversation WS] Subscription rejected:",
                {
                    userId:
                        connection.userId,
                    conversationId:
                        event.conversationId,
                },
            );

            sendError(
                connection.socket,
                "CONVERSATION_ACCESS_DENIED",
                "You do not have access to this conversation.",
            );

            return;
        }

        connection.conversationIds.add(
            event.conversationId,
        );

        console.log(
            "[Conversation WS] Subscribed:",
            {
                userId:
                    connection.userId,
                conversationId:
                    event.conversationId,
                subscriptions:
                    connection
                        .conversationIds
                        .size,
            },
        );

        send(connection.socket, {
            type: "SUBSCRIBED",
            conversationId:
                event.conversationId,
        });

        return;
    }

    if (
        event.type ===
        "UNSUBSCRIBE_CONVERSATION"
    ) {
        connection.conversationIds.delete(
            event.conversationId,
        );

        console.log(
            "[Conversation WS] Unsubscribed:",
            {
                userId:
                    connection.userId,
                conversationId:
                    event.conversationId,
                subscriptions:
                    connection
                        .conversationIds
                        .size,
            },
        );

        send(connection.socket, {
            type: "UNSUBSCRIBED",
            conversationId:
                event.conversationId,
        });
    }
}