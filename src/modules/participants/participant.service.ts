import {
    and,
    eq,
    isNull,
    gt,
} from "drizzle-orm";


import {
    createGuestToken,
    hashGuestToken,
} from "./participant-token";
import { db } from "../../database";
import { participants, rooms } from "../../database/schema";

export async function joinRoomAsGuest(
    roomId: string,
    displayName: string,
) {
    const [room] = await db
        .select({
            id: rooms.id,
            status: rooms.status,
            invitationExpiresAt:
                rooms.invitationExpiresAt,
            invitationRevokedAt:
                rooms.invitationRevokedAt,
        })
        .from(rooms)
        .where(
            and(
                eq(rooms.id, roomId),
                gt(
                    rooms.invitationExpiresAt,
                    new Date(),
                ),
                isNull(
                    rooms.invitationRevokedAt,
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

    const guestToken = createGuestToken();

    const guestTokenHash =
        hashGuestToken(guestToken);

    const [participant] = await db
        .insert(participants)
        .values({
            roomId,
            userId: null,
            guestTokenHash,
            displayName: displayName.trim(),
        })
        .returning({
            id: participants.id,
            roomId: participants.roomId,
            displayName:
                participants.displayName,
            joinedAt: participants.joinedAt,
        });

    if (!participant) {
        throw new Error(
            "Failed to create participant",
        );
    }

    return {
        participant,
        guestToken,
    };
}