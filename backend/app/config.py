import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

# "local" writes tickets straight into TurboFix-Tracker.xlsx (no credentials needed,
# used for dev/testing). "sheets" writes to a live Google Sheet via a service account
# (what production should use). "supabase" reads/writes to remote Supabase DB.
TICKET_STORE = os.getenv("TICKET_STORE", "supabase")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wcqgbleppiaddgfjrnpq.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWdibGVwcGlhZGRnZmpybnBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc2ODQ1MCwiZXhwIjoyMDk5MzQ0NDUwfQ.64ft-M034wkKnehqiNEiGxeRLxBfb1X7Y30bcutGZPQ"
)

_default_path = BACKEND_DIR / "TurboFix-Tracker.xlsx"
if not _default_path.exists():
    _default_path = BACKEND_DIR.parent / "TurboFix-Tracker.xlsx"

TRACKER_XLSX_PATH = os.getenv(
    "TRACKER_XLSX_PATH", str(_default_path)
)

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")

WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v20.0")
# The Cloud API "from" number fan-out sends as (Meta phone_number_id, not the raw number).
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

# The human-dialable TurboFix WhatsApp number (no "+", no spaces, e.g. "919900012345") -
# distinct from WHATSAPP_PHONE_NUMBER_ID above. Used to build the wa.me QR link returned
# by POST /vault/machines. Blank by default; the vault UI degrades gracefully without it.
WHATSAPP_DISPLAY_NUMBER = os.getenv("WHATSAPP_DISPLAY_NUMBER", "")

# Phase 3 fan-out: technician/informed users haven't messaged TurboFix themselves, so
# Meta requires a pre-approved message template (not free-form text) to reach them
# outside the 24h customer service window. This name/language must match a template
# already approved in Meta Business Manager.
WHATSAPP_TICKET_TEMPLATE_NAME = os.getenv("WHATSAPP_TICKET_TEMPLATE_NAME", "turbofix_new_ticket")
WHATSAPP_TICKET_TEMPLATE_LANGUAGE = os.getenv("WHATSAPP_TICKET_TEMPLATE_LANGUAGE", "en_US")
WHATSAPP_CLOSURE_TEMPLATE_NAME = os.getenv("WHATSAPP_CLOSURE_TEMPLATE_NAME", "turbofix_ticket_closed")
WHATSAPP_CLOSURE_TEMPLATE_LANGUAGE = os.getenv("WHATSAPP_CLOSURE_TEMPLATE_LANGUAGE", "en_US")

MEDIA_STORE_DIR = Path(os.getenv("MEDIA_STORE_DIR", str(BACKEND_DIR / "media_store")))
MEDIA_STORE_DIR.mkdir(parents=True, exist_ok=True)

# how long a text message's machine-ID context stays "open" waiting for a
# follow-up voice note from the same sender
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "900"))

# Harden phase: how often the background sweep checks for sessions that expired
# without ever being fanned out (e.g. a bare machine-ID text with no follow-up voice
# note) and fires a fallback notification for them instead of leaving them silent.
SESSION_SWEEP_INTERVAL_SECONDS = int(os.getenv("SESSION_SWEEP_INTERVAL_SECONDS", "60"))

# Harden phase: how long a Machines-tab read is cached before re-reading the
# tracker/Sheet. Machine registration is rare compared to message volume, so this
# avoids a full re-read on every single incoming message.
MACHINES_CACHE_TTL_SECONDS = int(os.getenv("MACHINES_CACHE_TTL_SECONDS", "60"))

# AI layer (Phase 2): transcription + structured-brief summarization.
# Two interchangeable providers:
#   - "gemini" — Google Gemini, which handles both audio transcription and JSON
#     summarization natively and has a free tier (the demo/pilot default: zero cost).
#   - "openai" — the original paid path, models priced out in progress.md's cost model.
# "auto" (default) picks Gemini if GEMINI_API_KEY is set, else OpenAI if
# OPENAI_API_KEY is set, else the AI layer is skipped entirely (tickets still log).
AI_PROVIDER = os.getenv("AI_PROVIDER", "auto")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-nano")

# Phase 5 - Document Vault (manuals/diagrams/BOM/consumables) with role-based access
# for owner/supervisor/maintenance_head. Dev default is an obviously-insecure secret
# so a real deployment is forced to set its own via the environment.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-insecure-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # a work-shift default

