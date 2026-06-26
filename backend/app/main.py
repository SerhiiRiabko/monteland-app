import asyncio
import logging
import logging.handlers
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from .core.config import settings
from .core.database import engine, Base
from .core.redis import close_redis, _check_available as _check_redis
from .core.security import decode_token
from .admin import create_admin
from .api.v1.router import api_router


# ── Logging setup ──────────────────────────────────────────────────────────────

def _setup_logging() -> None:
    fmt = logging.Formatter(
        "%(asctime)s %(levelname)-8s %(name)-30s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    handlers: list[logging.Handler] = [logging.StreamHandler()]

    if settings.LOG_FILE:
        os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
        fh = logging.handlers.RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8",
        )
        fh.setFormatter(fmt)
        handlers.append(fh)

    for h in handlers:
        h.setFormatter(fmt)

    logging.basicConfig(level=level, handlers=handlers, force=True)
    # Suppress noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


_setup_logging()
logger = logging.getLogger(__name__)


# ── Sentry ────────────────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            SqlalchemyIntegration(),
            LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
        ],
        traces_sample_rate=0.05,    # 5% of requests — free tier friendly
        send_default_pii=False,
    )
    logger.info("Sentry initialized (env=%s)", settings.ENVIRONMENT)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MonteLand backend starting up (env=%s)", settings.ENVIRONMENT)
    await _check_redis()
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            pass  # pgvector not available locally (Windows dev)
        if settings.ENVIRONMENT == "development":
            await conn.run_sync(Base.metadata.create_all)

    if settings.TELEGRAM_BOT_TOKEN and settings.TG_BOT_USERNAME:
        from .services.tg_bot import run_polling
        asyncio.create_task(run_polling(settings.TELEGRAM_BOT_TOKEN))

    logger.info("Startup complete")
    yield
    logger.info("Shutting down")
    await close_redis()
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    https_only=settings.COOKIE_SECURE,
    same_site=settings.COOKIE_SAMESITE,
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# ── Admin panel ────────────────────────────────────────────────────────────────
create_admin(app, engine)

# ── API routes ─────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "env": settings.ENVIRONMENT}


# ── Log viewer (protected by admin session) ────────────────────────────────────

_LOG_CSS = """
<style>
  body{font-family:monospace;background:#0f172a;color:#94a3b8;margin:0;padding:16px}
  h1{color:#e2e8f0;font-size:18px;margin-bottom:12px}
  .controls{margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap}
  select,button,input{background:#1e293b;color:#e2e8f0;border:1px solid #334155;
    padding:6px 12px;border-radius:6px;cursor:pointer;font-family:monospace}
  button:hover{background:#334155}
  #log{white-space:pre-wrap;font-size:12px;line-height:1.6}
  .ERROR{color:#f87171}.WARNING{color:#fbbf24}.INFO{color:#94a3b8}
  .DEBUG{color:#475569}.CRITICAL{color:#ff0000;font-weight:bold}
  .ts{color:#475569}
</style>
"""

_LOG_JS = """
<script>
function refresh(){location.reload()}
function applyFilter(){
  const lvl=document.getElementById('lvl').value;
  document.querySelectorAll('#log div').forEach(d=>{
    d.style.display=(!lvl||d.className.includes(lvl))?'block':'none';
  });
}
setInterval(()=>{if(document.getElementById('auto').checked)refresh()},15000);
</script>
"""


def _render_log_line(line: str) -> str:
    cls = "INFO"
    for level in ("CRITICAL", "ERROR", "WARNING", "DEBUG"):
        if level in line:
            cls = level
            break
    parts = line.split(" ", 2)
    if len(parts) >= 3:
        ts = f'<span class="ts">{parts[0]} {parts[1]}</span> '
        rest = parts[2].replace("<", "&lt;").replace(">", "&gt;")
        return f'<div class="{cls}">{ts}{rest}</div>'
    return f'<div class="{cls}">{line.replace("<","&lt;")}</div>'


@app.get("/logs", response_class=HTMLResponse, include_in_schema=False)
async def log_viewer(request: Request, lines: int = 300):
    """Admin-only log viewer. Protected by SQLAdmin session cookie."""
    token = request.session.get("admin_token")
    if not token:
        return HTMLResponse(
            '<meta http-equiv="refresh" content="0;url=/admin/login">',
            status_code=302,
        )
    try:
        payload = decode_token(token)
        if payload.get("role") != "admin":
            raise ValueError
    except Exception:
        return HTMLResponse("Forbidden", status_code=403)

    log_lines_html = ""
    log_path = settings.LOG_FILE

    if not log_path or not os.path.exists(log_path):
        log_lines_html = (
            '<div class="WARNING">Log file not configured or not found.<br>'
            f"LOG_FILE={log_path!r}<br>"
            "In production set LOG_FILE=/var/log/monteland/app.log in .env</div>"
        )
    else:
        try:
            with open(log_path, encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()
            tail = all_lines[-lines:]
            log_lines_html = "".join(_render_log_line(l.rstrip()) for l in tail)
        except Exception as exc:
            log_lines_html = f'<div class="ERROR">Failed to read log: {exc}</div>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>MonteLand Logs</title>{_LOG_CSS}</head>
<body>
<h1>📋 MonteLand — Application Logs
  <a href="/admin" style="font-size:13px;color:#60a5fa;margin-left:16px">← Admin</a>
</h1>
<div class="controls">
  <select id="lvl" onchange="applyFilter()">
    <option value="">All levels</option>
    <option value="ERROR">ERROR</option>
    <option value="WARNING">WARNING</option>
    <option value="INFO">INFO</option>
    <option value="DEBUG">DEBUG</option>
  </select>
  <button onclick="refresh()">↻ Refresh</button>
  <label><input type="checkbox" id="auto"> Auto-refresh (15s)</label>
  <span style="color:#475569;font-size:12px">Last {lines} lines · {log_path or "stdout only"}</span>
</div>
<div id="log">{log_lines_html}</div>
{_LOG_JS}
<script>window.scrollTo(0,document.body.scrollHeight)</script>
</body></html>"""
    return HTMLResponse(html)
