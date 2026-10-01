import {
    index,
    jsonb,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

import {
    users,
} from "../users";

import {
    calls,
} from "./calls";

export const callEvents =
    pgTable(
        "call_events",
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

            actorUserId: uuid(
                "actor_user_id",
            ).references(
                () => users.id,
                {
                    onDelete: "set null",
                },
            ),

            type: varchar("type", {
                length: 50,
            }).notNull(),

            metadata: jsonb("metadata"),

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
            index(
                "call_events_call_id_idx",
            ).on(table.callId),

            index(
                "call_events_actor_user_id_idx",
            ).on(table.actorUserId),

            index(
                "call_events_type_idx",
            ).on(table.type),

            index(
                "call_events_created_at_idx",
            ).on(table.createdAt),

            index(
                "call_events_call_created_at_idx",
            ).on(
                table.callId,
                table.createdAt,
            ),
        ],
    );