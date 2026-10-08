import assert from 'node:assert/strict';
import {ITEM_CATALOG} from '../src/catalog';
import {isStairSymbol,isPlatformSteps,platformCount} from '../src/utils/smallStairs';
import {stairOpening} from '../src/utils/objectPack';
import {emptyDocument,initialHistory,documentHistory} from '../src/utils/documentHistory';
import {parseProject,serializeProject} from '../src/utils/projectFile';
import {changesBetween,applyChanges} from '../src/cloud/patches';
import type {PlacedItem} from '../src/types';
const types=ITEM_CATALOG.filter(t=>isStairSymbol({typeId:t.id} as PlacedItem)||isPlatformSteps({typeId:t.id} as PlacedItem));
assert.equal(types.length,6);
for(const type of types) {
 const item:PlacedItem={id:type.id,typeId:type.id,x:140,y:200,rotation:.5,width:type.width,depth:type.depth,height:type.height,stairDirection:'down',color:'#123456',material:'oak'};
 assert.equal(stairOpening(item),null);
 if(isPlatformSteps(item)){assert.equal(item.depth!/platformCount(item),28);assert.equal(item.height!/platformCount(item),16);}
 const doc={...emptyDocument(),items:[item]};assert.deepEqual(parseProject(serializeProject(doc)),doc);
 const next={...doc,items:[{...item,x:250,width:180,depth:120,height:60,rotation:1}]};
 assert.deepEqual(applyChanges(doc,changesBetween(doc,next)),next);
 let history={...initialHistory(),present:doc};history=documentHistory(history,{type:'update',update:()=>next});history=documentHistory(history,{type:'undo'});assert.deepEqual(history.present,doc);history=documentHistory(history,{type:'redo'});assert.deepEqual(history.present,next);
}
console.log('PASS: six catalog variants, no openings, step dimensions, save/load, undo/redo and collaboration patches');
