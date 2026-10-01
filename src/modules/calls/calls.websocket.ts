// import type {
//     FastifyInstance,
// } from "fastify";

// import WebSocket from "ws";

// import {
//     findActiveSession,
// } from "../auth/sessions";

// import {
//     findUserById,
// } from "../auth/auth.repository";

// import {
//     findCallWithParticipants,
// } from "./calls.repository";

// import {
//     CALL_WS_EVENT,
// } from "./calls.types";

// import type {
//     CallWebSocketConnection,
//     CallWebSocketEvent,
//     CallWebSocketLifecycleEvent,
// } from "./calls.types";

// const connections =
//     new Set<CallWebSocketConnection>();

// /**
//  * Send a typed event to one WebSocket.
//  */
// function send(
//     socket: WebSocket,
//     event: CallWebSocketEvent,
// ) {
//     if (
//         socket.readyState !==
//         WebSocket.OPEN
//     ) {
//         return false;
//     }

//     try {
//         socket.send(
//             JSON.stringify(event),
//         );

//         return true;
//     } catch {
//         return false;
//     }
// }

// /**
//  * Send a standardized WebSocket error.
//  */
// function sendError(
//     socket: WebSocket,
//     code: string,
//     message: string,
// ) {
//     send(socket, {
//         type: CALL_WS_EVENT.ERROR,
//         code,
//         message,
//     });
// }

// /**
//  * Remove a connection from the
//  * in-memory connection registry.
//  */
// function removeConnection(
//     connection: CallWebSocketConnection,
// ) {
//     connections.delete(connection);
// }

// /**
//  * Remove a connection by socket.
//  *
//  * Used when authentication or setup
//  * fails before the Connection object
//  * is fully available.
//  */
// function removeConnectionBySocket(
//     socket: WebSocket,
// ) {
//     for (const connection of connections) {
//         if (
//             connection.socket ===
//             socket
//         ) {
//             connections.delete(
//                 connection,
//             );

//             return;
//         }
//     }
// }

// /**
//  * Send an event to every active socket
//  * belonging to a specific Miyor user.
//  *
//  * A user may have:
//  *
//  * - multiple browser tabs
//  * - desktop + mobile
//  * - multiple active sessions
//  *
//  * Therefore we intentionally send to
//  * every matching connection.
//  */
// function sendToUser(
//     userId: string,
//     event: CallWebSocketEvent,
// ) {
//     let deliveredCount = 0;

//     for (const connection of connections) {
//         /*
//          * Clean up dead sockets while
//          * iterating through the registry.
//          */
//         if (
//             connection.socket.readyState !==
//             WebSocket.OPEN
//         ) {
//             removeConnection(
//                 connection,
//             );

//             continue;
//         }

//         if (
//             connection.userId !==
//             userId
//         ) {
//             continue;
//         }

//         const delivered = send(
//             connection.socket,
//             event,
//         );

//         if (delivered) {
//             deliveredCount++;
//         } else {
//             removeConnection(
//                 connection,
//             );
//         }
//     }

//     return deliveredCount;
// }

// /**
//  * Parse a client WebSocket event.
//  *
//  * At this stage the client is only
//  * allowed to send PING.
//  *
//  * Call lifecycle transitions remain
//  * REST/domain operations.
//  *
//  * WebRTC signaling will be added to
//  * this protocol in the next phase.
//  */
// function parseClientEvent(
//     raw: string,
// ) {
//     try {
//         const parsed: unknown =
//             JSON.parse(raw);

//         if (
//             !parsed ||
//             typeof parsed !== "object"
//         ) {
//             return null;
//         }

//         const event =
//             parsed as Record<
//                 string,
//                 unknown
//             >;

//         if (
//             event.type ===
//             "PING"
//         ) {
//             return {
//                 type: "PING" as const,
//             };
//         }

//         return null;
//     } catch {
//         return null;
//     }
// }

// /**
//  * Broadcast a persisted call lifecycle
//  * event to every currently connected
//  * participant in the call.
//  *
//  * PostgreSQL remains the source of truth.
//  *
//  * The WebSocket only propagates the
//  * already-persisted state.
//  */
// export async function broadcastCallEvent(
//     callId: string,
//     eventType: CallWebSocketLifecycleEvent,
//     actorUserId?: string,
// ) {
//     const result =
//         await findCallWithParticipants(
//             callId,
//         );

//     if (!result) {
//         console.warn(
//             "[Call WS] Cannot broadcast: call not found.",
//             {
//                 callId,
//                 eventType,
//             },
//         );

//         return 0;
//     }

//     const event: CallWebSocketEvent =
//         {
//             type: eventType,

//             call: result.call,

//             participants:
//                 result.participants,

//             actorUserId:
//                 actorUserId ?? null,
//         };

//     let deliveredCount = 0;

//     /*
//      * Every participant receives the
//      * lifecycle event.
//      *
//      * Because sendToUser() sends to all
//      * sockets for a user, multiple tabs/
//      * devices are supported automatically.
//      */
//     for (const participant of
//         result.participants) {
//         deliveredCount +=
//             sendToUser(
//                 participant.userId,
//                 event,
//             );
//     }

//     console.log(
//         "[Call WS] Broadcast:",
//         {
//             event: eventType,
//             callId,
//             actorUserId:
//                 actorUserId ?? null,
//             deliveredCount,
//             activeConnections:
//                 connections.size,
//         },
//     );

//     return deliveredCount;
// }

