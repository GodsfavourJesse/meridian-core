import {
    createHash,
    randomBytes,
} from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "../../database";
import {
    emailVerificationTokens,
} from "../../database/schema";

const VERIFICATION_TOKEN_TTL_MS =
    1000 * 60 * 15;

function hashToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function createEmailVerificationTokenForUser(
    userId: string,
) {
    const rawToken =
        randomBytes(32).toString("hex");

    const tokenHash =
        hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
            VERIFICATION_TOKEN_TTL_MS,
    );

    await db
        .update(emailVerificationTokens)
        .set({
            usedAt: new Date(),
        })
        .where(
            eq(
                emailVerificationTokens.userId,
                userId,
            ),
        );

    await db
        .insert(emailVerificationTokens)
        .values({
            userId,
            tokenHash,
            expiresAt,
        });

    return rawToken;
}

export function hashVerificationToken(
    token: string,
) {
    return hashToken(token);
}