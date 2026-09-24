import { eq } from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";
import type { UpdateMeInput } from "./me.validation";

export async function getMe(userId: string) {
    const [user] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerifiedAt: users.emailVerifiedAt,
            status: users.status,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    return user ?? null;
}

export async function updateMe(
    userId: string,
    input: UpdateMeInput,
) {
    const [user] = await db
        .update(users)
        .set({
            name: input.name,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerifiedAt: users.emailVerifiedAt,
            status: users.status,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        });

    return user ?? null;
}