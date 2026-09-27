import {
    and,
    eq,
    isNull,
} from "drizzle-orm";

import { db } from "../../database";

import {
    emailVerificationTokens,
    users,
} from "../../database/schema";

export async function findUserById(
    userId: string,
) {
    const [user] = await db
        .select()
        .from(users)
        .where(
            eq(users.id, userId),
        )
        .limit(1);

    return user ?? null;
}

export async function findUserByEmail(
    email: string,
) {
    const [user] = await db
        .select()
        .from(users)
        .where(
            eq(users.email, email),
        )
        .limit(1);

    return user ?? null;
}

export async function findUserByUsername(
    username: string,
) {
    const [user] = await db
        .select()
        .from(users)
        .where(
            eq(users.username, username),
        )
        .limit(1);

    return user ?? null;
}

export async function findVerificationToken(
    tokenHash: string,
) {
    const [token] = await db
        .select()
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
            ),
        )
        .limit(1);

    return token ?? null;
}

export async function deleteUserById(
    userId: string,
) {
    await db
        .delete(users)
        .where(
            eq(users.id, userId),
        );
}