# Environment variables used by OpenClaw (gateway)

This document lists environment variables used by OpenClaw and their meaning. Variables are grouped as Required, Optional and Defaults.

Required (for a functional production deployment)
- PORT — provided by Railway. Used by the gateway to bind the HTTP/WebSocket listener.

Optional / Recommended
- NODE_ENV — set to "production" in the Dockerfile by default.
- OPENCLAW_EXTENSIONS — comma-separated list of bundled extensions to include at build time (build-time arg).
- OPENCLAW_BUNDLED_PLUGIN_DIR — directory with bundled plugins (default: extensions)

Pairing bypass (opt-in)
- OPENCLAW_DISABLE_DEVICE_PAIRING — when set to "true", newly created pairing requests are automatically approved (auto-approve). Disabled by default. DOES NOT disable authentication; it simply skips the manual approve CLI step in trusted deployments.
  - Default: not set (disabled)
  - Security note: enabling this option should only be done in trusted, controlled environments.

WhatsApp Cloud API (if used)
- WHATSAPP_WEBHOOK_VERIFY_TOKEN — verification token for your webhook (used on webhook verification).
- WHATSAPP_ACCESS_TOKEN — bearer token used to send outgoing messages via WhatsApp Cloud API.
- WHATSAPP_PHONE_NUMBER_ID — phone number id used in WhatsApp Cloud API URLs.
- WHATSAPP_BUSINESS_ACCOUNT_ID — WhatsApp business account id (optional for some flows).

Telegram / Discord (existing channels)
- TELEGRAM_BOT_TOKEN — if you use Telegram provider(s), ensure this token is set.
- DISCORD_BOT_TOKEN — if you use Discord provider(s), ensure this token is set.

Defaults:
- If PORT is unset, Dockerfile CMD falls back to 18789 for local convenience.
- NODE_ENV is set to production in the final Dockerfile.

Notes about security and trusted deployment:
- OPENCLAW_DISABLE_DEVICE_PAIRING must be considered carefully. Prefer to use it only in isolated and trusted cloud environments. The feature only auto-approves the pairing step; the normal token / device auth machinery remains in place.
