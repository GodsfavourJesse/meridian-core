import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(4000),

    APP_URL: z.string().url(),

    API_URL: z.string().url(),

    DATABASE_URL: z.string().min(1),

    REDIS_URL: z.string().min(1),

    SESSION_SECRET: z.string().min(32),

    SMTP_HOST: z.string().min(1),

    SMTP_PORT: z.coerce
        .number()
        .int()
        .positive(),

    SMTP_SECURE: z
        .string()
        .transform((value) => value.toLowerCase() === "true"),

    SMTP_USER: z.string().email(),

    SMTP_PASSWORD: z.string().min(1),

    EMAIL_FROM_NAME: z.string().min(1),

    EMAIL_FROM_ADDRESS: z.string().email(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsedEnv.data;