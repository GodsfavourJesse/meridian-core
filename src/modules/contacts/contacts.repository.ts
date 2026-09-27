import {
    and,
    eq,
    or,
} from "drizzle-orm";

import { db } from "../../database";

import {
    contacts,
    users,
} from "../../database/schema";

import type {
    ContactStatus,
} from "./contacts.types";

export async function findContactById(
    contactId: string,
) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(
            eq(
                contacts.id,
                contactId,
            ),
        )
        .limit(1);

    return contact ?? null;
}

export async function findContactBetweenUsers(
    userAId: string,
    userBId: string,
) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(
            or(
                and(
                    eq(
                        contacts.requesterId,
                        userAId,
                    ),
                    eq(
                        contacts.addresseeId,
                        userBId,
                    ),
                ),
                and(
                    eq(
                        contacts.requesterId,
                        userBId,
                    ),
                    eq(
                        contacts.addresseeId,
                        userAId,
                    ),
                ),
            ),
        )
        .limit(1);

    return contact ?? null;
}

export async function createContact(
    input: {
        requesterId: string;
        addresseeId: string;
        userLowId: string;
        userHighId: string;
    },
) {
    const [contact] = await db
        .insert(contacts)
        .values({
            requesterId:
                input.requesterId,
            addresseeId:
                input.addresseeId,
            userLowId:
                input.userLowId,
            userHighId:
                input.userHighId,
            status: "pending",
        })
        .returning();

    return contact ?? null;
}

export async function updateContactStatus(
    contactId: string,
    status: ContactStatus,
) {
    const [contact] = await db
        .update(contacts)
        .set({
            status,
            updatedAt:
                new Date(),
        })
        .where(
            eq(
                contacts.id,
                contactId,
            ),
        )
        .returning();

    return contact ?? null;
}

export async function deleteContact(
    contactId: string,
) {
    const [contact] = await db
        .delete(contacts)
        .where(
            eq(
                contacts.id,
                contactId,
            ),
        )
        .returning();

    return contact ?? null;
}

export async function findContactsForUser(
    userId: string,
    status?: ContactStatus,
) {
    const userCondition =
        or(
            eq(
                contacts.requesterId,
                userId,
            ),
            eq(
                contacts.addresseeId,
                userId,
            ),
        );

    const statusCondition =
        status
            ? eq(
                  contacts.status,
                  status,
              )
            : undefined;

    const whereCondition =
        statusCondition
            ? and(
                  userCondition,
                  statusCondition,
              )
            : userCondition;

    const rows = await db
        .select({
            contact: contacts,
            user: users,
        })
        .from(contacts)
        .innerJoin(
            users,
            or(
                and(
                    eq(
                        contacts.requesterId,
                        userId,
                    ),
                    eq(
                        users.id,
                        contacts.addresseeId,
                    ),
                ),
                and(
                    eq(
                        contacts.addresseeId,
                        userId,
                    ),
                    eq(
                        users.id,
                        contacts.requesterId,
                    ),
                ),
            ),
        )
        .where(whereCondition)
        .orderBy(
            contacts.createdAt,
        );

    return rows;
}