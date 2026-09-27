import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    createEmailVerificationTokenForUser,
} from "./email-verification";

import {
    sendVerificationEmail,
} from "./email.service";

import {
    requireAuth,
    type AuthenticatedRequest,
} from "./require-auth";

import {
    createSession,
    revokeSession,
    SESSION_COOKIE_NAME,
    setSessionCookie,
    clearSessionCookie,
} from "./sessions";

import {
    normalizeEmail,
    signupSchema,
    loginSchema,
} from "./auth.validation";

import {
    buildVerificationUrl,
} from "../../helpers/email.helpers";

import {
    registerUser,
    authenticateUser,
    deleteUnverifiedUser,
} from "./auth.service";

function validationError(error: {
    issues: Array<{
        path: PropertyKey[];
        message: string;
    }>;
}) {
    return {
        status: "error",
        message: "Invalid request",
        errors: error.issues.map(
            (issue) => ({
                field:
                    issue.path.join("."),
                message: issue.message,
            }),
        ),
    };
}

function serializeUser(user: {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    email: string;
    profilePictureUrl:
        string | null;
    bio: string | null;
    emailVerifiedAt:
        Date | null;
    status: string;
    createdAt: Date;
}) {
    return {
        id: user.id,
        displayName:
            user.displayName,
        username:
            user.username,
        miyorNumber:
            user.miyorNumber,
        email: user.email,
        profilePictureUrl:
            user.profilePictureUrl,
        bio: user.bio,
        emailVerifiedAt:
            user.emailVerifiedAt,
        status: user.status,
        createdAt:
            user.createdAt,
    };
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

export async function signupController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const parsed =
        signupSchema.safeParse(
            request.body,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send(
                validationError(
                    parsed.error,
                ),
            );
    }

    const email =
        normalizeEmail(
            parsed.data.email,
        );

    let user:
        | Awaited<
              ReturnType<
                  typeof registerUser
              >
          >
        | null = null;

    try {
        user =
            await registerUser({
                displayName:
                    parsed.data
                        .displayName,

                username:
                    parsed.data.username,

                email,

                password:
                    parsed.data.password,
            });

        const token =
            await createEmailVerificationTokenForUser(
                user.id,
            );

        const verificationUrl =
            buildVerificationUrl(
                token,
            );

        await sendVerificationEmail(
            user.email,
            verificationUrl,
        );

        return reply
            .status(201)
            .send({
                status: "ok",
                message:
                    "Account created. Please check your email to verify your account.",
                email: user.email,
            });
    } catch (error) {
        if (
            error instanceof Error
        ) {
            if (
                error.message ===
                "EMAIL_ALREADY_EXISTS"
            ) {
                return reply
                    .status(409)
                    .send({
                        status:
                            "error",
                        code:
                            "EMAIL_ALREADY_EXISTS",
                        message:
                            "An account with this email already exists",
                    });
            }

            if (
                error.message ===
                "USERNAME_ALREADY_EXISTS"
            ) {
                return reply
                    .status(409)
                    .send({
                        status:
                            "error",
                        code:
                            "USERNAME_ALREADY_EXISTS",
                        message:
                            "That username is already taken",
                    });
            }

            if (
                error.message.startsWith(
                    "RESEND_EMAIL_FAILED:",
                )
            ) {
                if (user) {
                    try {
                        await deleteUnverifiedUser(
                            user.id,
                        );
                    } catch (
                        cleanupError
                    ) {
                        request.log.error(
                            cleanupError,
                            "Failed to clean up user after email delivery failure",
                        );
                    }
                }

                request.log.error(
                    error,
                    "Verification email delivery failed",
                );

                return reply
                    .status(503)
                    .send({
                        status:
                            "error",
                        code:
                            "EMAIL_DELIVERY_FAILED",
                        message:
                            "We could not send your verification email. Please try again.",
                    });
            }
        }

        if (
            isUniqueViolation(
                error,
            )
        ) {
            return reply
                .status(409)
                .send({
                    status: "error",
                    code:
                        "ACCOUNT_ALREADY_EXISTS",
                    message:
                        "The email or username is already in use",
                });
        }

        throw error;
    }
}

export async function loginController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const parsed =
        loginSchema.safeParse(
            request.body,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send(
                validationError(
                    parsed.error,
                ),
            );
    }

    const email =
        normalizeEmail(
            parsed.data.email,
        );

    try {
        const user =
            await authenticateUser(
                email,
                parsed.data.password,
            );

        const session =
            await createSession(
                user.id,
            );

        setSessionCookie(
            reply,
            session.token,
        );

        return reply.send({
            status: "ok",
            user: serializeUser(
                user,
            ),
        });
    } catch (error) {
        if (
            error instanceof Error
        ) {
            switch (
                error.message
            ) {
                case "INVALID_CREDENTIALS":
                    return reply
                        .status(401)
                        .send({
                            status:
                                "error",
                            code:
                                "INVALID_CREDENTIALS",
                            message:
                                "Invalid email or password",
                        });

                case "EMAIL_NOT_VERIFIED":
                    return reply
                        .status(403)
                        .send({
                            status:
                                "error",
                            code:
                                "EMAIL_NOT_VERIFIED",
                            message:
                                "Please verify your email before signing in",
                        });

                case "ACCOUNT_SUSPENDED":
                    return reply
                        .status(403)
                        .send({
                            status:
                                "error",
                            code:
                                "ACCOUNT_SUSPENDED",
                            message:
                                "This account has been suspended",
                        });
            }
        }

        throw error;
    }
}

export async function logoutController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const token =
        request.cookies[
            SESSION_COOKIE_NAME
        ];

    if (token) {
        await revokeSession(token);
    }

    clearSessionCookie(reply);

    return reply.send({
        status: "ok",
    });
}

export async function meController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const user =
        (
            request as AuthenticatedRequest
        ).user;

    return reply.send({
        status: "ok",
        user: serializeUser(user),
    });
}