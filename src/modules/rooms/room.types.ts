export const ROOM_STATUSES = [
    "waiting",
    "active",
    "ended",
    "expired",
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];