import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    createDirectConversationSchema,
    listMessagesQuerySchema,
    sendMessageSchema,
} from "./conversations.validation";

import {
    createOrGetDirectConversation,
    getConversation,
    getConversationMessages,
    getUserConversations,
    markConversationAsRead,
    sendMessage,
} from "./conversations.service";
import { broadcastConversationEvent } from "../../realtime/realtime.conversations";

function handleConversationError(
    error: unknown,
    reply: FastifyReply,
) {
    if (!(error instanceof Error)) {
        return reply.status(500).send({
            status: "error",
            message: "Something went wrong.",
        });
    }

    const statusMap: Record<string, number> = {
        CANNOT_CONVERSE_WITH_SELF: 400,
        USER_NOT_FOUND: 404,
        USER_NOT_AVAILABLE: 400,
        CONTACT_NOT_ACCEPTED: 403,
        CONVERSATION_NOT_FOUND: 404,
        CONVERSATION_ACCESS_DENIED: 403,
        CONVERSATION_CREATION_FAILED: 500,
        MESSAGE_CREATION_FAILED: 500,
    };

    const status =
        statusMap[error.message] ?? 500;

    const messages: Record<string, string> = {
        CANNOT_CONVERSE_WITH_SELF:
            "You cannot start a conversation with yourself.",

        USER_NOT_FOUND:
            "User not found.",

        USER_NOT_AVAILABLE:
            "This user is not available.",

        CONTACT_NOT_ACCEPTED:
            "You can only message an accepted contact.",

        CONVERSATION_NOT_FOUND:
            "Conversation not found.",

        CONVERSATION_ACCESS_DENIED:
            "You do not have access to this conversation.",

        CONVERSATION_CREATION_FAILED:
            "Unable to create conversation.",

        MESSAGE_CREATION_FAILED:
            "Unable to send message.",
    };

    return reply.status(status).send({
        status: "error",
        message:
            messages[error.message] ??
            "Something went wrong.",
        code: error.message,
    });
}

export async function createDirectConversationController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    const parsed =
        createDirectConversationSchema.safeParse(
            request.body,
        );

    if (!parsed.success) {
        return reply.status(400).send({
            status: "error",
            message: "Invalid request.",
            errors:
                parsed.error.flatten()
                    .fieldErrors,
        });
    }

    try {
        const conversation =
            await createOrGetDirectConversation(
                request.user.id,
                parsed.data.userId,
            );

        return reply.status(201).send({
            status: "ok",
            conversation,
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}

export async function listConversationsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    try {
        const conversations =
            await getUserConversations(
                request.user.id,
            );

        return reply.send({
            status: "ok",
            conversations,
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}

export async function getConversationController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    const params =
        request.params as {
            conversationId: string;
        };

    try {
        const conversation =
            await getConversation(
                params.conversationId,
                request.user.id,
            );

        return reply.send({
            status: "ok",
            conversation,
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}

export async function listMessagesController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    const params =
        request.params as {
            conversationId: string;
        };

    const parsed =
        listMessagesQuerySchema.safeParse(
            request.query,
        );

    if (!parsed.success) {
        return reply.status(400).send({
            status: "error",
            message:
                "Invalid query parameters.",
            errors:
                parsed.error.flatten()
                    .fieldErrors,
        });
    }

    try {
        const messages =
            await getConversationMessages(
                params.conversationId,
                request.user.id,
                parsed.data.limit,
                parsed.data.before
                    ? new Date(
                          parsed.data.before,
                      )
                    : undefined,
            );

        return reply.send({
            status: "ok",
            messages,
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}

export async function sendMessageController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    const params =
        request.params as {
            conversationId: string;
        };

    const parsed =
        sendMessageSchema.safeParse(
            request.body,
        );

    if (!parsed.success) {
        return reply.status(400).send({
            status: "error",
            message: "Invalid message.",
            errors:
                parsed.error.flatten()
                    .fieldErrors,
        });
    }

    try {
        const message =
            await sendMessage(
                params.conversationId,
                request.user.id,
                parsed.data.body,
            );

        const deliveredCount =
            broadcastConversationEvent(
                params.conversationId,
                {
                    type: "MESSAGE_NEW",
                    message,
                },
                request.user.id,
            );

        request.log.info(
            {
                conversationId:
                    params.conversationId,
                messageId: message.id,
                senderId:
                    request.user.id,
                deliveredCount,
            },
            "Message created and realtime event broadcast",
        );

        return reply.status(201).send({
            status: "ok",
            message,
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}


export async function markConversationReadController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply.status(401).send({
            status: "error",
            message: "Unauthorized.",
        });
    }

    const params =
        request.params as {
            conversationId: string;
        };

    try {
        const readMessages =
            await markConversationAsRead(
                params.conversationId,
                request.user.id,
            );

        /*
         * Only broadcast when PostgreSQL actually
         * changed one or more messages.
         */
        const firstReadMessage =
            readMessages[0];

        if (firstReadMessage) {
            const readAt =
                firstReadMessage.readAt;

            if (readAt) {
                const messageIds =
                    readMessages.map(
                        (message) =>
                            message.id,
                    );

                const deliveredCount =
                    broadcastConversationEvent(
                        params.conversationId,
                        {
                            type: "MESSAGE_READ",
                            conversationId:
                                params.conversationId,
                            readerId:
                                request.user.id,
                            messageIds,
                            readAt:
                                readAt.toISOString(),
                        },
                        request.user.id,
                    );

                request.log.info(
                    {
                        conversationId:
                            params.conversationId,
                        readerId:
                            request.user.id,
                        messageIds,
                        deliveredCount,
                    },
                    "Conversation messages marked as read and realtime event broadcast",
                );
            }
        }

        return reply.status(200).send({
            status: "ok",
            readMessages:
                readMessages.map(
                    (message) => ({
                        id: message.id,
                        readAt:
                            message.readAt?.toISOString() ??
                            null,
                    }),
                ),
        });
    } catch (error) {
        return handleConversationError(
            error,
            reply,
        );
    }
}