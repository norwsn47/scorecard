# Build Plan
## Scorecard by Outbuild — Bruntsfield Links

> All completed chunk detail blocks (Chunks 1–29) are archived in BUILDPLAN-ARCHIVE.md.
> This file retains the summary tables for dependency visibility.

**Version:** 2.0
**Last updated:** 12 July 2026
**Stack:** Vite + React · Tailwind CSS · localStorage · Cloudflare Pages · Cloudflare D1 · Cloudflare Pages Functions · Resend

---

## Phase 4 — Scorecard Club

All nine Phase 4 chunks are complete. Full detail blocks are in BUILDPLAN-ARCHIVE.md.

**Prerequisites (all confirmed 12 July 2026):**
- `RESEND_API_KEY` — created and added to Cloudflare Pages env vars
- `RESEND_FROM_EMAIL` — `scorecard@outbuild.uk` (DNS verified in Resend dashboard)
- `APP_URL` — `https://scorecard.outbuild.uk` (added to Cloudflare Pages env vars)

---

## Chunk order summary (Phase 4)

| Chunk | What | Depends on | Status |
|-------|------|------------|--------|
| 21 | D1 database setup + schema | Nothing | Done |
| 22 | Pages Functions API scaffold | 21 | Done |
| 23 | Magic link auth backend | 21, 22 | Done |
| 24 | Session middleware | 23 | Done |
| 25 | Auth UI | 23, 24 | Done |
| 26 | Scorecard Club branding | 25 | Done |
| 27 | Course creation/selection UI | 25 | Done |
| 28 | Logged-in game save to D1 | 25, 27 | Done |
| 29 | Logged-in history | 25, 28 | Done |
