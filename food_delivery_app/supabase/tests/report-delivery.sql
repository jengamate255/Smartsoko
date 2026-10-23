-- Run in an isolated database with the report-delivery migration installed.
BEGIN;
DO $$
DECLARE job public.admin_report_schedules; old_lease uuid; payload jsonb;
BEGIN
  IF has_table_privilege('anon','public.admin_report_schedules','SELECT') OR
     has_table_privilege('authenticated','public.admin_report_schedules','SELECT') OR
     has_function_privilege('anon','public.claim_admin_report()','EXECUTE') OR
     has_function_privilege('authenticated','public.finish_admin_report(uuid,uuid,text,timestamptz,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Report recipients or worker functions exposed to client roles';
  END IF;
  INSERT INTO public.admin_report_schedules(name,report_type,frequency,emails,created_by,next_run_at)
    VALUES('QA report','orders','daily','["qa@example.invalid"]','qa',now()-interval '1 minute');
  SELECT * INTO job FROM public.claim_admin_report();
  IF job.id IS NULL OR job.attempts<>1 OR job.lease_token IS NULL THEN RAISE EXCEPTION 'Job was not claimed'; END IF;
  IF EXISTS(SELECT * FROM public.claim_admin_report()) THEN RAISE EXCEPTION 'Claimed job delivered concurrently'; END IF;
  payload:=public.prepare_admin_report(job.id,job.lease_token,'{"subject":"frozen"}');
  payload:=public.prepare_admin_report(job.id,job.lease_token,'{"subject":"changed"}');
  IF payload->>'subject'<>'frozen' THEN RAISE EXCEPTION 'Retry changed email payload'; END IF;
  IF public.finish_admin_report(job.id,gen_random_uuid(),NULL,now()+interval '1 day','test') THEN RAISE EXCEPTION 'Foreign lease changed job'; END IF;
  PERFORM public.finish_admin_report(job.id,job.lease_token,'temporary failure',NULL,NULL);
  SELECT * INTO job FROM public.admin_report_schedules WHERE id=job.id;
  IF job.last_error<>'temporary failure' OR job.attempts<>1 OR job.email_payload IS NULL OR job.next_run_at<=now() THEN RAISE EXCEPTION 'Retry state not durable'; END IF;
  UPDATE public.admin_report_schedules SET next_run_at=now()-interval '1 second' WHERE id=job.id;
  SELECT * INTO job FROM public.claim_admin_report();
  IF job.attempts<>2 THEN RAISE EXCEPTION 'Retry attempt lost'; END IF;
  PERFORM public.finish_admin_report(job.id,job.lease_token,NULL,now()+interval '1 day','test-provider-id');
  SELECT * INTO job FROM public.admin_report_schedules WHERE id=job.id;
  IF job.attempts<>0 OR job.last_sent_at IS NULL OR job.run_at IS NOT NULL OR job.email_payload IS NOT NULL OR job.provider_id<>'test-provider-id' THEN RAISE EXCEPTION 'Successful delivery not committed'; END IF;
  UPDATE public.admin_report_schedules SET next_run_at=now()-interval '1 second',status='paused' WHERE id=job.id;
  IF EXISTS(SELECT * FROM public.claim_admin_report()) THEN RAISE EXCEPTION 'Paused schedule claimed'; END IF;
  UPDATE public.admin_report_schedules SET status='active',attempts=5,lease_until=now()-interval '1 second' WHERE id=job.id;
  IF EXISTS(SELECT * FROM public.claim_admin_report()) THEN RAISE EXCEPTION 'Retry limit exceeded'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.admin_report_schedules WHERE id=job.id AND status='failed') THEN RAISE EXCEPTION 'Exhausted delivery not marked failed'; END IF;
END $$;
ROLLBACK;
