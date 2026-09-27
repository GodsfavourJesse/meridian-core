import {
    CONTACT_STATUS,
    type ContactStatus,
} from "./contacts.types";

import {
    createContact,
    deleteContact,
    findContactById,
    findContactBetweenUsers,
    findContactsForUser,
    updateContactStatus,
} from "./contacts.repository";

import {
    findUserById,
} from "../users/users.repository";

function canonicalUserPair(
    userAId: string,
    userBId: string,
) {
    return userAId < userBId
        ? {
              userLowId: userAId,
              userHighId: userBId,
          }
        : {
              userLowId: userBId,
              userHighId: userAId,
          };
}

export async function sendContactRequest(
    requesterId: string,
    addresseeId: string,
) {
    if (
        requesterId ===
        addresseeId
    ) {
        throw new Error(
            "CANNOT_ADD_SELF",
        );
    }

    const addressee =
        await findUserById(
            addresseeId,
        );

    if (!addressee) {
        throw new Error(
            "USER_NOT_FOUND",
        );
    }

    if (
        !addressee.emailVerifiedAt ||
        addressee.status !== "active"
    ) {
        throw new Error(
            "USER_NOT_AVAILABLE",
        );
    }

    const existing =
        await findContactBetweenUsers(
            requesterId,
            addresseeId,
        );

    if (existing) {
        if (
            existing.status ===
            CONTACT_STATUS.BLOCKED
        ) {
            throw new Error(
                "CONTACT_BLOCKED",
            );
        }

        if (
            existing.status ===
            CONTACT_STATUS.ACCEPTED
        ) {
            throw new Error(
                "CONTACT_ALREADY_EXISTS",
            );
        }

        if (
            existing.status ===
            CONTACT_STATUS.PENDING
        ) {
            throw new Error(
                existing.requesterId ===
                    requesterId
                    ? "CONTACT_REQUEST_ALREADY_SENT"
                    : "CONTACT_REQUEST_PENDING",
            );
        }

        if (
            existing.status ===
            CONTACT_STATUS.DECLINED
        ) {
            const updated =
                await updateContactStatus(
                    existing.id,
                    CONTACT_STATUS.PENDING,
                );

            if (!updated) {
                throw new Error(
                    "CONTACT_NOT_FOUND",
                );
            }

            return updated;
        }
    }

    const {
        userLowId,
        userHighId,
    } = canonicalUserPair(
        requesterId,
        addresseeId,
    );

    try {
        const contact =
            await createContact({
                requesterId,
                addresseeId,
                userLowId,
                userHighId,
            });

        if (!contact) {
            throw new Error(
                "CONTACT_CREATION_FAILED",
            );
        }

        return contact;
    } catch (error) {
        if (
            isUniqueViolation(error)
        ) {
            throw new Error(
                "CONTACT_ALREADY_EXISTS",
            );
        }

        throw error;
    }
}

export async function listContacts(
    userId: string,
    status?: ContactStatus,
) {
    const rows =
        await findContactsForUser(
            userId,
            status,
        );

    return rows.map(
        ({
            contact,
            user,
        }) => ({
            id: contact.id,
            requesterId:
                contact.requesterId,
            addresseeId:
                contact.addresseeId,
            status:
                contact.status as ContactStatus,
            direction:
                contact.requesterId ===
                userId
                    ? "outgoing"
                    : "incoming",
            createdAt:
                contact.createdAt,
            updatedAt:
                contact.updatedAt,
            user: {
                id: user.id,
                displayName:
                    user.displayName,
                username:
                    user.username,
                miyorNumber:
                    user.miyorNumber,
                profilePictureUrl:
                    user.profilePictureUrl,
                bio: user.bio,
            },
        }),
    );
}

export async function changeContactStatus(
    userId: string,
    contactId: string,
    newStatus: Extract<
        ContactStatus,
        | "accepted"
        | "declined"
        | "blocked"
    >,
) {
    const contact =
        await findContactById(
            contactId,
        );

    if (!contact) {
        throw new Error(
            "CONTACT_NOT_FOUND",
        );
    }

    const isRequester =
        contact.requesterId ===
        userId;

    const isAddressee =
        contact.addresseeId ===
        userId;

    if (
        !isRequester &&
        !isAddressee
    ) {
        throw new Error(
            "CONTACT_ACTION_NOT_ALLOWED",
        );
    }

    if (
        newStatus ===
        CONTACT_STATUS.ACCEPTED
    ) {
        if (!isAddressee) {
            throw new Error(
                "CONTACT_ACTION_NOT_ALLOWED",
            );
        }

        if (
            contact.status !==
            CONTACT_STATUS.PENDING
        ) {
            throw new Error(
                "CONTACT_REQUEST_NOT_ALLOWED",
            );
        }
    }

    if (
        newStatus ===
        CONTACT_STATUS.DECLINED
    ) {
        if (!isAddressee) {
            throw new Error(
                "CONTACT_ACTION_NOT_ALLOWED",
            );
        }

        if (
            contact.status !==
            CONTACT_STATUS.PENDING
        ) {
            throw new Error(
                "CONTACT_REQUEST_NOT_ALLOWED",
            );
        }
    }

    if (
        newStatus ===
        CONTACT_STATUS.BLOCKED
    ) {
        if (
            contact.status ===
            CONTACT_STATUS.BLOCKED
        ) {
            throw new Error(
                "CONTACT_ALREADY_BLOCKED",
            );
        }
    }

    const updated =
        await updateContactStatus(
            contactId,
            newStatus,
        );

    if (!updated) {
        throw new Error(
            "CONTACT_NOT_FOUND",
        );
    }

    return updated;
}

export async function removeContact(
    userId: string,
    contactId: string,
) {
    const contact =
        await findContactById(
            contactId,
        );

    if (!contact) {
        throw new Error(
            "CONTACT_NOT_FOUND",
        );
    }

    if (
        contact.requesterId !==
            userId &&
        contact.addresseeId !==
            userId
    ) {
        throw new Error(
            "CONTACT_ACTION_NOT_ALLOWED",
        );
    }

    const deleted =
        await deleteContact(
            contactId,
        );

    if (!deleted) {
        throw new Error(
            "CONTACT_NOT_FOUND",
        );
    }

    return deleted;
}

function isUniqueViolation(
    error: unknown,
): boolean {
    return (
        typeof error ===
            "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
    );
}