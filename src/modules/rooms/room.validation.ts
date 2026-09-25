import { z } from "zod";

export const joinRoomSchema = z.object({
    invitationToken: z
        .string()
        .min(20, "Invalid invitation"),

    displayName: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(
            100,
            "Name must be 100 characters or less",
        ),
});