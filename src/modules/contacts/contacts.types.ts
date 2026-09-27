export const CONTACT_STATUS = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    DECLINED: "declined",
    BLOCKED: "blocked",
} as const;

export type ContactStatus =
    (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

export type ContactDirection =
    | "incoming"
    | "outgoing"
    | null;

export type ContactListItem = {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: ContactStatus;
    direction: ContactDirection;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        displayName: string;
        username: string;
        miyorNumber: string | null;
        profilePictureUrl: string | null;
        bio: string | null;
    };
};