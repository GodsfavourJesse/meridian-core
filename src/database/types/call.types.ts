import { CALL_EVENT_TYPE, CALL_PARTICIPANT_ROLE, CALL_PARTICIPANT_STATE, CALL_STATE, CALL_TYPE } from "../constants/call.constants";

export type CallType =
    (typeof CALL_TYPE)[keyof typeof CALL_TYPE];

export type CallState =
    (typeof CALL_STATE)[keyof typeof CALL_STATE];

export type CallParticipantRole =
    (typeof CALL_PARTICIPANT_ROLE)[keyof typeof CALL_PARTICIPANT_ROLE];

export type CallParticipantState =
    (typeof CALL_PARTICIPANT_STATE)[keyof typeof CALL_PARTICIPANT_STATE];

export type CallEventType =
    (typeof CALL_EVENT_TYPE)[keyof typeof CALL_EVENT_TYPE];