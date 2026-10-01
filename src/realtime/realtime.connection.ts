import WebSocket from "ws";

import type {
    RealtimeConnection,
    RealtimeServerEvent,
} from "./realtime.types";

import {
    markPresenceOffline,
    markPresenceOnline,
    refreshPresence,
} from "./realtime.presence";

class RealtimeConnectionManager {
    private readonly connections =
        new Set<RealtimeConnection>();

    add(
        connection: RealtimeConnection,
    ) {
        this.connections.add(
            connection,
        );

        void markPresenceOnline(
            connection.userId,
            connection.connectionId,
        ).catch((error) => {
            console.error(
                "[Realtime] Failed to mark user online:",
                error,
            );
        });

        if (
            this.getUserConnections(
                connection.userId,
            ).length === 1
        ) {
            this.broadcastPresence({
                type: "PRESENCE_ONLINE",
                userId:
                    connection.userId,
            });
        }
    }

    remove(
        connection: RealtimeConnection,
    ) {
        const existed =
            this.connections.delete(
                connection,
            );

        if (!existed) {
            return;
        }

        void markPresenceOffline(
            connection.userId,
            connection.connectionId,
        )
            .then((becameOffline) => {
                if (becameOffline) {
                    this.broadcastPresence({
                        type:
                            "PRESENCE_OFFLINE",
                        userId:
                            connection.userId,
                    });
                }
            })
            .catch((error) => {
                console.error(
                    "[Realtime] Failed to mark user offline:",
                    error,
                );
            });
    }

    removeBySocket(
        socket: WebSocket,
    ) {
        const connection =
            [...this.connections].find(
                (item) =>
                    item.socket === socket,
            );

        if (connection) {
            this.remove(connection);
        }
    }

    touch(
        connection: RealtimeConnection,
    ) {
        void refreshPresence(
            connection.userId,
            connection.connectionId,
        ).catch((error) => {
            console.error(
                "[Realtime] Failed to refresh presence:",
                error,
            );
        });
    }

    get size() {
        return this.connections.size;
    }

    getConnections() {
        return this.connections;
    }

    getUserConnections(
        userId: string,
    ) {
        const result: RealtimeConnection[] =
            [];

        for (const connection of this.connections) {
            if (
                connection.userId ===
                userId
            ) {
                result.push(
                    connection,
                );
            }
        }

        return result;
    }

    send(
        socket: WebSocket,
        event: RealtimeServerEvent,
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

    sendError(
        socket: WebSocket,
        code: string,
        message: string,
    ) {
        return this.send(socket, {
            type: "ERROR",
            code,
            message,
        });
    }

    sendToUser(
        userId: string,
        event: RealtimeServerEvent,
    ) {
        let deliveredCount = 0;

        for (const connection of this.getUserConnections(
            userId,
        )) {
            const delivered =
                this.send(
                    connection.socket,
                    event,
                );

            if (delivered) {
                deliveredCount++;
            } else {
                this.remove(
                    connection,
                );
            }
        }

        return deliveredCount;
    }

    sendToConversation(
        conversationId: string,
        event: RealtimeServerEvent,
        excludeUserId?: string,
    ) {
        let deliveredCount = 0;

        for (const connection of this.connections) {
            if (
                connection.socket.readyState !==
                WebSocket.OPEN
            ) {
                this.remove(connection);
                continue;
            }

            if (
                excludeUserId &&
                connection.userId ===
                    excludeUserId
            ) {
                continue;
            }

            if (
                !connection.conversationIds.has(
                    conversationId,
                )
            ) {
                continue;
            }

            const delivered =
                this.send(
                    connection.socket,
                    event,
                );

            if (delivered) {
                deliveredCount++;
            } else {
                this.remove(connection);
            }
        }

        return deliveredCount;
    }

    private broadcastPresence(
        event:
            | {
                  type: "PRESENCE_ONLINE";
                  userId: string;
              }
            | {
                  type: "PRESENCE_OFFLINE";
                  userId: string;
              },
    ) {
        for (const connection of this.connections) {
            this.send(
                connection.socket,
                event,
            );
        }
    }
}

export const realtimeConnections =
    new RealtimeConnectionManager();
