import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    findActiveSession,
    SESSION_COOKIE_NAME,
} from "./sessions";

import {
    findUserById,
} from "./auth.repository";

import type {
    AuthenticatedUser,
} from "./auth.types";

export type AuthenticatedRequest =
    FastifyRequest & {
        user: AuthenticatedUser;
    };

export async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const token =
        request.cookies[SESSION_COOKIE_NAME];

    if (!token) {
        reply.status(401).send({
            status: "error",
            code: "UNAUTHENTICATED",
            message:
                "Authentication required",
        });

        return;
    }

    const session =
        await findActiveSession(token);

    if (!session) {
        reply.status(401).send({
            status: "error",
            code: "UNAUTHENTICATED",
            message:
                "Session expired or invalid",
        });

        return;
    }

    const user =
        await findUserById(
            session.userId,
        );

    if (!user) {
        reply.status(401).send({
            status: "error",
            code: "UNAUTHENTICATED",
            message:
                "User account not found",
        });

        return;
    }

    (
        request as AuthenticatedRequest
    ).user = user;
}

export function assertAuthenticated(
    request: FastifyRequest,
): asserts request is AuthenticatedRequest {
    if (!request.user) {
        throw new Error(
            "Authenticated user is required.",
        );
    }
}