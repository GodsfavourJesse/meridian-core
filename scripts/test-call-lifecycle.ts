import "dotenv/config";

import WebSocket from "ws";

const API_URL =
    process.env.API_URL ??
    "http://localhost:4000";

const TEST_PASSWORD = "MiyorTest123!";

const USER_A = {
    email: "miyor.test.1@miyor.local",
    password: TEST_PASSWORD,
};

const USER_B = {
    email: "miyor.test.2@miyor.local",
    password: TEST_PASSWORD,
};

type LoginResponse = {
    user: {
        id: string;
        displayName: string;
        username: string;
        email: string;
        miyorNumber: string | null;
    };
};

type Contact = {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: string;
    user: {
        id: string;
    };
};

type ContactResponse = {
    contact: {
        id: string;
        requesterId: string;
        addresseeId: string;
        status: string;
    };
};

type ContactListResponse = {
    contacts: Contact[];
};

type Conversation = {
    id: string;
};

type ConversationResponse = {
    conversation?: Conversation;
    data?: Conversation;
    id?: string;
};

type CallData = {
    id: string;
    conversationId: string;
    type: string;
    state: string;
    initiatedBy: string;
};

type CallResponse = {
    call?: CallData;
    data?: CallData;
    id?: string;
    conversationId?: string;
    type?: string;
    state?: string;
    initiatedBy?: string;
    participants?: Array<{
        id: string;
        callId: string;
        userId: string;
        role: string;
        state: string;
    }>;
};

type WebSocketEvent = {
    type: string;
    call?: {
        id: string;
        conversationId?: string;
        type?: string;
        state: string;
        initiatedBy?: string;
    };
    participants?: Array<{
        userId: string;
        role?: string;
        state: string;
    }>;
    actorUserId?: string | null;
    userId?: string;
    code?: string;
    message?: string;
};

function assertDevelopmentEnvironment() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error(
            "Call lifecycle tests can only run in development.",
        );
    }
}

async function login(
    credentials: {
        email: string;
        password: string;
    },
): Promise<{
    user: LoginResponse["user"];
    sessionCookie: string;
}> {
    const response = await fetch(
        `${API_URL}/auth/login`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Login failed (${response.status}): ${body}`,
        );
    }

    const data =
        (await response.json()) as LoginResponse;

    const setCookie =
        response.headers.get("set-cookie");

    if (!setCookie) {
        throw new Error(
            "Login succeeded but no session cookie was returned.",
        );
    }

    const sessionCookie =
        setCookie.split(";")[0];

    if (!sessionCookie) {
        throw new Error(
            "Login succeeded but the session cookie was empty.",
        );
    }

    return {
        user: data.user,
        sessionCookie,
    };
}

async function listContacts(
    sessionCookie: string,
): Promise<Contact[]> {
    const response = await fetch(
        `${API_URL}/contacts`,
        {
            method: "GET",
            headers: {
                Cookie: sessionCookie,
            },
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Contact listing failed (${response.status}): ${body}`,
        );
    }

    const data =
        (await response.json()) as ContactListResponse;

    return data.contacts ?? [];
}

