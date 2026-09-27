import {
    index,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { conversations } from "./conversations";
import { users } from "./users";

export const messages = pgTable(
    "messages",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => conversations.id, {
                onDelete: "cascade",
            }),

        senderId: uuid("sender_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        body: text("body").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        /*
         * NULL means the message has not been read
         * by the recipient yet.
         *
         * For the current Phase 4 implementation,
         * Miyor supports direct conversations, so
         * per-message readAt is sufficient.
         */
        readAt: timestamp("read_at", {
            withTimezone: true,
        }),

        deletedAt: timestamp("deleted_at", {
            withTimezone: true,
        }),
    },
    (table) => [
        index("messages_conversation_id_idx").on(
            table.conversationId,
        ),

        index("messages_sender_id_idx").on(
            table.senderId,
        ),

        index("messages_created_at_idx").on(
            table.createdAt,
        ),

        index(
            "messages_conversation_created_at_idx",
        ).on(
            table.conversationId,
            table.createdAt,
        ),

        /*
         * Helps unread-message queries:
         *
         * conversation + sender + read state
         */
        index(
            "messages_conversation_sender_read_at_idx",
        ).on(
            table.conversationId,
            table.senderId,
            table.readAt,
        ),
    ],
);