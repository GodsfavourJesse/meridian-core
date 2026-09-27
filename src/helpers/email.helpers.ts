import { env } from "../config/env";

export function buildVerificationUrl(
    token: string,
) {
    return `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
}