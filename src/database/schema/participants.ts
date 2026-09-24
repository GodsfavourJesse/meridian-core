import {
    index,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import { rooms } from "./rooms";
import { users } from "./users";

export const participants = pgTable(
    "participants",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        roomId: uuid("room_id")
            .notNull()
            .references(() => rooms.id, {
                onDelete: "cascade",
            }),

        userId: uuid("user_id").references(
            () => users.id,
            {
                onDelete: "set null",
            },
        ),

        guestTokenHash: varchar(
            "guest_token_hash",
            {
                length: 64,
            },
        ).notNull().unique(),

        displayName: varchar("display_name", {
            length: 100,
        }).notNull(),

        joinedAt: timestamp("joined_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        leftAt: timestamp("left_at", {
            withTimezone: true,
        }),
    },
    (table) => ({
        roomIdIdx: index(
            "participants_room_id_idx",
        ).on(table.roomId),

        userIdIdx: index(
            "participants_user_id_idx",
        ).on(table.userId),

        guestTokenHashIdx: index(
            "participants_guest_token_hash_idx",
        ).on(table.guestTokenHash),
    }),
);