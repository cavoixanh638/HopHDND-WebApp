-- STAGING ONLY. A verified Google admin can copy exact Firebase mirror rows
-- for fair 55-row read benchmarking. No service key in the WebApp.
-- Source: hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344.
-- SECURITY DEFINER remains in non-exposed hdnd_private; public wrapper
-- is SECURITY INVOKER, with an explicit authenticated-only EXECUTE grant.
CREATE OR REPLACE FUNCTION hdnd_private.stage_mirror_snapshot_for_benchmark(
  p_rows jsonb, p_source text, p_sha256 text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  n integer;
  n_after integer;
  actual_prefix constant text := '1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344:row:';
  item jsonb;
BEGIN
  IF NOT hdnd_private.is_admin() THEN
    RAISE EXCEPTION 'GOOGLE_ADMIN_REQUIRED';
  END IF;
  IF p_source <> '1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344'
     OR p_sha256 !~ '^[a-f0-9]{64}$'
     OR p_rows IS NULL
     OR jsonb_typeof(p_rows) <> 'array'
     OR length(p_rows::text) > 1500000
  THEN RAISE EXCEPTION 'INVALID_MIRROR_PAYLOAD'; END IF;
  n := jsonb_array_length(p_rows);
  IF n < 50 OR n > 1000 THEN RAISE EXCEPTION 'MIRROR_COUNT_INVALID %',n; END IF;

  -- Exclusive transaction-wide staging import, never upsert or overwrite
  -- any actual business record. Re-running with current rows must fail closed.
  PERFORM pg_catalog.pg_advisory_xact_lock(20261026,55);
  IF EXISTS (SELECT 1 FROM public.hdnd_items
       WHERE record_id !~ '^qa-supa-000[1-6]$') THEN
    RAISE EXCEPTION 'STAGING_HAS_REAL_DATA: manual snapshot review required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hdnd_audit)
     OR EXISTS (SELECT 1 FROM public.hdnd_cell_locks) THEN
    RAISE EXCEPTION 'STAGING_AUDIT_OR_LOCKS_EXIST: refusing replace';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(item) <> 'object'
       OR coalesce(item->>'recordId','') NOT LIKE actual_prefix||'%'
       OR (item->>'recordId') !~ '^[-A-Za-z0-9_:]{1,200}$'
       OR length(coalesce(item->>'displayCode','')) NOT BETWEEN 1 AND 100
       OR jsonb_typeof(item->'stt') IS DISTINCT FROM 'number'
       OR (item->>'stt') !~ '^[0-9]{1,9}$'
       OR (item->>'stt')::integer < 1
       OR jsonb_typeof(item->'revision') IS DISTINCT FROM 'number'
       OR (item->>'revision') !~ '^[0-9]{1,9}$'
       OR coalesce(item->>'documentKind','') NOT IN ('NQ','BC','UNCLASSIFIED')
       OR jsonb_typeof(item->'isDropped') IS DISTINCT FROM 'boolean'
       OR (item ? 'archivedAt' AND item->'archivedAt' <> 'null'::jsonb AND jsonb_typeof(item->'archivedAt') <> 'string')
       OR jsonb_typeof(item->'content') IS DISTINCT FROM 'string'
       OR length(coalesce(item->>'content','')) < 1
    THEN RAISE EXCEPTION 'MIRROR_ROW_INVALID'; END IF;
    IF (SELECT count(*) FROM jsonb_each(item) AS field
        WHERE field.key NOT IN
          ('recordId','displayCode','stt','revision','archivedAt',
           'documentKind','content','department','type','partyLevel',
           'progressParty','progressBuild','progressCouncil','specialist',
           'room','vpLeader','ubndLeader','specificProgress','note',
           'isDropped','partyMeeting','examined')) > 0
    THEN RAISE EXCEPTION 'UNEXPECTED_MIRROR_FIELD'; END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.unnest(ARRAY['department','type','partyLevel',
        'progressParty','progressBuild','progressCouncil','specialist',
        'room','vpLeader','ubndLeader','specificProgress','note']) k
      WHERE jsonb_typeof(item->k) IS DISTINCT FROM 'string'
    ) THEN RAISE EXCEPTION 'MIRROR_FIELD_TYPE_INVALID'; END IF;
    IF (item ? 'partyMeeting' AND jsonb_typeof(item->'partyMeeting') <> 'string')
       OR (item ? 'examined' AND jsonb_typeof(item->'examined') <> 'string')
       OR length(item->>'content') > 20000
    THEN RAISE EXCEPTION 'INVALID_EXTENDED_FIELD'; END IF;
  END LOOP;

  DELETE FROM public.hdnd_items WHERE record_id ~ '^qa-supa-000[1-6]$';
  INSERT INTO public.hdnd_items
    (record_id,display_code,stt,fields,revision,archived_at)
  SELECT
    x->>'recordId',x->>'displayCode',(x->>'stt')::integer,
    (x-'recordId'-'displayCode'-'stt'-'revision'-'archivedAt'),
    GREATEST(1,(x->>'revision')::bigint),
    NULLIF(x->>'archivedAt','')::timestamptz
  FROM jsonb_array_elements(p_rows) x;
  GET DIAGNOSTICS n_after = ROW_COUNT;
  IF n_after <> n OR (SELECT count(*) FROM public.hdnd_items) <> n THEN
    RAISE EXCEPTION 'MIRROR_INSERT_COUNT_MISMATCH';
  END IF;
  RETURN jsonb_build_object('ok',true,'rows',n,'source',p_source,'source_sha256',p_sha256);
END;
$fn$;
REVOKE ALL ON FUNCTION hdnd_private.stage_mirror_snapshot_for_benchmark(jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hdnd_private.stage_mirror_snapshot_for_benchmark(jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.hdnd_stage_mirror_snapshot_for_benchmark(
  p_rows jsonb, p_source text, p_sha256 text
) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $fn$
 SELECT hdnd_private.stage_mirror_snapshot_for_benchmark(p_rows,p_source,p_sha256);
$fn$;
REVOKE ALL ON FUNCTION public.hdnd_stage_mirror_snapshot_for_benchmark(jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hdnd_stage_mirror_snapshot_for_benchmark(jsonb,text,text) TO authenticated;
