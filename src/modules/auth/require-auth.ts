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
    SESSION_COOKIE_NAME,
} from "./sessions";


export async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    request.user = null;

    const token = request.cookies[SESSION_COOKIE_NAME];

    if (!token) {
        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    const session =
        await getSession(token);

    if (!session) {
        clearSessionCookie(reply);

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
        .where(
            eq(
                users.id,
                session.userId,
            ),
        )
        .limit(1);

    if (!user) {
        await revokeAllUserSessions(
            session.userId,
        );

        clearSessionCookie(reply);

        return reply.status(401).send({
            status: "error",
            message: "Authentication required",
        });
    }

    if (user.status !== "active") {
        clearSessionCookie(reply);

        return reply.status(403).send({
            status: "error",
            message: "Account is not active",
        });
    }

    request.user = user;
}