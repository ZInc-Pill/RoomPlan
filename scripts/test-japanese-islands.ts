import assert from 'node:assert/strict';
import {ITEM_CATALOG} from '../src/catalog';
import {isJapaneseIsland,japaneseIslandLayout,ungroupJapaneseIsland} from '../src/utils/japaneseIsland';
import {parseProject,serializeProject} from '../src/utils/projectFile';
import {emptyDocument,initialHistory,documentHistory} from '../src/utils/documentHistory';
import {changesBetween,applyChanges} from '../src/cloud/patches';
import {stairOpening} from '../src/utils/objectPack';
import type {PlacedItem} from '../src/types';
const types=ITEM_CATALOG.filter(t=>isJapaneseIsland({typeId:t.id}));assert.equal(types.length,3);
for(const type of types)for(const rotation of [0,.7,Math.PI/2])for(const panelState of ['closed','half','open'] as const) {
 const item:PlacedItem={id:'island',typeId:type.id,x:300,y:250,rotation,width:240,depth:110,height:95,panelState,panelMaterial:'woven',frameColor:'#876543',tableFinish:'wood',elevation:12};
 const doc={...emptyDocument(),items:[item]};assert.deepEqual(parseProject(serializeProject(doc)),doc);assert.equal(stairOpening(item),null);
 const split=ungroupJapaneseIsland(item,['stool-1','stool-2']);
 if(type.id!=='kit_japanese_complete'){assert.deepEqual(split,[item]);continue;}
 assert.equal(split.length,3);assert.equal(split[0].dividerHeight,100);assert.equal(split[0].typeId,'kit_breakfast_counter');
 const l=japaneseIslandLayout(item);
 split.slice(1).forEach((stool,i)=>{const dx=(stool.x-item.x)/.4,dy=(stool.y-item.y)/.4;assert.ok(Math.abs(dx*Math.cos(rotation)+dy*Math.sin(rotation)-l.stools[i].x)<1e-8);assert.ok(Math.abs(-dx*Math.sin(rotation)+dy*Math.cos(rotation)-l.stools[i].z)<1e-8);assert.equal(stool.frameColor,item.frameColor);assert.equal(stool.elevation,12);assert.equal(stool.height,70);});
 const next={...doc,items:split};assert.deepEqual(parseProject(serializeProject(next)),next);assert.deepEqual(applyChanges(doc,changesBetween(doc,next)),next);
 let history={...initialHistory(),present:doc};history=documentHistory(history,{type:'update',update:()=>next});history=documentHistory(history,{type:'undo'});assert.deepEqual(history.present,doc);history=documentHistory(history,{type:'redo'});assert.deepEqual(history.present,next);
}
console.log('PASS: three catalog islands, panel states, transformed ungroup positions, finishes, elevations, save/load, atomic undo/redo and collaborative patches');
