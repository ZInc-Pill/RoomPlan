import {ungroupJapaneseIsland} from '../src/utils/japaneseIsland';
import {changesBetween} from '../src/cloud/patches';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ITEM_CATALOG } from '../src/catalog';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const file of ['202610040001_roomplan_cloud.sql','202610050001_guest_collaboration.sql','202610070001_object_pack.sql','202610070002_shoji_panels.sql','202610070003_furniture_pack.sql','202610070004_small_stairs.sql','202610080001_japanese_islands.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
const owner='00000000-0000-0000-0000-000000000001';
await db.query('insert into auth.users values($1,$2,now())',[owner,'test@example.com']);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
const rpc=async(name:string,args:unknown[]) => (await db.query<any>(`select to_jsonb(public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})) as result`,args)).rows[0].result;
const openings=ITEM_CATALOG.filter(t=>['window','door'].includes(t.shape));
const walls=openings.map((t,i)=>({id:'wall'+i,start:{x:0,y:i*200},end:{x:800,y:i*200},thickness:8,height:150}));
const items=ITEM_CATALOG.map((t,i)=>{
  const openingIndex=openings.indexOf(t);
  return {id:'item'+i,typeId:t.id,x:400,y:openingIndex>=0?openingIndex*200:3000+i*100,rotation:0,
    ...(openingIndex>=0?{wallId:'wall'+openingIndex,wallOffset:1000}:{}),
    elevation:t.defaultElevation??0,
    ...(t.shape==='chair'?{seatHeight:65,seatMaterial:'leather',frameColor:'#123456'}:{}),
    ...(t.shape==='coffee_table'?{tableFinish:'glass',legColor:'#654321'}:{}),
    ...(['railing','corner_railing'].includes(t.shape)?{railingStyle:'wood'}:{}),
    ...(t.id.startsWith('shoji_')?{panelState:'half',panelMaterial:'woven',frameColor:'#98704b'}:{}),
    ...(t.shape==='stairs'?{stairDirection:'down',stairRailings:false}:{}),
    ...(t.id==='kit_island_divider'?{dividerStyle:'folding',dividerHeight:65}:{}),
    ...(t.shape==='window'||t.id.startsWith('door_glass')?{frameColor:'#345678'}:{})};
});
const doc={walls,floors:[],comments:[],items};
const project=await rpc('rp_create_project',['Object pack',JSON.stringify(doc)]);
const editor=await rpc('rp_create_guest_link',[project,'editor','24h']);
const viewer=await rpc('rp_create_guest_link',[project,'viewer','24h']);
await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');
const before=items.find(i=>i.typeId==='stairs_l')!,after={...before,x:before.x+50,stairDirection:'up',stairRailings:true};
const changes=JSON.stringify([{collection:'items',id:before.id,before,after}]);
await assert.rejects(()=>rpc('rp_guest_save',[viewer.token,changes]));
const saved=await rpc('rp_guest_save',[editor.token,changes]);assert.equal(saved.revision,1);
const read=await rpc('rp_open_guest_link',[viewer.token]);assert.deepEqual(read.project.document.items.find((i:any)=>i.id===before.id),after);
for(const patch of [{seatHeight:301},{seatMaterial:'steel'},{tableFinish:'water'},{railingStyle:'cloth'},{legColor:'red'},{panelState:'ajar'},{panelMaterial:'plastic'},{stairDirection:'sideways'},{stairRailings:'false'},{dividerStyle:'cloth'},{dividerHeight:301},{frameColor:'red'}]) {
  await assert.rejects(()=>rpc('rp_guest_save',[editor.token,JSON.stringify([{collection:'items',id:after.id,before:after,after:{...after,...patch}}])]));
}
const panel=items.find(i=>i.typeId==='shoji_tall_pair')!;
const panelAfter={...panel,panelState:'open',panelMaterial:'paper'};
await rpc('rp_guest_save',[editor.token,JSON.stringify([{collection:'items',id:panel.id,before:panel,after:panelAfter}])]);
const panelRead=await rpc('rp_open_guest_link',[viewer.token]);
assert.deepEqual(panelRead.project.document.items.find((i:any)=>i.id===panel.id),panelAfter);
const furnitureChanges=[['kit_japanese_complete',{dividerStyle:'slats',dividerHeight:85,panelState:'open',panelMaterial:'woven',tableFinish:'wood',frameColor:'#123456'}],['stair_symbol_l',{stairDirection:'down',rotation:.5}],['platform_steps_3',{width:150,depth:90,height:54}],['chair_upholstered',{seatHeight:55,seatMaterial:'fabric'}],['coffee_round',{tableFinish:'stone',legColor:'#112233'}],['bal_corner_railing',{railingStyle:'glass'}]].map(([typeId,patch])=>{const before=items.find(i=>i.typeId===typeId)!;return {collection:'items',id:before.id,before,after:{...before,...patch as object}};});
await rpc('rp_guest_save',[editor.token,JSON.stringify(furnitureChanges)]);
const furnitureRead=await rpc('rp_open_guest_link',[viewer.token]);
for(const change of furnitureChanges)assert.deepEqual(furnitureRead.project.document.items.find((i:any)=>i.id===change.id),change.after);
const groupedDoc=furnitureRead.project.document;
const grouped=groupedDoc.items.find((i:any)=>i.typeId==='kit_japanese_complete');
const ungroupedDoc={...groupedDoc,items:groupedDoc.items.flatMap((i:any)=>i.id===grouped.id?ungroupJapaneseIsland(i,['ungrouped-1','ungrouped-2']):[i])};
await rpc('rp_guest_save',[editor.token,JSON.stringify(changesBetween(groupedDoc,ungroupedDoc))]);
const splitRead=await rpc('rp_open_guest_link',[viewer.token]);
assert.deepEqual(splitRead.project.document.items.find((i:any)=>i.id==='ungrouped-1'),ungroupedDoc.items.find((i:any)=>i.id==='ungrouped-1'));
await assert.rejects(()=>db.query('select roomplan_private.validate_document($1)',[JSON.stringify(doc)]));
await db.close();console.log('Object pack SQL: all catalog types, opening defaults, guest collaboration, viewer denial, invalid options and private validator permissions passed');
