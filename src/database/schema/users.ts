import {
    index,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
    "users",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        displayName: varchar("display_name", {
            length: 100,
        }).notNull(),

        username: varchar("username", {
            length: 30,
        })
            .notNull()
            .unique(),

        miyorNumber: varchar("miyor_number", {
            length: 20,
        }).unique(),

        email: varchar("email", {
            length: 255,
        })
            .notNull()
            .unique(),

        passwordHash: varchar("password_hash", {
            length: 255,
        }).notNull(),

        profilePictureUrl: varchar(
            "profile_picture_url",
            {
                length: 500,
            },
        ),

        bio: varchar("bio", {
            length: 500,
        }),

        emailVerifiedAt: timestamp(
            "email_verified_at",
            {
                withTimezone: true,
            },
        ),

        status: varchar("status", {
            length: 30,
        })
            .notNull()
            .default("pending_verification"),

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
        index("users_display_name_idx").on(
            table.displayName,
        ),

        index("users_email_verified_at_idx").on(
            table.emailVerifiedAt,
        ),

        index("users_status_idx").on(
            table.status,
        ),
    ],
);