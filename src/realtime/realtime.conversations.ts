import {
    realtimeConnections,
} from "./realtime.connection";

import type {
    RealtimeMessageEvent,
} from "./realtime.types";

export function broadcastConversationEvent(
    conversationId: string,
    event: RealtimeMessageEvent,
    excludeUserId?: string,
) {
    const deliveredCount =
        realtimeConnections.sendToConversation(
            conversationId,
            event,
            excludeUserId,
        );

    console.log(
        "[Realtime] Conversation broadcast:",
        {
            event: event.type,
            conversationId,
            deliveredCount,
            activeConnections:
                realtimeConnections.size,
        },
    );

    return deliveredCount;
}