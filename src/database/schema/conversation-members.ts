import {
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import { conversations } from "./conversations";
import { users } from "./users";

export const CONVERSATION_MEMBER_ROLE = {
    MEMBER: "member",
    ADMIN: "admin",
} as const;

export type ConversationMemberRole =
    (typeof CONVERSATION_MEMBER_ROLE)[keyof typeof CONVERSATION_MEMBER_ROLE];

export const conversationMembers = pgTable(
    "conversation_members",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => conversations.id, {
                onDelete: "cascade",
            }),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        role: varchar("role", {
            length: 20,
        })
            .notNull()
            .default(CONVERSATION_MEMBER_ROLE.MEMBER),

        joinedAt: timestamp("joined_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("conversation_members_conversation_id_idx").on(
            table.conversationId,
        ),

        index("conversation_members_user_id_idx").on(
            table.userId,
        ),

        uniqueIndex(
            "conversation_members_conversation_user_unique_idx",
        ).on(
            table.conversationId,
            table.userId,
        ),
    ],
);