import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "../database";
import { users } from "../database/schema";

import {
    registerUser,
} from "../modules/auth/auth.service";

import {
    generateMiyorNumber,
} from "../modules/users/miyor-number";

import {
    USER_STATUS,
} from "../modules/users/users.types";

const TEST_PASSWORD =
    "MiyorTest123!";

const DEFAULT_COUNT = 3;

const MAX_NUMBER_GENERATION_ATTEMPTS =
    20;

function parseCount() {
    const rawCount =
        process.argv[2];

    if (!rawCount) {
        return DEFAULT_COUNT;
    }

    const count =
        Number.parseInt(
            rawCount,
            10,
        );

    if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > 20
    ) {
        throw new Error(
            "Count must be an integer between 1 and 20.",
        );
    }

    return count;
}

function isUniqueViolation(
    error: unknown,
): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
    );
}

async function activateTestUser(
    userId: string,
) {
    for (
        let attempt = 0;
        attempt <
        MAX_NUMBER_GENERATION_ATTEMPTS;
        attempt++
    ) {
        const miyorNumber =
            generateMiyorNumber();

        try {
            const [verifiedUser] =
                await db
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
                    .returning({
                        id: users.id,
                        displayName:
                            users.displayName,
                        username:
                            users.username,
                        email:
                            users.email,
                        miyorNumber:
                            users.miyorNumber,
                    });

            if (!verifiedUser) {
                throw new Error(
                    "TEST_USER_ACTIVATION_FAILED",
                );
            }

            return verifiedUser;
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

    throw new Error(
        "MIYOR_NUMBER_GENERATION_FAILED",
    );
}

async function main() {
    if (
        process.env.NODE_ENV !==
        "development"
    ) {
        throw new Error(
            "Test users can only be created in development.",
        );
    }

    const count =
        parseCount();

    console.log(
        `Creating ${count} Miyor test user(s)...`,
    );

    console.log(
        `Password for all new test users: ${TEST_PASSWORD}`,
    );

    for (
        let index = 1;
        index <= count;
        index++
    ) {
        const displayName =
            `Miyor Test User ${index}`;

        const username =
            `miyor_test_${index}`;

        const email =
            `miyor.test.${index}@miyor.local`;

        const existing =
            await db
                .select({
                    id: users.id,
                    email: users.email,
                    username:
                        users.username,
                    miyorNumber:
                        users.miyorNumber,
                })
                .from(users)
                .where(
                    eq(
                        users.email,
                        email,
                    ),
                )
                .limit(1);

        if (existing[0]) {
            console.log(
                `⚠️  ${email} already exists.`,
            );

            console.log(
                `   Miyor number: ${
                    existing[0]
                        .miyorNumber ??
                    "missing"
                }`,
            );

            continue;
        }

        const user =
            await registerUser({
                displayName,
                username,
                email,
                password:
                    TEST_PASSWORD,
            });

        const verifiedUser =
            await activateTestUser(
                user.id,
            );

        console.log("");
        console.log(
            `✅ Created ${verifiedUser.displayName}`,
        );

        console.log(
            `   Username: ${verifiedUser.username}`,
        );

        console.log(
            `   Email: ${verifiedUser.email}`,
        );

        console.log(
            `   Password: ${TEST_PASSWORD}`,
        );

        console.log(
            `   Miyor number: ${verifiedUser.miyorNumber}`,
        );
    }

    console.log("");
    console.log(
        "✅ Test-user generation complete.",
    );
}

main()
    .catch((error) => {
        console.error(
            "❌ Failed to create test users:",
        );

        console.error(error);

        process.exit(1);
    });