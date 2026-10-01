import WebSocket from "ws";

import type {
    RealtimeConnection,
    RealtimeServerEvent,
} from "./realtime.types";

class RealtimeConnectionManager {
    private readonly connections =
        new Set<RealtimeConnection>();

    add(connection: RealtimeConnection) {
        this.connections.add(connection);
    }

    remove(connection: RealtimeConnection) {
        this.connections.delete(connection);
    }

    removeBySocket(socket: WebSocket) {
        for (const connection of this.connections) {
            if (connection.socket === socket) {
                this.connections.delete(
                    connection,
                );

                return;
            }
        }
    }

    get size() {
        return this.connections.size;
    }

    getConnections() {
        return this.connections;
    }

    getUserConnections(userId: string) {
        const result: RealtimeConnection[] = [];

        for (const connection of this.connections) {
            if (connection.userId === userId) {
                result.push(connection);
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
            const delivered = this.send(
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

            const delivered = this.send(
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
}

export const realtimeConnections =
    new RealtimeConnectionManager();