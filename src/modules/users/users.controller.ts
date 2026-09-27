import type { FastifyReply, FastifyRequest } from "fastify";

import { profileUpdateSchema, userSearchSchema } from "./users.validation";
import { searchUsersService, updateProfile } from "./users.service";

function serializeUser(user: {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    email: string;
    profilePictureUrl: string | null;
    bio: string | null;
    emailVerifiedAt: Date | null;
    status: string;
    createdAt: Date;
}) {
    return {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        miyorNumber: user.miyorNumber,
        email: user.email,
        profilePictureUrl: user.profilePictureUrl,
        bio: user.bio,
        emailVerifiedAt: user.emailVerifiedAt,
        status: user.status,
        createdAt: user.createdAt,
    };
}

export async function updateProfileController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const result = profileUpdateSchema.safeParse(request.body);

    if (!result.success) {
        return reply.status(400).send({
            status: "error",
            code: "VALIDATION_ERROR",
            message: "Invalid profile information.",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    try {
        if (!request.user) {
            return reply.status(401).send({
                status: "error",
                code: "UNAUTHORIZED",
                message: "Authentication required.",
            });
        }
        
        const user = await updateProfile(
            request.user.id,
            result.data,
        );

        return reply.send({
            status: "ok",
            user: serializeUser(user),
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "USER_NOT_FOUND"
        ) {
            return reply.status(404).send({
                status: "error",
                code: "USER_NOT_FOUND",
                message: "User not found.",
            });
        }

        request.log.error(error);

        return reply.status(500).send({
            status: "error",
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to update your profile.",
        });
    }
}

export async function searchUsersController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply
            .status(401)
            .send({
                status: "error",
                code: "UNAUTHORIZED",
                message:
                    "Authentication required.",
            });
    }

    const parsed =
        userSearchSchema.safeParse(
            request.query,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid search query.",
                errors:
                    parsed.error.issues.map(
                        (issue) => ({
                            field:
                                issue.path.join(
                                    ".",
                                ),
                            message:
                                issue.message,
                        }),
                    ),
            });
    }

    const users =
        await searchUsersService(
            parsed.data.q,
        );

    return reply.send({
        status: "ok",
        results: users,
    });
}