-- Add city and region columns for display (optional; not used in lookup).
-- Run once on existing postal_code_zone tables. Safe to run if columns already exist.

ALTER TABLE postal_code_zone ADD COLUMN IF NOT EXISTS city varchar(128);
ALTER TABLE postal_code_zone ADD COLUMN IF NOT EXISTS region varchar(128);
