-- RoomPlan accounts, membership and atomic collaborative document updates.
-- All writes go through permission-checked RPCs; clients cannot update tables directly.
create schema if not exists roomplan_private;
revoke all on schema roomplan_private from public;
grant usage on schema roomplan_private to authenticated;

create table public.rp_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 120),
  document jsonb not null default '{"walls":[],"floors":[],"items":[],"comments":[]}',
  revision bigint not null default 0,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index rp_projects_owner on public.rp_projects(owner_id,updated_at desc);
create table public.rp_members (
  project_id uuid not null references public.rp_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  email text not null,
  primary key(project_id,user_id)
);
create index rp_members_user on public.rp_members(user_id,project_id);
create table public.rp_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.rp_projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days',
  unique(project_id,email)
);
create index rp_invites_email on public.rp_invitations(email);
create table public.rp_links (
  project_id uuid primary key references public.rp_projects(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role text not null check(role in ('editor','viewer')),
  expires_at timestamptz not null default now()+interval '7 days'
);

create function roomplan_private.email() returns text language sql stable security definer set search_path='' as $$
  select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null
$$;
create function roomplan_private.role(p uuid) returns text language sql stable security definer set search_path='' as $$
  select case when owner_id=auth.uid() then 'owner' else
    (select role from public.rp_members m where m.project_id=p and m.user_id=auth.uid()) end
  from public.rp_projects where id=p
$$;
revoke all on function roomplan_private.email(),roomplan_private.role(uuid) from public;
grant execute on function roomplan_private.email(),roomplan_private.role(uuid) to authenticated;

alter table public.rp_projects enable row level security;
alter table public.rp_members enable row level security;
alter table public.rp_invitations enable row level security;
alter table public.rp_links enable row level security;
revoke all on public.rp_projects,public.rp_members,public.rp_invitations,public.rp_links from anon,authenticated;
grant select on public.rp_projects,public.rp_members,public.rp_invitations,public.rp_links to authenticated;
create policy rp_projects_read on public.rp_projects for select to authenticated using (roomplan_private.role(id) is not null);
create policy rp_members_read on public.rp_members for select to authenticated using (roomplan_private.role(project_id)='owner' or user_id=auth.uid());
create policy rp_invites_read on public.rp_invitations for select to authenticated using (roomplan_private.role(project_id)='owner' or email=roomplan_private.email());
create policy rp_links_read on public.rp_links for select to authenticated using (roomplan_private.role(project_id)='owner');

create function roomplan_private.number(v jsonb, minimum numeric default -1000000) returns numeric language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(v) is distinct from 'number' or (v::text)::numeric not between minimum and 1000000 then raise exception 'Invalid geometry number'; end if;
 return (v::text)::numeric;
end $$;
create function roomplan_private.point(v jsonb) returns void language plpgsql immutable set search_path='' as $$
begin perform roomplan_private.number(v->'x');perform roomplan_private.number(v->'y');end $$;
create function roomplan_private.validate_document(d jsonb) returns void language plpgsql set search_path='' as $$
declare c text; e jsonb; k text; corner jsonb; ids text[] := '{}'; w jsonb; other jsonb; dx double precision; dy double precision; len double precision; off double precision; wide double precision; high double precision; otherwide double precision;
begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>5000000 then raise exception 'Invalid or oversized document'; end if;
 foreach c in array array['walls','floors','items','comments'] loop
  if jsonb_typeof(d->c) is distinct from 'array' or jsonb_array_length(d->c)>10000 then raise exception 'Invalid collection'; end if;
  for e in select value from jsonb_array_elements(d->c) loop
   if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'id') is distinct from 'string' or coalesce(length(e->>'id'),0) not between 1 and 200 or e->>'id'=any(ids) then raise exception 'Invalid or duplicate entity ID'; end if;
   ids:=array_append(ids,e->>'id');
   foreach k in array array['color','material'] loop
    if e ? k and (jsonb_typeof(e->k) is distinct from 'string' or length(e->>k)>10000) then raise exception 'Invalid appearance';end if;
   end loop;
   if c='walls' then
    perform roomplan_private.point(e->'start');perform roomplan_private.point(e->'end');perform roomplan_private.number(e->'thickness',0.001);
    if e ? 'height' then perform roomplan_private.number(e->'height',0.001);end if;
   elsif c='floors' then
    if jsonb_typeof(e->'points') is distinct from 'array' or jsonb_array_length(e->'points') not between 3 and 10000 or jsonb_typeof(e->'color') is distinct from 'string' then raise exception 'Invalid floor';end if;
    for corner in select value from jsonb_array_elements(e->'points') loop perform roomplan_private.point(corner);end loop;
   elsif c='comments' then
    perform roomplan_private.point(e);
    if jsonb_typeof(e->'text') is distinct from 'string' or length(e->>'text')>10000 then raise exception 'Invalid note';end if;
   else
    perform roomplan_private.point(e);perform roomplan_private.number(e->'rotation');
    if e->>'typeId' is null or e->>'typeId' not in ('win_std','win_large','door_int','door_ext','kit_counter','kit_base_cabinet','kit_corner_cabinet','kit_island','kit_sink','kit_dishwasher','kit_fridge_std','kit_fridge_dbl','kit_table_4','kit_table_6','bed_single','bed_queen','bed_king','bed_wardrobe','bed_nightstand','liv_sofa_2','liv_sofa_3','liv_tvstand','liv_tv_cabinet','liv_rug_m','liv_rug_l','bath_tub','bath_shower','bath_toilet','bath_sink','bal_railing','bal_corner_railing','bal_plant','bal_chair','bal_lounge_chair','arch_divider') then raise exception 'Unknown furniture type';end if;
    foreach k in array array['width','depth','height','elevation'] loop
     if e ? k then perform roomplan_private.number(e->k,case when k='elevation' then 0 else 0.001 end);end if;
    end loop;
   end if;
  end loop;
 end loop;
 for e in select value from jsonb_array_elements(d->'items') where value ? 'wallId' loop
  if e->>'typeId' not in ('win_std','win_large','door_int','door_ext') then raise exception 'Only openings attach to walls';end if;
  select value into w from jsonb_array_elements(d->'walls') where value->>'id'=e->>'wallId';
  if w is null then raise exception 'Opening references missing wall';end if;
  off:=roomplan_private.number(e->'wallOffset',0);
  wide:=coalesce((e->>'width')::double precision,case e->>'typeId' when 'win_large' then 200 when 'door_int' then 80 else 90 end);
  high:=coalesce((e->>'height')::double precision,case e->>'typeId' when 'win_std' then 120 when 'win_large' then 150 else 210 end);
  dx:=(w->'end'->>'x')::double precision-(w->'start'->>'x')::double precision;dy:=(w->'end'->>'y')::double precision-(w->'start'->>'y')::double precision;len:=sqrt(dx*dx+dy*dy);
  if len=0 or off*0.4<wide*0.2-0.00004 or off*0.4>len-wide*0.2+0.00004 or (high+coalesce((e->>'elevation')::double precision,0))*0.4>coalesce((w->>'height')::double precision,150) then raise exception 'Opening does not fit wall';end if;
  if sqrt(power((e->>'x')::double precision-((w->'start'->>'x')::double precision+dx*off*0.4/len),2)+power((e->>'y')::double precision-((w->'start'->>'y')::double precision+dy*off*0.4/len),2))>0.0001 or abs(sin(atan2(dy,dx)-(e->>'rotation')::double precision))>0.0001 then raise exception 'Opening geometry mismatches attachment';end if;
  for other in select value from jsonb_array_elements(d->'items') where value->>'wallId'=e->>'wallId' and value->>'id'>e->>'id' loop
   otherwide:=coalesce((other->>'width')::double precision,case other->>'typeId' when 'win_large' then 200 when 'door_int' then 80 else 90 end);
   if off-wide/2<(other->>'wallOffset')::double precision+otherwide/2-0.0001 and off+wide/2>(other->>'wallOffset')::double precision-otherwide/2+0.0001 then raise exception 'Openings overlap';end if;
  end loop;
 end loop;
