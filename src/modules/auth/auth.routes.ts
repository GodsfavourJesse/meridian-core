import type { FastifyInstance } from "fastify";

import {
    loginController,
    logoutController,
    meController,
    signupController,
} from "./auth.controller";

import { requireAuth } from "./require-auth";

export async function authRoutes(
    app: FastifyInstance,
) {
    app.post(
        "/signup",
        signupController,
    );

    app.post(
        "/login",
        loginController,
    );

    app.post(
        "/logout",
        logoutController,
    );

    app.get(
        "/me",
        {
            preHandler: requireAuth,
        },
        meController,
    );
}