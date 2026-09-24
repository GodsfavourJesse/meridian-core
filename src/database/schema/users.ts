import {
    pgTable,
    uuid,
    varchar,
    timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", {
        length: 100,
    }).notNull(),

    email: varchar("email", {
        length: 255,
    }).notNull().unique(),

    passwordHash: varchar("password_hash", {
        length: 255,
    }).notNull(),

    emailVerifiedAt: timestamp("email_verified_at", {
        withTimezone: true,
    }),

    status: varchar("status", {
        length: 20,
    }).notNull().default("active"),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    }).defaultNow().notNull(),
});