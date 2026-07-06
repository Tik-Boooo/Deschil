---
name: Deschil white-label
description: Key decisions and constraints for the OpenClaw→Deschil white-label refactor
---

## Package name must stay "openclaw"
**Why:** Hundreds of workspace packages import `"openclaw/plugin-sdk/..."` using the root package name. Renaming the root breaks all workspace resolution. Only user-visible text/branding was changed — internal package identity stays `openclaw`.

## Owner filter — fail-closed exact comparison
**File:** `extensions/whatsapp/src/inbound/access-control.ts`
**Rule:** Strip non-digits from both sides, require strict equality. Fail-closed on empty/unresolvable sender. Bidirectional suffix-matching was rejected — it allows partial-number spoofing.
**How to apply:** Always use `senderDigits === ownerDigits` (strict), never `.endsWith()` or `.includes()`.
**Why:** `.endsWith()` matching is a security hole for phone number identity checks.

## Owner number is configured exclusively via env var
`DESCHIL_OWNER_NUMBER` must be set in the deployment environment. The code warns and passes through (no filtering) when the env var is unset — it does not embed a real number as a fallback. This keeps PII out of source code and memory.

## Green-API extension scope (current)
`extensions/greenapi/` is a **helper library** only — polling, send, owner-filter utilities. It does NOT register a full OpenClaw `ChannelPlugin`. The `openclaw.plugin.json` has `"activation": false` to reflect this. Full channel integration is tracked as a follow-up task.

## pnpm-only Docker installs
Added `--config.dedupe-peer-dependents=false` to the main `pnpm install` call in the Dockerfile. Never use npm/bun/yarn for installs — they throw "Unsupported Protocol" on `workspace:` specifiers.

## Internal element names not renamed
`openclaw-app`, `openclaw-login-gate`, etc. are used in hundreds of TS files. Renaming them is out of scope; only user-visible brand text (title, manifest, i18n, favicon) was changed.
