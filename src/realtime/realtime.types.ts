import type WebSocket from "ws";
import { callParticipants, calls } from "../database/schema";

/*
 * --------------------------------------------------------------------------
 * Realtime event protocol
 * --------------------------------------------------------------------------
 *
 * This is the application's single WebSocket protocol.
 *
 * REST remains responsible for persistent state transitions.
 * WebSocket is responsible for realtime delivery and, later, WebRTC
 * signaling.
 */

export const REALTIME_EVENT = {
    CONNECTED: "CONNECTED",
    PONG: "PONG",
    ERROR: "ERROR",

    SUBSCRIBED: "SUBSCRIBED",
    UNSUBSCRIBED: "UNSUBSCRIBED",

    MESSAGE_NEW: "MESSAGE_NEW",
    MESSAGE_READ: "MESSAGE_READ",

    CALL_CREATED: "CALL_CREATED",
    CALL_RINGING: "CALL_RINGING",
    CALL_ACCEPTED: "CALL_ACCEPTED",
    CALL_DECLINED: "CALL_DECLINED",
    CALL_CANCELLED: "CALL_CANCELLED",
    CALL_MISSED: "CALL_MISSED",
    CALL_CONNECTED: "CALL_CONNECTED",
    CALL_ENDED: "CALL_ENDED",
    CALL_FAILED: "CALL_FAILED",

    PRESENCE_ONLINE: "PRESENCE_ONLINE",
    PRESENCE_OFFLINE: "PRESENCE_OFFLINE",

    OFFER: "OFFER",
    ANSWER: "ANSWER",
    ICE_CANDIDATE: "ICE_CANDIDATE",
} as const;

export type RealtimeEventType =
    (typeof REALTIME_EVENT)[keyof typeof REALTIME_EVENT];

/*
 * --------------------------------------------------------------------------
 * Server → client
 * --------------------------------------------------------------------------
 */

export type RealtimeConnectedEvent = {
    type: "CONNECTED";
    userId: string;
};

export type RealtimePongEvent = {
    type: "PONG";
};

export type RealtimeErrorEvent = {
    type: "ERROR";
    code: string;
    message: string;
};

export type RealtimeSubscriptionEvent =
    | {
          type: "SUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBED";
          conversationId: string;
      };

export type RealtimeMessageEvent =
    | {
          type: "MESSAGE_NEW";
          message: unknown;
      }
    | {
          type: "MESSAGE_READ";
          conversationId: string;
          readerId: string;
          messageIds: string[];
          readAt: string;
      };

/*
 * Call payload deliberately mirrors the persisted records.
 *
 * This keeps realtime call events consistent with the REST API.
 */
export type RealtimeCallEvent = {
    type:
        | "CALL_CREATED"
        | "CALL_RINGING"
        | "CALL_ACCEPTED"
        | "CALL_DECLINED"
        | "CALL_CANCELLED"
        | "CALL_MISSED"
        | "CALL_CONNECTED"
        | "CALL_ENDED"
        | "CALL_FAILED";

    call: typeof calls.$inferSelect;

    participants: Array<
        typeof callParticipants.$inferSelect
    >;

    actorUserId: string | null;
};

export type RealtimePresenceEvent =
    | {
          type: "PRESENCE_ONLINE";
          userId: string;
      }
    | {
          type: "PRESENCE_OFFLINE";
          userId: string;
      };

export type RealtimeWebRTCServerEvent =
    | {
          type: "OFFER";
          callId: string;
          fromUserId: string;
          sdp: string;
      }
    | {
          type: "ANSWER";
          callId: string;
          fromUserId: string;
          sdp: string;
      }
    | {
          type: "ICE_CANDIDATE";
          callId: string;
          fromUserId: string;
          candidate: {
              candidate: string;
              sdpMid: string | null;
              sdpMLineIndex: number | null;
              usernameFragment?: string | null;
          };
      };

export type RealtimeServerEvent =
    | RealtimeConnectedEvent
    | RealtimePongEvent
    | RealtimeErrorEvent
    | RealtimeSubscriptionEvent
    | RealtimeMessageEvent
    | RealtimeCallEvent
    | RealtimePresenceEvent
    | RealtimeWebRTCServerEvent;

/*
 * --------------------------------------------------------------------------
 * Client → server
 * --------------------------------------------------------------------------
 */

export type RealtimeWebRTCClientEvent =
    | {
          type: "OFFER";
          callId: string;
          sdp: string;
      }
    | {
          type: "ANSWER";
          callId: string;
          sdp: string;
      }
    | {
          type: "ICE_CANDIDATE";
          callId: string;
          candidate: {
              candidate: string;
              sdpMid: string | null;
              sdpMLineIndex: number | null;
              usernameFragment?: string | null;
          };
      };

export type RealtimeClientEvent =
    | {
          type: "PING";
      }
    | {
          type: "SUBSCRIBE_CONVERSATION";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBE_CONVERSATION";
          conversationId: string;
      }
    | RealtimeWebRTCClientEvent;

/*
 * --------------------------------------------------------------------------
 * Connection
 * --------------------------------------------------------------------------
 */

export type RealtimeConnection = {
    socket: WebSocket;
    userId: string;
    conversationIds: Set<string>;
};