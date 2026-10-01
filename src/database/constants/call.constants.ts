export const CALL_TYPE = {
    VOICE: "voice",
    VIDEO: "video",
} as const;

export const CALL_STATE = {
    INITIATING: "initiating",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    CONNECTED: "connected",
    DECLINED: "declined",
    MISSED: "missed",
    CANCELLED: "cancelled",
    ENDED: "ended",
    FAILED: "failed",
} as const;

export const CALL_PARTICIPANT_ROLE = {
    CALLER: "caller",
    CALLEE: "callee",
} as const;

export const CALL_PARTICIPANT_STATE = {
    INVITED: "invited",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    CONNECTED: "connected",
    DECLINED: "declined",
    MISSED: "missed",
    CANCELLED: "cancelled",
    ENDED: "ended",
    FAILED: "failed",
} as const;

export const CALL_EVENT_TYPE = {
    CREATED: "CALL_CREATED",
    RINGING: "CALL_RINGING",
    ACCEPTED: "CALL_ACCEPTED",
    CONNECTED: "CALL_CONNECTED",
    DECLINED: "CALL_DECLINED",
    MISSED: "CALL_MISSED",
    CANCELLED: "CALL_CANCELLED",
    ENDED: "CALL_ENDED",
    FAILED: "CALL_FAILED",
} as const;