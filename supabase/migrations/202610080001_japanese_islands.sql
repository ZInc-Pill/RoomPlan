-- Add three coordinated kitchen islands; existing option fields and permissions are unchanged.
begin;
create or replace function roomplan_private.validate_document(d jsonb) returns void language plpgsql set search_path='' as $$
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
    if e ? 'seatHeight' then if roomplan_private.number(e->'seatHeight',1)>300 then raise exception 'Invalid seat height';end if;end if;
    if e ? 'seatMaterial' and (jsonb_typeof(e->'seatMaterial') is distinct from 'string' or e->>'seatMaterial' not in ('wood','fabric','leather')) then raise exception 'Invalid seat material';end if;
    if e ? 'tableFinish' and (jsonb_typeof(e->'tableFinish') is distinct from 'string' or e->>'tableFinish' not in ('wood','glass','stone')) then raise exception 'Invalid table finish';end if;
    if e ? 'railingStyle' and (jsonb_typeof(e->'railingStyle') is distinct from 'string' or e->>'railingStyle' not in ('metal','glass','wood')) then raise exception 'Invalid railing style';end if;
    if e ? 'legColor' and (jsonb_typeof(e->'legColor') is distinct from 'string' or e->>'legColor' !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid leg color';end if;
    if e ? 'panelState' and (jsonb_typeof(e->'panelState') is distinct from 'string' or e->>'panelState' not in ('closed','half','open')) then raise exception 'Invalid panel state';end if;
    if e ? 'panelMaterial' and (jsonb_typeof(e->'panelMaterial') is distinct from 'string' or e->>'panelMaterial' not in ('paper','woven')) then raise exception 'Invalid panel material';end if;
    if e ? 'dividerStyle' and (jsonb_typeof(e->'dividerStyle') is distinct from 'string' or e->>'dividerStyle' not in ('solid','slats','glass','fluted','folding')) then raise exception 'Invalid divider style';end if;
    if e ? 'dividerHeight' then if roomplan_private.number(e->'dividerHeight',1)>300 then raise exception 'Invalid divider height';end if;end if;
    if e ? 'stairDirection' and (jsonb_typeof(e->'stairDirection') is distinct from 'string' or e->>'stairDirection' not in ('up','down')) then raise exception 'Invalid stair direction';end if;
    if e ? 'stairRailings' and jsonb_typeof(e->'stairRailings') is distinct from 'boolean' then raise exception 'Invalid stair railings';end if;
    if e ? 'frameColor' and (jsonb_typeof(e->'frameColor') is distinct from 'string' or e->>'frameColor' !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid frame color';end if;
    if e->>'typeId' is null or e->>'typeId' not in ('kit_japanese_divider','kit_breakfast_counter','kit_japanese_complete','stair_symbol_straight','stair_symbol_l','stair_symbol_u','platform_steps_2','platform_steps_3','platform_steps_4','chair_wood','chair_upholstered','chair_modern','stool_backless','stool_low','stool_full','tv_tabletop','tv_wall','coffee_rect','coffee_round','coffee_oval','shoji_short_single','shoji_short_pair','shoji_tall_single','shoji_tall_pair','win_std','win_large','door_int','door_ext','win_high','win_wall','win_tall','door_glass_single','door_glass_double','door_glass_sliding','kit_counter','kit_base_cabinet','kit_corner_cabinet','kit_island','kit_sink','kit_dishwasher','kit_fridge_std','kit_fridge_dbl','kit_table_4','kit_table_6','kit_island_seating','kit_island_divider','bed_single','bed_queen','bed_king','bed_wardrobe','bed_nightstand','liv_sofa_2','liv_sofa_3','liv_tvstand','liv_tv_cabinet','liv_rug_m','liv_rug_l','bath_tub','bath_shower','bath_toilet','bath_sink','bal_railing','bal_corner_railing','bal_plant','bal_chair','bal_lounge_chair','stairs_straight','stairs_l','stairs_u','arch_divider') then raise exception 'Unknown furniture type';end if;
    foreach k in array array['width','depth','height','elevation'] loop
     if e ? k then perform roomplan_private.number(e->k,case when k='elevation' then 0 else 0.001 end);end if;
    end loop;
   end if;
  end loop;
 end loop;
 for e in select value from jsonb_array_elements(d->'items') where value ? 'wallId' loop
  if e->>'typeId' not in ('shoji_short_single','shoji_short_pair','shoji_tall_single','shoji_tall_pair','win_std','win_large','door_int','door_ext','win_high','win_wall','win_tall','door_glass_single','door_glass_double','door_glass_sliding') then raise exception 'Only openings attach to walls';end if;
  select value into w from jsonb_array_elements(d->'walls') where value->>'id'=e->>'wallId';
  if w is null then raise exception 'Opening references missing wall';end if;
  off:=roomplan_private.number(e->'wallOffset',0);
  wide:=coalesce((e->>'width')::double precision,case e->>'typeId' when 'shoji_short_single' then 100 when 'shoji_short_pair' then 180 when 'shoji_tall_single' then 100 when 'shoji_tall_pair' then 180 when 'win_std' then 90 when 'win_large' then 200 when 'door_int' then 80 when 'door_ext' then 90 when 'win_high' then 180 when 'win_wall' then 360 when 'win_tall' then 120 when 'door_glass_single' then 90 when 'door_glass_double' then 180 when 'door_glass_sliding' then 240 end);
  high:=coalesce((e->>'height')::double precision,case e->>'typeId' when 'shoji_short_single' then 110 when 'shoji_short_pair' then 110 when 'shoji_tall_single' then 240 when 'shoji_tall_pair' then 240 when 'win_std' then 120 when 'win_large' then 150 when 'door_int' then 210 when 'door_ext' then 210 when 'win_high' then 50 when 'win_wall' then 150 when 'win_tall' then 270 when 'door_glass_single' then 270 when 'door_glass_double' then 270 when 'door_glass_sliding' then 270 end);
  dx:=(w->'end'->>'x')::double precision-(w->'start'->>'x')::double precision;dy:=(w->'end'->>'y')::double precision-(w->'start'->>'y')::double precision;len:=sqrt(dx*dx+dy*dy);
  if len=0 or off*0.4<wide*0.2-0.00004 or off*0.4>len-wide*0.2+0.00004 or (high+coalesce((e->>'elevation')::double precision,0))*0.4>coalesce((w->>'height')::double precision,150) then raise exception 'Opening does not fit wall';end if;
  if sqrt(power((e->>'x')::double precision-((w->'start'->>'x')::double precision+dx*off*0.4/len),2)+power((e->>'y')::double precision-((w->'start'->>'y')::double precision+dy*off*0.4/len),2))>0.0001 or abs(sin(atan2(dy,dx)-(e->>'rotation')::double precision))>0.0001 then raise exception 'Opening geometry mismatches attachment';end if;
  for other in select value from jsonb_array_elements(d->'items') where value->>'wallId'=e->>'wallId' and value->>'id'>e->>'id' loop
   otherwide:=coalesce((other->>'width')::double precision,case other->>'typeId' when 'shoji_short_single' then 100 when 'shoji_short_pair' then 180 when 'shoji_tall_single' then 100 when 'shoji_tall_pair' then 180 when 'win_std' then 90 when 'win_large' then 200 when 'door_int' then 80 when 'door_ext' then 90 when 'win_high' then 180 when 'win_wall' then 360 when 'win_tall' then 120 when 'door_glass_single' then 90 when 'door_glass_double' then 180 when 'door_glass_sliding' then 240 end);
   if off-wide/2<(other->>'wallOffset')::double precision+otherwide/2-0.0001 and off+wide/2>(other->>'wallOffset')::double precision-otherwide/2+0.0001 then raise exception 'Openings overlap';end if;
  end loop;
 end loop;
end $$;
commit;
