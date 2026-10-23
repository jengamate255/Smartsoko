-- Durable schedules. Only the server service role can read recipients or claim work.
CREATE TABLE IF NOT EXISTS public.admin_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  report_type text NOT NULL CHECK (report_type IN ('revenue','orders','users')),
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  emails jsonb NOT NULL CHECK (jsonb_typeof(emails) = 'array' AND jsonb_array_length(emails) BETWEEN 1 AND 10),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','failed')),
  next_run_at timestamptz NOT NULL,
  run_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  email_payload jsonb,
  last_sent_at timestamptz,
  last_error text,
  provider_id text
);
ALTER TABLE public.admin_report_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_report_schedules FROM anon, authenticated;
GRANT ALL ON public.admin_report_schedules TO service_role;
CREATE INDEX IF NOT EXISTS admin_report_due ON public.admin_report_schedules(next_run_at) WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.claim_admin_report()
RETURNS SETOF public.admin_report_schedules LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE selected_id uuid;
BEGIN
  UPDATE admin_report_schedules SET status='failed', last_error='Retry limit reached; review delivery history', lease_token=NULL, lease_until=NULL
    WHERE status='active' AND attempts>=5 AND (lease_until IS NULL OR lease_until<now());
  SELECT id INTO selected_id FROM admin_report_schedules
    WHERE status='active' AND next_run_at<=now() AND (lease_until IS NULL OR lease_until<now()) AND attempts<5
    ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF selected_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE admin_report_schedules SET run_at=coalesce(run_at,next_run_at),
    lease_token=gen_random_uuid(), lease_until=now()+interval '5 minutes', attempts=attempts+1
    WHERE id=selected_id RETURNING *;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_admin_report(p_id uuid, p_lease uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb;
BEGIN
  UPDATE admin_report_schedules SET email_payload=coalesce(email_payload,p_payload)
    WHERE id=p_id AND lease_token=p_lease AND lease_until>now() RETURNING email_payload INTO payload;
  IF payload IS NULL THEN RAISE EXCEPTION 'Report delivery lease expired'; END IF;
  RETURN payload;
END $$;

CREATE OR REPLACE FUNCTION public.finish_admin_report(p_id uuid, p_lease uuid, p_error text, p_next timestamptz, p_provider_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_error IS NULL AND (p_next IS NULL OR p_provider_id IS NULL) THEN RAISE EXCEPTION 'Delivery acknowledgement required'; END IF;
  UPDATE admin_report_schedules SET
    status=CASE WHEN p_error IS NOT NULL AND (attempts>=5 OR run_at<now()-interval '23 hours') THEN 'failed' ELSE status END,
    next_run_at=CASE WHEN p_error IS NULL THEN p_next ELSE now()+interval '5 minutes' * attempts END,
    last_sent_at=CASE WHEN p_error IS NULL THEN now() ELSE last_sent_at END,
    provider_id=CASE WHEN p_error IS NULL THEN p_provider_id ELSE provider_id END,
    last_error=left(p_error,500),
    attempts=CASE WHEN p_error IS NULL THEN 0 ELSE attempts END,
    email_payload=CASE WHEN p_error IS NULL THEN NULL ELSE email_payload END,
    run_at=CASE WHEN p_error IS NULL THEN NULL ELSE run_at END,
    lease_token=NULL, lease_until=NULL
    WHERE id=p_id AND lease_token=p_lease;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_admin_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_admin_report(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_admin_report(uuid,uuid,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_report() TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_admin_report(uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_admin_report(uuid,uuid,text,timestamptz,text) TO service_role;
