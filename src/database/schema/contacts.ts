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

export const contacts = pgTable(
    "contacts",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        requesterId: uuid("requester_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        addresseeId: uuid("addressee_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        /*
         * The lower/higher IDs create a canonical
         * representation of the relationship.
         *
         * A -> B and B -> A therefore produce
         * the same pair and cannot both exist.
         */
        userLowId: uuid("user_low_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        userHighId: uuid("user_high_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        status: varchar("status", {
            length: 20,
        })
            .notNull()
            .default("pending"),

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
        index(
            "contacts_requester_id_idx",
        ).on(table.requesterId),

        index(
            "contacts_addressee_id_idx",
        ).on(table.addresseeId),

        index(
            "contacts_user_low_id_idx",
        ).on(table.userLowId),

        index(
            "contacts_user_high_id_idx",
        ).on(table.userHighId),

        index(
            "contacts_status_idx",
        ).on(table.status),

        uniqueIndex(
            "contacts_user_pair_unique_idx",
        ).on(
            table.userLowId,
            table.userHighId,
        ),

        check(
            "contacts_not_self_check",
            sql`${table.requesterId} <> ${table.addresseeId}`,
        ),

        check(
            "contacts_canonical_pair_check",
            sql`${table.userLowId} < ${table.userHighId}`,
        ),
    ],
);