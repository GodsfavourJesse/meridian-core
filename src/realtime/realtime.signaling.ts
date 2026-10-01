import {
    findCallWithParticipants,
} from "../modules/calls/calls.repository";

import {
    realtimeConnections,
} from "./realtime.connection";

import type {
    RealtimeConnection,
    RealtimeWebRTCClientEvent,
    RealtimeWebRTCServerEvent,
} from "./realtime.types";

const SIGNALING_CALL_STATES = new Set([
    "accepted",
    "connected",
]);

type SignalingEventType =
    RealtimeWebRTCClientEvent["type"];

function isSignalingCallState(
    state: string,
): boolean {
    return SIGNALING_CALL_STATES.has(state);
}

function sendSignalingError(
    connection: RealtimeConnection,
    code: string,
    message: string,
) {
    realtimeConnections.sendError(
        connection.socket,
        code,
        message,
    );
}

export async function handleWebRTCSignaling(
    connection: RealtimeConnection,
    event: RealtimeWebRTCClientEvent,
) {
    /*
     * ----------------------------------------------------------------------
     * Load the persisted call
     * ----------------------------------------------------------------------
     */

    const result =
        await findCallWithParticipants(
            event.callId,
        );

    if (!result) {
        sendSignalingError(
            connection,
            "CALL_NOT_FOUND",
            "Call not found.",
        );

        return;
    }

    const {
        call,
        participants,
    } = result;

    /*
     * ----------------------------------------------------------------------
     * Verify that the authenticated socket belongs
     * to a participant in this call.
     * ----------------------------------------------------------------------
     *
     * We NEVER trust a user ID supplied by the browser.
     */

    const ownParticipant =
        participants.find(
            (participant) =>
                participant.userId ===
                connection.userId,
        );

    if (!ownParticipant) {
        sendSignalingError(
            connection,
            "CALL_ACCESS_DENIED",
            "You are not a participant in this call.",
        );

        return;
    }

    const allowedParticipantStates =
        new Set([
            "accepted",
            "connected",
        ]);

    if (
        !allowedParticipantStates.has(
            ownParticipant.state,
        )
    ) {
        sendSignalingError(
            connection,
            "CALL_PARTICIPANT_NOT_READY",
            "Your call participant is not ready for WebRTC signaling.",
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * Verify call lifecycle state
     * ----------------------------------------------------------------------
     *
     * Signaling is only allowed after the callee has
     * accepted the call.
     */

    if (
        !isSignalingCallState(
            call.state,
        )
    ) {
        sendSignalingError(
            connection,
            "CALL_NOT_READY",
            "This call is not ready for WebRTC signaling.",
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * Find the remote participant
     * ----------------------------------------------------------------------
     */

    const remoteParticipant =
        participants.find(
            (participant) =>
                participant.userId !==
                connection.userId,
        );

    if (!remoteParticipant) {
        sendSignalingError(
            connection,
            "REMOTE_PARTICIPANT_NOT_FOUND",
            "The other call participant could not be found.",
        );

        return;
    }

    /*
     * ----------------------------------------------------------------------
     * Build the server-side signaling event
     * ----------------------------------------------------------------------
     *
     * The destination is derived from the database.
     * The client cannot choose who receives the signal.
     */

    let serverEvent:
        RealtimeWebRTCServerEvent;

    switch (event.type) {
        case "OFFER":
            serverEvent = {
                type: "OFFER",
                callId: call.id,
                fromUserId: connection.userId,
                sdp: event.sdp,
            };
            break;

        case "ANSWER":
            serverEvent = {
                type: "ANSWER",
                callId: call.id,
                fromUserId: connection.userId,
                sdp: event.sdp,
            };
            break;

        case "ICE_CANDIDATE":
            serverEvent = {
                type: "ICE_CANDIDATE",
                callId: call.id,
                fromUserId: connection.userId,
                candidate: event.candidate,
            };
            break;

        case "MEDIA_STATE":
            serverEvent = {
                type: "MEDIA_STATE",
                callId: call.id,
                fromUserId: connection.userId,
                audioEnabled: event.audioEnabled,
                videoEnabled: event.videoEnabled,
            };
            break;
    }

    /*
     * ----------------------------------------------------------------------
     * Relay only to the other participant
     * ----------------------------------------------------------------------
     */

    const deliveredCount =
        realtimeConnections.sendToUser(
            remoteParticipant.userId,
            serverEvent,
        );

    console.log(
        "[Realtime] WebRTC signaling relayed:",
        {
            event: event.type,
            callId: call.id,
            fromUserId:
                connection.userId,
            toUserId:
                remoteParticipant.userId,
            deliveredCount,
        },
    );
}