import { redis } from "../config/redis";
import {
    participantConnectionKey,
    roomPresenceKey,
} from "./redis-keys";
import type {
    RoomParticipantPresence,
} from "./realtime.types";

const PRESENCE_TTL_SECONDS = 60 * 60;

export async function setParticipantPresence(
    presence: RoomParticipantPresence,
) {
    const key = roomPresenceKey(
        presence.roomId,
    );

    await redis.hset(
        key,
        presence.participantId,
        JSON.stringify(presence),
    );

    await redis.expire(
        key,
        PRESENCE_TTL_SECONDS,
    );

    await redis.set(
        participantConnectionKey(
            presence.participantId,
        ),
        presence.connectionId,
        "EX",
        PRESENCE_TTL_SECONDS,
    );
}

export async function getRoomPresence(
    roomId: string,
) {
    const key = roomPresenceKey(roomId);

    const values = await redis.hvals(key);

    return values.map(
        (value) =>
            JSON.parse(
                value,
            ) as RoomParticipantPresence,
    );
}

export async function removeParticipantPresence(
    roomId: string,
    participantId: string,
) {
    await redis.hdel(
        roomPresenceKey(roomId),
        participantId,
    );

    await redis.del(
        participantConnectionKey(
            participantId,
        ),
    );
}