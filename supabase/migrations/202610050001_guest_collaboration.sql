-- Capability links never create permanent memberships. All access is checked server-side.
begin;
create table public.rp_guest_links (
 token text primary key default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),
 project_id uuid not null references public.rp_projects(id) on delete cascade,
 role text not null check(role in ('viewer','editor')),
 created_at timestamptz not null default now(), expires_at timestamptz,
 revoked_at timestamptz
);
create index rp_guest_links_project on public.rp_guest_links(project_id);
alter table public.rp_guest_links enable row level security;
revoke all on public.rp_guest_links from public,anon,authenticated;
grant select on public.rp_guest_links to authenticated;
create policy rp_guest_links_owner on public.rp_guest_links for select to authenticated using(roomplan_private.role(project_id)='owner');

-- Presence is ephemeral, contains no email addresses, and never increments document revision.
create table public.rp_presence (
 project_id uuid not null references public.rp_projects(id) on delete cascade,
 session_id uuid not null, credential text not null, label text not null,
 cursor jsonb, seen_at timestamptz not null default now(), primary key(project_id,session_id)
);
create index rp_presence_recent on public.rp_presence(project_id,seen_at);
alter table public.rp_presence enable row level security;
revoke all on public.rp_presence from public,anon,authenticated;

create function public.rp_create_guest_link(p_project uuid,p_role text,p_duration text) returns public.rp_guest_links
language plpgsql security definer set search_path='' as $$
declare result public.rp_guest_links; duration interval;
begin
 perform 1 from public.rp_projects where id=p_project for update;
 if roomplan_private.role(p_project) is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_role is null or p_role not in ('viewer','editor') then raise exception 'Invalid role'; end if;
 case p_duration when '1h' then duration:=interval '1 hour'; when '24h' then duration:=interval '24 hours'; when '7d' then duration:=interval '7 days'; when 'unlimited' then duration:=null; else raise exception 'Invalid duration'; end case;
 if (select count(*) from public.rp_guest_links where project_id=p_project and revoked_at is null and (expires_at is null or expires_at>clock_timestamp()))>=50 then raise exception 'Too many active links. Revoke an unused link first.'; end if;
 insert into public.rp_guest_links(project_id,role,expires_at) values(p_project,p_role,clock_timestamp()+duration) returning * into result;
 return result;
