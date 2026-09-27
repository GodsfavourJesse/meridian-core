import type { FastifyInstance } from "fastify";

import {
    verifyEmailAddress,
} from "./verification.service";

export async function verificationRoute(
    app: FastifyInstance,
) {
    app.get(
        "/verify-email",
        async (
            request,
            reply,
        ) => {
            const { token } =
                request.query as {
                    token?: string;
                };

            if (!token) {
                return reply
                    .status(400)
                    .send({
                        error:
                            "VERIFICATION_TOKEN_REQUIRED",
                    });
            }

            try {
                const user =
                    await verifyEmailAddress(
                        token,
                    );

                return reply.send({
                    message:
                        "EMAIL_VERIFIED",
                    user: {
                        id: user.id,
                        email: user.email,
                        miyorNumber:
                            user.miyorNumber,
                    },
                });
            } catch (error) {
                if (
                    error instanceof Error
                ) {
                    switch (
                        error.message
                    ) {
                        case "INVALID_VERIFICATION_TOKEN":
                            return reply
                                .status(400)
                                .send({
                                    error: error.message,
                                });

                        case "VERIFICATION_TOKEN_EXPIRED":
                            return reply
                                .status(400)
                                .send({
                                    error: error.message,
                                });

                        case "EMAIL_ALREADY_VERIFIED":
                            return reply
                                .status(409)
                                .send({
                                    error: error.message,
                                });

                        case "USER_NOT_FOUND":
                            return reply
                                .status(404)
                                .send({
                                    error: error.message,
                                });

                        default:
                            app.log.error(
                                error,
                            );

                            return reply
                                .status(500)
                                .send({
                                    error:
                                        "INTERNAL_SERVER_ERROR",
                                });
                    }
                }

                app.log.error(error);

                return reply
                    .status(500)
                    .send({
                        error:
                            "INTERNAL_SERVER_ERROR",
                    });
            }
        },
    );
}