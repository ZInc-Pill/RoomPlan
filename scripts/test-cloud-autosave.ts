import assert from 'node:assert/strict';
import { ProjectSync, saveError } from '../src/cloud/ProjectSync';
import { CloudRecovery } from '../src/cloud/CloudRecovery';
import { emptyDocument } from '../src/utils/documentHistory';
import { applyChanges } from '../src/cloud/patches';
const doc=emptyDocument();
const p={id:'p',owner_id:'u',title:'Test',revision:0,archived:false,updated_at:'2026-10-08T10:00:00Z',document:doc};
const edit=(text:string)=>({...doc,comments:[{id:'a',x:0,y:0,text}]});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let remote=p, calls=0, failure:Error|undefined, release: (()=>void)|undefined, slow=false;
const transport={load:async()=>structuredClone(remote),save:async(_id:string,changes:any)=>{
  calls++; if(slow)await new Promise<void>(r=>release=r);if(failure)throw failure;
  remote={...remote,revision:remote.revision+1,updated_at:'2026-10-08T10:01:00Z',document:applyChanges(remote.document,changes)};return structuredClone(remote);
}};
const s=new ProjectSync(p,'editor',transport,()=>{});
s.changed(edit('1'),false);s.changed(edit('2'),false);s.changed(edit('3'),false);
await wait(550);assert.equal(calls,1);assert.deepEqual(remote.document,edit('3'));assert.equal(s.status,'Saved to cloud');
slow=true;s.changed(edit('4'),false);const pending=s.saveNow();s.changed(edit('5'),false);
assert.equal(s.status,'Saving…');assert.equal(s.lastSavedAt,remote.updated_at);release!();await pending;
assert.equal(s.dirty,true);assert.equal(s.draft.comments[0].text,'5');assert.equal(remote.document.comments[0].text,'4');
slow=false;await s.saveNow();assert.equal(remote.document.comments[0].text,'5');
failure=Error('Failed to fetch');s.changed(edit('6'),false);await s.saveNow();assert.equal(s.conflict,false);assert.equal(s.status,'Save failed');assert(s.dirty);
const priorCalls=calls;await wait(500);assert.equal(calls,priorCalls); // no request storm
failure=undefined;await s.saveNow();assert.equal(s.dirty,false);
s.setOnline(false);s.changed(edit('7'),false);await s.saveNow();assert.equal(s.status,'Offline');assert.equal(calls,priorCalls+1);
s.setOnline(true);await wait(20);assert.equal(s.dirty,false);assert.equal(remote.document.comments[0].text,'7');
failure=Object.assign(Error('JWT expired'),{code:'PGRST301'});s.changed(edit('8'),false);await s.saveNow();assert.match(s.error,/Sign in again/);assert(s.dirty);
s.receive({...remote,revision:remote.revision+1});assert.match(s.error,/Sign in again/); // reads cannot hide write failure
failure=undefined;remote={...remote,revision:s.base.revision};await s.saveNow();assert(!s.dirty);
s.setEditing(true);s.changed(edit('9'),false);const count=calls;await s.saveNow();assert.equal(calls,count);s.setEditing(false);await wait(20);assert.equal(calls,count+1);
s.dispose();
const order=new ProjectSync(p,'editor',transport,()=>{});order.setEditing(true);order.receive({...p,revision:3});order.receive({...p,revision:2});order.setEditing(false);assert.equal(order.base.revision,3);order.dispose();
const conflict=new ProjectSync({...p,document:edit('base')},'editor',transport,()=>{});conflict.changed(edit('local'),false);conflict.receive({...p,revision:9,document:edit('remote')});assert(conflict.conflict);assert.equal(conflict.draft.comments[0].text,'local');await conflict.saveNow();assert(conflict.dirty);conflict.dispose();
class MemoryStorage implements Storage {
  map=new Map<string,string>();get length(){return this.map.size;}clear(){this.map.clear();}key(i:number){return [...this.map.keys()][i]??null;}getItem(k:string){return this.map.get(k)??null;}setItem(k:string,v:string){this.map.set(k,v);}removeItem(k:string){this.map.delete(k);}
}
const storage=new MemoryStorage();const r1=new CloudRecovery(storage,'test','tab1');const old=new ProjectSync(p,'editor',transport,()=>{});old.checkpoint=()=>r1.checkpoint(old);old.changed(edit('recover'),false);assert(storage.getItem(r1.key));old.dispose();
const r2=new CloudRecovery(storage,'test','tab2');const copy=r2.pending()[0];assert(copy.base);remote=p;
const reopened=new ProjectSync(p,'editor',transport,()=>{});reopened.checkpoint=()=>r2.checkpoint(reopened);assert(reopened.restore(copy.base!,copy.document));r2.markRestored(copy.key);assert(storage.getItem(r1.key));await reopened.saveNow();assert.equal(storage.length,0);assert.equal(remote.document.comments[0].text,'recover');reopened.dispose();
const collision=new ProjectSync({...p,revision:2,document:edit('other')},'editor',transport,()=>{});assert(!collision.restore(p,edit('recover')));assert.equal(collision.draft.comments[0].text,'other');collision.dispose();
assert.match(saveError(Object.assign(Error('Unknown furniture type'),{code:'P0001'})),/migration/);
assert.match(saveError(Object.assign(Error('Denied'),{code:'42501'})),/permission/);
console.log('PASS: debounce, rapid edits, slow acknowledgements, pending edits, retry, offline/reconnect, expired session, ordered realtime, gesture-deferred manual save, conflicts, checkpoint/reopen/restore/cleanup');

// Unknown outcome: server commits but the response is lost; retry reads it back without duplication.
remote=p;let lost=true;
const uncertain=new ProjectSync(p,'editor',{load:transport.load,save:async(id,changes)=>{const saved=await transport.save(id,changes);if(lost){lost=false;throw Error('Failed to fetch');}return saved;}},()=>{});
uncertain.changed(edit('ack lost'),false);await uncertain.saveNow();assert(uncertain.dirty);const committed=remote.revision;await uncertain.saveNow();assert(!uncertain.dirty);assert.equal(remote.revision,committed);uncertain.dispose();
const stale=new ProjectSync({...p,revision:5},'editor',{load:async()=>p,save:async()=>({...p,revision:4})},()=>{});
stale.changed(edit('new'),false);await stale.saveNow();assert.equal(stale.base.revision,5);assert(stale.dirty);assert(stale.conflict);stale.dispose();
console.log('PASS: lost acknowledgement read-back and stale response rejection');
