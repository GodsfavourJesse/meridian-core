import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const emailVerificationTokens = pgTable(
    "email_verification_tokens",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        tokenHash: varchar("token_hash", {
            length: 64,
        }).notNull().unique(),

        expiresAt: timestamp("expires_at", {
            withTimezone: true,
        }).notNull(),

        usedAt: timestamp("used_at", {
            withTimezone: true,
        }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("email_verification_tokens_user_id_idx").on(table.userId),
        index("email_verification_tokens_expires_at_idx").on(
            table.expiresAt,
        ),
    ],
);