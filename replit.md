# Deschil — Private AI Assistant

Deschil is a white-label fork of OpenClaw — a personal, always-on AI assistant gateway with multi-channel messaging support.

## Project overview

| Property | Value |
|---|---|
| Base project | OpenClaw (MIT) |
| Brand | Deschil |
| Stack | TypeScript · Node 24 · pnpm workspaces · Lit/Vite UI |
| Primary channel | WhatsApp via Green-API |
| Owner filter | `<OWNER_E164>` (override with `DESCHIL_OWNER_NUMBER`) |

## Key customisations in this fork

| Area | What changed |
|---|---|
| Visual branding | Title, favicon, manifest, i18n strings → "Deschil" |
| Favicon / logo | New 3D neumorphic "D" SVG logo (indigo→violet→cyan gradient) |
| Control UI | Full 3D neumorphic CSS design system (`ui/src/styles/base.css`) |
| Login splash | Animated neumorphic hero panel with brand orbs (`ui/src/styles/components.css`) |
| WhatsApp | Green-API extension (`extensions/greenapi/`) reads `GREEN_API_INS` + `GREEN_API_TOK` |
| Owner filter | WhatsApp inbound drops all non-owner senders (`extensions/whatsapp/src/inbound/access-control.ts`) |
| Dockerfile | pnpm-workspace-exclusive install with `--config.dedupe-peer-dependents=false` |

## Environment variables

```env
# Gateway auth
OPENCLAW_GATEWAY_TOKEN=          # auto-generated if blank

# Green-API WhatsApp
GREEN_API_INS=                   # Green-API instance ID
GREEN_API_TOK=                   # Green-API token

# Deschil private filter
DESCHIL_OWNER_NUMBER=<OWNER_E164>  # Only this number can interact with the AI
```

Secrets already configured in Replit: `SESSION_SECRET`, `GITHUB_TOKEN`, `RAILWAY_TOKEN`

## Running locally

```bash
pnpm install
pnpm build
node openclaw.mjs gateway
```

## Docker build (Railway / production)

```bash
docker build \
  --build-arg OPENCLAW_EXTENSIONS="greenapi,whatsapp" \
  -t deschil .
```

## Green-API integration

See `extensions/greenapi/README.md` for full setup.

## User preferences

- Keep all internal pnpm/workspace protocol installs pnpm-only (never npm/bun for package installs)
- Owner filter default: `<OWNER_E164>` (configurable via `DESCHIL_OWNER_NUMBER`)
- Brand name: Deschil (not OpenClaw) in all user-visible surfaces
