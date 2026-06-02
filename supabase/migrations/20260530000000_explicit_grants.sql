/**
 * Explicit Data API grants — required from May 30 2026 (Supabase policy change).
 * New projects no longer expose public schema tables by default.
 * Existing projects must be compliant before October 30 2026.
 *
 * - anon       : no direct table access (all reads go through Next.js API routes with service_role)
 * - authenticated: full access (admin portal sessions)
 * - service_role : full access (server-side relay engine, already bypasses RLS)
 *
 * ALTER DEFAULT PRIVILEGES ensures every future table created in public schema
 * inherits the same grants automatically — no per-table boilerplate needed.
 */

-- ── Existing tables ───────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.leads
  to authenticated, service_role;

grant select, insert, update, delete
  on public.lead_events
  to authenticated, service_role;

grant select, insert, update, delete
  on public.deal_integrations
  to authenticated, service_role;

grant select, insert, update, delete
  on public.deal_api_keys
  to authenticated, service_role;

grant select, insert, update, delete
  on public.deal_postback_configs
  to authenticated, service_role;

grant select, insert, update, delete
  on public.integration_field_mappings
  to authenticated, service_role;

grant select, insert, update, delete
  on public.postback_relays
  to authenticated, service_role;

-- ── Sequences (needed for INSERT with serial/identity columns) ────────────────

grant usage, select
  on all sequences in schema public
  to authenticated, service_role;

-- ── Future tables — auto-grant on create ──────────────────────────────────────

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to authenticated, service_role;
