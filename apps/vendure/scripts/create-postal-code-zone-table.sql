-- Creates the postal_code_zone table used by PostalZonePlugin (shipping by postal code).
-- Run this once if the table is missing (e.g. DB was created before the plugin was added).
-- Usage: psql $DATABASE_URL -f apps/vendure/scripts/create-postal-code-zone-table.sql
-- Or on droplet: docker compose run --rm -e PGPASSWORD=$DB_PASSWORD postgres psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /path/to/this/file
-- (Mount the script or paste the SQL.)

CREATE TABLE IF NOT EXISTS postal_code_zone (
  id SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "countryCode" varchar(2) NOT NULL,
  prefix varchar(6) NOT NULL DEFAULT '',
  "zoneName" varchar(128) NOT NULL,
  "rateCents" integer NOT NULL
);

-- Optional: create index for lookups (countryCode + prefix)
CREATE INDEX IF NOT EXISTS idx_postal_code_zone_country_prefix
  ON postal_code_zone ("countryCode", prefix);

COMMENT ON TABLE postal_code_zone IS 'Shipping rate by 3-char FSA (Canada) or country default. Seed with pnpm run seed:postal-zones.';