end $$;
create function public.rp_revoke_guest_link(p_token text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.rp_guest_links set revoked_at=clock_timestamp() where token=p_token and roomplan_private.role(project_id)='owner';
 if not found then raise exception 'Owner access required' using errcode='42501'; end if;
end $$;
create function roomplan_private.guest_link(p_token text) returns public.rp_guest_links language plpgsql security definer set search_path='' as $$
declare link public.rp_guest_links;
begin
 select * into link from public.rp_guest_links where token=p_token and revoked_at is null and (expires_at is null or expires_at>clock_timestamp()) for share;
 if link.project_id is null then raise exception 'This link has expired or been revoked.' using errcode='42501'; end if;
 return link;
end $$;
create function public.rp_open_guest_link(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.rp_guest_links; p public.rp_projects;
begin
 link:=roomplan_private.guest_link(p_token);
 select * into p from public.rp_projects where id=link.project_id;
 if p.archived then raise exception 'Project is archived' using errcode='42501'; end if;
 return jsonb_build_object('project',to_jsonb(p),'role',link.role,'expires_at',link.expires_at);
end $$;

-- One atomic patch implementation for members and guests; entry points authorize first.
create function roomplan_private.apply_changes(p_project uuid,p_changes jsonb) returns public.rp_projects language plpgsql security definer set search_path='' as $$
declare p public.rp_projects; change jsonb; c text; entity_id text; current_entity jsonb; next_list jsonb;
begin
 select * into p from public.rp_projects where id=p_project for update;
 if p.id is null or p.archived then raise exception 'Project is unavailable'; end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>40000 or octet_length(p_changes::text)>10000000 then raise exception 'Invalid changes'; end if;
 for change in select value from jsonb_array_elements(p_changes) loop
  c:=change->>'collection'; entity_id:=change->>'id';
  if c is null or c not in ('walls','floors','items','comments') or entity_id is null or not(change ? 'before' and change ? 'after') then raise exception 'Invalid change'; end if;
  select value into current_entity from jsonb_array_elements(p.document->c) where value->>'id'=entity_id;
  current_entity:=coalesce(current_entity,'null'::jsonb);
  if current_entity=change->'after' then continue; end if;
  if current_entity is distinct from change->'before' then raise exception 'Concurrent edit conflict' using errcode='40001'; end if;
  if change->'after'<>'null'::jsonb and (change->'after'->>'id' is distinct from entity_id or jsonb_typeof(change->'after')<>'object') then raise exception 'Invalid replacement'; end if;
  select coalesce(jsonb_agg(case when value->>'id'=entity_id then change->'after' else value end order by ord),'[]'::jsonb) into next_list from jsonb_array_elements(p.document->c) with ordinality as a(value,ord) where not(value->>'id'=entity_id and change->'after'='null'::jsonb);
  if current_entity='null'::jsonb and change->'after'<>'null'::jsonb then next_list:=next_list||jsonb_build_array(change->'after'); end if;
  p.document:=jsonb_set(p.document,array[c],next_list);
 end loop;
 perform roomplan_private.validate_document(p.document);
 if p.document=(select document from public.rp_projects where id=p_project) then return p; end if;
 update public.rp_projects set document=p.document,revision=revision+1,updated_at=clock_timestamp() where id=p_project returning * into p;
 return p;
end $$;
create or replace function public.rp_save_changes(p_project uuid,p_changes jsonb) returns public.rp_projects language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.rp_projects where id=p_project for update;
 if coalesce(roomplan_private.role(p_project),'') not in ('owner','editor') then raise exception 'Edit access required' using errcode='42501'; end if;
 return roomplan_private.apply_changes(p_project,p_changes);
end $$;
create function public.rp_guest_save(p_token text,p_changes jsonb) returns public.rp_projects language plpgsql security definer set search_path='' as $$
declare link public.rp_guest_links; saved public.rp_projects;
begin
 link:=roomplan_private.guest_link(p_token);
 if link.role<>'editor' then raise exception 'This link permits viewing only.' using errcode='42501'; end if;
 saved:=roomplan_private.apply_changes(link.project_id,p_changes);
 if link.expires_at is not null and link.expires_at<=clock_timestamp() then raise exception 'This link has expired.' using errcode='42501'; end if;
 return saved;
end $$;

create function roomplan_private.member_active(p_project uuid,p_credential text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rp_projects where id=p_project and 'user:'||owner_id::text=p_credential)
 or exists(select 1 from public.rp_members where project_id=p_project and 'user:'||user_id::text=p_credential)
$$;

-- Batches cursor heartbeat, access recheck, revision check and peer snapshot in one request.
-- No document payload when its revision has not changed; guest credentials are never exposed.
create function public.rp_collaborate(p_project uuid,p_session uuid,p_revision bigint,p_cursor jsonb default null,p_token text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare access text; access_credential text; label text; link public.rp_guest_links; p public.rp_projects; peers jsonb;
begin
 if p_session is null then raise exception 'Session required'; end if;
 if p_token is not null then
  link:=roomplan_private.guest_link(p_token);
  if link.project_id<>p_project then raise exception 'Wrong project' using errcode='42501'; end if;
  access:=link.role; access_credential:='link:'||md5(p_token); label:='Guest '||left(md5(p_session::text),4);
 else
  access:=roomplan_private.role(p_project);
  if access is null then raise exception 'Project access required' using errcode='42501'; end if;
  access_credential:='user:'||auth.uid()::text;
  select coalesce(nullif(split_part(email,'@',1),''),'Member') into label from auth.users where id=auth.uid();
 end if;
 select * into p from public.rp_projects where id=p_project;
 if p.id is null or p.archived then raise exception 'Project is unavailable' using errcode='42501'; end if;
 if p_cursor is not null and p_cursor<>'null'::jsonb then
  if p_cursor->>'view' not in ('2d','3d') or p_cursor->>'view' is null then raise exception 'Invalid cursor'; end if;
  perform roomplan_private.point(p_cursor);
  p_cursor:=jsonb_build_object('x',p_cursor->'x','y',p_cursor->'y','view',p_cursor->'view');
 else p_cursor:=null; end if;
 delete from public.rp_presence where project_id=p_project and seen_at<clock_timestamp()-interval '30 seconds';
 if (select count(*) from public.rp_presence where project_id=p_project)>=100 and not exists(select 1 from public.rp_presence where project_id=p_project and session_id=p_session) then raise exception 'This room is full'; end if;
 insert into public.rp_presence(project_id,session_id,credential,label,cursor) values(p_project,p_session,access_credential,left(label,32),p_cursor)
 on conflict(project_id,session_id) do update set cursor=excluded.cursor,label=excluded.label,seen_at=clock_timestamp()
 where public.rp_presence.credential=excluded.credential and (public.rp_presence.cursor is distinct from excluded.cursor or public.rp_presence.seen_at<clock_timestamp()-interval '3 seconds');
 if not exists(select 1 from public.rp_presence where project_id=p_project and session_id=p_session and credential=access_credential) then raise exception 'Invalid presence session' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',md5(s.session_id::text),'name',s.label,'cursor',s.cursor)),'[]'::jsonb) into peers from public.rp_presence s
 where s.project_id=p_project and s.session_id<>p_session and s.seen_at>clock_timestamp()-interval '8 seconds'
 and (s.credential like 'user:%' and roomplan_private.member_active(p_project,s.credential)
   or exists(select 1 from public.rp_guest_links l where l.project_id=p_project and 'link:'||md5(l.token)=s.credential and l.revoked_at is null and (l.expires_at is null or l.expires_at>clock_timestamp())));
 return jsonb_build_object('role',access,'peers',peers,'project',case when p.revision>p_revision then to_jsonb(p) else null end,'expires_at',link.expires_at);
end $$;

revoke all on function roomplan_private.guest_link(text),roomplan_private.apply_changes(uuid,jsonb),roomplan_private.member_active(uuid,text) from public,anon,authenticated;
revoke all on function public.rp_create_guest_link(uuid,text,text),public.rp_revoke_guest_link(text),public.rp_open_guest_link(text),public.rp_guest_save(text,jsonb),public.rp_collaborate(uuid,uuid,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.rp_create_guest_link(uuid,text,text),public.rp_revoke_guest_link(text) to authenticated;
grant execute on function public.rp_open_guest_link(text),public.rp_guest_save(text,jsonb),public.rp_collaborate(uuid,uuid,bigint,jsonb,text) to anon,authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rp_projects') then
  alter publication supabase_realtime add table public.rp_projects;
 end if;
end $$;
commit;
