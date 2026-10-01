import type { FastifyInstance } from "fastify";

import {
    checkDatabaseConnection,
} from "./database";

import {
    checkRedisConnection,
} from "./config/redis";

import {
    authRoutes,
} from "./modules/auth/auth.routes";
import { verificationRoute } from "./modules/auth/verification-routes";
import { usersRoutes } from "./modules/users/users.routes";
import { contactsRoutes } from "./modules/contacts/contacts.routes";
import { conversationRoutes } from "./modules/conversations/conversations.routes";
import { callRoutes } from "./modules/calls/calls.routes";
import { registerRealtimeWebSocket } from "./realtime/realtime.gateway";

export async function registerRoutes(
    app: FastifyInstance,
) {
    // Authentication
    await app.register(
        authRoutes,
        {
            prefix: "/auth",
        },
    );

    // Email verification
    await app.register(
        verificationRoute,
        {
            prefix: "/auth",
        },
    );

    // Users
    await app.register(usersRoutes, {
        prefix: "/users",
    });

    // Contatcs
    await app.register(contactsRoutes, {
        prefix: "/contacts",
    });

    // Conversations
    app.register(conversationRoutes, {
        prefix: "/conversations",
    });

    // Calls
    await app.register(callRoutes);

    registerRealtimeWebSocket(app);

    // Health
    app.get(
        "/health",
        async (
            _request,
            reply,
        ) => {
            try {
                await checkDatabaseConnection();
                await checkRedisConnection();

                return {
                    status: "ok",
                    service: "miyor-api",
                    database:
                        "connected",
                    redis:
                        "connected",
                };
            } catch (error) {
                app.log.error(error);

                return reply
                    .status(503)
                    .send({
                        status:
                            "error",
                        service:
                            "miyor-api",
                        database:
                            "disconnected",
                        redis:
                            "unknown",
                    });
            }
        },
    );
}