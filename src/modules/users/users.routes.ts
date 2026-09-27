import type { FastifyInstance } from "fastify";

import { requireAuth } from "../auth/require-auth";
import { searchUsersController, updateProfileController } from "./users.controller";

export async function usersRoutes(
    app: FastifyInstance,
) {
    app.get(
        "/search",
        {
            preHandler: requireAuth,
        },
        searchUsersController,
    );

    app.patch(
        "/me",
        {
            preHandler: requireAuth,
        },
        updateProfileController,
    );
}