import { env } from "../config/env";

export function buildVerificationUrl(token: string) {
    const url = new URL("/auth/verify-email", env.APP_URL);
    url.searchParams.set("token", token);
    return url.toString();
}