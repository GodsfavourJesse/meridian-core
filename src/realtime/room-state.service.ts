import { redis } from "../config/redis";
import { roomStateKey } from "./redis-keys";

export type RealtimeRoomState = {
    status: "waiting" | "active";
    startedAt?: string;
};

export async function setRoomState(
    roomId: string,
    state: RealtimeRoomState,
) {
    await redis.set(
        roomStateKey(roomId),
        JSON.stringify(state),
        "EX",
        60 * 60 * 24,
    );
}

export async function getRoomState(
    roomId: string,
) {
    const value = await redis.get(
        roomStateKey(roomId),
    );

    if (!value) {
        return null;
    }

    return JSON.parse(
        value,
    ) as RealtimeRoomState;
}

export async function deleteRoomState(
    roomId: string,
) {
    await redis.del(
        roomStateKey(roomId),
    );
}