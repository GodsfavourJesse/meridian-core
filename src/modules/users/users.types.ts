export const USER_STATUS = {
    PENDING_VERIFICATION:
        "pending_verification",

    ACTIVE: "active",

    SUSPENDED: "suspended",
} as const;

export type UserStatus =
    (typeof USER_STATUS)[keyof typeof USER_STATUS];

export type PublicUser = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
    emailVerifiedAt: Date | null;
    status: UserStatus;
    createdAt: Date;
};

export const MAX_GENERATION_ATTEMPTS = 20;

export type UpdateProfileInput = {
    displayName?: string | undefined;
    bio?: string | null | undefined;
    profilePictureUrl?: string | null | undefined;
};

export type DiscoverableUser = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
};