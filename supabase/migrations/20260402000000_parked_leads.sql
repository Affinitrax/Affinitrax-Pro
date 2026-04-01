-- Migration: add 'parked' status for leads with no buyer integration yet
-- Parked leads are safe in DB and can be replayed when a buyer goes live.

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('received','relaying','relayed','parked','failed','ftd','rejected'));
