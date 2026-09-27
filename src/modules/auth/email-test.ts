import { Resend } from "resend";

import { env } from "../../config/env";

const resend = new Resend(
    env.RESEND_API_KEY,
);

export async function sendTestEmail() {
    const result =
        await resend.emails.send({
            from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,

            to: [
                "jessefavour45@gmail.com",
            ],

            subject:
                "Miyor Resend Test",

            text:
                "If you received this email, Miyor's Resend integration is working.",

            html: `
                <h1>Miyor Resend Test</h1>
                <p>
                    If you received this email,
                    Miyor's Resend integration is working.
                </p>
            `,
        });

    console.log(
        "[resend] test result:",
        result,
    );

    return result;
}