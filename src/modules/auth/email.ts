import { Resend } from "resend";

import { env } from "../../config/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(
    email: string,
    verificationUrl: string,
) {
    const { data, error } = await resend.emails.send({
        from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        to: [email],
        subject: "Verify your Miyor email",

        text: [
            `Welcome to ${env.EMAIL_FROM_NAME}.`,
            "",
            "Please verify your email address by opening this link:",
            verificationUrl,
            "",
            "This verification link expires in 30 minutes.",
            "",
            "If you did not create a Miyor account, you can safely ignore this email.",
        ].join("\n"),

        html: `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    />
                    <title>Verify your Miyor email</title>
                </head>

                <body
                    style="
                        margin:0;
                        padding:0;
                        background:#f8fafc;
                        font-family:Arial,sans-serif;
                        color:#0f172a;
                    "
                >
                    <div
                        style="
                            max-width:600px;
                            margin:0 auto;
                            padding:48px 20px;
                        "
                    >
                        <div
                            style="
                                background:#ffffff;
                                border:1px solid #e2e8f0;
                                border-radius:16px;
                                padding:40px;
                            "
                        >
                            <div style="margin-bottom:32px;">
                                <strong style="font-size:24px;">
                                    MIYOR
                                </strong>
                            </div>

                            <h1
                                style="
                                    font-size:28px;
                                    line-height:1.2;
                                    margin:0 0 16px;
                                "
                            >
                                Verify your email
                            </h1>

                            <p
                                style="
                                    font-size:16px;
                                    line-height:1.6;
                                    color:#475569;
                                "
                            >
                                Welcome to Miyor. Please verify your email
                                address to activate your account and access
                                your dashboard.
                            </p>

                            <div style="margin:32px 0;">
                                <a
                                    href="${verificationUrl}"
                                    style="
                                        display:inline-block;
                                        background:#0f172a;
                                        color:#ffffff;
                                        text-decoration:none;
                                        padding:14px 24px;
                                        border-radius:10px;
                                        font-weight:600;
                                    "
                                >
                                    Verify my email
                                </a>
                            </div>

                            <p
                                style="
                                    font-size:14px;
                                    line-height:1.6;
                                    color:#64748b;
                                "
                            >
                                This verification link expires in 30 minutes.
                            </p>

                            <p
                                style="
                                    font-size:14px;
                                    line-height:1.6;
                                    color:#64748b;
                                "
                            >
                                If the button doesn't work, copy and paste this
                                URL into your browser:
                            </p>

                            <p
                                style="
                                    font-size:13px;
                                    line-height:1.6;
                                    word-break:break-all;
                                    color:#475569;
                                "
                            >
                                ${verificationUrl}
                            </p>

                            <hr
                                style="
                                    border:0;
                                    border-top:1px solid #e2e8f0;
                                    margin:32px 0;
                                "
                            />

                            <p
                                style="
                                    font-size:13px;
                                    color:#94a3b8;
                                "
                            >
                                If you didn't create a Miyor account, you can
                                safely ignore this email.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
        `,
    });

    if (error) {
        throw new Error(
            `RESEND_EMAIL_FAILED: ${error.message}`,
        );
    }

    return data;
}