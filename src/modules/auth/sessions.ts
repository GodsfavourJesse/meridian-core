import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { env } from "../../config/env";
import type { FastifyReply } from "fastify";
import { db } from "../../database";
import { sessions } from "../../database/schema";


export const SESSION_COOKIE_NAME = "miyor_session";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function setSessionCookie(reply: FastifyReply, token: string) {
    reply.setCookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
    });
}

export function clearSessionCookie(reply: FastifyReply) {
    reply.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    });
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export function createSessionToken() {
    return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
    return createHash("sha256")
        .update(`${env.SESSION_SECRET}:${token}`)
        .digest("hex");
}

export function getSessionExpiration() {
    return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function createSession(userId: string) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = getSessionExpiration();

    const [session] = await db
        .insert(sessions)
        .values({
            userId,
            tokenHash,
            expiresAt,
        })
        .returning({
            id: sessions.id,
            userId: sessions.userId,
            expiresAt: sessions.expiresAt,
        });

    if (!session) {
        throw new Error("Failed to create session");
    }

    return {
        token,
        ...session,
    };
}

export async function getSession(token: string) {
    const tokenHash = hashSessionToken(token);

    const [session] = await db
        .select({
            id: sessions.id,
            userId: sessions.userId,
            expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(
            and(
                eq(sessions.tokenHash, tokenHash),
                isNull(sessions.revokedAt),
                gt(sessions.expiresAt, new Date()),
            ),
        )
        .limit(1);

    return session ?? null;
}

export async function revokeSession(token: string) {
    const tokenHash = hashSessionToken(token);

    await db
        .update(sessions)
        .set({
            revokedAt: new Date(),
        })
        .where(eq(sessions.tokenHash, tokenHash));
}

export async function revokeAllUserSessions(userId: string) {
    await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
            and(
                eq(sessions.userId, userId),
                isNull(sessions.revokedAt),
            ),
        );
}
