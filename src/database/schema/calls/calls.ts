import {
    index,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import {
    conversations,
} from "../conversations";

import {
    users,
} from "../users";

export const calls = pgTable(
    "calls",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        conversationId: uuid(
            "conversation_id",
        )
            .notNull()
            .references(
                () => conversations.id,
                {
                    onDelete: "cascade",
                },
            ),

        type: varchar("type", {
            length: 20,
        }).notNull(),

        state: varchar("state", {
            length: 30,
        }).notNull(),

        initiatedBy: uuid(
            "initiated_by",
        )
            .notNull()
            .references(
                () => users.id,
                {
                    onDelete: "restrict",
                },
            ),

        startedAt: timestamp(
            "started_at",
            {
                withTimezone: true,
            },
        ),

        connectedAt: timestamp(
            "connected_at",
            {
                withTimezone: true,
            },
        ),

        endedAt: timestamp(
            "ended_at",
            {
                withTimezone: true,
            },
        ),

        createdAt: timestamp(
            "created_at",
            {
                withTimezone: true,
            },
        )
            .notNull()
            .defaultNow(),

        updatedAt: timestamp(
            "updated_at",
            {
                withTimezone: true,
            },
        )
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index(
            "calls_conversation_id_idx",
        ).on(table.conversationId),

        index(
            "calls_initiated_by_idx",
        ).on(table.initiatedBy),

        index(
            "calls_state_idx",
        ).on(table.state),

        index(
            "calls_created_at_idx",
        ).on(table.createdAt),

        index(
            "calls_conversation_created_at_idx",
        ).on(
            table.conversationId,
            table.createdAt,
        ),
    ],
);