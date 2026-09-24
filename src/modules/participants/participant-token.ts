import {
    createHash,
    randomBytes,
} from "node:crypto";
import { env } from "../../config/env";


export function createGuestToken() {
    return randomBytes(32).toString("base64url");
}

export function hashGuestToken(
    token: string,
) {
    return createHash("sha256")
        .update(
            `${env.SESSION_SECRET}:${token}`,
        )
        .digest("hex");
}