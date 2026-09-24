import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

import { env } from "./config/env";
import { closeDatabaseConnection } from "./database";
import { registerRoutes } from "./routes";

export function buildApp() {
    const app = Fastify({
        logger:
            env.NODE_ENV === "development"
                ? {
                    transport: {
                        target: "pino-pretty",
                        options: {
                            colorize: true,
                            translateTime: "HH:MM:ss",
                            ignore: "pid,hostname",
                        },
                    },
                }
                : true,
    });

    app.register(cors, {
        origin: env.APP_URL,
        credentials: true,
    });

    app.register(cookie);

    app.register(async (instance) => {
        instance.addHook("onClose", async () => {
            await closeDatabaseConnection();
        });

        await registerRoutes(instance);
    });

    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);

        const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
                ? error.statusCode
                : 500;

        const message =
            statusCode >= 500
                ? "Internal server error"
                : error instanceof Error
                    ? error.message
                    : "Request failed";

        return reply.status(statusCode).send({
            status: "error",
            message,
        });
    });

    return app;
}
