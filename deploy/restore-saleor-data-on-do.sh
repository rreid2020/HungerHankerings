#!/usr/bin/env bash
# =============================================================================
# LEGACY – Saleor only. Do NOT use for Vendure.
# Vendure uses DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (no DATABASE_URL).
# Run Vendure migrations with: docker compose ... run --rm vendure node dist/migrate.js
# (see docs/troubleshoot-502.md and deploy/DROPLET-DATABASE-AND-MIGRATIONS.md)
# =============================================================================
# Run on the Droplet: truncate DO Saleor data (keep schema + django_migrations), then restore from deploy/saleor_data.dump
# Requires: deploy/saleor_data.dump present, .env with DATABASE_URL in project root.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP="$SCRIPT_DIR/saleor_data.dump"

if [ ! -f "$DUMP" ]; then
  echo "Missing dump file: $DUMP"
  echo "Copy it from your PC with: scp deploy/saleor_data.dump root@YOUR_DROPLET_IP:/root/HungerHankerings/deploy/"
  exit 1
fi

cd "$PROJECT_ROOT"
if [ ! -f .env ]; then
  echo "Missing .env in $PROJECT_ROOT"
  exit 1
fi

set -a
source .env
set +a

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set in .env"
  exit 1
fi

echo "Truncating all tables (except django_migrations) in DO Saleor database..."
TRUNCATE_SQL=$(docker run --rm postgres:15 psql "$DATABASE_URL" -t -A -c "
  SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(tablename), ', ') || ' CASCADE;'
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename != 'django_migrations';
")
TRUNCATE_SQL=$(echo "$TRUNCATE_SQL" | tr -d '\r\n')
docker run --rm postgres:15 psql "$DATABASE_URL" -c "$TRUNCATE_SQL"

echo "Restoring data (--data-only --disable-triggers)..."
docker run --rm -v "$SCRIPT_DIR:/deploy" postgres:15 pg_restore --no-owner --no-acl -d "$DATABASE_URL" --data-only --disable-triggers /deploy/saleor_data.dump || true

echo "Done. You can restart Saleor: docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d --force-recreate saleor-api saleor-worker"
