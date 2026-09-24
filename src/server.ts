import "./config/dns";

import { buildApp } from "./app";
import { env } from "./config/env";
import { closeDatabaseConnection } from "./database";
import { verifyEmailTransport } from "./modules/auth/email";
import { redis } from "./config/redis";

const app = buildApp();

const start = async () => {
    try {
        await verifyEmailTransport();

        app.log.info("✓ SMTP connection verified");

        await app.listen({
            port: env.PORT,
            host: "0.0.0.0",
        });

        app.log.info(
            `🚀 Miyor API running on ${env.API_URL}`,
        );
    } catch (error) {
        app.log.error(error);
        await closeDatabaseConnection();
        process.exit(1);
    }
};

const shutdown = async (signal: string) => {
    app.log.info(
        `${signal} received. Shutting down...`,
    );

    try {
        await app.close();
        await closeDatabaseConnection();
        await redis.quit();
        process.exit(0);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

void start();