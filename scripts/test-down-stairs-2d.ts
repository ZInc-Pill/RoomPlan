import assert from 'node:assert/strict';
import {parseProject,serializeProject} from '../src/utils/projectFile';
import {downStairPlan,isDownStair,stairFloorOwners} from '../src/utils/downStairs2D';
import {stairOpening} from '../src/utils/objectPack';
import type {PlacedItem} from '../src/types';
const stair:PlacedItem={id:'down',typeId:'stairs_straight',x:200,y:300,rotation:0,width:110,depth:360,height:280,stairDirection:'down'};
for(const patch of [{},{x:250,y:350},{width:200,depth:400},{rotation:Math.PI/3},{elevation:-100}]) {
 const item={...stair,...patch};const plan=downStairPlan(item);
 assert.equal(plan.points,stairOpening(item)!.map(p=>`${p.x},${p.y}`).join(' '));
}
assert.equal(isDownStair({...stair,stairDirection:'up'}),false);
assert.equal([stair].filter(i=>i.id!=='down').filter(isDownStair).length,0);

const base={id:'base',color:'#ffffff',points:[{x:0,y:0},{x:500,y:0},{x:500,y:600},{x:0,y:600}]};
const partial={id:'partial',color:'#cccccc',points:[{x:150,y:300},{x:250,y:300},{x:250,y:500},{x:150,y:500}]};
const full={...base,id:'full'};
for(const covers of [[],[partial],[full],[partial,full]]) {
 const doc={items:[stair],floors:[base,...covers],walls:[],comments:[]};
 assert.equal(stairFloorOwners(doc.items,doc.floors).get(stair.id),'base');
 const loaded=parseProject(serializeProject(doc));
 assert.equal(stairFloorOwners(loaded.items,loaded.floors).get(stair.id),'base');
 assert.deepEqual(loaded.floors,doc.floors);
}
const remote={...base,id:'remote',points:base.points.map(p=>({x:p.x+1000,y:p.y}))};
assert.equal(stairFloorOwners([stair],[remote,base,full]).get(stair.id),'base');
assert.equal(stairFloorOwners([stair],[remote]).get(stair.id),undefined);
assert.equal(stairFloorOwners([{...stair,rotation:.7}],[base,full]).get(stair.id),'base');
console.log('PASS: original opening owner, partial/full covers, rotation, separate rooms, save/load and legacy floors');
