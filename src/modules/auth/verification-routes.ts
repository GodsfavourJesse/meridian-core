import type { FastifyInstance } from "fastify";

import {
    eq,
} from "drizzle-orm";

import { db } from "../../database";
import { users } from "../../database/schema";
import {
    createEmailVerificationTokenForUser,
    verifyEmailToken,
} from "./email-verification";
import { sendVerificationEmail } from "./email";
import {
    normalizeEmail,
    resendVerificationSchema,
    verifyEmailSchema,
} from "./validation";
import { buildVerificationUrl } from "../../helpers/email.helpers";

export async function verificationRoutes(
    app: FastifyInstance,
) {
    app.post<{
        Body: {
            token?: string;
        };
    }>("/verify-email", async (request, reply) => {
        const parsed = verifyEmailSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send({
                status: "error",
                message: "Invalid verification token",
            });
        }

        const token = parsed.data.token;

        const result =
            await verifyEmailToken(token);

        if (!result) {
            return reply.status(400).send({
                status: "error",
                message:
                    "This verification link is invalid or has expired",
            });
        }

        return {
            status: "ok",
            message: "Email verified successfully",
        };
    });

    app.post<{
        Body: {
            email?: string;
        };
    }>("/resend-verification", async (
        request,
        reply,
    ) => {
        const parsed = resendVerificationSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send({
                status: "error",
                message: "Invalid email address",
            });
        }

        const email = normalizeEmail(parsed.data.email);

        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                emailVerifiedAt:
                    users.emailVerifiedAt,
                status: users.status,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        /*
         * Do not reveal whether an email belongs
         * to an account.
         */
        if (
            !user ||
            user.status !== "active" ||
            user.emailVerifiedAt
        ) {
            return {
                status: "ok",
                message:
                    "If the account requires verification, a new email will be sent",
            };
        }

        try {
            const {
                token,
            } =
                await createEmailVerificationTokenForUser(
                    user.id,
                );

            const verificationUrl = buildVerificationUrl(token);

            await sendVerificationEmail(
                user.email,
                verificationUrl,
            );
        } catch (error) {
            if (
                error instanceof Error &&
                error.message ===
                    "VERIFICATION_RESEND_COOLDOWN"
            ) {
                return reply.status(429).send({
                    status: "error",
                    message:
                        "Please wait before requesting another verification email",
                });
            }

            if (
                error instanceof Error &&
                error.message ===
                    "VERIFICATION_DAILY_LIMIT"
            ) {
                return reply.status(429).send({
                    status: "error",
                    message:
                        "Verification email limit reached. Please try again later",
                });
            }

            throw error;
        }

        return {
            status: "ok",
            message:
                "If the account requires verification, a new email will be sent",
        };
    });
}