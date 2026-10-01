import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    createCallSchema,
    callIdParamsSchema,
    listCallsQuerySchema,
} from "./calls.schemas";

import {
    CallServiceError,
    acceptCall,
    cancelCall,
    createNewCall,
    declineCall,
    endCall,
    getCall,
    getCallEvents,
    getUserCalls,
    markCallConnected,
} from "./calls.service";

import {
    assertAuthenticated,
} from "../auth/require-auth";

function handleCallError(
    error: unknown,
    reply: FastifyReply,
) {
    if (
        error instanceof CallServiceError
    ) {
        const status =
            error.code ===
                "CALL_NOT_FOUND" ||
            error.code ===
                "CONVERSATION_NOT_FOUND"
                ? 404
                : error.code ===
                      "CALL_ACCESS_DENIED"
                  ? 403
                  : 400;

        return reply.status(status).send({
            status: "error",
            code: error.code,
            message: error.message,
        });
    }

    throw error;
}

export async function createCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    assertAuthenticated(request);

    const parsed =
        createCallSchema.safeParse(
            request.body,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid request body.",
                errors:
                    parsed.error.issues.map(
                        (issue) => ({
                            field:
                                issue
                                    .path
                                    .join("."),
                            message:
                                issue.message,
                        }),
                    ),
            });
    }

    try {
        const call =
            await createNewCall({
                conversationId:
                    parsed.data
                        .conversationId,

                initiatedBy:
                    request.user.id,

                calleeId:
                    parsed.data.calleeId,

                type:
                    parsed.data.type,
            });

        return reply
            .status(201)
            .send({
                status: "success",
                data: call,
            });
    } catch (error) {
        return handleCallError(
            error,
            reply,
        );
    }
}

export async function listCallsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    assertAuthenticated(request);

    const parsed =
        listCallsQuerySchema.safeParse(
            request.query,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid query parameters.",
                errors:
                    parsed.error.issues.map(
                        (issue) => ({
                            field:
                                issue
                                    .path
                                    .join("."),
                            message:
                                issue.message,
                        }),
                    ),
            });
    }

    const calls =
        await getUserCalls(
            request.user.id,
            parsed.data.limit,
        );

    return reply.send({
        status: "success",
        data: calls,
    });
}

export async function getCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    assertAuthenticated(request);

    const parsed =
        callIdParamsSchema.safeParse(
            request.params,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid call ID.",
            });
    }

    try {
        const call =
            await getCall(
                parsed.data.callId,
                request.user.id,
            );

        return reply.send({
            status: "success",
            data: call,
        });
    } catch (error) {
        return handleCallError(
            error,
            reply,
        );
    }
}

export async function getCallEventsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    assertAuthenticated(request);

    const parsed =
        callIdParamsSchema.safeParse(
            request.params,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid call ID.",
            });
    }

    try {
        const events =
            await getCallEvents(
                parsed.data.callId,
                request.user.id,
            );

        return reply.send({
            status: "success",
            data: events,
        });
    } catch (error) {
        return handleCallError(
            error,
            reply,
        );
    }
}

export async function acceptCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    return transitionCall(
        request,
        reply,
        acceptCall,
    );
}

export async function declineCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    return transitionCall(
        request,
        reply,
        declineCall,
    );
}

export async function cancelCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    return transitionCall(
        request,
        reply,
        cancelCall,
    );
}

export async function connectCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    return transitionCall(
        request,
        reply,
        markCallConnected,
    );
}

export async function endCallController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    return transitionCall(
        request,
        reply,
        endCall,
    );
}

async function transitionCall(
    request: FastifyRequest,
    reply: FastifyReply,
    action: (
        callId: string,
        userId: string,
    ) => Promise<unknown>,
) {
    assertAuthenticated(request);

    const parsed =
        callIdParamsSchema.safeParse(
            request.params,
        );

    if (!parsed.success) {
        return reply
            .status(400)
            .send({
                status: "error",
                code: "VALIDATION_ERROR",
                message:
                    "Invalid call ID.",
            });
    }

    try {
        const call =
            await action(
                parsed.data.callId,
                request.user.id,
            );

        return reply.send({
            status: "success",
            data: call,
        });
    } catch (error) {
        return handleCallError(
            error,
            reply,
        );
    }
}