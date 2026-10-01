import {
    createCall,
    findActiveCallForUser,
    findCallWithParticipants,
    listCallEvents,
    listUserCalls,
} from "./calls.repository";

import {
    acceptCall as acceptCallDomain,
    cancelCall as cancelCallDomain,
    declineCall as declineCallDomain,
    endCall as endCallDomain,
    markCallConnected as markCallConnectedDomain,
    startRingingCall as startRingingCallDomain,
} from "./calls.domain";

import {
    broadcastCallEvent,
} from "../../realtime/realtime.calls";

import {
    findConversationById,
    isConversationMember,
} from "../conversations/conversations.repository";

import type {
    CreateCallInput,
} from "./calls.types";

export class CallServiceError
    extends Error
{
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);

        this.name =
            "CallServiceError";
    }
}

export async function createNewCall(
    input: CreateCallInput,
) {
    /*
     * A user cannot call themselves.
     */
    if (
        input.initiatedBy ===
        input.calleeId
    ) {
        throw new CallServiceError(
            "CANNOT_CALL_SELF",
            "You cannot call yourself.",
        );
    }

    /*
     * The conversation must exist.
     */
    const conversation =
        await findConversationById(
            input.conversationId,
        );

    if (!conversation) {
        throw new CallServiceError(
            "CONVERSATION_NOT_FOUND",
            "Conversation not found.",
        );
    }

    /*
     * The caller must belong to
     * the conversation.
     */
    const callerIsMember =
        await isConversationMember(
            input.conversationId,
            input.initiatedBy,
        );

    if (!callerIsMember) {
        throw new CallServiceError(
            "CALLER_NOT_IN_CONVERSATION",
            "The caller is not a member of this conversation.",
        );
    }

    /*
     * The callee must belong to
     * the same conversation.
     */
    const calleeIsMember =
        await isConversationMember(
            input.conversationId,
            input.calleeId,
        );

    if (!calleeIsMember) {
        throw new CallServiceError(
            "CALLEE_NOT_IN_CONVERSATION",
            "The callee is not a member of this conversation.",
        );
    }

    /*
     * Prevent the caller from starting
     * another call while already active.
     */
    const callerActiveCall =
        await findActiveCallForUser(
            input.initiatedBy,
        );

    if (callerActiveCall) {
        throw new CallServiceError(
            "CALLER_ALREADY_IN_CALL",
            "The caller is already in an active call.",
        );
    }

    /*
     * Prevent calling someone who is
     * already participating in another
     * active call.
     */
    const calleeActiveCall =
        await findActiveCallForUser(
            input.calleeId,
        );

    if (calleeActiveCall) {
        throw new CallServiceError(
            "CALLEE_ALREADY_IN_CALL",
            "The callee is already in an active call.",
        );
    }

    /*
     * Persist the call in the
     * "initiating" state.
     */
    const call =
        await createCall(input);

    /*
     * Notify realtime subscribers that
     * the call has been created.
     *
     * The database remains the source
     * of truth. WebSocket delivery is
     * only a realtime notification.
     */
    await broadcastCallEvent(
        call.id,
        "CALL_CREATED",
        input.initiatedBy,
    );

    /*
     * Move the call:
     *
     * initiating → ringing
     *
     * startRingingCall() also broadcasts
     * CALL_RINGING after the database
     * transition succeeds.
     */
    return startRingingCall(
        call.id,
        input.initiatedBy,
    );
}

export async function getCall(
    callId: string,
    userId: string,
) {
    const result =
        await findCallWithParticipants(
            callId,
        );

    if (!result) {
        throw new CallServiceError(
            "CALL_NOT_FOUND",
            "Call not found.",
        );
    }

    const isParticipant =
        result.participants.some(
            (participant) =>
                participant.userId ===
                userId,
        );

    if (!isParticipant) {
        throw new CallServiceError(
            "CALL_ACCESS_DENIED",
            "You are not a participant in this call.",
        );
    }

    return result;
}

export async function getCallEvents(
    callId: string,
    userId: string,
) {
    /*
     * getCall() also performs the
     * authorization check.
     */
    await getCall(
        callId,
        userId,
    );

    return listCallEvents(
        callId,
    );
}

export async function getUserCalls(
    userId: string,
    limit = 50,
) {
    return listUserCalls(
        userId,
        limit,
    );
}

export async function acceptCall(
    callId: string,
    userId: string,
) {
    const result =
        await acceptCallDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_ACCEPTED",
        userId,
    );

    return result;
}

export async function declineCall(
    callId: string,
    userId: string,
) {
    const result =
        await declineCallDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_DECLINED",
        userId,
    );

    return result;
}

export async function cancelCall(
    callId: string,
    userId: string,
) {
    const result =
        await cancelCallDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_CANCELLED",
        userId,
    );

    return result;
}

export async function markCallConnected(
    callId: string,
    userId: string,
) {
    const result =
        await markCallConnectedDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_CONNECTED",
        userId,
    );

    return result;
}

export async function endCall(
    callId: string,
    userId: string,
) {
    const result =
        await endCallDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_ENDED",
        userId,
    );

    return result;
}

export async function startRingingCall(
    callId: string,
    userId: string,
) {
    const result =
        await startRingingCallDomain(
            callId,
            userId,
        );

    await broadcastCallEvent(
        callId,
        "CALL_RINGING",
        userId,
    );

    return result;
}