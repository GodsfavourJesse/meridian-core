import { z } from "zod";

export const signupSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name is too long"),

    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(255, "Email is too long"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long"),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(255, "Email is too long"),

    password: z
        .string()
        .min(1, "Password is required")
        .max(128, "Password is too long"),
});

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export const verifyEmailSchema = z.object({
    token: z
        .string()
        .trim()
        .regex(/^[a-f0-9]{64}$/i, "Invalid verification token"),
});

export const resendVerificationSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(255, "Email is too long"),
});
