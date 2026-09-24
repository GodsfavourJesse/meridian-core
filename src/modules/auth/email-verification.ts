import { createHash, randomBytes } from "node:crypto";

import {
    and,
    eq,
    gt,
    isNull,
    sql,
} from "drizzle-orm";

import { env } from "../../config/env";
import { db } from "../../database";
import {
    emailVerificationTokens,
    users,
} from "../../database/schema";

const VERIFICATION_TOKEN_DURATION_MS =
    1000 * 60 * 30; // 30 minutes

const RESEND_COOLDOWN_MS =
    1000 * 60; // 1 minute

const MAX_RESENDS_PER_DAY = 5;

export function createEmailVerificationToken() {
    return randomBytes(32).toString("hex");
}

export function hashEmailVerificationToken(token: string) {
    return createHash("sha256")
        .update(`${env.SESSION_SECRET}:${token}`)
        .digest("hex");
}

export function getEmailVerificationExpiration() {
    return new Date(
        Date.now() + VERIFICATION_TOKEN_DURATION_MS,
    );
}

export async function createEmailVerificationTokenForUser(
    userId: string,
) {
    const recentToken = await db
        .select({
            createdAt: emailVerificationTokens.createdAt,
        })
        .from(emailVerificationTokens)
        .where(
            and(
                eq(emailVerificationTokens.userId, userId),
                gt(
                    emailVerificationTokens.createdAt,
                    new Date(Date.now() - RESEND_COOLDOWN_MS),
                ),
            ),
        )
        .orderBy(sql`${emailVerificationTokens.createdAt} DESC`)
        .limit(1);

    if (recentToken[0]) {
        throw new Error("VERIFICATION_RESEND_COOLDOWN");
    }

    const dayAgo = new Date(
        Date.now() - 1000 * 60 * 60 * 24,
    );

    const resendCount = await db
        .select({
            count: sql<number>`count(*)`,
        })
        .from(emailVerificationTokens)
        .where(
            and(
                eq(emailVerificationTokens.userId, userId),
                gt(
                    emailVerificationTokens.createdAt,
                    dayAgo,
                ),
            ),
        );

    if (
        Number(resendCount[0]?.count ?? 0) >=
        MAX_RESENDS_PER_DAY
    ) {
        throw new Error("VERIFICATION_DAILY_LIMIT");
    }

    const token = createEmailVerificationToken();

    const tokenHash = hashEmailVerificationToken(token);

    const expiresAt =
        getEmailVerificationExpiration();

    await db
        .insert(emailVerificationTokens)
        .values({
            userId,
            tokenHash,
            expiresAt,
        });

    return {
        token,
        expiresAt,
    };
}

export async function verifyEmailToken(token: string) {
    const tokenHash =
        hashEmailVerificationToken(token);

    const now = new Date();

    return db.transaction(async (tx) => {
        const [verificationToken] =
            await tx
                .select({
                    id: emailVerificationTokens.id,
                    userId: emailVerificationTokens.userId,
                })
                .from(emailVerificationTokens)
                .where(
                    and(
                        eq(
                            emailVerificationTokens.tokenHash,
                            tokenHash,
                        ),
                        isNull(
                            emailVerificationTokens.usedAt,
                        ),
                        gt(
                            emailVerificationTokens.expiresAt,
                            now,
                        ),
                    ),
                )
                .limit(1);

        if (!verificationToken) {
            return null;
        }

        const [consumedToken] = await tx
            .update(emailVerificationTokens)
            .set({
                usedAt: now,
            })
            .where(
                and(
                    eq(
                        emailVerificationTokens.id,
                        verificationToken.id,
                    ),
                    isNull(
                        emailVerificationTokens.usedAt,
                    ),
                ),
            )
            .returning({
                id: emailVerificationTokens.id,
                userId: emailVerificationTokens.userId,
            });

        if (!consumedToken) {
            return null;
        }

        await tx
            .update(users)
            .set({
                emailVerifiedAt: now,
                updatedAt: now,
            })
            .where(eq(users.id, verificationToken.userId));

        return {
            userId: verificationToken.userId,
        };
    });
}