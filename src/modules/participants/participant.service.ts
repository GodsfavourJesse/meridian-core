import { and, eq, gt, isNull } from "drizzle-orm";

import {
    createGuestToken,
    hashGuestToken,
} from "./participant-token";

import {
    db,
} from "../../database";

import {
    participants,
    rooms,
} from "../../database/schema";

import {
    hashInvitationToken,
} from "../rooms/room-token";

export async function joinRoomAsGuest(
    roomId: string,
    invitationToken: string,
    displayName: string,
) {
    const invitationTokenHash =
        hashInvitationToken(
            invitationToken,
        );

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

                eq(
                    rooms.invitationTokenHash,
                    invitationTokenHash,
                ),

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
        room.status !==
        "active"
    ) {
        return null;
    }

    const guestToken =
        createGuestToken();

    const guestTokenHash =
        hashGuestToken(
            guestToken,
        );

    const [participant] =
        await db
            .insert(participants)
            .values({
                roomId,
                userId: null,
                guestTokenHash,
                displayName:
                    displayName.trim(),
            })
            .returning({
                id:
                    participants.id,
                roomId:
                    participants.roomId,
                displayName:
                    participants.displayName,
                joinedAt:
                    participants.joinedAt,
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

/**
 * Authenticate an existing guest participant
 * for a realtime WebSocket connection.
 */
export async function authenticateGuestParticipant(
    roomId: string,
    participantId: string,
    guestToken: string,
) {
    const guestTokenHash =
        hashGuestToken(
            guestToken,
        );

    const [participant] =
        await db
            .select({
                id:
                    participants.id,

                roomId:
                    participants.roomId,

                displayName:
                    participants.displayName,

                joinedAt:
                    participants.joinedAt,

                roomStatus:
                    rooms.status,
            })
            .from(participants)
            .innerJoin(
                rooms,
                eq(
                    rooms.id,
                    participants.roomId,
                ),
            )
            .where(
                and(
                    eq(
                        participants.id,
                        participantId,
                    ),

                    eq(
                        participants.roomId,
                        roomId,
                    ),

                    eq(
                        participants.guestTokenHash,
                        guestTokenHash,
                    ),
                ),
            )
            .limit(1);

    if (!participant) {
        return null;
    }

    if (
        participant.roomStatus !==
        "active"
    ) {
        return null;
    }

    return {
        roomId:
            participant.roomId,

        participantId:
            participant.id,

        displayName:
            participant.displayName,

        role:
            "guest" as const,
    };
}