import type { FastifyInstance } from "fastify";

import { requireAuth } from "../auth/require-auth";
import {
    createRoom,
    endRoom,
    getRoomByInvitationToken,
    getRoomForHost,
    startRoom,
} from "./room.service";
import { env } from "../../config/env";
import { joinRoomSchema } from "./room.validation";
import { joinRoomAsGuest } from "../participants/participant.service";

export async function roomRoutes(
    app: FastifyInstance,
) {
    app.post(
        "/rooms",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const { room, invitationToken } =
                await createRoom(
                    request.user!.id,
                );

            const invitationUrl =
                `${env.APP_URL}/c/${invitationToken}`;

            return reply.status(201).send({
                status: "ok",
                room: {
                    id: room.id,
                    roomCode: room.roomCode,
                    status: room.status,
                    createdAt: room.createdAt,
                    invitationExpiresAt:
                        room.invitationExpiresAt,
                },
                invitation: {
                    url: invitationUrl,
                    expiresAt:
                        room.invitationExpiresAt,
                },
            });
        },
    );

    app.get(
        "/rooms/:roomId",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const { roomId } =
                request.params as {
                    roomId: string;
                };

            const room = await getRoomForHost(
                roomId,
                request.user!.id,
            );

            if (!room) {
                return reply.status(404).send({
                    status: "error",
                    message: "Room not found",
                });
            }

            return {
                status: "ok",
                room,
            };
        },
    );

    app.post(
        "/rooms/:roomId/end",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const { roomId } =
                request.params as {
                    roomId: string;
                };

            const room = await endRoom(
                roomId,
                request.user!.id,
            );

            if (!room) {
                return reply.status(404).send({
                    status: "error",
                    message:
                        "Room not found or already ended",
                });
            }

            return {
                status: "ok",
                room,
            };
        },
    );

    app.get(
        "/rooms/invitations/:token",
        async (request, reply) => {
            const { token } =
                request.params as {
                    token: string;
                };

            if (!token || token.length < 20) {
                return reply.status(404).send({
                    status: "error",
                    message: "Invitation not found",
                });
            }

            const room =
                await getRoomByInvitationToken(token);

            if (!room) {
                return reply.status(404).send({
                    status: "error",
                    code: "INVALID_INVITATION",
                    message:
                        "This invitation is invalid or has expired.",
                });
            }

            return {
                status: "ok" as const,
                room: {
                    id: room.id,
                    roomCode: room.roomCode,
                    status: room.status,
                    createdAt: room.createdAt,
                    invitationExpiresAt:
                        room.invitationExpiresAt,
                },
            };
        },
    );

    app.post(
        "/rooms/:roomId/join",
        async (request, reply) => {
            const { roomId } =
                request.params as {
                    roomId: string;
                };

            const parsed =
                joinRoomSchema.safeParse(
                    request.body,
                );

            if (!parsed.success) {
                return reply.status(400).send({
                    status: "error",
                    code: "INVALID_DISPLAY_NAME",
                    message:
                        parsed.error.issues[0]?.message ??
                        "Invalid display name",
                });
            }

            const result =
                await joinRoomAsGuest(
                    roomId,
                    parsed.data.displayName,
                );

            if (!result) {
                return reply.status(404).send({
                    status: "error",
                    code: "ROOM_UNAVAILABLE",
                    message:
                        "This call is no longer available.",
                });
            }

            return reply.status(201).send({
                status: "ok",
                participant: {
                    id: result.participant.id,
                    roomId:
                        result.participant.roomId,
                    displayName:
                        result.participant.displayName,
                    joinedAt:
                        result.participant.joinedAt,
                },
                guestToken:
                    result.guestToken,
            });
        },
    );

    app.post(
        "/rooms/:roomId/start",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const { roomId } =
                request.params as {
                    roomId: string;
                };

            const result =
                await startRoom(
                    roomId,
                    request.user!.id,
                );

            if (
                !result.ok &&
                result.reason === "NOT_FOUND"
            ) {
                return reply.status(404).send({
                    status: "error",
                    code: "ROOM_NOT_FOUND",
                    message:
                        "Room not found.",
                });
            }

            if (
                !result.ok &&
                result.reason === "INVALID_STATUS"
            ) {
                return reply.status(409).send({
                    status: "error",
                    code: "ROOM_NOT_STARTABLE",
                    message:
                        "This room cannot be started.",
                });
            }

            if (
                !result.ok &&
                result.reason === "START_FAILED"
            ) {
                return reply.status(409).send({
                    status: "error",
                    code: "ROOM_START_FAILED",
                    message:
                        "Unable to start the room.",
                });
            }

            return reply.status(200).send({
                status: "ok",
                room: {
                    id: result.room.id,
                    roomCode:
                        result.room.roomCode,
                    status:
                        result.room.status,
                    startedAt:
                        result.room.startedAt,
                    invitationExpiresAt:
                        result.room
                            .invitationExpiresAt,
                },
            });
        },
    );
}