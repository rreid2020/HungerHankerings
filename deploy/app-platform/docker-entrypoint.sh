#!/bin/sh
set -e
LISTEN_PORT="${PORT:-8080}"
sed "s/__LISTEN_PORT__/${LISTEN_PORT}/g" /etc/nginx/app-platform-server.conf.template > /etc/nginx/http.d/default.conf
rm -f /tmp/supervisord.pid /run/supervisor.sock 2>/dev/null || true
exec /usr/bin/supervisord -c /etc/supervisord.conf
