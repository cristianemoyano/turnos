<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Turnos

## Project Overview

Turnos is a multi-tenant appointment booking product (salons / studios). Stack: Next.js 16 (App Router), TypeScript, Sequelize, PostgreSQL, NextAuth v5 (Credentials + JWT), Cap CAPTCHA on login/signup and public booking (create + confirm).

**Package manager:** `pnpm` only. Never `npm` or `yarn`.
**Test framework:** Vitest. Never Jest.

## Architecture

- Business logic lives in `src/modules/*/…service.ts`, never in routes or models.
- Routes are thin: validate → service → response.
- Models define structure and associations only.
- Auth edge config: `src/lib/auth.config.ts` + `src/proxy.ts`. Node auth: `src/lib/auth.ts`.

## Production

| Item | Value |
|------|-------|
| URL | https://turnos.andiko.cloud |
| VPS | `ssh root@187.77.235.70` |
| Repo on VPS | `/root/turnos` |
| Stack | Docker Swarm `turnos` (app + postgres), nginx edge shared with Andiko |
| Cap | https://cap.andiko.cloud (site key `turnos-prod`) |

Deploy / hotfix workflows: [`.cursor/skills/prod-deploy/SKILL.md`](.cursor/skills/prod-deploy/SKILL.md) and [`.cursor/skills/prod-hotfix/SKILL.md`](.cursor/skills/prod-hotfix/SKILL.md). Runbook: [`docs/deployment/production.md`](docs/deployment/production.md).

## Core Principles

- Correctness over cleverness — appointment data is real customer time.
- Explicit over implicit.
- Never run `make prod-init` on a live stack.
- `NEXT_PUBLIC_*` (including Cap site key) requires an image rebuild.

## Progressive Web App (install)

Turnos is installable as a PWA (one product manifest for staff + public booking).

- **Stack:** `@serwist/next` + `serwist`, App Router `src/app/manifest.ts`, icons in `public/icons/`, SW source `src/app/sw.ts` (build emits `public/sw.js`).
- **Build:** `pnpm build` runs `next build --webpack` (required — Serwist is a webpack plugin; Next 16 Turbopack build cannot inject the SW).
- **Android (Chrome):** open https://turnos.andiko.cloud → browser menu → **Install app** / **Agregar a la pantalla de inicio**.
- **iOS (Safari):** Share → **Add to Home Screen**. iOS does not use the service worker the same way for install prompts; Add to Home Screen is the supported path. Standalone works after that; push/background sync remain limited vs Android.
- **Offline:** shell/assets may load from cache; agenda data still needs network. Fallback page: `/~offline`.

