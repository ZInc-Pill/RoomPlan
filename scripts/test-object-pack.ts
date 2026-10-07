import assert from 'node:assert/strict';
import { ITEM_CATALOG } from '../src/catalog';
import { stairOpening, stairLayout } from '../src/utils/objectPack';
import { floorWithOpenings } from '../src/utils/floorOpenings';
import { parseProject, serializeProject } from '../src/utils/projectFile';
import { initialHistory, documentHistory, emptyDocument } from '../src/utils/documentHistory';
import { changesBetween, applyChanges } from '../src/cloud/patches';
import { attachNearestOpening } from '../src/utils/openingAttachment';
import type { PlacedItem } from '../src/types';

const ids=['kit_island_seating','kit_island_divider','stairs_straight','stairs_l','stairs_u','win_high','win_wall','win_tall','door_glass_single','door_glass_double','door_glass_sliding'];
const items:PlacedItem[]=ids.map((typeId,i)=>({id:'pack'+i,typeId,x:i*250,y:100,rotation:0}));
items[1]={...items[1],dividerStyle:'fluted',dividerHeight:70,material:'oak',color:'#aa8866'};
items[2]={...items[2],stairDirection:'down',stairRailings:false,height:250};
items[5]={...items[5],frameColor:'#123456',elevation:180};
const doc={...emptyDocument(),items};
assert.deepEqual(parseProject(serializeProject(doc)),doc,'All optional pack fields round trip');
for(const patch of [{dividerStyle:'cloth'},{stairDirection:'sideways'},{dividerHeight:500},{stairRailings:'yes'},{frameColor:'red'}]) {
  assert.throws(()=>parseProject(serializeProject({...doc,items:[{...items[0],...patch} as any]})));
}
assert.equal(ITEM_CATALOG.find(t=>t.id==='win_std')?.defaultElevation,90);
assert.equal(ITEM_CATALOG.find(t=>t.id==='win_large')?.defaultElevation,undefined,'Legacy defaults unchanged');
const wall={id:'wall',start:{x:0,y:0},end:{x:800,y:0},thickness:8,height:150};
for(const type of ITEM_CATALOG.filter(t=>ids.includes(t.id)&&['door','window'].includes(t.shape))) {
  const i={id:type.id,typeId:type.id,x:400,y:2,rotation:0,elevation:type.defaultElevation??0};
  const attached=attachNearestOpening(i,[wall]);assert.ok(attached,type.id+' attaches');
  assert.doesNotThrow(()=>parseProject(serializeProject({...emptyDocument(),walls:[wall],items:[attached!]})));
}
const stair={id:'s',typeId:'stairs_straight',x:100,y:100,rotation:0,width:100,depth:200,height:280,stairDirection:'down'} as PlacedItem;
const square=[{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:0,y:200}];
function area(holes:ReturnType<typeof stairOpening>[]) {
  const g=floorWithOpenings(square,holes.filter(Boolean) as any),p=g.getAttribute('position');let total=0;
  for(let i=0;i<p.count;i+=3)total+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getY(i+2)-p.getY(i))-(p.getY(i+1)-p.getY(i))*(p.getX(i+2)-p.getX(i)))/2;
  g.dispose();return total;
}
const hole=stairOpening(stair)!;
assert.ok(Math.abs(area([hole])-(40000-40*80))<.01,'Actual floor triangles removed');
assert.ok(Math.abs(area([stairOpening({...stair,rotation:Math.PI/4})])-(40000-3200))<.02,'Rotated cutout');
assert.ok(Math.abs(area([stairOpening({...stair,x:0})])-(40000-1600))<.02,'Cutout crossing floor edge');
assert.ok(Math.abs(area([hole,hole])-(40000-3200))<.01,'Overlapping holes do not double-subtract');
assert.equal(area([]),40000,'Deleting stair restores floor');
assert.equal(stairOpening({...stair,stairDirection:'up'}),null);
let history={...initialHistory(),present:{...emptyDocument(),items:[stair]}};
history=documentHistory(history,{type:'update',update:d=>({...d,items:[{...stair,x:140}]})});
assert.notDeepEqual(stairOpening(history.present.items[0]),hole);
history=documentHistory(history,{type:'undo'});assert.deepEqual(stairOpening(history.present.items[0]),hole);
history=documentHistory(history,{type:'redo'});assert.equal(history.present.items[0].x,140);
const moved={...doc,items:doc.items.map(i=>i.id===items[1].id?{...i,x:i.x+50}:i)};
assert.deepEqual(applyChanges(doc,changesBetween(doc,moved)),moved,'Collaboration retains compound object fields');
for(const type of ITEM_CATALOG.filter(t=>t.shape==='stairs')) {
  const layout=stairLayout(type.id,type.width,type.depth,type.height);
  assert.ok(layout.treads.length>3&&layout.treads.length<=36);
  assert.ok(Math.abs(layout.treads.at(-1)!.y-type.height)<1e-6);
  assert.equal(layout.path.length,type.id==='stairs_straight'?2:type.id==='stairs_l'?3:4);
}
console.log('Object pack: catalog, defaults, options, round trips, wall attachment, rotated/overlapping/edge floor holes, deletion, history and collaboration passed');
