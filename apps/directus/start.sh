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

# Managed Postgres (e.g. DigitalOcean): TLS required; Node often rejects DO's chain unless rejectUnauthorized=false.
# Many hosts (including DO App Platform) mangle env keys containing "__", so nested DB_SSL__reject_unauthorized may never reach Directus.
# Directus supports cast prefix "json:" — one variable, no "__".
# Local Postgres without TLS: DB_SSL=false
if [ -z "${DB_SSL:-}" ]; then
  export DB_SSL='json:{"rejectUnauthorized":false}'
elif [ "${DB_SSL}" = "true" ] || [ "${DB_SSL}" = "1" ]; then
  export DB_SSL='json:{"rejectUnauthorized":false}'
fi

exec ./node_modules/.bin/directus start