end $$;
revoke all on function roomplan_private.validate_document(jsonb),roomplan_private.number(jsonb,numeric),roomplan_private.point(jsonb) from public;

create function public.rp_create_project(p_title text, p_document jsonb default '{"walls":[],"floors":[],"items":[],"comments":[]}') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if roomplan_private.email() is null then raise exception 'Verified account required' using errcode='42501'; end if;
  perform roomplan_private.validate_document(p_document);
  insert into public.rp_projects(owner_id,title,document) values(auth.uid(),trim(p_title),p_document) returning id into result;
  return result;
end $$;

create function public.rp_save_changes(p_project uuid,p_changes jsonb) returns public.rp_projects language plpgsql security definer set search_path='' as $$
declare p public.rp_projects; change jsonb; c text; entity_id text; current_entity jsonb; next_list jsonb;
begin
  select * into p from public.rp_projects where id=p_project for update;
  if roomplan_private.role(p_project) not in ('owner','editor') or roomplan_private.role(p_project) is null then raise exception 'Edit access required' using errcode='42501'; end if;
  if p.archived then raise exception 'Project is archived'; end if;
  if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>40000 or octet_length(p_changes::text)>10000000 then raise exception 'Invalid changes'; end if;
  for change in select value from jsonb_array_elements(p_changes) loop
    c := change->>'collection'; entity_id := change->>'id';
    if c is null or c not in ('walls','floors','items','comments') or entity_id is null or not (change ? 'before' and change ? 'after') then raise exception 'Invalid change'; end if;
    select value into current_entity from jsonb_array_elements(p.document->c) where value->>'id'=entity_id;
    current_entity := coalesce(current_entity,'null'::jsonb);
    if current_entity=change->'after' then continue; end if;
    if current_entity is distinct from change->'before' then raise exception 'Concurrent edit conflict' using errcode='40001'; end if;
    if change->'after'<>'null'::jsonb and (change->'after'->>'id' is distinct from entity_id or jsonb_typeof(change->'after')<>'object') then raise exception 'Invalid replacement'; end if;
    select coalesce(jsonb_agg(case when value->>'id'=entity_id then change->'after' else value end order by ord),'[]'::jsonb) into next_list
      from jsonb_array_elements(p.document->c) with ordinality as a(value,ord)
      where not (value->>'id'=entity_id and change->'after'='null'::jsonb);
    if current_entity='null'::jsonb and change->'after'<>'null'::jsonb then next_list:=next_list||jsonb_build_array(change->'after'); end if;
    p.document:=jsonb_set(p.document,array[c],next_list);
  end loop;
  perform roomplan_private.validate_document(p.document);
  if p.document=(select document from public.rp_projects where id=p_project) then return p; end if;
  update public.rp_projects set document=p.document,revision=revision+1,updated_at=now() where id=p_project returning * into p;
  return p;
