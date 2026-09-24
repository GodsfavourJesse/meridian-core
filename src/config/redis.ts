import Redis from "ioredis";

import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
});

redis.on("connect", () => {
    console.log("[redis] connected");
});

redis.on("ready", () => {
    console.log("[redis] ready");
});

redis.on("error", (error) => {
    console.error("[redis] error", error);
});

redis.on("close", () => {
    console.log("[redis] connection closed");
});

export async function checkRedisConnection() {
    const result = await redis.ping();

    if (result !== "PONG") {
        throw new Error("Redis health check failed");
    }
}