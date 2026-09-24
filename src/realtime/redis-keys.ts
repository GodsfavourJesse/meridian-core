export function roomPresenceKey(roomId: string) {
    return `room:${roomId}:presence`;
}

export function roomStateKey(roomId: string) {
    return `room:${roomId}:state`;
}

export function websocketSessionKey(connectionId: string) {
    return `ws:${connectionId}`;
}

export function participantConnectionKey(
    participantId: string,
) {
    return `participant:${participantId}:connection`;
}