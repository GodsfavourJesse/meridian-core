import "dotenv/config";
import { z } from "zod";

const optionalEnvString = z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional();

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(4000),

    APP_URL: z
        .string()
        .url(),

    API_URL: z
        .string()
        .url(),

    DATABASE_URL: z
        .string()
        .min(1),

    REDIS_URL: z
        .string()
        .min(1),

    /*
     * WebRTC ICE configuration
     *
     * STUN is required for development.
     * TURN is optional until a TURN/coturn server is configured.
     */
    STUN_SERVER_URL: z
        .string()
        .trim()
        .min(1)
        .default("stun:stun.l.google.com:19302"),

    TURN_SERVER_URL: optionalEnvString,

    TURN_USERNAME: optionalEnvString,

    TURN_CREDENTIAL: optionalEnvString,

    /*
     * Authentication
     */
    SESSION_SECRET: z
        .string()
        .min(32),

    /*
     * Email
     */
    RESEND_API_KEY: z
        .string()
        .min(1),

    EMAIL_FROM_NAME: z
        .string()
        .min(1),

    EMAIL_FROM_ADDRESS: z
        .string()
        .email(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsedEnv.error.flatten().fieldErrors);

    process.exit(1);
}

export const env = parsedEnv.data;