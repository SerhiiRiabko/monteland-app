import random
import secrets
import string
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr
from jose import JWTError

from ....core.database import get_db
from ....core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_secure_token,
)
from ....core.config import settings
from ....models.user import User, UserRole, PhoneOTP, MessengerChannel
from ....services.messenger_service import (
    send_otp_whatsapp,
    send_otp_viber,
    send_otp_telegram,
)

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.BUYER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        verification_token=generate_secure_token(),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie("access_token", access_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, refresh_token: str | None = Cookie(default=None),
                  db: AsyncSession = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = payload["sub"]
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(user.id, user.role)
    response.set_cookie("access_token", access_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


# ── Seller registration (from sell form — no password yet) ────────────────────

class RegisterSellerRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None


class RegisterSellerResponse(BaseModel):
    user_id: str
    is_new: bool
    # dev only — token visible so you can test without real email
    dev_token: str | None = None


@router.post("/register-seller", response_model=RegisterSellerResponse, status_code=201)
async def register_seller(data: RegisterSellerRequest, db: AsyncSession = Depends(get_db)):
    """
    Called when seller submits the sell form.
    - If email already exists → resend setup link
    - If new → create seller account (no password yet) → send welcome email
    """
    from ....services.email import send_seller_welcome

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    is_new = user is None

    if is_new:
        token = generate_secure_token(32)
        user = User(
            email=data.email,
            password_hash="",            # no password until set-password flow
            full_name=data.full_name,
            phone=data.phone,
            role=UserRole.SELLER,
            is_active=True,
            is_verified=False,
            verification_token=token,
        )
        db.add(user)
        await db.flush()
    else:
        # Refresh token so the link is always fresh
        token = generate_secure_token(32)
        user.verification_token = token
        if data.full_name and not user.full_name:
            user.full_name = data.full_name
        if data.phone and not user.phone:
            user.phone = data.phone

    await send_seller_welcome(
        to=data.email,
        name=data.full_name or "",
        token=token,
    )

    # Return token in dev so it's easy to test without real email
    from ....core.config import settings as cfg
    dev_token = token if cfg.DEBUG else None

    return RegisterSellerResponse(user_id=str(user.id), is_new=is_new, dev_token=dev_token)


# ── Set password (from email link) ────────────────────────────────────────────

class SetPasswordRequest(BaseModel):
    token: str
    password: str
    password_confirm: str


@router.post("/set-password")
async def set_password(data: SetPasswordRequest, response: Response, db: AsyncSession = Depends(get_db)):
    if data.password != data.password_confirm:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    if len(data.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    result = await db.execute(
        select(User).where(User.verification_token == data.token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.password_hash     = hash_password(data.password)
    user.is_verified       = True
    user.verification_token = None

    access_token  = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie("access_token", access_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    return {"ok": True, "access_token": access_token, "role": user.role}


# ── Validate token (for set-password page to pre-check) ──────────────────────

@router.get("/verify-token")
async def verify_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User.email, User.full_name).where(User.verification_token == token)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"valid": True, "email": row.email, "name": row.full_name}


# ── Messenger OTP registration/login ─────────────────────────────────────────

OTP_TTL_MINUTES = 5
OTP_MAX_ATTEMPTS = 3


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


class RequestOTPBody(BaseModel):
    phone: str
    channel: MessengerChannel


class RequestOTPResponse(BaseModel):
    sent: bool
    dev_code: str | None = None        # only in DEBUG mode
    telegram_link: str | None = None   # only for channel=telegram


@router.post("/request-otp", response_model=RequestOTPResponse)
async def request_otp(data: RequestOTPBody, db: AsyncSession = Depends(get_db)):
    """
    Generate a 6-digit OTP and deliver it via the requested messenger.

    WhatsApp / Viber — OTP sent directly by phone number.
    Telegram         — Returns a deep link (t.me/Bot?start=TOKEN).
                       The bot sends the OTP after the user opens the link.
    DEV mode         — dev_code is always returned regardless of delivery.
    """
    phone = data.phone.strip()
    if len(phone) < 7:
        raise HTTPException(status_code=422, detail="Invalid phone number")

    # Invalidate previous unused OTPs for same phone+channel
    await db.execute(
        delete(PhoneOTP).where(
            PhoneOTP.phone == phone,
            PhoneOTP.channel == data.channel,
            PhoneOTP.used == False,  # noqa: E712
        )
    )

    code = _generate_otp()
    otp = PhoneOTP(
        phone=phone,
        channel=data.channel,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    )

    telegram_link: str | None = None

    if data.channel == MessengerChannel.TELEGRAM:
        # Telegram can't message by phone — user must open a bot deep link first.
        # session_token ties this OTP to the incoming /start command in the bot.
        session_tok = secrets.token_urlsafe(32)
        otp.session_token = session_tok
        if settings.TG_BOT_USERNAME:
            telegram_link = f"https://t.me/{settings.TG_BOT_USERNAME}?start={session_tok}"
        print(f"[OTP DEV] Telegram OTP {code} — session_token={session_tok}")
    elif data.channel == MessengerChannel.WHATSAPP:
        db.add(otp)
        await db.flush()
        sent = await send_otp_whatsapp(phone, code)
        if not sent:
            print(f"[OTP DEV] WhatsApp not configured — code for {phone}: {code}")
    elif data.channel == MessengerChannel.VIBER:
        db.add(otp)
        await db.flush()
        sent = await send_otp_viber(phone, code)
        if not sent:
            print(f"[OTP DEV] Viber not configured — code for {phone}: {code}")

    if data.channel == MessengerChannel.TELEGRAM:
        db.add(otp)
        await db.flush()

    dev_code = code if settings.DEBUG else None
    return RequestOTPResponse(
        sent=data.channel != MessengerChannel.TELEGRAM,  # Telegram delivery is async
        dev_code=dev_code,
        telegram_link=telegram_link,
    )


class VerifyOTPBody(BaseModel):
    phone: str
    channel: MessengerChannel
    code: str
    full_name: str | None = None


@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPBody, response: Response, db: AsyncSession = Depends(get_db)):
    """Verify OTP and log in (or register) the user via JWT cookies."""
    phone = data.phone.strip()

    result = await db.execute(
        select(PhoneOTP).where(
            PhoneOTP.phone == phone,
            PhoneOTP.channel == data.channel,
            PhoneOTP.used == False,  # noqa: E712
        ).order_by(PhoneOTP.created_at.desc())
    )
    otp = result.scalar_one_or_none()

    if not otp:
        raise HTTPException(status_code=400, detail="OTP not found. Request a new code.")

    if datetime.now(timezone.utc) > otp.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Request a new code.")

    otp.attempts += 1
    if otp.attempts > OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    if otp.code != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid code")

    otp.used = True

    # ── Find or create user ─────────────────────────────────────────────────
    user: User | None = None

    if data.channel == MessengerChannel.TELEGRAM:
        # Look up by telegram_chat_id stored during bot /start handling
        if otp.telegram_chat_id:
            result = await db.execute(
                select(User).where(User.telegram == otp.telegram_chat_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    email=f"tg{otp.telegram_chat_id}@messenger.monteland",
                    password_hash="",
                    full_name=data.full_name,
                    phone=phone,
                    telegram=otp.telegram_chat_id,
                    role=UserRole.BUYER,
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                await db.flush()
                await db.refresh(user)
        else:
            # DEV mode or bot not running — fall through to phone lookup below
            pass

    if user is None:
        # WhatsApp / Viber — look up by phone in messenger-specific or general phone field
        messenger_field = data.channel.value  # "whatsapp" | "viber" | "telegram"
        result = await db.execute(
            select(User).where(getattr(User, messenger_field) == phone)
        )
        user = result.scalar_one_or_none()

        if not user:
            result = await db.execute(select(User).where(User.phone == phone))
            user = result.scalar_one_or_none()

        if not user:
            safe_phone = phone.replace("+", "").replace(" ", "")
            user = User(
                email=f"{safe_phone}@messenger.monteland",
                password_hash="",
                full_name=data.full_name,
                phone=phone,
                role=UserRole.BUYER,
                is_active=True,
                is_verified=True,
            )
            setattr(user, messenger_field, phone)
            db.add(user)
            await db.flush()
            await db.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie("access_token", access_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True,
                        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    return {"ok": True, "is_new": user.full_name is None, "role": user.role}


# ── Auto-detect messenger channel by phone ────────────────────────────────────

CHANNEL_LABELS = {
    "whatsapp": "WhatsApp",
    "viber": "Viber",
    "telegram": "Telegram",
}


@router.get("/messenger-channel")
async def get_messenger_channel(phone: str, db: AsyncSession = Depends(get_db)):
    """
    Look up which messenger channel a user registered with.
    Used by the login form to pre-select the channel automatically.

    Returns:
      { channel: "telegram", label: "Telegram" }  — known user
      { channel: null }                            — new user, show all options
    """
    phone = phone.strip()
    if not phone:
        return {"channel": None}

    # Check each messenger field
    for ch in ("whatsapp", "viber"):
        result = await db.execute(
            select(User).where(getattr(User, ch) == phone)
        )
        if result.scalar_one_or_none():
            return {"channel": ch, "label": CHANNEL_LABELS[ch]}

    # Telegram is stored by chat_id, not phone — check phone field + telegram not null
    result = await db.execute(
        select(User).where(
            User.phone == phone,
            User.telegram.isnot(None),
        )
    )
    if result.scalar_one_or_none():
        return {"channel": "telegram", "label": "Telegram"}

    # Also check phone field with whatsapp/viber as fallback
    result = await db.execute(
        select(User).where(User.phone == phone)
    )
    user = result.scalar_one_or_none()
    if user:
        for ch in ("whatsapp", "viber", "telegram"):
            if getattr(user, ch):
                return {"channel": ch, "label": CHANNEL_LABELS[ch]}

    return {"channel": None}