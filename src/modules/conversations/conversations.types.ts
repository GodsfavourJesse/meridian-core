import type {
    ConversationMemberRole,
    ConversationType,
} from "../../database/schema";

export type ConversationSummary = {
    id: string;
    type: ConversationType;
    createdAt: Date;
    updatedAt: Date;

    participant: {
        id: string;
        displayName: string;
        username: string;
        miyorNumber: string | null;
        profilePictureUrl: string | null;
    } | null;

    lastMessage: {
        id: string;
        body: string;
        senderId: string;
        createdAt: Date;
    } | null;
};

export type ConversationMember = {
    id: string;
    conversationId: string;
    userId: string;
    role: ConversationMemberRole;
    joinedAt: Date;

    user: {
        id: string;
        displayName: string;
        username: string;
        miyorNumber: string | null;
        profilePictureUrl: string | null;
    };
};

export type ConversationDetails = {
    id: string;
    type: ConversationType;
    createdAt: Date;
    updatedAt: Date;
    members: ConversationMember[];
};

export type MessageItem = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    readAt: Date | null;

    sender: {
        id: string;
        displayName: string;
        username: string;
        profilePictureUrl: string | null;
    };
};

export type CreateDirectConversationInput = {
    userId: string;
};

export type SendMessageInput = {
    body: string;
};

export type ListMessagesInput = {
    limit: number;
    before?: Date;
};