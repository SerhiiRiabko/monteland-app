from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "MonteLand API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "production"] = "development"
    DEBUG: bool = False

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str                          # required — no default
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # Admin panel credentials
    ADMIN_EMAIL: str = "admin@monteland.me"
    ADMIN_PASSWORD: str                      # required — no default

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str                        # postgresql+asyncpg://user:pass@host/db
    SYNC_DATABASE_URL: str = ""             # postgresql://... for Alembic (set in .env)

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str                          # redis://:password@host:6379/0

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3002,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── JWT Cookie settings ───────────────────────────────────────────────────
    COOKIE_SECURE: bool = False             # True on production (HTTPS)
    COOKIE_SAMESITE: str = "lax"

    # ── File uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 5
    MAX_PHOTOS_PER_LISTING: int = 20

    # ── Cloudflare R2 (file storage) ──────────────────────────────────────────
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""
    R2_BUCKET: str = ""
    R2_PUBLIC_URL: str = ""

    # ── Email (Resend) ────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@monteland.me"
    EMAIL_FROM_NAME: str = "MonteLand"

    # ── AI (Anthropic) ────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL_FAST: str = "claude-haiku-4-5-20251001"
    AI_MODEL_QUALITY: str = "claude-sonnet-4-6"

    # ── Telegram Bot ─────────────────────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: str = ""
    TG_BOT_USERNAME: str = ""    # e.g. "MonteLandBot" (without @) — for deep links

    # ── WhatsApp (Twilio) ─────────────────────────────────────────────────────
    # Get from twilio.com — sandbox: TWILIO_WHATSAPP_FROM=+14155238886
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""   # phone number registered in Twilio for WA

    # ── Viber Business Messages ───────────────────────────────────────────────
    # Get from Viber Partner Program or Vonage/Infobip
    VIBER_API_TOKEN: str = ""

    # ── Embeddings (OpenAI) ───────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"   # 1536 dimensions
    EMBEDDING_DIM: int = 1536

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3002"

    # ── Error tracking (Sentry) ───────────────────────────────────────────────
    # Get DSN from sentry.io (free tier: 5000 errors/month)
    SENTRY_DSN: str = ""

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    # Absolute path to log file; empty = stdout only (dev/Windows)
    LOG_FILE: str = ""


settings = Settings()