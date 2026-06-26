"""
Messenger OTP delivery service.

Channels:
  WhatsApp — Twilio Messaging API (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
  Viber    — Viber Bot REST API  (VIBER_API_TOKEN; user must have started the bot first)
  Telegram — Bot API sendMessage (TELEGRAM_BOT_TOKEN; chat_id supplied by tg_bot polling)

DEV fallback: if credentials not set, function returns False and
the code is returned in the API response (dev_code field).
"""

import httpx

from ..core.config import settings


async def send_otp_whatsapp(phone: str, code: str) -> bool:
    """Send OTP via WhatsApp using Twilio Messaging API."""
    if not all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_WHATSAPP_FROM,
    ]):
        return False

    wa_to = phone if phone.startswith("+") else f"+{phone}"
    text = (
        f"🔑 Ваш код підтвердження MonteLand:\n\n"
        f"*{code}*\n\n"
        f"⏱ Дійсний 5 хвилин. Не передавайте нікому."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/"
                f"{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                data={
                    "From": f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}",
                    "To": f"whatsapp:{wa_to}",
                    "Body": text,
                },
            )
        return resp.status_code == 201
    except Exception as exc:
        print(f"[WhatsApp OTP] Error: {exc}")
        return False


async def send_otp_viber(phone: str, code: str) -> bool:
    """
    Send OTP via Viber Business Messages API.
    Requires VIBER_API_TOKEN (from Viber Partner Program / Vonage / Infobip).
    This channel can reach users by phone number (unlike the free Viber Bot).
    """
    if not settings.VIBER_API_TOKEN:
        return False

    # Using Viber Business Messages via Vonage (nexmo) API approach
    # Adapt to your provider: Infobip, Vonage, etc. all use similar payload
    payload = {
        "auth_token": settings.VIBER_API_TOKEN,
        "receiver": phone.lstrip("+"),
        "type": "text",
        "text": (
            f"🔑 Ваш код MonteLand: {code}\n"
            f"Дійсний 5 хвилин."
        ),
        "sender": {
            "name": "MonteLand",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://chatapi.viber.com/pa/send_message",
                headers={"X-Viber-Auth-Token": settings.VIBER_API_TOKEN},
                json=payload,
            )
        result = resp.json()
        return result.get("status") == 0
    except Exception as exc:
        print(f"[Viber OTP] Error: {exc}")
        return False


async def send_otp_telegram(chat_id: str | int, code: str) -> bool:
    """Send OTP directly to Telegram user via Bot API sendMessage."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "parse_mode": "HTML",
                    "text": (
                        "🔑 <b>Ваш код підтвердження MonteLand:</b>\n\n"
                        f"<code>{code}</code>\n\n"
                        "⏱ Дійсний 5 хвилин."
                    ),
                },
            )
        return resp.status_code == 200
    except Exception as exc:
        print(f"[Telegram OTP] Error: {exc}")
        return False