async function sendContactRequest(
    sessionCookie: string,
    userId: string,
): Promise<ContactResponse> {
    const response = await fetch(
        `${API_URL}/contacts`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
            },
            body: JSON.stringify({
                userId,
            }),
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Contact request failed (${response.status}): ${body}`,
        );
    }

    return (await response.json()) as ContactResponse;
}

async function acceptContact(
    sessionCookie: string,
    contactId: string,
): Promise<ContactResponse> {
    const response = await fetch(
        `${API_URL}/contacts/${contactId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
            },
            body: JSON.stringify({
                status: "accepted",
            }),
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Contact acceptance failed (${response.status}): ${body}`,
        );
    }

    return (await response.json()) as ContactResponse;
}

async function ensureAcceptedContact(
    userASessionCookie: string,
    userAId: string,
    userBSessionCookie: string,
    userBId: string,
): Promise<Contact> {
    const contacts = await listContacts(
        userASessionCookie,
    );

    const existing = contacts.find(
        (contact) =>
            contact.user.id === userBId ||
            contact.requesterId === userBId ||
            contact.addresseeId === userBId,
    );

    if (existing) {
        if (existing.status === "accepted") {
            console.log(
                `   ✅ Existing accepted contact: ${existing.id}`,
            );

            return existing;
        }

        if (existing.status === "blocked") {
            throw new Error(
                `Contact ${existing.id} is blocked. Unblock the test users before running the lifecycle test.`,
            );
        }

        if (existing.status === "pending") {
            console.log(
                `   ℹ️ Existing pending contact: ${existing.id}`,
            );

            const addresseeIsUserA =
                existing.addresseeId === userAId;

            const addresseeSession =
                addresseeIsUserA
                    ? userASessionCookie
                    : userBSessionCookie;

            await acceptContact(
                addresseeSession,
                existing.id,
            );

            console.log(
                "   ✅ Existing contact request accepted.",
            );

            return {
                ...existing,
                status: "accepted",
            };
        }

        if (existing.status === "declined") {
            console.log(
                "   ℹ️ Existing contact was declined. Re-sending request...",
            );

            const requesterIsUserA =
                existing.requesterId === userAId;

            const requesterSession =
                requesterIsUserA
                    ? userASessionCookie
                    : userBSessionCookie;

            const addresseeSession =
                requesterIsUserA
                    ? userBSessionCookie
                    : userASessionCookie;

            const addresseeId =
                requesterIsUserA
                    ? userBId
                    : userAId;

            const request =
                await sendContactRequest(
                    requesterSession,
                    addresseeId,
                );

            await acceptContact(
                addresseeSession,
                request.contact.id,
            );

            console.log(
                "   ✅ Contact request re-sent and accepted.",
            );

            return {
                id: request.contact.id,
                requesterId:
                    request.contact.requesterId,
                addresseeId:
                    request.contact.addresseeId,
                status: "accepted",
                user: {
                    id: addresseeId,
                },
            };
        }
    }

    console.log(
        "   ℹ️ No existing contact. Sending contact request...",
    );

    const request =
        await sendContactRequest(
            userASessionCookie,
            userBId,
        );

    console.log(
        `   ✅ Contact request: ${request.contact.id}`,
    );

    await acceptContact(
        userBSessionCookie,
        request.contact.id,
    );

    console.log(
        "   ✅ User B accepted the contact request.",
    );

    return {
        id: request.contact.id,
        requesterId:
            request.contact.requesterId,
        addresseeId:
            request.contact.addresseeId,
        status: "accepted",
        user: {
            id: userBId,
        },
    };
}

async function createConversation(
    sessionCookie: string,
    participantId: string,
): Promise<Conversation> {
    const response = await fetch(
        `${API_URL}/conversations`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
            },
            body: JSON.stringify({
                userId: participantId,
            }),
        },
    );

    const body =
        (await response.json()) as ConversationResponse & {
            status?: string;
            message?: string;
            errors?: unknown;
        };

    if (!response.ok) {
        throw new Error(
            `Conversation creation failed (${response.status}): ${JSON.stringify(body)}`,
        );
    }

    const conversation =
        body.conversation ??
        body.data ??
        (body.id
            ? {
                  id: body.id,
              }
            : undefined);

    if (!conversation?.id) {
        throw new Error(
            `Conversation response did not contain an id: ${JSON.stringify(body)}`,
        );
    }

    return conversation;
}

async function createCall(
    sessionCookie: string,
    conversationId: string,
    calleeId: string,
): Promise<{
    call: CallData;
    participants: Array<{
        id: string;
        callId: string;
        userId: string;
        role: string;
        state: string;
    }>;
}> {
    const response = await fetch(
        `${API_URL}/calls`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
            },
            body: JSON.stringify({
                conversationId,
                calleeId,
                type: "voice",
            }),
        },
    );

    const body =
        (await response.json()) as CallResponse;

    if (!response.ok) {
        throw new Error(
            `Call creation failed (${response.status}): ${JSON.stringify(body)}`,
        );
    }

    const rawCall =
        body.call ??
        body.data ??
        (body.id
            ? {
                  id: body.id,
                  conversationId:
                      body.conversationId ??
                      conversationId,
                  type:
                      body.type ??
                      "voice",
                  state:
                      body.state ??
                      "initiating",
                  initiatedBy:
                      body.initiatedBy ??
                      "",
              }
            : undefined);

    if (!rawCall?.id) {
        throw new Error(
            `Call response did not contain a call id: ${JSON.stringify(body)}`,
        );
    }

    return {
        call: rawCall,
        participants:
            body.participants ?? [],
    };
}

async function transitionCall(
    sessionCookie: string,
    callId: string,
    action:
        | "accept"
        | "connect"
        | "end",
) {
    const response = await fetch(
        `${API_URL}/calls/${callId}/${action}`,
        {
            method: "POST",
            headers: {
                Cookie: sessionCookie,
            },
        },
    );

    const body = await response.json();

    if (!response.ok) {
        throw new Error(
            `${action} failed (${response.status}): ${JSON.stringify(body)}`,
        );
    }

    return body;
}

function waitForEvent(
    socket: WebSocket,
    expectedType: string,
    timeoutMs = 5000,
): Promise<WebSocketEvent> {
    return new Promise<WebSocketEvent>(
        (resolve, reject) => {
            const timeout =
                setTimeout(() => {
                    socket.off(
                        "message",
                        handleMessage,
                    );

                    reject(
                        new Error(
                            `Timed out waiting for ${expectedType}.`,
                        ),
                    );
                }, timeoutMs);

            function handleMessage(
                raw: WebSocket.RawData,
            ) {
                let event: WebSocketEvent;

                try {
                    event =
                        JSON.parse(
                            raw.toString(),
                        ) as WebSocketEvent;
                } catch {
                    return;
                }

                console.log(
                    "   ← WS",
                    event.type,
                );

                if (
                    event.type !==
                    expectedType
                ) {
                    return;
                }

                clearTimeout(timeout);

                socket.off(
                    "message",
                    handleMessage,
                );

                resolve(event);
            }

            socket.on(
                "message",
                handleMessage,
            );
        },
    );
}

async function connectWebSocket(
    sessionCookie: string,
): Promise<WebSocket> {
    const wsUrl =
        API_URL.replace(
            /^http/,
            "ws",
        ) + "/calls/ws";

    const socket = new WebSocket(
        wsUrl,
        {
            headers: {
                Cookie: sessionCookie,
            },
        },
    );

    /*
     * IMPORTANT:
     *
     * Register the CONNECTED listener before waiting for
     * the socket's "open" event. The server sends CONNECTED
     * immediately after authentication, so waiting until
     * after "open" can miss the message.
     */
    const connectedEventPromise =
        waitForEvent(
            socket,
            "CONNECTED",
        );

    await new Promise<void>(
        (resolve, reject) => {
            const timeout =
                setTimeout(() => {
                    reject(
                        new Error(
                            "WebSocket connection timed out.",
                        ),
                    );
                }, 5000);

            socket.once(
                "open",
                () => {
                    clearTimeout(
                        timeout,
                    );

                    resolve();
                },
            );

            socket.once(
                "error",
                (error) => {
                    clearTimeout(
                        timeout,
                    );

                    reject(error);
                },
            );
        },
    );

    await connectedEventPromise;

    return socket;
}

async function main() {
    assertDevelopmentEnvironment();

    console.log("");
    console.log(
        "=== Miyor Native Call Lifecycle Test ===",
    );
    console.log("");

    // ----------------------------------------------------------------------
    // 1. Login both users
    // ----------------------------------------------------------------------

    console.log(
        "1. Logging in test users...",
    );

    const userA =
        await login(USER_A);

    const userB =
        await login(USER_B);

    console.log(
        `   ✅ User A: ${userA.user.username}`,
    );

    console.log(
        `   ✅ User B: ${userB.user.username}`,
    );

    // ----------------------------------------------------------------------
    // 2. Establish accepted contact
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "2. Establishing accepted contact...",
    );

    await ensureAcceptedContact(
        userA.sessionCookie,
        userA.user.id,
        userB.sessionCookie,
        userB.user.id,
    );

    // ----------------------------------------------------------------------
    // 3. Create conversation
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "3. Creating conversation...",
    );

    const conversation =
        await createConversation(
            userA.sessionCookie,
            userB.user.id,
        );

    console.log(
        `   ✅ Conversation: ${conversation.id}`,
    );

    // ----------------------------------------------------------------------
    // 4. Connect both call WebSockets
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "4. Connecting call WebSockets...",
    );

    const socketA =
        await connectWebSocket(
            userA.sessionCookie,
        );

    const socketB =
        await connectWebSocket(
            userB.sessionCookie,
        );

    console.log(
        "   ✅ User A WebSocket connected.",
    );

    console.log(
        "   ✅ User B WebSocket connected.",
    );

    // ----------------------------------------------------------------------
    // 5. Create voice call
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "5. Creating voice call...",
    );

    /*
     * Register BOTH lifecycle listeners before creating the call.
     *
     * The backend broadcasts CALL_CREATED and CALL_RINGING
     * immediately after the REST request, so registering the
     * second listener after awaiting the first can miss it.
     */
    const createdEventPromise =
        waitForEvent(
            socketB,
            "CALL_CREATED",
        );

    const ringingEventPromise =
        waitForEvent(
            socketB,
            "CALL_RINGING",
        );

    const callPromise =
        createCall(
            userA.sessionCookie,
            conversation.id,
            userB.user.id,
        );

    const [
        createdEvent,
        ringingEvent,
        call,
    ] = await Promise.all([
        createdEventPromise,
        ringingEventPromise,
        callPromise,
    ]);

    console.log(
        `   ✅ Call created: ${call.call.id}`,
    );

    console.log(
        `   ✅ State: ${call.call.state}`,
    );

    if (
        createdEvent.call?.id !==
        call.call.id
    ) {
        throw new Error(
            "CALL_CREATED contains an unexpected call ID.",
        );
    }

    if (
        ringingEvent.call?.id !==
        call.call.id
    ) {
        throw new Error(
            "CALL_RINGING contains an unexpected call ID.",
        );
    }

    console.log(
        "   ✅ User B received CALL_CREATED.",
    );

    console.log(
        "   ✅ User B received CALL_RINGING.",
    );

    // ----------------------------------------------------------------------
    // 6. Accept call
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "6. Accepting call as User B...",
    );

    const acceptedEventPromise =
        waitForEvent(
            socketA,
            "CALL_ACCEPTED",
        );

    await transitionCall(
        userB.sessionCookie,
        call.call.id,
        "accept",
    );

    await acceptedEventPromise;

    console.log(
        "   ✅ User A received CALL_ACCEPTED.",
    );

    // ----------------------------------------------------------------------
    // 7. Mark connected
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "7. Marking call connected...",
    );

    const connectedA =
        waitForEvent(
            socketA,
            "CALL_CONNECTED",
        );

    const connectedB =
        waitForEvent(
            socketB,
            "CALL_CONNECTED",
        );

    await transitionCall(
        userB.sessionCookie,
        call.call.id,
        "connect",
    );

    await Promise.all([
        connectedA,
        connectedB,
    ]);

    console.log(
        "   ✅ Both users received CALL_CONNECTED.",
    );

    // ----------------------------------------------------------------------
    // 8. End call
    // ----------------------------------------------------------------------

    console.log("");
    console.log(
        "8. Ending call as User B...",
    );

    const endedA =
        waitForEvent(
            socketA,
            "CALL_ENDED",
        );

    const endedB =
        waitForEvent(
            socketB,
            "CALL_ENDED",
        );

    await transitionCall(
        userB.sessionCookie,
        call.call.id,
        "end",
    );

    await Promise.all([
        endedA,
        endedB,
    ]);

    console.log(
        "   ✅ Both users received CALL_ENDED.",
    );

    // ----------------------------------------------------------------------
    // 9. Cleanup
    // ----------------------------------------------------------------------

    socketA.close();
    socketB.close();

    console.log("");
    console.log(
        "========================================",
    );
    console.log(
        "✅ Native call lifecycle test passed.",
    );
    console.log(
        "========================================",
    );
    console.log("");
}

main().catch((error) => {
    console.error("");
    console.error(
        "❌ Native call lifecycle test failed:",
    );
    console.error(error);
    console.error("");

    process.exit(1);
});