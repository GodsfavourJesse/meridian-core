import type { FastifyInstance } from "fastify";

import {
    createDirectConversationController,
    getConversationController,
    listConversationsController,
    listMessagesController,
    markConversationReadController,
    sendMessageController,
} from "./conversations.controller";

import { requireAuth } from "../auth/require-auth";
import { registerConversationWebSocket } from "./conversations.websocket";


export async function conversationRoutes(
    app: FastifyInstance,
) {
    registerConversationWebSocket(app);

    app.post(
        "/",
        {
            preHandler: requireAuth,
        },
        createDirectConversationController,
    );

    app.get(
        "/",
        {
            preHandler: requireAuth,
        },
        listConversationsController,
    );

    app.get(
        "/:conversationId",
        {
            preHandler: requireAuth,
        },
        getConversationController,
    );

    app.get(
        "/:conversationId/messages",
        {
            preHandler: requireAuth,
        },
        listMessagesController,
    );

    app.post(
        "/:conversationId/messages",
        {
            preHandler: requireAuth,
        },
        sendMessageController,
    );

    app.post(
        "/:conversationId/read",
        {
            preHandler: requireAuth,
        },
        markConversationReadController,
    );
}