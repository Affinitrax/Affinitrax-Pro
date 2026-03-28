-- Add FTD and other crypto/FX event types
ALTER TABLE public.postback_events
  DROP CONSTRAINT IF EXISTS postback_events_event_type_check;

ALTER TABLE public.postback_events
  ADD CONSTRAINT postback_events_event_type_check
  CHECK (event_type IN ('click', 'lead', 'conversion', 'rejection', 'ftd', 'deposit', 'registration'));
