import { z } from "zod";

export const usernameSchema = z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can contain only letters, numbers, and underscores",
    )
    .transform((value) =>
        value.toLowerCase(),
    );

export const displayNameSchema = z
    .string()
    .trim()
    .min(
        1,
        "Display name is required",
    )
    .max(
        100,
        "Display name must be at most 100 characters",
    );

export const profileUpdateSchema =
    z.object({
        displayName:
            displayNameSchema.optional(),

        bio: z
            .string()
            .trim()
            .max(
                500,
                "Bio must be at most 500 characters",
            )
            .nullable()
            .optional(),

        profilePictureUrl: z
            .string()
            .url()
            .max(500)
            .nullable()
            .optional(),
    });


export const userSearchSchema =
    z.object({
        q: z
            .string()
            .trim()
            .min(
                1,
                "Search query is required.",
            )
            .max(
                100,
                "Search query is too long.",
            ),
    });