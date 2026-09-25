import type { FastifyInstance } from "fastify";

import { checkDatabaseConnection } from "./database";
import { authRoutes } from "./modules/auth/routes";
import { verificationRoutes } from "./modules/auth/verification-routes";
import { meRoutes } from "./modules/me/me.routes";
import { roomRoutes } from "./modules/rooms/room.routes";
import { registerRealtime } from "./realtime/websocket";

export async function registerRoutes(app: FastifyInstance) {
    await app.register(authRoutes, { prefix: "/auth" });
    await app.register(verificationRoutes, { prefix: "/auth" });
    await app.register(meRoutes);
    await app.register(roomRoutes);
    await registerRealtime(app);

    app.get("/health", async (_request, reply) => {
        try {
            await checkDatabaseConnection();

            return {
                status: "ok",
                service: "miyor-api",
                database: "connected",
            };
        } catch (error) {
            app.log.error(error);

            return reply.status(503).send({
                status: "error",
                service: "miyor-api",
                database: "disconnected",
            });
        }
    });
}
