import { eq } from "drizzle-orm";
import { db } from "../../database";
import { users } from "../../database/schema";
import { generateMiyorNumber } from "./miyor-number";
import {
    findUserById,
    findUserByUsername,
    searchUsers,
    updateUserProfile,
} from "./users.repository";
import {
    MAX_GENERATION_ATTEMPTS,
    UpdateProfileInput,
} from "./users.types";

export async function getUserById(
    userId: string,
) {
    return findUserById(userId);
}

export async function getUserByUsername(
    username: string,
) {
    return findUserByUsername(
        username.toLowerCase(),
    );
}

export async function assignMiyorNumber(
    userId: string,
) {
    for (
        let attempt = 0;
        attempt < MAX_GENERATION_ATTEMPTS;
        attempt++
    ) {
        const miyorNumber = generateMiyorNumber();

        const [existing] = await db
            .select({
                id: users.id,
            })
            .from(users)
            .where(
                eq(
                    users.miyorNumber,
                    miyorNumber,
                ),
            )
            .limit(1);

        if (existing) {
            continue;
        }

        const [updated] = await db
            .update(users)
            .set({
                miyorNumber,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        if (updated) {
            return updated;
        }
    }

    throw new Error(
        "MIYOR_NUMBER_GENERATION_FAILED",
    );
}

export async function updateProfile(
    userId: string,
    input: UpdateProfileInput,
) {
    const user = await findUserById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const updatedUser = await updateUserProfile(
        userId,
        input,
    );

    if (!updatedUser) {
        throw new Error("USER_NOT_FOUND");
    }

    return updatedUser;
}

export async function searchUsersService(
    query: string,
) {
    return searchUsers(query);
}