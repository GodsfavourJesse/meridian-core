import type {
    FastifyInstance,
} from "fastify";

import {
    requireAuth,
} from "../auth/require-auth";

import {
    createContactController,
    deleteContactController,
    listContactsController,
    updateContactController,
} from "./contacts.controller";

export async function contactsRoutes(
    app: FastifyInstance,
) {
    app.post(
        "/",
        {
            preHandler: requireAuth,
        },
        createContactController,
    );

    app.get(
        "/",
        {
            preHandler: requireAuth,
        },
        listContactsController,
    );

    app.patch(
        "/:id",
        {
            preHandler: requireAuth,
        },
        updateContactController,
    );

    app.delete(
        "/:id",
        {
            preHandler: requireAuth,
        },
        deleteContactController,
    );
}