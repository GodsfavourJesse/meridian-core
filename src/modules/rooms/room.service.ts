import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../database";
import { rooms } from "../../database/schema";
import {
    createInvitationToken,
    createRoomCode,
    hashInvitationToken,
} from "./room-token";

const INVITATION_DURATION_MS = 1000 * 60 * 60 * 24;

export async function createRoom(hostId: string) {
    const invitationToken = createInvitationToken();
    const invitationTokenHash =
        hashInvitationToken(invitationToken);

    const invitationExpiresAt = new Date(
        Date.now() + INVITATION_DURATION_MS,
    );

    const roomCode = createRoomCode();

    const [room] = await db
        .insert(rooms)
        .values({
            hostId,
            roomCode,
            status: "waiting",
            invitationTokenHash,
            invitationExpiresAt,
        })
        .returning({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            createdAt: rooms.createdAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        });

    if (!room) {
        throw new Error("Failed to create room");
    }

    return {
        room,
        invitationToken,
    };
}

export async function getRoomForHost(
    roomId: string,
    hostId: string,
) {
    const [room] = await db
        .select({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            createdAt: rooms.createdAt,
            startedAt: rooms.startedAt,
            endedAt: rooms.endedAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        })
        .from(rooms)
        .where(
            and(
                eq(rooms.id, roomId),
                eq(rooms.hostId, hostId),
            ),
        )
        .limit(1);

    return room ?? null;
}

export async function endRoom(
    roomId: string,
    hostId: string,
) {
    const [room] = await db
        .update(rooms)
        .set({
            status: "ended",
            endedAt: new Date(),
            invitationRevokedAt: new Date(),
        })
        .where(
            and(
                eq(rooms.id, roomId),
                eq(rooms.hostId, hostId),
                isNull(rooms.endedAt),
            ),
        )
        .returning({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            createdAt: rooms.createdAt,
            startedAt: rooms.startedAt,
            endedAt: rooms.endedAt,
        });

    return room ?? null;
}

export async function getRoomByInvitationToken(
    invitationToken: string,
) {
    const tokenHash =
        hashInvitationToken(invitationToken);

    const [room] = await db
        .select({
            id: rooms.id,
            roomCode: rooms.roomCode,
            status: rooms.status,
            createdAt: rooms.createdAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        })
        .from(rooms)
        .where(
            and(
                eq(
                    rooms.invitationTokenHash,
                    tokenHash,
                ),
                isNull(rooms.invitationRevokedAt),
                gt(
                    rooms.invitationExpiresAt,
                    new Date(),
                ),
            ),
        )
        .limit(1);

    if (!room) {
        return null;
    }

    if (
        room.status === "ended" ||
        room.status === "expired"
    ) {
        return null;
    }

    return room;
}

export async function startRoom(
    roomId: string,
    hostId: string,
) {
    const [room] = await db
        .select({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            startedAt: rooms.startedAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        })
        .from(rooms)
        .where(
            and(
                eq(rooms.id, roomId),
                eq(rooms.hostId, hostId),
            ),
        )
        .limit(1);

    if (!room) {
        return {
            ok: false as const,
            reason: "NOT_FOUND" as const,
        };
    }

    if (room.status === "active") {
        return {
            ok: true as const,
            room,
        };
    }

    if (room.status !== "waiting") {
        return {
            ok: false as const,
            reason: "INVALID_STATUS" as const,
            room,
        };
    }

    const now = new Date();

    const [startedRoom] = await db
        .update(rooms)
        .set({
            status: "active",
            startedAt: now,
        })
        .where(
            and(
                eq(rooms.id, roomId),
                eq(rooms.hostId, hostId),
                eq(rooms.status, "waiting"),
            ),
        )
        .returning({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            startedAt: rooms.startedAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        });

    if (!startedRoom) {
        return {
            ok: false as const,
            reason: "START_FAILED" as const,
        };
    }

    return {
        ok: true as const,
        room: startedRoom,
    };
}

export async function getHostRoom(
    roomId: string,
    hostId: string,
) {
    const [room] = await db
        .select({
            id: rooms.id,
            hostId: rooms.hostId,
            roomCode: rooms.roomCode,
            status: rooms.status,
            createdAt: rooms.createdAt,
            startedAt: rooms.startedAt,
            endedAt: rooms.endedAt,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
        })
        .from(rooms)
        .where(
            and(
                eq(rooms.id, roomId),
                eq(rooms.hostId, hostId),
            ),
        )
        .limit(1);

    return room ?? null;
}