import { eq, ilike, or } from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";
import { UpdateProfileInput } from "./users.types";

export async function findUserById(
    userId: string,
) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    return user ?? null;
}

export async function findUserByEmail(
    email: string,
) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
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

export async function updateUserProfile(
    userId: string,
    input: UpdateProfileInput,
) {
    const [user] = await db
        .update(users)
        .set({
            ...input,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

    return user ?? null;
}

export async function searchUsers(
    query: string,
) {
    const normalizedQuery =
        query
            .trim()
            .replace(/^@/, "");

    const normalizedNumber =
        normalizedQuery.replace(
            /\s+/g,
            "",
        );

    const results =
        await db
            .select({
                id: users.id,
                displayName:
                    users.displayName,
                username:
                    users.username,
                miyorNumber:
                    users.miyorNumber,
                profilePictureUrl:
                    users.profilePictureUrl,
                bio: users.bio,
            })
            .from(users)
            .where(
                or(
                    ilike(
                        users.username,
                        `%${normalizedQuery}%`,
                    ),

                    ilike(
                        users.displayName,
                        `%${normalizedQuery}%`,
                    ),

                    eq(
                        users.miyorNumber,
                        normalizedNumber,
                    ),
                ),
            )
            .limit(20);

    return results;
}