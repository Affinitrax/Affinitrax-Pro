ALTER TABLE deal_integrations
  ADD COLUMN IF NOT EXISTS daily_cap int DEFAULT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES deal_integrations(id);

COMMENT ON COLUMN deal_integrations.daily_cap IS 'Max leads relayed per calendar day (UTC). NULL = no cap.';
COMMENT ON COLUMN leads.integration_id IS 'Integration that handled the relay for this lead.';

CREATE INDEX IF NOT EXISTS idx_leads_integration_created
  ON leads(integration_id, created_at)
  WHERE integration_id IS NOT NULL;
