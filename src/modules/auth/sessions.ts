import { createHash, randomBytes } from "node:crypto";

import type { FastifyReply } from "fastify";

import {
    and,
    eq,
    gt,
    isNull,
} from "drizzle-orm";

import { db } from "../../database";
import { sessions } from "../../database/schema";

import { env } from "../../config/env";

export const SESSION_COOKIE_NAME =
    "miyor_session";

export const SESSION_MAX_AGE_SECONDS =
    60 * 60 * 24 * 30;

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure:
        env.NODE_ENV ===
        "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge:
        SESSION_MAX_AGE_SECONDS,
};

export function hashSessionToken(
    token: string,
): string {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function createSession(
    userId: string,
) {
    const token =
        randomBytes(32).toString(
            "hex",
        );

    const tokenHash =
        hashSessionToken(token);

    const expiresAt =
        new Date(
            Date.now() +
                SESSION_MAX_AGE_SECONDS *
                    1000,
        );

    const [session] =
        await db
            .insert(sessions)
            .values({
                userId,
                tokenHash,
                expiresAt,
            })
            .returning({
                id: sessions.id,
                expiresAt:
                    sessions.expiresAt,
            });

    if (!session) {
        throw new Error(
            "SESSION_CREATION_FAILED",
        );
    }

    return {
        token,
        session,
    };
}

export async function findActiveSession(
    token: string,
) {
    const tokenHash =
        hashSessionToken(token);

    const [session] =
        await db
            .select()
            .from(sessions)
            .where(
                and(
                    eq(
                        sessions.tokenHash,
                        tokenHash,
                    ),
                    isNull(
                        sessions.revokedAt,
                    ),
                    gt(
                        sessions.expiresAt,
                        new Date(),
                    ),
                ),
            )
            .limit(1);

    return session ?? null;
}

export async function revokeSession(
    token: string,
) {
    const tokenHash =
        hashSessionToken(token);

    await db
        .update(sessions)
        .set({
            revokedAt: new Date(),
        })
        .where(
            eq(
                sessions.tokenHash,
                tokenHash,
            ),
        );
}

export function setSessionCookie(
    reply: FastifyReply,
    token: string,
) {
    reply.setCookie(
        SESSION_COOKIE_NAME,
        token,
        SESSION_COOKIE_OPTIONS,
    );
}

export function clearSessionCookie(
    reply: FastifyReply,
) {
    reply.clearCookie(
        SESSION_COOKIE_NAME,
        SESSION_COOKIE_OPTIONS,
    );
}