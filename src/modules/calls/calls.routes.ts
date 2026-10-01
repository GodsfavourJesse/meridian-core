import type {
    FastifyInstance,
} from "fastify";

import {
    requireAuth,
} from "../auth/require-auth";

import {
    acceptCallController,
    cancelCallController,
    connectCallController,
    createCallController,
    declineCallController,
    endCallController,
    getCallController,
    getCallEventsController,
    listCallsController,
} from "./calls.controller";

export async function callRoutes(
    fastify: FastifyInstance,
) {
    fastify.post(
        "/calls",
        {
            preHandler: requireAuth,
        },
        createCallController,
    );

    fastify.get(
        "/calls",
        {
            preHandler: requireAuth,
        },
        listCallsController,
    );

    fastify.get(
        "/calls/:callId",
        {
            preHandler: requireAuth,
        },
        getCallController,
    );

    fastify.get(
        "/calls/:callId/events",
        {
            preHandler: requireAuth,
        },
        getCallEventsController,
    );

    fastify.post(
        "/calls/:callId/accept",
        {
            preHandler: requireAuth,
        },
        acceptCallController,
    );

    fastify.post(
        "/calls/:callId/decline",
        {
            preHandler: requireAuth,
        },
        declineCallController,
    );

    fastify.post(
        "/calls/:callId/cancel",
        {
            preHandler: requireAuth,
        },
        cancelCallController,
    );

    fastify.post(
        "/calls/:callId/connect",
        {
            preHandler: requireAuth,
        },
        connectCallController,
    );

    fastify.post(
        "/calls/:callId/end",
        {
            preHandler: requireAuth,
        },
        endCallController,
    );
}