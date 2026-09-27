import { z } from "zod";

import {
    CONTACT_STATUS,
} from "./contacts.types";

export const createContactSchema =
    z.object({
        userId: z
            .string()
            .uuid("Invalid user ID."),
    });

export const updateContactSchema =
    z.object({
        status: z.enum([
            CONTACT_STATUS.ACCEPTED,
            CONTACT_STATUS.DECLINED,
            CONTACT_STATUS.BLOCKED,
        ]),
    });

export const contactsQuerySchema =
    z.object({
        status: z
            .enum([
                CONTACT_STATUS.PENDING,
                CONTACT_STATUS.ACCEPTED,
                CONTACT_STATUS.DECLINED,
                CONTACT_STATUS.BLOCKED,
            ])
            .optional(),
    });