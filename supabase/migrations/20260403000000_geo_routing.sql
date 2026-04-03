-- Geo routing: add allowed_geos and priority to deal_integrations
ALTER TABLE deal_integrations
  ADD COLUMN IF NOT EXISTS allowed_geos text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 10;

COMMENT ON COLUMN deal_integrations.allowed_geos IS 'NULL = accept all geos. Non-null = only relay leads whose country is in this array.';
COMMENT ON COLUMN deal_integrations.priority IS 'Lower number = higher priority. Used for geo-routing tie-breaking.';
