import type {
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    createContactSchema,
    contactsQuerySchema,
    updateContactSchema,
} from "./contacts.validation";

import {
    changeContactStatus,
    listContacts,
    removeContact,
    sendContactRequest,
} from "./contacts.service";

function validationError(
    error: {
        issues: Array<{
            path: PropertyKey[];
            message: string;
        }>;
    },
) {
    return {
        status: "error",
        code: "VALIDATION_ERROR",
        message:
            "Invalid request.",
        errors:
            error.issues.map(
                (issue) => ({
                    field:
                        issue.path.join(
                            ".",
                        ),
                    message:
                        issue.message,
                }),
            ),
    };
}

function errorResponse(
    reply: FastifyReply,
    error: unknown,
) {
    if (
        !(error instanceof Error)
    ) {
        return reply
            .status(500)
            .send({
                status: "error",
                code:
                    "INTERNAL_SERVER_ERROR",
                message:
                    "An unexpected error occurred.",
            });
    }

    const responses: Record<
        string,
        {
            status: number;
            message: string;
        }
    > = {
        CANNOT_ADD_SELF: {
            status: 400,
            message:
                "You cannot add yourself as a contact.",
        },

        USER_NOT_FOUND: {
            status: 404,
            message:
                "User not found.",
        },

        USER_NOT_AVAILABLE: {
            status: 404,
            message:
                "User is not available.",
        },

        CONTACT_ALREADY_EXISTS: {
            status: 409,
            message:
                "A contact relationship already exists with this user.",
        },

        CONTACT_REQUEST_ALREADY_SENT: {
            status: 409,
            message:
                "You have already sent a contact request to this user.",
        },

        CONTACT_REQUEST_PENDING: {
            status: 409,
            message:
                "This user has already sent you a contact request.",
        },

        CONTACT_BLOCKED: {
            status: 403,
            message:
                "This contact relationship is blocked.",
        },

        CONTACT_ALREADY_BLOCKED: {
            status: 409,
            message:
                "This contact is already blocked.",
        },

        CONTACT_NOT_FOUND: {
            status: 404,
            message:
                "Contact relationship not found.",
        },

        CONTACT_ACTION_NOT_ALLOWED: {
            status: 403,
            message:
                "You are not allowed to perform this action.",
        },

        CONTACT_REQUEST_NOT_ALLOWED: {
            status: 400,
            message:
                "This contact request cannot be changed to that status.",
        },

        CONTACT_CREATION_FAILED: {
            status: 500,
            message:
                "Unable to create the contact request.",
        },
    };

    const response =
        responses[error.message];

    if (response) {
        return reply
            .status(response.status)
            .send({
                status: "error",
                code: error.message,
                message:
                    response.message,
            });
    }

    throw error;
}

export async function createContactController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const parsed =
        createContactSchema.safeParse(
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

    if (!request.user) {
        return reply
            .status(401)
            .send({
                status: "error",
                code: "UNAUTHORIZED",
                message:
                    "Authentication required.",
            });
    }

    try {
        const contact =
            await sendContactRequest(
                request.user.id,
                parsed.data.userId,
            );

        return reply
            .status(201)
            .send({
                status: "ok",
                contact,
            });
    } catch (error) {
        return errorResponse(
            reply,
            error,
        );
    }
}

export async function listContactsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (!request.user) {
        return reply
            .status(401)
            .send({
                status: "error",
                code: "UNAUTHORIZED",
                message:
                    "Authentication required.",
            });
    }

    const parsed =
        contactsQuerySchema.safeParse(
            request.query,
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

    const contacts =
        await listContacts(
            request.user.id,
            parsed.data.status,
        );

    return reply.send({
        status: "ok",
        contacts,
    });
}

export async function updateContactController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const params =
        request.params as {
            id?: string;
        };

    if (!params.id) {
        return reply
            .status(400)
            .send({
                status: "error",
                code:
                    "CONTACT_ID_REQUIRED",
                message:
                    "Contact ID is required.",
            });
    }

    const parsed =
        updateContactSchema.safeParse(
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

    if (!request.user) {
        return reply
            .status(401)
            .send({
                status: "error",
                code: "UNAUTHORIZED",
                message:
                    "Authentication required.",
            });
    }

    try {
        const contact =
            await changeContactStatus(
                request.user.id,
                params.id,
                parsed.data.status,
            );

        return reply.send({
            status: "ok",
            contact,
        });
    } catch (error) {
        return errorResponse(
            reply,
            error,
        );
    }
}

export async function deleteContactController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const params =
        request.params as {
            id?: string;
        };

    if (!params.id) {
        return reply
            .status(400)
            .send({
                status: "error",
                code:
                    "CONTACT_ID_REQUIRED",
                message:
                    "Contact ID is required.",
            });
    }

    if (!request.user) {
        return reply
            .status(401)
            .send({
                status: "error",
                code: "UNAUTHORIZED",
                message:
                    "Authentication required.",
            });
    }

    try {
        await removeContact(
            request.user.id,
            params.id,
        );

        return reply.send({
            status: "ok",
        });
    } catch (error) {
        return errorResponse(
            reply,
            error,
        );
    }
}