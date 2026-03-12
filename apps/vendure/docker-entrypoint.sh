#!/bin/sh
set -e
# Run migrations with same env as the server, then start the server.
echo "Running migrations..."
node dist/migrate.js
echo "Starting server..."
exec "$@"
