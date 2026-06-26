"""
Telegram Bot long-polling loop.

Runs as a background asyncio task started in main.py lifespan.
Handles /start {session_token} messages from users who clicked the deep link.

Flow:
  1. User enters phone → clicks Telegram in the modal
  2. Backend creates PhoneOTP with session_token → returns deep link:
     https://t.me/{BOT_USERNAME}?start={session_token}
  3. User opens deep link → Telegram sends /start {session_token} to the bot
  4. This loop receives it → finds PhoneOTP → saves chat_id → sends OTP code
  5. User enters code on website → verify-otp validates normally
"""

import asyncio

import httpx
from sqlalchemy import select

from ..core.config import settings
from ..core.database import AsyncSessionLocal
from ..models.user import PhoneOTP
from .messenger_service import send_otp_telegram


async def _handle_start(chat_id: int, session_token: str) -> None:
    """Process /start {session_token} — save chat_id and send OTP to user."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PhoneOTP).where(
                PhoneOTP.session_token == session_token,
                PhoneOTP.used == False,  # noqa: E712
            )
        )
        otp = result.scalar_one_or_none()

        if not otp:
            await send_telegram_message(
                chat_id,
                "❌ Посилання невалідне або застаріло. Поверніться на сайт і запросіть новий код.",
            )
            return

        otp.telegram_chat_id = str(chat_id)
        await db.commit()

    # Send OTP (outside the DB transaction — network call)
    sent = await send_otp_telegram(chat_id, otp.code)
    if not sent:
        print(f"[TG BOT] Failed to send OTP to chat_id={chat_id}")


async def send_telegram_message(chat_id: int, text: str) -> None:
    """Send a plain text message to any Telegram chat."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text},
            )
    except Exception as exc:
        print(f"[TG BOT] sendMessage error: {exc}")


async def run_polling(token: str) -> None:
    """
    Long-polling loop. Call once on startup via asyncio.create_task().
    Processes only /start {token} messages for OTP deep links.
    """
    print(f"[TG BOT] Starting polling for @{settings.TG_BOT_USERNAME}")
    offset = 0

    while True:
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.get(
                    f"https://api.telegram.org/bot{token}/getUpdates",
                    params={
                        "offset": offset,
                        "timeout": 25,
                        "allowed_updates": ["message"],
                    },
                )

            if resp.status_code != 200:
                await asyncio.sleep(5)
                continue

            updates = resp.json().get("result", [])
            for update in updates:
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                text = msg.get("text", "")
                chat_id = msg.get("chat", {}).get("id")

                if chat_id and text.startswith("/start "):
                    session_token = text[7:].strip()
                    if session_token:
                        asyncio.create_task(_handle_start(chat_id, session_token))
                elif chat_id and text.strip() == "/start":
                    await send_telegram_message(
                        chat_id,
                        "👋 Привіт! Я бот MonteLand.\n\n"
                        "Відкрийте сайт monteland.me, оберіть Telegram "
                        "як канал і отримайте посилання для входу.",
                    )

        except asyncio.CancelledError:
            print("[TG BOT] Polling stopped.")
            return
        except Exception as exc:
            print(f"[TG BOT] Polling error: {exc}")
            await asyncio.sleep(5)
