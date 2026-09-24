import {
    index,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const rooms = pgTable(
    "rooms",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        hostId: uuid("host_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        roomCode: varchar("room_code", {
            length: 32,
        })
            .notNull()
            .unique(),

        status: varchar("status", {
            length: 20,
        })
            .notNull()
            .default("waiting"),

        invitationTokenHash: varchar("invitation_token_hash", {
            length: 64,
        })
            .notNull()
            .unique(),

        invitationExpiresAt: timestamp(
            "invitation_expires_at",
            {
                withTimezone: true,
            },
        ).notNull(),

        invitationRevokedAt: timestamp(
            "invitation_revoked_at",
            {
                withTimezone: true,
            },
        ),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        startedAt: timestamp("started_at", {
            withTimezone: true,
        }),

        endedAt: timestamp("ended_at", {
            withTimezone: true,
        }),
    },
    (table) => ({
        hostIdIdx: index("rooms_host_id_idx").on(table.hostId),
        statusIdx: index("rooms_status_idx").on(table.status),
        invitationExpiresAtIdx: index(
            "rooms_invitation_expires_at_idx",
        ).on(table.invitationExpiresAt),
    }),
);