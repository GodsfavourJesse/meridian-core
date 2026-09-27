import {
    and,
    count,
    desc,
    eq,
    isNull,
    lt,
    ne,
} from "drizzle-orm";

import {
    conversationMembers,
    conversations,
    messages,
    users,
} from "../../database/schema";

import { db } from "../../database";

export async function findDirectConversation(
    userLowId: string,
    userHighId: string,
) {
    const [conversation] =
        await db
            .select({
                id: conversations.id,
                type: conversations.type,
                createdAt:
                    conversations.createdAt,
                updatedAt:
                    conversations.updatedAt,
            })
            .from(conversations)
            .where(
                and(
                    eq(
                        conversations.directUserLowId,
                        userLowId,
                    ),
                    eq(
                        conversations.directUserHighId,
                        userHighId,
                    ),
                ),
            )
            .limit(1);

    return conversation ?? null;
}

export async function createDirectConversation(
    userLowId: string,
    userHighId: string,
) {
    const [conversation] =
        await db
            .insert(conversations)
            .values({
                type: "direct",
                directUserLowId: userLowId,
                directUserHighId:
                    userHighId,
            })
            .onConflictDoNothing({
                target: [
                    conversations.directUserLowId,
                    conversations.directUserHighId,
                ],
            })
            .returning({
                id: conversations.id,
                type: conversations.type,
                createdAt:
                    conversations.createdAt,
                updatedAt:
                    conversations.updatedAt,
            });

    if (conversation) {
        return conversation;
    }

    return findDirectConversation(
        userLowId,
        userHighId,
    );
}

export async function addConversationMember(
    conversationId: string,
    userId: string,
) {
    const [member] =
        await db
            .insert(conversationMembers)
            .values({
                conversationId,
                userId,
            })
            .onConflictDoNothing({
                target: [
                    conversationMembers.conversationId,
                    conversationMembers.userId,
                ],
            })
            .returning();

    return member ?? null;
}

export async function isConversationMember(
    conversationId: string,
    userId: string,
) {
    const [member] =
        await db
            .select({
                id: conversationMembers.id,
            })
            .from(conversationMembers)
            .where(
                and(
                    eq(
                        conversationMembers.conversationId,
                        conversationId,
                    ),
                    eq(
                        conversationMembers.userId,
                        userId,
                    ),
                ),
            )
            .limit(1);

    return Boolean(member);
}

export async function findConversationById(
    conversationId: string,
) {
    const [conversation] =
        await db
            .select({
                id: conversations.id,
                type: conversations.type,
                createdAt:
                    conversations.createdAt,
                updatedAt:
                    conversations.updatedAt,
            })
            .from(conversations)
            .where(
                eq(
                    conversations.id,
                    conversationId,
                ),
            )
            .limit(1);

    return conversation ?? null;
}

export async function listConversationMembers(
    conversationId: string,
) {
    return db
        .select({
            id: conversationMembers.id,
            conversationId:
                conversationMembers.conversationId,
            userId:
                conversationMembers.userId,
            role:
                conversationMembers.role,
            joinedAt:
                conversationMembers.joinedAt,

            user: {
                id: users.id,
                displayName:
                    users.displayName,
                username:
                    users.username,
                miyorNumber:
                    users.miyorNumber,
                profilePictureUrl:
                    users.profilePictureUrl,
            },
        })
        .from(conversationMembers)
        .innerJoin(
            users,
            eq(
                users.id,
                conversationMembers.userId,
            ),
        )
        .where(
            eq(
                conversationMembers.conversationId,
                conversationId,
            ),
        )
        .orderBy(
            conversationMembers.joinedAt,
        );
}

