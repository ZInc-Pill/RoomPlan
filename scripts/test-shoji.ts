import assert from 'node:assert/strict';
import { ITEM_CATALOG } from '../src/catalog';
import { shojiLayout, isShoji } from '../src/utils/shoji';
import { packProperties } from '../src/utils/objectPack';
import { emptyDocument, initialHistory, documentHistory } from '../src/utils/documentHistory';
import { serializeProject, parseProject } from '../src/utils/projectFile';
import { attachNearestOpening, reconcileOpenings } from '../src/utils/openingAttachment';
import { changesBetween, applyChanges } from '../src/cloud/patches';
import type { PlacedItem } from '../src/types';

const wall={id:'wall',start:{x:0,y:0},end:{x:800,y:0},thickness:8,height:150};
for(const type of ITEM_CATALOG.filter(t=>isShoji({typeId:t.id}))) {
  const base:PlacedItem={id:type.id,typeId:type.id,x:400,y:0,rotation:0,elevation:type.defaultElevation??0,frameColor:'#886644'};
  const attached=attachNearestOpening(base,[wall])!;
  assert.ok(attached);
  for(const panelMaterial of ['paper','woven'] as const) for(const panelState of ['closed','half','open'] as const) {
    const item={...attached,panelMaterial,panelState};
    const document={...emptyDocument(),walls:[wall],items:[item]};
    assert.deepEqual(parseProject(serializeProject(document)),document);
    const layout=shojiLayout(item,type.width,20),fraction=panelState==='closed'?0:panelState==='half'?.5:1;
    const overlap=layout.leaves.reduce((sum,leaf)=>sum+Math.max(0,Math.min(type.width/2,leaf.x+leaf.width/2)-Math.max(-type.width/2,leaf.x-leaf.width/2)),0);
    assert.equal(overlap,type.width*(1-fraction),'Plan and 3D share the same opening coverage');
    if(type.id.endsWith('_pair')) assert.equal(layout.leaves[0].x,-layout.leaves[1].x);
    assert.ok(layout.z>10,'Leaves slide in front of wall, not inside it');
    const next={...document,items:[{...item,panelState:'open' as const}]};
    const reconciled=reconcileOpenings(document,next);
    assert.equal(reconciled.items[0].wallId,wall.id);
    assert.equal(reconciled.items[0].x,item.x,'State does not move the opening');
    assert.deepEqual(applyChanges(document,changesBetween(document,next)),next);
  }
  const before={...emptyDocument(),items:[{...base,panelState:'closed' as const}]};
  let history:ReturnType<typeof initialHistory>={...initialHistory(),present:before};
  history=documentHistory(history,{type:'update',update:d=>({...d,items:[{...d.items[0],panelState:'open'}]})});
  history=documentHistory(history,{type:'undo'});assert.equal(history.present.items[0].panelState,'closed');
  history=documentHistory(history,{type:'redo'});assert.equal(history.present.items[0].panelState,'open');
}
assert.deepEqual(packProperties({}),{});
for(const invalid of [{panelState:'ajar'},{panelMaterial:'glass'},{panelState:null},{panelMaterial:4}]) assert.throws(()=>packProperties(invalid));
console.log('Shoji: four variants, three states, two inserts, paired symmetry, wall attachment, fixed openings, round trips, collaboration and undo/redo passed');
