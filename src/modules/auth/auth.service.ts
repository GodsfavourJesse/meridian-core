import { eq } from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";

import {
    deleteUserById,
    findUserByEmail,
    findUserByUsername,
} from "./auth.repository";

import {
    hashPassword,
    verifyPassword,
} from "./password";

import {
    USER_STATUS,
} from "../users/users.types";

export async function registerUser(input: {
    displayName: string;
    username: string;
    email: string;
    password: string;
}) {
    const existingEmail =
        await findUserByEmail(
            input.email,
        );

    if (existingEmail) {
        throw new Error(
            "EMAIL_ALREADY_EXISTS",
        );
    }

    const existingUsername =
        await findUserByUsername(
            input.username,
        );

    if (existingUsername) {
        throw new Error(
            "USERNAME_ALREADY_EXISTS",
        );
    }

    const passwordHash =
        await hashPassword(
            input.password,
        );

    const [user] =
        await db
            .insert(users)
            .values({
                displayName:
                    input.displayName,

                username:
                    input.username,

                email:
                    input.email,

                passwordHash,

                status:
                    USER_STATUS.PENDING_VERIFICATION,
            })
            .returning();

    if (!user) {
        throw new Error(
            "USER_CREATION_FAILED",
        );
    }

    return user;
}

export async function authenticateUser(
    email: string,
    password: string,
) {
    const user =
        await findUserByEmail(
            email,
        );

    if (!user) {
        throw new Error(
            "INVALID_CREDENTIALS",
        );
    }

    const valid =
        await verifyPassword(
            user.passwordHash,
            password,
        );

    if (!valid) {
        throw new Error(
            "INVALID_CREDENTIALS",
        );
    }

    if (
        user.status ===
        USER_STATUS.PENDING_VERIFICATION
    ) {
        throw new Error(
            "EMAIL_NOT_VERIFIED",
        );
    }

    if (
        user.status ===
        USER_STATUS.SUSPENDED
    ) {
        throw new Error(
            "ACCOUNT_SUSPENDED",
        );
    }

    return user;
}

export async function activateVerifiedUser(
    userId: string,
) {
    const [user] =
        await db
            .update(users)
            .set({
                emailVerifiedAt:
                    new Date(),

                status:
                    USER_STATUS.ACTIVE,

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    users.id,
                    userId,
                ),
            )
            .returning();

    return user ?? null;
}

export async function deleteUnverifiedUser(
    userId: string,
) {
    await deleteUserById(userId);
}