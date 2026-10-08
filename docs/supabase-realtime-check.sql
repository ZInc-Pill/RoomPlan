select 'Project table published to Realtime' as check_name, exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rp_projects') as passed
union all select 'Realtime publishes updates', exists(select 1 from pg_publication where pubname='supabase_realtime' and pubupdate)
union all select 'Project RLS enabled', relrowsecurity from pg_class where oid='public.rp_projects'::regclass
union all select 'Signed-in save calls shared patch handler', position('roomplan_private.apply_changes' in prosrc)>0 from pg_proc where oid=to_regprocedure('public.rp_save_changes(uuid,jsonb)')
union all select 'Guest save calls shared patch handler', position('roomplan_private.apply_changes' in prosrc)>0 from pg_proc where oid=to_regprocedure('public.rp_guest_save(text,jsonb)')
union all select 'Members can call collaboration', has_function_privilege('authenticated','public.rp_collaborate(uuid,uuid,bigint,jsonb,text)','execute')
union all select 'Guest links can call collaboration', has_function_privilege('anon','public.rp_collaborate(uuid,uuid,bigint,jsonb,text)','execute')
union all select 'Collaboration returns newer project revisions', position('p.revision>p_revision' in replace(prosrc,' ',''))>0 and position('to_jsonb(p)' in prosrc)>0 from pg_proc where oid=to_regprocedure('public.rp_collaborate(uuid,uuid,bigint,jsonb,text)')
union all select 'Shared patch handler validates document', position('validate_document' in prosrc)>0 from pg_proc where oid=to_regprocedure('roomplan_private.apply_changes(uuid,jsonb)');