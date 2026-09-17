---
name: prod-hotfix
description: >-
  Run urgent production hot-fix scripts and SQL against Turnos VPS without
  deploying a new image. Use when the user asks for a prod backfill, one-off
  data repair, or “arreglar en prod ahora” without waiting for release.
---

# Production hot-fix (no deploy)

Use when **data is wrong in prod** and a code release can wait, but the repair
cannot. Prefer dry-run → apply SQL or a tsx script inside the live Swarm stack.

For routine releases see [prod-deploy](../prod-deploy/SKILL.md).

## Golden rules

1. **Confirm with the user** before any `UPDATE`/`DELETE`/`INSERT` or `--apply` on prod.
2. **Dry-run first** — print counts / sample rows; never apply blind.
3. Prefer scoped fixes (`WHERE business_id = …`) over full-table rewrites.
4. **No `make prod-ship`** for data-only repairs.
5. **Never** put secrets in chat logs; load them from `/run/secrets/*` inside the container.

## Access

```bash
ssh -o BatchMode=yes root@187.77.235.70
APP=$(docker ps -q -f name=turnos_app | head -1)
CID=$(docker ps -q -f name=turnos_postgres | head -1)
```

- App image: `turnos_app` (tsx + source under `/app`, secrets under `/run/secrets`)
- DB: `turnos_postgres` → `psql -U turnos -d turnos`
- Host repo mirror: `/root/turnos`

Pipe scripts via SSH (scp from agent sandboxes often fails):

```bash
ssh root@187.77.235.70 'cat > /tmp/my-hotfix.ts' < scripts/my-hotfix.ts
```

## Path A — SQL

```bash
docker exec -i "$CID" psql -U turnos -d turnos -v ON_ERROR_STOP=1 -c "
BEGIN;
-- dry-run SELECT counts first
UPDATE … WHERE …;
COMMIT;
"
```

## Path B — tsx inside app

```bash
docker exec -u 0 "$APP" sh -c '
  export DATABASE_URL=$(tr -d "\n" < /run/secrets/database_url)
  export AUTH_SECRET=$(tr -d "\n" < /run/secrets/auth_secret)
  node --import tsx /tmp/my-hotfix.ts
'
```

## Related

- [production.md](../../../docs/deployment/production.md)
- [prod-deploy](../prod-deploy/SKILL.md)
