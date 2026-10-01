import {
    and,
    desc,
    eq,
    inArray,
} from "drizzle-orm";

import {
    db,
} from "../../database";

import {
    callEvents,
    callParticipants,
    calls,
} from "../../database/schema/calls";

import type {
    CreateCallEventInput,
    CreateCallInput,
    CreateCallParticipantInput,
} from "./calls.types";
import { CALL_STATE } from "../../database/constants/call.constants";

export async function createCall(
    input: CreateCallInput,
) {
    return db.transaction(
        async (transaction) => {
            const [call] =
                await transaction
                    .insert(calls)
                    .values({
                        conversationId:
                            input.conversationId,

                        initiatedBy:
                            input.initiatedBy,

                        type:
                            input.type,

                        state: "initiating",

                        startedAt:
                            new Date(),
                    })
                    .returning();

            if (!call) {
                throw new Error(
                    "Failed to create call.",
                );
            }

            await transaction
                .insert(callParticipants)
                .values([
                    {
                        callId: call.id,
                        userId:
                            input.initiatedBy,
                        role: "caller",
                        state: "invited",
                    },
                    {
                        callId: call.id,
                        userId:
                            input.calleeId,
                        role: "callee",
                        state: "invited",
                    },
                ]);

            await transaction
                .insert(callEvents)
                .values({
                    callId: call.id,
                    actorUserId:
                        input.initiatedBy,
                    type: "CALL_CREATED",
                });

            return call;
        },
    );
}

export async function findCallById(
    callId: string,
) {
    const [call] =
        await db
            .select()
            .from(calls)
            .where(
                eq(calls.id, callId),
            )
            .limit(1);

    return call ?? null;
}

export async function findCallWithParticipants(
    callId: string,
) {
    const call =
        await findCallById(callId);

    if (!call) {
        return null;
    }

    const participants =
        await db
            .select()
            .from(callParticipants)
            .where(
                eq(
                    callParticipants.callId,
                    callId,
                ),
            )
            .orderBy(
                callParticipants.createdAt,
            );

    return {
        call,
        participants,
    };
}

export async function findCallParticipant(
    callId: string,
    userId: string,
) {
    const [participant] =
        await db
            .select()
            .from(callParticipants)
            .where(
                and(
                    eq(
                        callParticipants.callId,
                        callId,
                    ),
                    eq(
                        callParticipants.userId,
                        userId,
                    ),
                ),
            )
            .limit(1);

    return participant ?? null;
}

export async function updateCallState(
    callId: string,
    state: string,
    timestamps?: {
        connectedAt?: Date;
        endedAt?: Date;
    },
) {
    const [call] =
        await db
            .update(calls)
            .set({
                state,

                ...(timestamps
                    ?.connectedAt !==
                    undefined
                    ? {
                          connectedAt:
                              timestamps.connectedAt,
                      }
                    : {}),

                ...(timestamps
                    ?.endedAt !==
                    undefined
                    ? {
                          endedAt:
                              timestamps.endedAt,
                      }
                    : {}),

                updatedAt:
                    new Date(),
            })
            .where(
                eq(calls.id, callId),
            )
            .returning();

    return call ?? null;
}

export async function updateParticipantState(
    callId: string,
    userId: string,
    state: string,
    timestamps?: {
        joinedAt?: Date;
        leftAt?: Date;
    },
) {
    const [participant] =
        await db
            .update(callParticipants)
            .set({
                state,

                ...(timestamps
                    ?.joinedAt !==
                    undefined
                    ? {
                          joinedAt:
                              timestamps.joinedAt,
                      }
                    : {}),

                ...(timestamps
                    ?.leftAt !==
                    undefined
                    ? {
                          leftAt:
                              timestamps.leftAt,
                      }
                    : {}),
            })
            .where(
                and(
                    eq(
                        callParticipants.callId,
                        callId,
                    ),
                    eq(
                        callParticipants.userId,
                        userId,
                    ),
                ),
            )
            .returning();

    return participant ?? null;
}

export async function createCallEvent(
    input: CreateCallEventInput,
) {
    const [event] =
        await db
            .insert(callEvents)
            .values({
                callId:
                    input.callId,

                actorUserId:
                    input.actorUserId,

                type:
                    input.type,

                metadata:
                    input.metadata,
            })
            .returning();

    if (!event) {
        throw new Error(
            "Failed to create call event.",
        );
    }

    return event;
}

export async function listCallEvents(
    callId: string,
) {
    return db
        .select()
        .from(callEvents)
        .where(
            eq(
                callEvents.callId,
                callId,
            ),
        )
        .orderBy(
            desc(callEvents.createdAt),
        );
}

export async function findActiveCallForUser(
    userId: string,
) {
    const [result] =
        await db
            .select({
                call: calls,
                participant:
                    callParticipants,
            })
            .from(callParticipants)
            .innerJoin(
                calls,
                eq(
                    callParticipants.callId,
                    calls.id,
                ),
            )
            .where(
                and(
                    eq(
                        callParticipants.userId,
                        userId,
                    ),
                    inArray(
                        calls.state,
                        [
                            CALL_STATE.INITIATING,
                            CALL_STATE.RINGING,
                            CALL_STATE.ACCEPTED,
                            CALL_STATE.CONNECTED,
                        ],
                    ),
                ),
            )
            .orderBy(
                desc(calls.createdAt),
            )
            .limit(1);

    return result ?? null;
}

export async function listUserCalls(
    userId: string,
    limit = 50,
) {
    return db
        .select({
            call: calls,
            participant:
                callParticipants,
        })
        .from(callParticipants)
        .innerJoin(
            calls,
            eq(
                callParticipants.callId,
                calls.id,
            ),
        )
        .where(
            eq(
                callParticipants.userId,
                userId,
            ),
        )
        .orderBy(
            desc(calls.createdAt),
        )
        .limit(limit);
}