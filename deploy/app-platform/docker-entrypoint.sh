#!/bin/sh
set -e
LISTEN_PORT="${PORT:-8080}"
sed "s/__LISTEN_PORT__/${LISTEN_PORT}/g" /etc/nginx/app-platform-server.conf.template > /etc/nginx/http.d/default.conf
if [ -n "${INTERNAL_OPS_HOST:-}" ]; then
  sed -e "s/__LISTEN_PORT__/${LISTEN_PORT}/g" -e "s/__INTERNAL_OPS_HOST__/${INTERNAL_OPS_HOST}/g" \
    /etc/nginx/directus-ops-server.conf.template >> /etc/nginx/http.d/default.conf
fi
rm -f /tmp/supervisord.pid /run/supervisor.sock 2>/dev/null || true
exec /usr/bin/supervisord -c /etc/supervisord.conf
