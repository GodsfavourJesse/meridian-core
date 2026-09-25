export type RealtimeEvent =
    | {
          type: "ROOM_JOINED";

          participant: {
              participantId: string;
              displayName: string;
              role: "host" | "guest";
          };
      }

    | {
          type: "ROOM_LEFT";

          participant: {
              participantId: string;
              displayName: string;
          };
      }

    | {
          type: "ROOM_PRESENCE";

          participants: Array<{
              participantId: string;
              displayName: string;
              role: "host" | "guest";
          }>;
      }

    | {
          type: "OFFER";

          from: string;

          sdp: RTCSessionDescriptionInit;
      }

    | {
          type: "ANSWER";

          from: string;

          sdp: RTCSessionDescriptionInit;
      }

    | {
          type: "ICE_CANDIDATE";

          from: string;

          candidate: RTCIceCandidateInit;
      };