import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import { env } from "../config/env";

const STATE_CHANGING_METHODS =
    new Set([
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ]);

export async function requireTrustedOrigin(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (
        !STATE_CHANGING_METHODS.has(
            request.method,
        )
    ) {
        return;
    }

    const origin =
        request.headers.origin;

    if (!origin) {
        return reply.status(403).send({
            status: "error",
            message:
                "Request origin could not be verified",
        });
    }

    if (origin !== env.APP_URL) {
        request.log.warn(
            {
                origin,
                expectedOrigin:
                    env.APP_URL,
            },
            "Rejected request from untrusted origin",
        );

        return reply.status(403).send({
            status: "error",
            message: "Untrusted request origin",
        });
    }
}