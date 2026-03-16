-- Widen prefix column to support 2-3 char prefixes for remote zones (e.g. K0, K0K).
-- Run once on existing DBs that have postal_code_zone with prefix varchar(1).
-- Safe to run multiple times (no-op if already varchar(6)).

ALTER TABLE postal_code_zone
  ALTER COLUMN prefix TYPE varchar(6) USING (prefix::varchar(6));
