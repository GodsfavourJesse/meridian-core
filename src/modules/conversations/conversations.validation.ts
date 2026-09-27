import { z } from "zod";

export const createDirectConversationSchema =
    z.object({
        userId: z.string().uuid(
            "Invalid user ID.",
        ),
    });

export const sendMessageSchema =
    z.object({
        body: z
            .string()
            .trim()
            .min(1, "Message cannot be empty.")
            .max(
                5000,
                "Message cannot exceed 5000 characters.",
            ),
    });

export const listMessagesQuerySchema =
    z.object({
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(50),

        before: z
            .string()
            .datetime()
            .optional(),
    });