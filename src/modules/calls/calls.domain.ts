import { CALL_EVENT_TYPE, CALL_PARTICIPANT_ROLE, CALL_PARTICIPANT_STATE, CALL_STATE } from "../../database/constants/call.constants";
import { CallState } from "../../database/types/call.types";
import {
    createCallEvent,
    findCallById,
    findCallParticipant,
    findCallWithParticipants,
    updateCallState,
    updateParticipantState,
} from "./calls.repository";


export class CallDomainError
    extends Error
{
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);

        this.name =
            "CallDomainError";
    }
}

const TERMINAL_CALL_STATES =
    new Set<CallState>([
        CALL_STATE.DECLINED,
        CALL_STATE.MISSED,
        CALL_STATE.CANCELLED,
        CALL_STATE.ENDED,
        CALL_STATE.FAILED,
    ]);

function assertCallExists(
    call: Awaited<
        ReturnType<typeof findCallById>
    >,
): asserts call is NonNullable<typeof call> {
    if (!call) {
        throw new CallDomainError(
            "CALL_NOT_FOUND",
            "Call not found.",
        );
    }
}

function assertNotTerminal(
    state: CallState,
) {
    if (
        TERMINAL_CALL_STATES.has(
            state,
        )
    ) {
        throw new CallDomainError(
            "CALL_ALREADY_FINISHED",
            "This call has already finished.",
        );
    }
}

export async function acceptCall(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    assertNotTerminal(call.state as CallState);

    if (
        call.state !==
        CALL_STATE.RINGING
    ) {
        throw new CallDomainError(
            "INVALID_CALL_STATE",
            "Only a ringing call can be accepted.",
        );
    }

    const participant =
        await findCallParticipant(
            callId,
            userId,
        );

    if (!participant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_NOT_FOUND",
            "You are not a participant in this call.",
        );
    }

    if (
        participant.role !==
        "callee"
    ) {
        throw new CallDomainError(
            "INVALID_CALL_PARTICIPANT",
            "Only the callee can accept the call.",
        );
    }

    if (
        participant.state !==
        CALL_PARTICIPANT_STATE.RINGING
    ) {
        throw new CallDomainError(
            "INVALID_PARTICIPANT_STATE",
            "This participant cannot accept the call.",
        );
    }

    const updatedParticipant =
        await updateParticipantState(
            callId,
            userId,
            CALL_PARTICIPANT_STATE.ACCEPTED,
        );

    if (!updatedParticipant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_UPDATE_FAILED",
            "Failed to accept the call.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.ACCEPTED,
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to accept the call.",
        );
    }

    await createCallEvent({
        callId,
        actorUserId: userId,
        type:
            CALL_EVENT_TYPE.ACCEPTED,
    });

    return updatedCall;
}

export async function declineCall(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    assertNotTerminal(call.state as CallState);

    if (
        call.state !==
        CALL_STATE.RINGING
    ) {
        throw new CallDomainError(
            "INVALID_CALL_STATE",
            "Only a ringing call can be declined.",
        );
    }

    const participant =
        await findCallParticipant(
            callId,
            userId,
        );

    if (!participant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_NOT_FOUND",
            "You are not a participant in this call.",
        );
    }

    if (
        participant.role !==
        "callee"
    ) {
        throw new CallDomainError(
            "INVALID_CALL_PARTICIPANT",
            "Only the callee can decline the call.",
        );
    }

    const updatedParticipant =
        await updateParticipantState(
            callId,
            userId,
            CALL_PARTICIPANT_STATE.DECLINED,
            {
                leftAt: new Date(),
            },
        );

    if (!updatedParticipant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_UPDATE_FAILED",
            "Failed to decline the call.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.DECLINED,
            {
                endedAt: new Date(),
            },
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to decline the call.",
        );
    }

    await createCallEvent({
        callId,
        actorUserId: userId,
        type:
            CALL_EVENT_TYPE.DECLINED,
    });

    return updatedCall;
}

export async function cancelCall(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    assertNotTerminal(call.state as CallState);

    if (
        call.initiatedBy !==
        userId
    ) {
        throw new CallDomainError(
            "NOT_CALL_INITIATOR",
            "Only the caller can cancel the call.",
        );
    }

    if (
        call.state !==
            CALL_STATE.INITIATING &&
        call.state !==
            CALL_STATE.RINGING
    ) {
        throw new CallDomainError(
            "INVALID_CALL_STATE",
            "This call can no longer be cancelled.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.CANCELLED,
            {
                endedAt: new Date(),
            },
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to cancel the call.",
        );
    }

    await updateParticipantState(
        callId,
        userId,
        CALL_PARTICIPANT_STATE.CANCELLED,
        {
            leftAt: new Date(),
        },
    );

    await createCallEvent({
        callId,
        actorUserId: userId,
        type:
            CALL_EVENT_TYPE.CANCELLED,
    });

    return updatedCall;
}

