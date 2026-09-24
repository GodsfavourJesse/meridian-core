import type { FastifyInstance } from "fastify";

import { requireAuth } from "../auth/require-auth";
import { getMe, updateMe } from "./me.service";
import { updateMeSchema } from "./me.validation";

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

export async function meRoutes(app: FastifyInstance) {
    app.get(
        "/me",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const user = await getMe(request.user!.id);

            if (!user) {
                return reply.status(404).send({
                    status: "error",
                    message: "User not found",
                });
            }

            return {
                status: "ok" as const,
                user,
            };
        },
    );

    app.patch(
        "/me",
        {
            preHandler: requireAuth,
        },
        async (request, reply) => {
            const parsed = updateMeSchema.safeParse(request.body);

            if (!parsed.success) {
                return reply
                    .status(400)
                    .send(validationError(parsed.error));
            }

            const user = await updateMe(
                request.user!.id,
                parsed.data,
            );

            if (!user) {
                return reply.status(404).send({
                    status: "error",
                    message: "User not found",
                });
            }

            return {
                status: "ok" as const,
                user,
            };
        },
    );
}