import { eq } from "drizzle-orm";

import { db } from "../../database";

import {
    emailVerificationTokens,
    users,
} from "../../database/schema";

import {
    generateMiyorNumber,
} from "../users/miyor-number";

import {
    USER_STATUS,
} from "../users/users.types";

import {
    findVerificationToken,
} from "./auth.repository";

import {
    hashVerificationToken,
} from "./email-verification";

const MAX_NUMBER_GENERATION_ATTEMPTS = 20;

export async function verifyEmailAddress(
    rawToken: string,
) {
    const tokenHash =
        hashVerificationToken(rawToken);

    const verificationToken =
        await findVerificationToken(
            tokenHash,
        );

    if (!verificationToken) {
        throw new Error(
            "INVALID_VERIFICATION_TOKEN",
        );
    }

    if (
        verificationToken.expiresAt.getTime() <=
        Date.now()
    ) {
        throw new Error(
            "VERIFICATION_TOKEN_EXPIRED",
        );
    }

    const userId =
        verificationToken.userId;

    return db.transaction(
        async (tx) => {
            const [user] = await tx
                .select()
                .from(users)
                .where(
                    eq(users.id, userId),
                )
                .limit(1);

            if (!user) {
                throw new Error(
                    "USER_NOT_FOUND",
                );
            }

            if (
                user.emailVerifiedAt
            ) {
                throw new Error(
                    "EMAIL_ALREADY_VERIFIED",
                );
            }

            let verifiedUser = null;

            for (
                let attempt = 0;
                attempt <
                MAX_NUMBER_GENERATION_ATTEMPTS;
                attempt++
            ) {
                const miyorNumber =
                    generateMiyorNumber();

                try {
                    const [updatedUser] =
                        await tx
                            .update(users)
                            .set({
                                miyorNumber,
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

                    verifiedUser =
                        updatedUser;

                    break;
                } catch (error) {
                    if (
                        isUniqueViolation(
                            error,
                        )
                    ) {
                        continue;
                    }

                    throw error;
                }
            }

            if (!verifiedUser) {
                throw new Error(
                    "MIYOR_NUMBER_GENERATION_FAILED",
                );
            }

            await tx
                .update(
                    emailVerificationTokens,
                )
                .set({
                    usedAt:
                        new Date(),
                })
                .where(
                    eq(
                        emailVerificationTokens.id,
                        verificationToken.id,
                    ),
                );

            return verifiedUser;
        },
    );
}

function isUniqueViolation(
    error: unknown,
): boolean {
    if (
        typeof error !== "object" ||
        error === null
    ) {
        return false;
    }

    return (
        "code" in error &&
        error.code === "23505"
    );
}