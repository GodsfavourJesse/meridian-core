import "./config/dns";

import { buildApp } from "./app";
import { env } from "./config/env";
import { redis } from "./config/redis";

const app = buildApp();

async function start() {
    try {
        await app.listen({
            port: env.PORT,
            host: "0.0.0.0",
        });

        app.log.info(
            `Miyor API running on ${env.API_URL}`,
        );
    } catch (error) {
        app.log.error(error);

        process.exit(1);
    }
}

async function shutdown(
    signal: string,
) {
    app.log.info(
        `${signal} received. Shutting down...`,
    );

    try {
        /*
         * app.close() triggers Fastify's
         * onClose hooks, including the
         * PostgreSQL connection cleanup.
         */
        await app.close();

        /*
         * Redis is owned outside the Fastify
         * database lifecycle, so close it here.
         */
        await redis.quit();

        process.exit(0);
    } catch (error) {
        app.log.error(error);

        process.exit(1);
    }
}

process.on(
    "SIGINT",
    () => {
        void shutdown("SIGINT");
    },
);

process.on(
    "SIGTERM",
    () => {
        void shutdown("SIGTERM");
    },
);

void start();