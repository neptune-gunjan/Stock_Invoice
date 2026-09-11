
"""Email service using Resend."""

from __future__ import annotations

import resend

from app.config import get_settings


def send_password_reset_email(
    recipient_email: str,
    reset_token: str,
) -> None:
    settings = get_settings()

    if not settings.resend_api_key:
        raise RuntimeError(
            "RESEND_API_KEY is not configured."
        )

    resend.api_key = settings.resend_api_key

    reset_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/reset-password?token={reset_token}"
    )

    params: resend.Emails.SendParams = {
        "from": settings.resend_from_email,
        "to": [recipient_email],
        "subject": "Reset your Stock Invoice password",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset your password</h2>

            <p>
                We received a request to reset the password
                for your Stock Invoice account.
            </p>

            <p>
                Click the button below to create a new password:
            </p>

            <p style="margin: 30px 0;">
                <a
                    href="{reset_url}"
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background: #111827;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                    "
                >
                    Reset Password
                </a>
            </p>

            <p>
                This link will expire in 30 minutes and can only
                be used once.
            </p>

            <p>
                If you did not request a password reset, you can
                safely ignore this email.
            </p>

            <p style="color: #6b7280; font-size: 13px;">
                Stock Invoice
            </p>
        </div>
        """,
    }


    try:
        resend.Emails.send(params)
    except Exception as exc:
        print("RESEND ERROR:", repr(exc))
        raise


