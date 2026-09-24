import {
    createHash,
    randomBytes,
} from "node:crypto";
import { env } from "../../config/env";


export function createRoomCode() {
    return randomBytes(8)
        .toString("base64url")
        .slice(0, 11);
}

export function createInvitationToken() {
    return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
    return createHash("sha256")
        .update(`${env.SESSION_SECRET}:${token}`)
        .digest("hex");
}