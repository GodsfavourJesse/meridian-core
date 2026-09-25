import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";


import { createEmailVerificationTokenForUser } from "./email-verification";
import { sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import {
    clearSessionCookie,
    createSession,
    revokeSession,
    SESSION_COOKIE_NAME,
    setSessionCookie,
} from "./sessions";
import {
    loginSchema,
    normalizeEmail,
    signupSchema,
} from "./validation";
import { db } from "../../database";
import { users } from "../../database/schema";
import { buildVerificationUrl } from "../../helpers/email.helpers";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;


function validationError(error: {
    issues: Array<{
        path: PropertyKey[];
        message: string;
    }>;
}) {
    return {
        status: "error",
        message: "Invalid request",
        errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        })),
    };
}


export async function authRoutes(app: FastifyInstance) {
    app.post("/signup", async (request, reply) => {
        const parsed = signupSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send(
                validationError(parsed.error),
            );
        }

        const name = parsed.data.name.trim();
        const email = normalizeEmail(parsed.data.email);
        const passwordHash = await hashPassword(parsed.data.password);

        try {
            const [user] = await db
                .insert(users)
                .values({
                    name,
                    email,
                    passwordHash,
                })
                .returning({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    emailVerifiedAt: users.emailVerifiedAt,
                    status: users.status,
                    createdAt: users.createdAt,
                });

            if (!user) {
                throw new Error("Failed to create user");
            }

            const { token } = await createEmailVerificationTokenForUser(user.id);

            const verificationUrl = buildVerificationUrl(token);

            await sendVerificationEmail(
                user.email,
                verificationUrl,
            );

            return reply.status(201).send({
                status: "ok",
                message:
                    "Account created. Please check your email to verify your account.",
                email: user.email,
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "23505"
            ) {
                return reply.status(409).send({
                    status: "error",
                    message: "Email is already in use",
                });
            }

            throw error;
        }
    });

    app.post("/login", async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send(
                validationError(parsed.error),
            );
        }

        const email = normalizeEmail(parsed.data.email);

        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                passwordHash: users.passwordHash,
                emailVerifiedAt: users.emailVerifiedAt,
                status: users.status,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            return reply.status(401).send({
                status: "error",
                message: "Invalid email or password",
            });
        }

        const passwordValid = await verifyPassword(
            user.passwordHash,
            parsed.data.password,
        );

        if (!passwordValid) {
            return reply.status(401).send({
                status: "error",
                message: "Invalid email or password",
            });
        }

        if (user.status !== "active") {
            return reply.status(403).send({
                status: "error",
                message: "Account is not active",
            });
        }

        if (!user.emailVerifiedAt) {
            return reply.status(403).send({
                status: "error",
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email before signing in",
            });
        }

        const session = await createSession(user.id);

        setSessionCookie(reply, session.token);

        return {
            status: "ok",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt,
                status: user.status,
                createdAt: user.createdAt,
            },
        };
    });

    app.post("/logout", async (request, reply) => {
        const token = request.cookies[SESSION_COOKIE_NAME];

        if (token) {
            await revokeSession(token);
        }

        clearSessionCookie(reply); 

        return reply.send({
            status: "ok",
        });
    });
}
