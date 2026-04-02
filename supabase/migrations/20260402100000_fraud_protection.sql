-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fraud_protection
-- Adds database-level safeguards for duplicate conversion protection
-- and a quality_flags column on leads for traffic monitoring.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Partial unique index on postback_events:
--    Prevents the same (click_id, event_type) pair being recorded twice
--    for high-value conversion events (ftd, deposit, conversion).
--    click_id must be non-null — clicks without tracking IDs are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS postback_events_dedup_conversion
  ON public.postback_events (deal_id, click_id, event_type)
  WHERE click_id IS NOT NULL
    AND event_type IN ('ftd', 'deposit', 'conversion');

-- 2. Add quality_flags column to leads table for traffic quality annotations
--    Stores an array of flag strings e.g. ["duplicate_email_24h", "duplicate_ip_1h"]
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS quality_flags text[] DEFAULT NULL;

-- 3. Index on leads(deal_id, email, created_at) for fast duplicate email checks
CREATE INDEX IF NOT EXISTS leads_deal_email_created
  ON public.leads (deal_id, email, created_at DESC);

-- 4. Index on leads(deal_id, ip, created_at) for fast duplicate IP checks
CREATE INDEX IF NOT EXISTS leads_deal_ip_created
  ON public.leads (deal_id, ip, created_at DESC);

-- 5. Index on postback_events(deal_id, click_id, event_type) for dedup lookups
CREATE INDEX IF NOT EXISTS postback_events_deal_click_event
  ON public.postback_events (deal_id, click_id, event_type)
  WHERE click_id IS NOT NULL;

-- 6. Index on postback_events(deal_id, ip_address, event_type, created_at)
--    for duplicate IP click detection
CREATE INDEX IF NOT EXISTS postback_events_deal_ip_event
  ON public.postback_events (deal_id, ip_address, event_type, created_at DESC)
  WHERE ip_address IS NOT NULL;

-- 7. Index on leads(deal_id, is_test, created_at) for fast daily cap count
CREATE INDEX IF NOT EXISTS leads_deal_test_created
  ON public.leads (deal_id, is_test, created_at DESC);