export async function listUserConversations(
    userId: string,
) {
    const memberships =
        await db
            .select({
                conversationId:
                    conversationMembers.conversationId,
            })
            .from(conversationMembers)
            .where(
                eq(
                    conversationMembers.userId,
                    userId,
                ),
            );

    const results: Array<{
        id: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;

        participant: {
            id: string;
            displayName: string;
            username: string;
            miyorNumber: string | null;
            profilePictureUrl:
                string | null;
        } | null;

        lastMessage: {
            id: string;
            body: string;
            senderId: string;
            createdAt: Date;
        } | null;

        unreadCount: number;
    }> = [];

    for (const membership of memberships) {
        const conversation =
            await findConversationById(
                membership.conversationId,
            );

        if (!conversation) {
            continue;
        }

        const members =
            await db
                .select({
                    id: users.id,
                    displayName:
                        users.displayName,
                    username:
                        users.username,
                    miyorNumber:
                        users.miyorNumber,
                    profilePictureUrl:
                        users.profilePictureUrl,
                })
                .from(conversationMembers)
                .innerJoin(
                    users,
                    eq(
                        users.id,
                        conversationMembers.userId,
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            conversation.id,
                        ),
                        ne(
                            conversationMembers.userId,
                            userId,
                        ),
                    ),
                )
                .limit(1);

        /*
         * The newest message is the first
         * message because we order descending.
         */
        const [lastMessage] =
            await db
                .select({
                    id: messages.id,
                    body: messages.body,
                    senderId:
                        messages.senderId,
                    createdAt:
                        messages.createdAt,
                })
                .from(messages)
                .where(
                    and(
                        eq(
                            messages.conversationId,
                            conversation.id,
                        ),
                        isNull(
                            messages.deletedAt,
                        ),
                    ),
                )
                .orderBy(
                    desc(messages.createdAt),
                )
                .limit(1);

        /*
         * For the current direct-message
         * read model, an incoming message is
         * unread when:
         *
         * - sender is not the current user
         * - readAt is null
         * - message is not deleted
         */
        const [
            unreadResult,
        ] = await db
            .select({
                count: count(messages.id),
            })
            .from(messages)
            .where(
                and(
                    eq(
                        messages.conversationId,
                        conversation.id,
                    ),
                    ne(
                        messages.senderId,
                        userId,
                    ),
                    isNull(
                        messages.readAt,
                    ),
                    isNull(
                        messages.deletedAt,
                    ),
                ),
            );

        results.push({
            id: conversation.id,
            type: conversation.type,

            createdAt:
                conversation.createdAt,

            updatedAt:
                conversation.updatedAt,

            participant:
                members[0] ?? null,

            lastMessage:
                lastMessage ?? null,

            unreadCount:
                unreadResult?.count ?? 0,
        });
    }

    /*
     * Conversation list is newest activity
     * first.
     */
    return results.sort(
        (a, b) =>
            b.updatedAt.getTime() -
            a.updatedAt.getTime(),
    );
}

export async function createMessage(
    conversationId: string,
    senderId: string,
    body: string,
) {
    const [message] =
        await db
            .insert(messages)
            .values({
                conversationId,
                senderId,
                body,
            })
            .returning({
                id: messages.id,
            });

    /*
     * A new message makes the conversation
     * the most recently active conversation.
     */
    await db
        .update(conversations)
        .set({
            updatedAt: new Date(),
        })
        .where(
            eq(
                conversations.id,
                conversationId,
            ),
        );

    return message ?? null;
}

export async function findMessageById(
    messageId: string,
) {
    const [message] =
        await db
            .select({
                id: messages.id,

                conversationId:
                    messages.conversationId,

                senderId:
                    messages.senderId,

                body: messages.body,

                createdAt:
                    messages.createdAt,

                updatedAt:
                    messages.updatedAt,

                readAt:
                    messages.readAt,

                deletedAt:
                    messages.deletedAt,

                sender: {
                    id: users.id,
                    displayName:
                        users.displayName,
                    username:
                        users.username,
                    profilePictureUrl:
                        users.profilePictureUrl,
                },
            })
            .from(messages)
            .innerJoin(
                users,
                eq(
                    users.id,
                    messages.senderId,
                ),
            )
            .where(
                eq(
                    messages.id,
                    messageId,
                ),
            )
            .limit(1);

    return message ?? null;
}

export async function listMessages(
    conversationId: string,
    limit: number,
    before?: Date,
) {
    const conditions = [
        eq(
            messages.conversationId,
            conversationId,
        ),
        isNull(messages.deletedAt),
    ];

    /*
     * Pagination retrieves messages older
     * than the supplied cursor.
     */
    if (before) {
        conditions.push(
            lt(
                messages.createdAt,
                before,
            ),
        );
    }

    /*
     * IMPORTANT:
     *
     * Messages are intentionally returned
     * newest -> oldest.
     *
     * The frontend therefore prepends newly
     * received messages.
     */
    return db
        .select({
            id: messages.id,

            conversationId:
                messages.conversationId,

            senderId:
                messages.senderId,

            body:
                messages.body,

            createdAt:
                messages.createdAt,

            updatedAt:
                messages.updatedAt,

            readAt:
                messages.readAt,

            deletedAt:
                messages.deletedAt,

            sender: {
                id: users.id,
                displayName:
                    users.displayName,
                username:
                    users.username,
                profilePictureUrl:
                    users.profilePictureUrl,
            },
        })
        .from(messages)
        .innerJoin(
            users,
            eq(
                users.id,
                messages.senderId,
            ),
        )
        .where(
            and(...conditions),
        )
        .orderBy(
            desc(messages.createdAt),
        )
        .limit(limit);
}

export async function markConversationMessagesAsRead(
    conversationId: string,
    userId: string,
) {
    const readAt = new Date();

    /*
     * Mark only messages received by the
     * current user as read.
     *
     * Sender's own messages are never marked
     * read by this operation.
     */
    return db
        .update(messages)
        .set({
            readAt,
        })
        .where(
            and(
                eq(
                    messages.conversationId,
                    conversationId,
                ),
                ne(
                    messages.senderId,
                    userId,
                ),
                isNull(
                    messages.readAt,
                ),
                isNull(
                    messages.deletedAt,
                ),
            ),
        )
        .returning({
            id: messages.id,
            readAt: messages.readAt,
        });
}