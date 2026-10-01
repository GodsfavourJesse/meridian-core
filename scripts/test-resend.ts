import "dotenv/config";

import { Resend } from "resend";
import { z } from "zod";

const envSchema =
    z.object({
        RESEND_API_KEY:
            z.string().min(1),

        EMAIL_FROM_NAME:
            z.string().min(1),

        EMAIL_FROM_ADDRESS:
            z.string().email(),
    });

const parsed =
    envSchema.safeParse(
        process.env,
    );

if (!parsed.success) {
    console.error(
        "❌ Invalid Resend environment variables:",
    );

    console.error(
        parsed.error.flatten()
            .fieldErrors,
    );

    process.exit(1);
}

const env = parsed.data;

const resend =
    new Resend(
        env.RESEND_API_KEY,
    );

const testRecipient =
    "jessefavour45@gmail.com";

async function main() {
    console.log(
        "Testing Resend...",
    );

    console.log({
        from:
            `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        to: testRecipient,
    });

    const {
        data,
        error,
    } =
        await resend.emails.send({
            from:
                `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,

            to: [
                testRecipient,
            ],

            subject:
                "Miyor Resend Test",

            text:
                "Miyor Resend integration is working.",

            html: `
                <h1>Miyor Resend Test</h1>

                <p>
                    Miyor's Resend integration
                    is working correctly.
                </p>
            `,
        });

    if (error) {
        console.error(
            "❌ Resend failed:",
        );

        console.error(error);

        process.exit(1);
    }

    console.log(
        "✅ Resend accepted the email.",
    );

    console.log(
        "Resend email ID:",
        data?.id,
    );
}

main().catch(
    (error) => {
        console.error(
            "❌ Unexpected error:",
            error,
        );

        process.exit(1);
    },
);