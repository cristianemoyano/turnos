# Production deployment (Turnos)

Turnos production runs on the **same Hostinger VPS** as Andiko ERP:

| Item | Value |
|------|--------|
| URL | https://turnos.andiko.cloud |
| SSH | `ssh root@187.77.235.70` |
| Repo | `/root/turnos` |
| Swarm stack | `turnos` (`app` + `postgres`) |
| Edge | Andiko `nginx` on `:80`/`:443` → `turnos_app:3000` via overlay `andiko_web` |
| Cap | https://cap.andiko.cloud (site key `turnos-prod`, not Andiko’s key) |
| TLS | Shared Let’s Encrypt cert for `andiko.cloud` (+ SAN `turnos.andiko.cloud`) |

Day-to-day work is **shipping releases**, not re-running bootstrap.

## Architecture

```
Internet → andiko nginx (:443) → turnos_app (:3000) → turnos_postgres
                ↑
           Cap (cap.andiko.cloud) for login / signup / public booking
```

## Environment file

Copy `infra/.env.production.example` → `infra/.env.production` on the VPS. Never commit it.

Generate secrets:

```bash
openssl rand -base64 32   # POSTGRES_PASSWORD, AUTH_SECRET
```

Required:

| Variable | Example |
|----------|---------|
| `AUTH_URL` | `https://turnos.andiko.cloud` |
| `NEXT_PUBLIC_BASE_URL` | `https://turnos.andiko.cloud` |
| `NEXT_PUBLIC_CAP_HOST` | `https://cap.andiko.cloud` |
| `NEXT_PUBLIC_CAP_SITE_KEY` | from `make prod-setup-cap` |
| `CAP_SECRET_KEY` | from `make prod-setup-cap` |
| `CAP_VERIFY_URL` | `https://cap.andiko.cloud/siteverify` |

`NEXT_PUBLIC_*` is baked into the Docker image at build time.

## Bootstrap (once)

1. DNS: A record `turnos` → `187.77.235.70` on zone `andiko.cloud`.
2. Clone repo to `/root/turnos`, fill `infra/.env.production`.
3. `make prod-setup-cap` — creates Cap site `turnos-prod` using Andiko’s `CAP_ADMIN_KEY`.
4. `make prod-init` — data dir + Docker secrets. **Never on a live stack.**
5. `make prod-nginx-http` — install HTTP vhost for ACME.
6. `make prod-ssl` — expand cert SANs (preserves existing) + install HTTPS vhost.
7. `make prod-ship TAG=v0.1.0` — build, deploy (if stack missing), migrate, deploy, health.

## Routine release

```bash
ssh root@187.77.235.70
cd /root/turnos
git pull
make prod-ship TAG=vX.Y.Z
```

## Health

```bash
curl -sf https://turnos.andiko.cloud/api/health
# {"status":"ok","db":"connected"}
```

## First tenant

Open https://turnos.andiko.cloud/signup (Cap required in prod). Prefer business slug `andiko` → booking URL `https://turnos.andiko.cloud/r/andiko` (Cap also required on public create and `/confirmar/[token]`).

## Agent skills

- [prod-deploy](../../.cursor/skills/prod-deploy/SKILL.md)
- [prod-hotfix](../../.cursor/skills/prod-hotfix/SKILL.md)
