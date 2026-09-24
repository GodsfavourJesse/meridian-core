import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import { eq } from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";
import {
    clearSessionCookie,
    getSession,
    revokeAllUserSessions,
} from "./sessions";

declare module "fastify" {
    interface FastifyRequest {
        user: {
            id: string;
            name: string;
            email: string;
            emailVerifiedAt: Date | null;
            status: string;
            createdAt: Date;
        } | null;
    }
}

export async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const token =
        request.cookies.miyor_session;

    if (!token) {
        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    const session = await getSession(token);

    if (!session) {
        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    const [user] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerifiedAt:
                users.emailVerifiedAt,
            status: users.status,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    if (!user) {
        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    if (user.status !== "active") {
        return reply.status(403).send({
            status: "error",
            message: "Account is not active",
        });
    }

    request.user = user;
}

export async function requireVerifiedAuth(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    await requireAuth(request, reply);

    if (reply.sent) {
        return;
    }

    const user = request.user;

    if (!user) {
        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    if (!user.emailVerifiedAt) {
        await revokeAllUserSessions(user.id);
        clearSessionCookie(reply);

        return reply.status(403).send({
            status: "error",
            code: "EMAIL_NOT_VERIFIED",
            message: "Email verification required",
        });
    }
}