export async function markCallConnected(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    if (
        call.state !==
            CALL_STATE.ACCEPTED &&
        call.state !==
            CALL_STATE.CONNECTED
    ) {
        throw new CallDomainError(
            "INVALID_CALL_STATE",
            "Only an accepted call can become connected.",
        );
    }

    const participant =
        await findCallParticipant(
            callId,
            userId,
        );

    if (!participant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_NOT_FOUND",
            "You are not a participant in this call.",
        );
    }

    const now = new Date();

    const updatedParticipant =
        await updateParticipantState(
            callId,
            userId,
            CALL_PARTICIPANT_STATE.CONNECTED,
            {
                joinedAt:
                    participant.joinedAt ??
                    now,
            },
        );

    if (!updatedParticipant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_UPDATE_FAILED",
            "Failed to connect the participant.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.CONNECTED,
            {
                connectedAt:
                    call.connectedAt ??
                    now,
            },
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to connect the call.",
        );
    }

    if (
        call.state !==
        CALL_STATE.CONNECTED
    ) {
        await createCallEvent({
            callId,
            actorUserId: userId,
            type:
                CALL_EVENT_TYPE.CONNECTED,
        });
    }

    return updatedCall;
}

export async function endCall(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    if (
        TERMINAL_CALL_STATES.has(
            call.state as CallState,
        )
    ) {
        throw new CallDomainError(
            "CALL_ALREADY_FINISHED",
            "This call has already finished.",
        );
    }

    const participant =
        await findCallParticipant(
            callId,
            userId,
        );

    if (!participant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_NOT_FOUND",
            "You are not a participant in this call.",
        );
    }

    const now = new Date();

    const updatedParticipant =
        await updateParticipantState(
            callId,
            userId,
            CALL_PARTICIPANT_STATE.ENDED,
            {
                leftAt: now,
            },
        );

    if (!updatedParticipant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_UPDATE_FAILED",
            "Failed to end the call for this participant.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.ENDED,
            {
                endedAt: now,
            },
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to end the call.",
        );
    }

    await createCallEvent({
        callId,
        actorUserId: userId,
        type:
            CALL_EVENT_TYPE.ENDED,
    });

    return updatedCall;
}

export async function startRingingCall(
    callId: string,
    userId: string,
) {
    const call =
        await findCallById(callId);

    assertCallExists(call);

    if (
        call.initiatedBy !==
        userId
    ) {
        throw new CallDomainError(
            "NOT_CALL_INITIATOR",
            "Only the caller can start ringing the call.",
        );
    }

    if (
        call.state !==
        CALL_STATE.INITIATING
    ) {
        throw new CallDomainError(
            "INVALID_CALL_STATE",
            "Only an initiating call can start ringing.",
        );
    }

    const participants =
        await findCallWithParticipants(
            callId,
        );

    if (!participants) {
        throw new CallDomainError(
            "CALL_NOT_FOUND",
            "Call not found.",
        );
    }

    const callee =
        participants.participants.find(
            (participant) =>
                participant.role ===
                CALL_PARTICIPANT_ROLE.CALLEE,
        );

    if (!callee) {
        throw new CallDomainError(
            "CALLEE_NOT_FOUND",
            "Call callee was not found.",
        );
    }

    if (
        callee.state !==
        CALL_PARTICIPANT_STATE.INVITED
    ) {
        throw new CallDomainError(
            "INVALID_PARTICIPANT_STATE",
            "The callee cannot be moved to ringing from the current state.",
        );
    }

    const updatedParticipant =
        await updateParticipantState(
            callId,
            callee.userId,
            CALL_PARTICIPANT_STATE.RINGING,
        );

    if (!updatedParticipant) {
        throw new CallDomainError(
            "CALL_PARTICIPANT_UPDATE_FAILED",
            "Failed to start ringing for the callee.",
        );
    }

    const updatedCall =
        await updateCallState(
            callId,
            CALL_STATE.RINGING,
        );

    if (!updatedCall) {
        throw new CallDomainError(
            "CALL_UPDATE_FAILED",
            "Failed to start ringing the call.",
        );
    }

    await createCallEvent({
        callId,
        actorUserId: userId,
        type:
            CALL_EVENT_TYPE.RINGING,
    });

    return updatedCall;
}