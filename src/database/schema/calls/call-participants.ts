import {
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import {
    users,
} from "../users";

import {
    calls,
} from "./calls";

export const callParticipants =
    pgTable(
        "call_participants",
        {
            id: uuid("id")
                .defaultRandom()
                .primaryKey(),

            callId: uuid("call_id")
                .notNull()
                .references(
                    () => calls.id,
                    {
                        onDelete: "cascade",
                    },
                ),

            userId: uuid("user_id")
                .notNull()
                .references(
                    () => users.id,
                    {
                        onDelete: "cascade",
                    },
                ),

            role: varchar("role", {
                length: 20,
            }).notNull(),

            state: varchar("state", {
                length: 30,
            }).notNull(),

            joinedAt: timestamp(
                "joined_at",
                {
                    withTimezone: true,
                },
            ),

            leftAt: timestamp(
                "left_at",
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
        },
        (table) => [
            uniqueIndex(
                "call_participants_call_user_unique",
            ).on(
                table.callId,
                table.userId,
            ),

            index(
                "call_participants_call_id_idx",
            ).on(table.callId),

            index(
                "call_participants_user_id_idx",
            ).on(table.userId),

            index(
                "call_participants_user_state_idx",
            ).on(
                table.userId,
                table.state,
            ),
        ],
    );