import { randomUUID } from "node:crypto";

import { redis } from "../config/redis";

const PRESENCE_PREFIX =
    "miyor:presence:";

const PRESENCE_TTL_SECONDS = 60;

export const REALTIME_INSTANCE_ID =
    randomUUID();

function presenceKey(
    userId: string,
) {
    return `${PRESENCE_PREFIX}${userId}`;
}

function memberKey(
    connectionId: string,
) {
    return `${REALTIME_INSTANCE_ID}:${connectionId}`;
}

export async function markPresenceOnline(
    userId: string,
    connectionId: string,
) {
    const key =
        presenceKey(userId);

    const added =
        await redis.sadd(
            key,
            memberKey(connectionId),
        );

    await redis.expire(
        key,
        PRESENCE_TTL_SECONDS,
    );

    return added > 0;
}

export async function refreshPresence(
    userId: string,
    connectionId: string,
) {
    const key =
        presenceKey(userId);

    await redis.sadd(
        key,
        memberKey(connectionId),
    );

    await redis.expire(
        key,
        PRESENCE_TTL_SECONDS,
    );
}

export async function markPresenceOffline(
    userId: string,
    connectionId: string,
) {
    const key =
        presenceKey(userId);

    await redis.srem(
        key,
        memberKey(connectionId),
    );

    const remaining =
        await redis.scard(key);

    if (remaining === 0) {
        await redis.del(key);
        return true;
    }

    await redis.expire(
        key,
        PRESENCE_TTL_SECONDS,
    );

    return false;
}

export async function isUserOnline(
    userId: string,
) {
    return (
        (await redis.exists(
            presenceKey(userId),
        )) === 1
    );
}
