import { findCallWithParticipants } from "../modules/calls/calls.repository";
import {
    realtimeConnections,
} from "./realtime.connection";

import type {
    RealtimeCallEvent,
} from "./realtime.types";

type RealtimeCallLifecycleEvent =
    RealtimeCallEvent["type"];

export async function broadcastCallEvent(
    callId: string,
    eventType: RealtimeCallLifecycleEvent,
    actorUserId?: string,
) {
    /*
     * PostgreSQL is the source of truth.
     *
     * Always reload the call after the state
     * transition so every recipient receives
     * the persisted state rather than a state
     * constructed by the WebSocket layer.
     */
    const result =
        await findCallWithParticipants(
            callId,
        );

    if (!result) {
        console.warn(
            "[Realtime] Cannot broadcast call: call not found.",
            {
                callId,
                eventType,
            },
        );

        return 0;
    }

    const event: RealtimeCallEvent = {
        type: eventType,
        call: result.call,
        participants:
            result.participants,
        actorUserId:
            actorUserId ?? null,
    };

    let deliveredCount = 0;

    /*
     * A participant may have multiple
     * connected devices/tabs.
     *
     * realtimeConnections.sendToUser()
     * intentionally delivers to all of them.
     */
    for (const participant of
        result.participants) {
        deliveredCount +=
            realtimeConnections.sendToUser(
                participant.userId,
                event,
            );
    }

    console.log(
        "[Realtime] Call broadcast:",
        {
            event: eventType,
            callId,
            actorUserId:
                actorUserId ?? null,
            deliveredCount,
            activeConnections:
                realtimeConnections.size,
        },
    );

    return deliveredCount;
}