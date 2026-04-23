# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- `impacta-osint` — IMPACTA OSINT single-page lookup tool (React + Vite, dark black/white theme). One search bar, three lookups: **Discord ID**, **Email**, **IP address**. Auto-detects, fans out to every connected provider, renders a rich Discord profile card (banner, avatar, badges, tag, bio, past names if any source returns them), breach table, AI risk analysis card, JSON download, and printable PDF report.
- `api-server` — Express API. `POST /api/lookup` accepts `{query, kind?}` and aggregates results in parallel. Per-kind providers:
  - **discord_id** → mesalytic public proxy (full profile: badges, avatar, banner, accent, Nitro), Discord CDN avatar/banner URL builder, snowflake → created-at, IntelVault discord-to-ip, Snusbase + OSINTCat (treating ID as username), Swatted.
  - **email** → DNS, Snusbase, LeakCheck, SEON, IntelVault, OSINTCat, BreachHub, Swatted.
  - **ip** → IP-API geo, Snusbase, LeakCheck, SEON, IntelVault, OSINTCat, Swatted.
  Other input kinds return 400. Provider failures are captured per-source and never crash the response. AI layer (gpt-5.4 via Replit AI Integrations OpenAI proxy) consumes raw provider data and emits risk score, identity correlation, patterns, recommendations, and pivot suggestions.

### Notes on provider behavior
- **Discord profile sources**: mesalytic.moe is reachable from production hosts (Railway etc.) but the Replit dev sandbox's egress IP is blocked, so dev-mode Discord lookups will show only fields derivable from the snowflake (created_at, default avatar). On Railway the full profile resolves.
- **Swatted (swattedw.tf/api/lookup)**: requires a session token, not the static keys we have. Returns 401/404 with the current keys; failures are surfaced per-source. If the user later provides a real `session=...` cookie we can plumb it in.
- **BreachHub**: current key returns 401 (invalid).
- **OSINTCat**: known upstream bug returns 500 for some payload types ("'coroutine' object has no attribute 'get'").

## Required Secrets (OSINT providers)

`SNUSBASE_API_KEY`, `SNUSBASE_BETA_API_KEY`, `LEAKCHECK_API_KEY`, `SEON_API_KEY`, `INTELVAULT_API_KEY`, `OSINTCAT_API_KEY`, `SWATTED_OG_KEY`, `SWATTED_PLUS_KEY`, `SWATTED_ULTIMATE_KEY`, `SWATTED_HEIST_KEY`, `SWATTED_SECURITY_PHRASE`, `BREACHHUB_API_KEY`, `LUPERLY_API_KEY`. Missing keys simply mark that provider as failed in the report.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
