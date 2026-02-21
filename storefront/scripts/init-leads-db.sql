-- Run this against your Digital Ocean PostgreSQL database to create the leads table.
-- You can run it via psql or your DB client:
--   psql $DATABASE_URL -f scripts/init-leads-db.sql

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

COMMENT ON TABLE leads IS 'Stores lead/inquiry submissions from contact, quote, and pantry forms';
