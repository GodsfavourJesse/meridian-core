import {
    contacts,
    users,
} from "../../database/schema";

import { db } from "../../database";

import {
    and,
    eq,
} from "drizzle-orm";

import {
    addConversationMember,
    createDirectConversation,
    createMessage,
    findConversationById,
    findDirectConversation,
    findMessageById,
    isConversationMember,
    listConversationMembers,
    listMessages,
    listUserConversations,
    markConversationMessagesAsRead,
} from "./conversations.repository";

function getCanonicalPair(
    userA: string,
    userB: string,
) {
    if (userA < userB) {
        return {
            low: userA,
            high: userB,
        };
    }

    return {
        low: userB,
        high: userA,
    };
}

export async function createOrGetDirectConversation(
    currentUserId: string,
    otherUserId: string,
) {
    if (currentUserId === otherUserId) {
        throw new Error(
            "CANNOT_CONVERSE_WITH_SELF",
        );
    }

    const [otherUser] =
        await db
            .select({
                id: users.id,
                status: users.status,
                emailVerifiedAt:
                    users.emailVerifiedAt,
            })
            .from(users)
            .where(
                eq(users.id, otherUserId),
            )
            .limit(1);

    if (!otherUser) {
        throw new Error(
            "USER_NOT_FOUND",
        );
    }

    if (
        otherUser.status !== "active" ||
        !otherUser.emailVerifiedAt
    ) {
        throw new Error(
            "USER_NOT_AVAILABLE",
        );
    }

    const { low, high } =
        getCanonicalPair(
            currentUserId,
            otherUserId,
        );

    const [contact] =
        await db
            .select({
                id: contacts.id,
                status: contacts.status,
            })
            .from(contacts)
            .where(
                and(
                    eq(
                        contacts.userLowId,
                        low,
                    ),
                    eq(
                        contacts.userHighId,
                        high,
                    ),
                ),
            )
            .limit(1);

    if (
        !contact ||
        contact.status !== "accepted"
    ) {
        throw new Error(
            "CONTACT_NOT_ACCEPTED",
        );
    }

    const existing =
        await findDirectConversation(
            low,
            high,
        );

    if (existing) {
        return existing;
    }

    const conversation =
        await createDirectConversation(
            low,
            high,
        );

    if (!conversation) {
        throw new Error(
            "CONVERSATION_CREATION_FAILED",
        );
    }

    await addConversationMember(
        conversation.id,
        low,
    );

    await addConversationMember(
        conversation.id,
        high,
    );

    return conversation;
}

export async function getUserConversations(
    userId: string,
) {
    return listUserConversations(
        userId,
    );
}

export async function getConversation(
    conversationId: string,
    userId: string,
) {
    const conversation =
        await findConversationById(
            conversationId,
        );

    if (!conversation) {
        throw new Error(
            "CONVERSATION_NOT_FOUND",
        );
    }

    const isMember =
        await isConversationMember(
            conversationId,
            userId,
        );

    if (!isMember) {
        throw new Error(
            "CONVERSATION_ACCESS_DENIED",
        );
    }

    const members =
        await listConversationMembers(
            conversationId,
        );

    return {
        ...conversation,
        members,
    };
}

export async function sendMessage(
    conversationId: string,
    userId: string,
    body: string,
) {
    const conversation =
        await findConversationById(
            conversationId,
        );

    if (!conversation) {
        throw new Error(
            "CONVERSATION_NOT_FOUND",
        );
    }

    const isMember =
        await isConversationMember(
            conversationId,
            userId,
        );

    if (!isMember) {
        throw new Error(
            "CONVERSATION_ACCESS_DENIED",
        );
    }

    const created =
        await createMessage(
            conversationId,
            userId,
            body,
        );

    if (!created) {
        throw new Error(
            "MESSAGE_CREATION_FAILED",
        );
    }

    const message =
        await findMessageById(
            created.id,
        );

    if (!message) {
        throw new Error(
            "MESSAGE_CREATION_FAILED",
        );
    }

    return message;
}

export async function getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number,
    before?: Date,
) {
    const conversation =
        await findConversationById(
            conversationId,
        );

    if (!conversation) {
        throw new Error(
            "CONVERSATION_NOT_FOUND",
        );
    }

    const isMember =
        await isConversationMember(
            conversationId,
            userId,
        );

    if (!isMember) {
        throw new Error(
            "CONVERSATION_ACCESS_DENIED",
        );
    }

    const conversationMessages =
        await listMessages(
            conversationId,
            limit,
            before,
        );

    return conversationMessages.reverse();
}

export async function markConversationAsRead(
    conversationId: string,
    userId: string,
) {
    const conversation =
        await findConversationById(
            conversationId,
        );

    if (!conversation) {
        throw new Error(
            "CONVERSATION_NOT_FOUND",
        );
    }

    const isMember =
        await isConversationMember(
            conversationId,
            userId,
        );

    if (!isMember) {
        throw new Error(
            "CONVERSATION_ACCESS_DENIED",
        );
    }

    return markConversationMessagesAsRead(
        conversationId,
        userId,
    );
}