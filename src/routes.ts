import type { FastifyInstance } from "fastify";

import {
    checkDatabaseConnection,
} from "./database";

import {
    authRoutes,
} from "./modules/auth/auth.routes";
import { verificationRoute } from "./modules/auth/verification-routes";
import { usersRoutes } from "./modules/users/users.routes";
import { contactsRoutes } from "./modules/contacts/contacts.routes";
import { conversationRoutes } from "./modules/conversations/conversations.routes";

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

    // Health
    app.get(
        "/health",
        async (
            _request,
            reply,
        ) => {
            try {
                await checkDatabaseConnection();

                return {
                    status: "ok",
                    service: "miyor-api",
                    database:
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
                    });
            }
        },
    );
}