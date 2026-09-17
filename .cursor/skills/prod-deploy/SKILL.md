---
name: prod-deploy
description: >-
  Safe production deploy workflow for Turnos on the Andiko VPS. Prefer make
  prod-ship. Use when deploying to turnos.andiko.cloud, shipping releases, or
  expanding TLS/DNS for the Turnos stack.
---

# Production deploy (Turnos VPS)

## One command

```bash
make prod-ship TAG=vX.Y.Z              # build + migrate + deploy + health
make prod-ship TAG=vX.Y.Z SCOPE=infra  # same; use after docker-stack.yml changes
```

Skip flags: `SKIP_BUILD=1`, `SKIP_MIGRATE=1`.

## Golden rules

1. **Prefer `make prod-ship`** — do not chain low-level scripts for routine releases.
2. **Never** `make prod-init` on a **live** stack (rotates / recreates secrets incorrectly).
3. **Never** `docker stack rm turnos` for updates.
4. **`NEXT_PUBLIC_*`** (Cap site key, base URL) requires image rebuild.
5. Do not touch the Andiko stack except nginx conf.d extras and shared cert SANs.

## Environment

| Item | Value |
|------|-------|
| SSH | `root@187.77.235.70` |
| Repo | `/root/turnos` |
| Domain | https://turnos.andiko.cloud |
| Health | `curl -sf https://turnos.andiko.cloud/api/health` |
| Cap | https://cap.andiko.cloud |

## Bootstrap (first time only)

1. DNS A `turnos` → `187.77.235.70` on `andiko.cloud`.
2. Copy `infra/.env.production.example` → `infra/.env.production` and fill secrets.
3. `make prod-setup-cap` (creates `turnos-prod` site key; needs Andiko `CAP_ADMIN_KEY`).
4. `make prod-init`
5. `make prod-nginx-http` → `make prod-ssl`
6. `make prod-ship TAG=v0.1.0`

## Low-level commands (advanced)

`prod-build`, `prod-migrate`, `prod-deploy`, `prod-health`, `prod-ssl`, `prod-nginx-http`, `prod-setup-cap`.

## Related

- [production.md](../../../docs/deployment/production.md)
- [prod-hotfix](../prod-hotfix/SKILL.md)
