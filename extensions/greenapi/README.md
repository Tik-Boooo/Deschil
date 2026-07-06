# Deschil — Green-API WhatsApp Extension

Connect Deschil to WhatsApp through [Green-API](https://green-api.com/en/) — a cloud-hosted WhatsApp gateway that doesn't require a local browser session.

## Quick Start

### 1. Environment variables

```env
GREEN_API_INS=your_instance_id
GREEN_API_TOK=your_api_token
DESCHIL_OWNER_NUMBER=<OWNER_E164>   # Only messages from this number are processed
```

### 2. Add to `openclaw.json`

```json
{
  "plugins": {
    "greenapi": {
      "enabled": true,
      "instanceId": "",
      "token": "",
      "ownerNumber": "<OWNER_E164>"
    }
  }
}
```

`instanceId` and `token` fall back to `GREEN_API_INS` / `GREEN_API_TOK` env vars when blank.

### 3. Enable at build time

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="greenapi" .
```

## Owner-only Filter

All incoming messages are filtered against `ownerNumber`. Messages from any other sender are silently dropped before reaching the AI — this keeps the assistant strictly private.

## Architecture

- Uses **polling** (`receiveNotification` + `deleteNotification`) — no inbound webhook infrastructure needed.
- Falls back gracefully if Green-API is unreachable; errors are logged but do not crash the gateway.
- Compatible with all Green-API regions and the free tier.
