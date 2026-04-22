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

- `impacta-osint` — IMPACTA OSINT single-page lookup tool (React + Vite, dark black/white theme). Search bar + multi-source intelligence report with breach table, enrichment cards, JSON download, and printable PDF report.
- `api-server` — Express API. `POST /api/lookup` aggregates results in parallel from Snusbase, LeakCheck, SEON, IntelVault, OSINTCat, BreachHub, Luperly, Swatted.wtf, plus free IP-API / DNS / reverse-geocode enrichment. Provider failures are captured per-source and never crash the response.

## Required Secrets (OSINT providers)

`SNUSBASE_API_KEY`, `SNUSBASE_BETA_API_KEY`, `LEAKCHECK_API_KEY`, `SEON_API_KEY`, `INTELVAULT_API_KEY`, `OSINTCAT_API_KEY`, `SWATTED_OG_KEY`, `SWATTED_PLUS_KEY`, `SWATTED_ULTIMATE_KEY`, `SWATTED_HEIST_KEY`, `SWATTED_SECURITY_PHRASE`, `BREACHHUB_API_KEY`, `LUPERLY_API_KEY`. Missing keys simply mark that provider as failed in the report.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
