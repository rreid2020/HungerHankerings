#!/bin/bash
# Run once on the droplet (e.g. after first deploy) to create and seed postal_code_zone.
# SSH to droplet, cd /root/HungerHankerings, then: bash deploy/run-postal-zone-once.sh
# Requires .env and vendure image (e.g. stack already built).
set -e
cd /root/HungerHankerings
set -a && . ./.env && set +a
comp="docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml"
echo "Creating postal_code_zone table (idempotent)..."
$comp run --rm vendure node dist/create-postal-code-zone-table.js
echo "Widening prefix if needed..."
$comp run --rm vendure node dist/alter-postal-zone-prefix-length.js || true
echo "Adding city/region columns if needed..."
$comp run --rm vendure node dist/alter-postal-zone-add-city-region.js || true
echo "Seeding postal code zones (idempotent)..."
$comp run --rm vendure node dist/seed-postal-code-zones.js
echo "Done. postal_code_zone is ready."