# "local"  (default) saves files to disk. Files are LOST on Railway redeploys
#           (ephemeral filesystem). Safe for local dev/test only.
# "drive"  uploads to a Google Drive folder using the same service-account file
#           already used for Sheets — free 15 GB, files survive redeploys.
# "gcs"    legacy stub — falls back to local in the new architecture.
DOCUMENT_STORE = os.getenv("DOCUMENT_STORE", "local")
DOCUMENT_STORE_DIR = Path(os.getenv("DOCUMENT_STORE_DIR", str(BACKEND_DIR / "document_store")))
DOCUMENT_STORE_DIR.mkdir(parents=True, exist_ok=True)
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")
# Google Drive folder ID where uploaded documents are stored (DOCUMENT_STORE=drive).
# Create a folder in Google Drive, share it with the service account email, then
# copy the folder ID from the URL:  https://drive.google.com/drive/folders/<FOLDER_ID>
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")

MAX_DOCUMENT_SIZE_MB = int(os.getenv("MAX_DOCUMENT_SIZE_MB", "25"))
ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".dwg", ".dxf",
    ".xlsx", ".csv", ".docx", ".txt", ".md",
}

# Origins allowed to call the vault API from a browser (the demo-site vault.html
# staff portal runs on a different origin than this backend, often on a
# random/auto-picked local dev port). Auth here is a Bearer JWT, not a cookie, so a
# wildcard origin doesn't carry the usual CSRF/credential-leak risk - tighten this to
# a comma-separated allowlist (e.g. the deployed GitHub Pages URL) for production.
_cors_raw = os.getenv("VAULT_CORS_ORIGINS", "")
VAULT_CORS_ORIGINS = [
    o.strip() for o in _cors_raw.split(",") if o.strip()
] if _cors_raw.strip() else [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5175", "http://127.0.0.1:5175",
]

# Password reset (Phase 5). Same "runs locally with zero credentials, real service
# for production" split used by TICKET_STORE and DOCUMENT_STORE:
#   - "console" (default) writes the reset email (including the link) to the log, so
#     local dev and the test suite exercise the full flow without any email account.
#   - "smtp" sends a real email via any SMTP endpoint (SendGrid/SES/Mailgun/Gmail
#     app-password); set SMTP_HOST/PORT/USER/PASSWORD + EMAIL_FROM.
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "console")
EMAIL_FROM = os.getenv("EMAIL_FROM", "TurboFix <no-reply@turbofix.local>")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# How long a password-reset link stays valid, and where it points. The link opens the
# static reset-password.html page in the demo-site, which posts the token back here.
PASSWORD_RESET_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30"))
RESET_LINK_BASE = os.getenv("RESET_LINK_BASE", "http://localhost:8080/reset-password.html")

# Internal TurboFix-team admin console (GET /admin) - approve companies and set their
# paid machine_quota. This is a platform operator, not a per-company user, so it isn't
# in the Users tab; it logs in with a single shared password from the environment.
# The dev default is obviously insecure so a real deployment is forced to set its own.
_INSECURE_ADMIN_DEFAULT = "dev-admin-change-me"
PLATFORM_ADMIN_PASSWORD = os.getenv("PLATFORM_ADMIN_PASSWORD", _INSECURE_ADMIN_DEFAULT)
ADMIN_TOKEN_EXPIRE_MINUTES = int(os.getenv("ADMIN_TOKEN_EXPIRE_MINUTES", "120"))

_INSECURE_JWT_DEFAULT = "dev-insecure-secret-change-in-production"
_running_tests = "pytest" in os.getenv("_", "") or os.getenv("PYTEST_CURRENT_TEST")
if not _running_tests:
    import logging as _log
    is_prod = ENVIRONMENT == "production"
    
    if PLATFORM_ADMIN_PASSWORD == _INSECURE_ADMIN_DEFAULT:
        if is_prod:
            raise RuntimeError("PLATFORM_ADMIN_PASSWORD is using the insecure default! Set a secure value in production env vars.")
        _log.getLogger("turbofix.config").warning(
            "PLATFORM_ADMIN_PASSWORD is the insecure default — set it in env vars before deploying."
        )
    if JWT_SECRET_KEY == _INSECURE_JWT_DEFAULT:
        if is_prod:
            raise RuntimeError("JWT_SECRET_KEY is using the insecure default! Set a secure value in production env vars.")
        _log.getLogger("turbofix.config").warning(
            "JWT_SECRET_KEY is the insecure default — set it in env vars before deploying."
        )
    if is_prod and WHATSAPP_ACCESS_TOKEN and not WHATSAPP_APP_SECRET:
        raise RuntimeError(
            "WHATSAPP_APP_SECRET is required in production when WhatsApp delivery is enabled."
        )
    if is_prod and RESET_LINK_BASE.startswith(("http://localhost", "http://127.0.0.1")):
        raise RuntimeError("RESET_LINK_BASE must point to the deployed frontend in production.")
    if is_prod and EMAIL_PROVIDER == "console":
        _log.getLogger("turbofix.config").warning(
            "EMAIL_PROVIDER=console logs password-reset links; configure SMTP before enabling resets."
        )