// /**
//  * Register the native Miyor call
//  * WebSocket endpoint.
//  *
//  * Endpoint:
//  *
//  *     GET /calls/ws
//  */
// export function registerCallWebSocket(
//     app: FastifyInstance,
// ) {
//     app.get(
//         "/calls/ws",
//         {
//             websocket: true,
//         },
//         (socket, request) => {
//             request.log.info(
//                 {
//                     url: request.url,

//                     hasCookie:
//                         Boolean(
//                             request.cookies?.[
//                                 "miyor_session"
//                             ],
//                         ),
//                 },
//                 "[Call WS] Upgrade accepted",
//             );

//             void handleConnection(
//                 socket,
//                 request,
//             ).catch((error) => {
//                 request.log.error(
//                     error,
//                     "Call WebSocket connection handler failed",
//                 );

//                 removeConnectionBySocket(
//                     socket,
//                 );

//                 try {
//                     if (
//                         socket.readyState ===
//                         WebSocket.OPEN
//                     ) {
//                         socket.close(
//                             1011,
//                             "Internal server error",
//                         );
//                     }
//                 } catch {
//                     // Socket may already be closed.
//                 }
//             });
//         },
//     );
// }

// /**
//  * Authenticate and initialize a
//  * call WebSocket connection.
//  */
// async function handleConnection(
//     socket: WebSocket,
//     request: {
//         cookies: Record<
//             string,
//             string | undefined
//         >;

//         log: {
//             info?: (
//                 object: unknown,
//                 message?: string,
//             ) => void;

//             error: (
//                 error: unknown,
//                 message?: string,
//             ) => void;
//         };
//     },
// ) {
//     try {
//         const sessionCookie =
//             request.cookies[
//                 "miyor_session"
//             ];

//         /*
//          * WebSocket upgrades do not pass
//          * through the normal requireAuth
//          * HTTP preHandler.
//          *
//          * Therefore authentication is
//          * performed manually using the
//          * existing session cookie.
//          */
//         if (!sessionCookie) {
//             console.warn(
//                 "[Call WS] Rejected: missing session cookie.",
//             );

//             socket.close(
//                 1008,
//                 "Authentication required",
//             );

//             return;
//         }

//         const session =
//             await findActiveSession(
//                 sessionCookie,
//             );

//         if (!session) {
//             console.warn(
//                 "[Call WS] Rejected: invalid session.",
//             );

//             socket.close(
//                 1008,
//                 "Session expired or invalid",
//             );

//             return;
//         }

//         const user =
//             await findUserById(
//                 session.userId,
//             );

//         if (!user) {
//             console.warn(
//                 "[Call WS] Rejected: user not found.",
//             );

//             socket.close(
//                 1008,
//                 "User account not found",
//             );

//             return;
//         }

//         const connection: CallWebSocketConnection =
//             {
//                 socket,
//                 userId: user.id,
//             };

//         connections.add(
//             connection,
//         );

//         console.log(
//             "[Call WS] Connected:",
//             {
//                 userId: user.id,

//                 activeConnections:
//                     connections.size,
//             },
//         );

//         send(socket, {
//             type:
//                 CALL_WS_EVENT.CONNECTED,

//             userId: user.id,
//         });

//         socket.on(
//             "message",
//             (raw) => {
//                 void handleClientMessage(
//                     connection,
//                     raw.toString(),
//                 ).catch((error) => {
//                     request.log.error(
//                         error,
//                         "Call WebSocket message handler failed",
//                     );

//                     sendError(
//                         connection.socket,
//                         "INTERNAL_ERROR",
//                         "Unable to process WebSocket event.",
//                     );
//                 });
//             },
//         );

//         socket.on(
//             "close",
//             (code, reason) => {
//                 console.log(
//                     "[Call WS] Closed:",
//                     {
//                         userId:
//                             connection.userId,

//                         code,

//                         reason:
//                             reason.toString(),
//                     },
//                 );

//                 removeConnection(
//                     connection,
//                 );
//             },
//         );

//         socket.on(
//             "error",
//             (error) => {
//                 request.log.error(
//                     error,
//                     "Call WebSocket error",
//                 );

//                 removeConnection(
//                     connection,
//                 );
//             },
//         );
//     } catch (error) {
//         request.log.error(
//             error,
//             "Call WebSocket authentication/connection failed",
//         );

//         removeConnectionBySocket(
//             socket,
//         );

//         try {
//             if (
//                 socket.readyState ===
//                 WebSocket.OPEN
//             ) {
//                 socket.close(
//                     1011,
//                     "Internal server error",
//                 );
//             }
//         } catch {
//             // Socket may already be closed.
//         }
//     }
// }

// /**
//  * Handle events sent from the client.
//  *
//  * Lifecycle events are deliberately
//  * NOT accepted from the client.
//  *
//  * REST endpoints/domain operations
//  * remain authoritative for:
//  *
//  * - accept
//  * - decline
//  * - cancel
//  * - connect
//  * - end
//  *
//  * PING is currently the only client
//  * WebSocket event.
//  */
// async function handleClientMessage(
//     connection: CallWebSocketConnection,
//     raw: string,
// ) {
//     const event =
//         parseClientEvent(raw);

//     if (!event) {
//         sendError(
//             connection.socket,
//             "INVALID_EVENT",
//             "Invalid WebSocket event.",
//         );

//         return;
//     }

//     if (
//         event.type === "PING"
//     ) {
//         send(connection.socket, {
//             type:
//                 CALL_WS_EVENT.PONG,
//         });
//     }
// }