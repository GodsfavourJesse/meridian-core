import {
    check,
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { users } from "./users";

export const CONVERSATION_TYPE = {
    DIRECT: "direct",
    GROUP: "group",
} as const;

export type ConversationType =
    (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE];

export const conversations = pgTable(
    "conversations",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        type: varchar("type", {
            length: 20,
        })
            .notNull()
            .default(CONVERSATION_TYPE.DIRECT),

        /*
         * Used only for direct conversations.
         *
         * Keeping the pair in canonical order allows us to guarantee
         * that John + Jane cannot accidentally create two direct
         * conversations.
         */
        directUserLowId: uuid("direct_user_low_id")
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        directUserHighId: uuid("direct_user_high_id")
            .references(() => users.id, {
                onDelete: "cascade",
            }),

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
    },
    (table) => [
        index("conversations_updated_at_idx").on(
            table.updatedAt,
        ),

        index("conversations_direct_user_low_id_idx").on(
            table.directUserLowId,
        ),

        index("conversations_direct_user_high_id_idx").on(
            table.directUserHighId,
        ),

        uniqueIndex(
            "conversations_direct_pair_unique_idx",
        ).on(
            table.directUserLowId,
            table.directUserHighId,
        ),

        check(
            "conversations_type_check",
            sql`${table.type} in ('direct', 'group')`,
        ),

        check(
            "conversations_direct_pair_order_check",
            sql`
                ${table.directUserLowId} IS NULL
                OR ${table.directUserHighId} IS NULL
                OR ${table.directUserLowId} < ${table.directUserHighId}
            `,
        ),

        check(
            "conversations_direct_pair_not_same_check",
            sql`
                ${table.directUserLowId} IS NULL
                OR ${table.directUserHighId} IS NULL
                OR ${table.directUserLowId} <> ${table.directUserHighId}
            `,
        ),
    ],
);