export type ParticipantRole =
    | "host"
    | "guest";

export type PresenceStatus =
    | "joined"
    | "left";

export type RoomParticipantPresence = {
    participantId: string;
    roomId: string;
    displayName: string;
    role: ParticipantRole;
    status: PresenceStatus;
    connectionId: string;
    joinedAt: string;
};