end $$;

create function public.rp_update_project(p_project uuid,p_title text,p_archived boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.rp_projects where id=p_project for update;
  if roomplan_private.role(p_project) is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  update public.rp_projects set title=trim(p_title),archived=p_archived,revision=revision+1,updated_at=now() where id=p_project;
end $$;

create function public.rp_invite(p_project uuid,p_email text,p_role text) returns public.rp_invitations language plpgsql security definer set search_path='' as $$
declare invitation public.rp_invitations;
begin
  perform 1 from public.rp_projects where id=p_project for update;
  if roomplan_private.role(p_project) is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  if exists(select 1 from public.rp_invitations where project_id=p_project and email=lower(trim(p_email)) and created_at>now()-interval '30 seconds') then raise exception 'Wait 30 seconds before inviting this email again'; end if;
  if (select count(*) from public.rp_invitations where project_id=p_project and expires_at>now())>=100 then raise exception 'Too many pending invitations'; end if;
  if length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  insert into public.rp_invitations(project_id,email,role) values(p_project,lower(trim(p_email)),p_role)
  on conflict(project_id,email) do update set role=excluded.role,token=gen_random_uuid(),created_at=now(),expires_at=now()+interval '7 days'
  returning * into invitation;
  return invitation;
end $$;

create function public.rp_accept_invite(p_token uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.rp_invitations;
begin
  select * into inv from public.rp_invitations where token=p_token and email=roomplan_private.email() and expires_at>now() for update;
  if inv.id is null then raise exception 'Invitation expired or belongs to a different verified email' using errcode='42501'; end if;
  insert into public.rp_members(project_id,user_id,email,role) values(inv.project_id,auth.uid(),inv.email,inv.role)
    on conflict(project_id,user_id) do update set role=excluded.role;
  delete from public.rp_invitations where id=inv.id;
  return inv.project_id;
end $$;

create function public.rp_pending_invites() returns table(token uuid,title text,role text,expires_at timestamptz) language sql security definer set search_path='' as $$
  select i.token,p.title,i.role,i.expires_at from public.rp_invitations i join public.rp_projects p on p.id=i.project_id
  where i.email=roomplan_private.email() and i.expires_at>now() and not p.archived
$$;

create function public.rp_manage_member(p_project uuid,p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.rp_projects where id=p_project for update;
  if roomplan_private.role(p_project) is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  if p_role is null then delete from public.rp_members where project_id=p_project and user_id=p_user;
  else update public.rp_members set role=p_role where project_id=p_project and user_id=p_user; end if;
end $$;
create function public.rp_revoke_invite(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.rp_invitations where id=p_id and roomplan_private.role(project_id)='owner';
end $$;

create function public.rp_share_link(p_project uuid,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform 1 from public.rp_projects where id=p_project for update;
  if roomplan_private.role(p_project) is distinct from 'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  delete from public.rp_links where project_id=p_project;
  if p_role is not null then
    insert into public.rp_links(project_id,role) values(p_project,p_role) returning token into result;
  end if;
  return result;
end $$;
create function public.rp_join_link(p_token uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare link public.rp_links;
begin
  if roomplan_private.email() is null then raise exception 'Verified account required' using errcode='42501'; end if;
  select * into link from public.rp_links where token=p_token and expires_at>now() for share;
  if link.project_id is null then raise exception 'Link expired or revoked' using errcode='42501'; end if;
  insert into public.rp_members(project_id,user_id,email,role) values(link.project_id,auth.uid(),roomplan_private.email(),link.role)
    on conflict(project_id,user_id) do nothing;
  return link.project_id;
end $$;

-- Deny default PUBLIC execution, grant only the intended authenticated entry points.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rp_%' loop
    execute format('revoke all on function %s from public, anon',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
-- Document commits only; no pointer-motion database writes.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.rp_projects;
  end if;
end $$;
