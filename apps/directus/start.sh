#!/bin/sh
set -e
cd /app/directus

if [ "${ENABLE_DIRECTUS:-}" != "true" ]; then
  echo "[directus] ENABLE_DIRECTUS is not true — process idle (no RAM used by Directus)."
  exec tail -f /dev/null
fi

if [ -z "${KEY:-}" ] || [ -z "${SECRET:-}" ]; then
  echo "[directus] KEY and SECRET must be set when ENABLE_DIRECTUS=true"
  exit 1
fi

# Directus reads DB_* ; use DB_DATABASE for the ops DB (e.g. hungerhankeringsadmin).
# Vendure uses DB_NAME — set both on App Platform when sharing the same cluster user.
if [ -z "${DB_DATABASE:-}" ]; then
  echo "[directus] DB_DATABASE must be set when ENABLE_DIRECTUS=true (internal Postgres database name)."
  exit 1
fi

export HOST="${DIRECTUS_BIND_HOST:-127.0.0.1}"
export EXTENSIONS_PATH="${EXTENSIONS_PATH:-/app/directus/extensions}"
export DB_CLIENT="${DB_CLIENT:-pg}"

exec ./node_modules/.bin/directus start
