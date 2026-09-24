export type RealtimeEvent =
    |   {
          type: "ROOM_JOINED";
          participant: {
              participantId: string;
              displayName: string;
              role: "host" | "guest";
          };
        }
    |   {
          type: "ROOM_LEFT";
          participant: {
              participantId: string;
              displayName: string;
          };
        }
    |   {
          type: "ROOM_PRESENCE";
          participants: Array<{
              participantId: string;
              displayName: string;
              role: "host" | "guest";
          }>;
        };