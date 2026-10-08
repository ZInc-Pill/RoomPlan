import {writeFileSync} from 'node:fs';
import {ITEM_CATALOG} from '../src/catalog';
const docs=ITEM_CATALOG.map(t=>{
 const opening=['window','door'].includes(t.shape);
 const item={id:'audit-item',typeId:t.id,x:400,y:0,rotation:0,width:t.width,depth:t.depth,height:t.height,elevation:t.defaultElevation??0,color:t.color,
 ...(opening?{wallId:'audit-wall',wallOffset:1000}:{}),
 ...(t.shape==='chair'?{seatHeight:65,seatMaterial:'fabric',frameColor:'#123456'}:{}),
 ...(t.shape==='coffee_table'?{tableFinish:'stone',legColor:'#654321'}:{}),
 ...(['railing','corner_railing'].includes(t.shape)?{railingStyle:'glass'}:{}),
 ...(t.id.startsWith('shoji_')||t.id.startsWith('kit_japanese')||t.id==='kit_breakfast_counter'?{panelState:'half',panelMaterial:'woven',frameColor:'#98704b'}:{}),
 ...(t.shape==='stairs'?{stairDirection:'down',stairRailings:true}:{}),
 ...(t.id==='kit_island_divider'?{dividerStyle:'folding',dividerHeight:65}:{}),
 ...(opening?{frameColor:'#345678'}:{})};
 return {walls:opening?[{id:'audit-wall',start:{x:0,y:0},end:{x:800,y:0},thickness:8,height:150}]:[],floors:[],comments:[],items:[item]};
});
writeFileSync('docs/supabase-all-catalog-check.sql',`-- Read-only: validates synthetic documents without saving any project.\nselect d->'items'->0->>'typeId' as object_type, 'Accepted' as result,\nroomplan_private.validate_document(d) as validation\nfrom jsonb_array_elements($audit$${JSON.stringify(docs)}$audit$::jsonb) as data(d);\n`);
console.log('Prepared read-only live validation for '+docs.length+' catalog objects, dimensions, options and wall attachments.');
