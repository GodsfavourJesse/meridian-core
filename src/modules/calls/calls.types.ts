import type {
    CallEventType,
    CallParticipantRole,
    CallParticipantState,
    CallState,
    CallType,
} from "../../database/types/call.types";

import type {
    callParticipants,
    calls,
} from "../../database/schema/calls";

export interface CreateCallInput {
    conversationId: string;
    initiatedBy: string;
    calleeId: string;
    type: CallType;
}

export interface CreateCallParticipantInput {
    callId: string;
    userId: string;
    role: CallParticipantRole;
    state: CallParticipantState;
}

export interface CreateCallEventInput {
    callId: string;
    actorUserId?: string;
    type: CallEventType;
    metadata?: Record<string, unknown>;
}

export interface UpdateCallStateInput {
    callId: string;
    state: CallState;
    updatedAt?: Date;
}

export interface UpdateParticipantStateInput {
    callId: string;
    userId: string;
    state: CallParticipantState;
    joinedAt?: Date;
    leftAt?: Date;
}

export interface CallWithParticipants {
    call: typeof calls.$inferSelect;
    participants: Array<
        typeof callParticipants.$inferSelect
    >;
}