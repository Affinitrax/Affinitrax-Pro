-- ============================================================
-- Affinitrax Integration Layer — Migration
-- Creates the generalized buyer-relay + seller-intake system
-- ============================================================

-- 1. deal_integrations — per-deal buyer CRM configuration
CREATE TABLE IF NOT EXISTS deal_integrations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                   UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  endpoint_url              TEXT NOT NULL,
  auth_type                 TEXT NOT NULL CHECK (auth_type IN ('header_key','bearer','basic','query_param')),
  auth_header_name          TEXT NOT NULL DEFAULT 'Authorization',
  auth_header_value_enc     TEXT,           -- AES-256-GCM encrypted buyer credential
  content_type              TEXT NOT NULL DEFAULT 'json' CHECK (content_type IN ('json','form_urlencoded')),
  response_lead_id_path     TEXT NOT NULL DEFAULT 'leadId',    -- dot-notation path into response
  response_redirect_url_path TEXT,                             -- dot-notation path for redirect URL
  ip_whitelist_required     BOOLEAN NOT NULL DEFAULT false,
  notes                     TEXT,
  status                    TEXT NOT NULL DEFAULT 'testing' CHECK (status IN ('active','inactive','testing')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. integration_field_mappings — translate Affinitrax fields → buyer field names
CREATE TABLE IF NOT EXISTS integration_field_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES deal_integrations(id) ON DELETE CASCADE,
  affinitrax_field  TEXT NOT NULL,
  buyer_field       TEXT NOT NULL,
  required          BOOLEAN NOT NULL DEFAULT false,
  default_value     TEXT,
  transform         TEXT NOT NULL DEFAULT 'none'
                    CHECK (transform IN ('none','uppercase','lowercase','e164_phone','strip_plus')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. deal_api_keys — Affinitrax-issued keys given to sellers per deal
CREATE TABLE IF NOT EXISTS deal_api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  partner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  label         TEXT NOT NULL DEFAULT 'Default',
  key_hash      TEXT NOT NULL UNIQUE,   -- SHA-256 of full key, never stored plain
  key_prefix    TEXT NOT NULL,          -- first 12 chars of key for display only
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

-- 4. deal_postback_configs — seller tracker postback URLs per event type
CREATE TABLE IF NOT EXISTS deal_postback_configs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id              UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL
                       CHECK (event_type IN ('lead','ftd','deposit','conversion','rejection')),
  seller_postback_url  TEXT NOT NULL,
  placeholder_syntax   TEXT NOT NULL DEFAULT 'double_bracket'
                       CHECK (placeholder_syntax IN ('double_bracket','curly','percent','single_bracket')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, event_type)
);

-- 5. leads — every lead that enters Affinitrax
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  partner_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  api_key_id      UUID REFERENCES deal_api_keys(id) ON DELETE SET NULL,

  -- Standard Affinitrax lead fields (always stored)
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  country         TEXT,
  ip              TEXT,
  click_id        TEXT,
  sub1            TEXT,
  sub2            TEXT,
  sub3            TEXT,

  -- Relay outcome (filled after forwarding to buyer CRM)
  buyer_lead_id   TEXT,
  buyer_crm_id    TEXT,
  redirect_url    TEXT,
  status          TEXT NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','relaying','relayed','failed','ftd','rejected')),
  relay_attempts  INTEGER NOT NULL DEFAULT 0,
  relay_error     TEXT,
  relayed_at      TIMESTAMPTZ,
  ftd_at          TIMESTAMPTZ,

  is_test         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. lead_events — full audit trail (every inbound + outbound HTTP call per lead)
CREATE TABLE IF NOT EXISTS lead_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  event_type      TEXT NOT NULL,
  endpoint        TEXT,
  payload         JSONB,
  response_status INTEGER,
  response_body   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. postback_relays — every postback fired from Affinitrax to a seller's tracker
CREATE TABLE IF NOT EXISTS postback_relays (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  raw_url         TEXT NOT NULL,  -- template with placeholders
  resolved_url    TEXT,           -- URL after placeholder substitution
  response_status INTEGER,
  response_body   TEXT,
  fired_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_deal_id              ON leads(deal_id);
CREATE INDEX IF NOT EXISTS idx_leads_click_id             ON leads(click_id);
CREATE INDEX IF NOT EXISTS idx_leads_email                ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status               ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at           ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id        ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_postback_relays_lead_id    ON postback_relays(lead_id);
CREATE INDEX IF NOT EXISTS idx_deal_api_keys_key_hash     ON deal_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_deal_api_keys_deal_id      ON deal_api_keys(deal_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_int_id      ON integration_field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_deal_integrations_deal_id  ON deal_integrations(deal_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All access via service role key on server side — RLS blocks accidental
-- direct client queries. Policies below allow service role to pass through.

ALTER TABLE deal_integrations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_postback_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE postback_relays         ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────────────────────

-- Atomic relay_attempts increment — avoids read-modify-write race conditions
CREATE OR REPLACE FUNCTION increment_relay_attempts(p_lead_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE leads SET relay_attempts = relay_attempts + 1 WHERE id = p_lead_id;
$$;

-- Service role bypass (all server API routes use createAdminClient)
CREATE POLICY "service_all_integrations"    ON deal_integrations        FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_field_mappings"  ON integration_field_mappings FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_api_keys"        ON deal_api_keys            FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_postback_cfg"    ON deal_postback_configs     FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_leads"           ON leads                    FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_lead_events"     ON lead_events              FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_postback_relays" ON postback_relays          FOR ALL TO service_role USING (true);
