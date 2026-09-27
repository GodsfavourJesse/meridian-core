import { z } from "zod";

import {
    displayNameSchema,
    usernameSchema,
} from "../users/users.validation";

export const signupSchema = z.object({
    displayName: displayNameSchema,

    username: usernameSchema,

    email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(255),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(255),

    password: z
        .string()
        .min(1, "Password is required")
        .max(128),
});

export const verifyEmailSchema = z.object({
    token: z
        .string()
        .trim()
        .min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(255),
});

export function normalizeEmail(
    email: string,
): string {
    return email.trim().toLowerCase();
}