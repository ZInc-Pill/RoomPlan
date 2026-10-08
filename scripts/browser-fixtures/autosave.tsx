// Isolated SDK mock: no project writes leave this fixture.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CloudEditor} from '../../src/cloud/CloudWorkspace';
import {supabase} from '../../src/cloud/client';
import {emptyDocument} from '../../src/utils/documentHistory';
import {applyChanges} from '../../src/cloud/patches';
import '../../src/index.css';
let project={id:'autosave-fixture',owner_id:'fixture-owner',title:'Autosave test room',revision:0,archived:false,updated_at:new Date().toISOString(),document:emptyDocument()};
let fail=true;
if(!supabase)throw Error('Fixture needs configured SDK');
const client=supabase as any;
client.channel=()=>{const c={on:()=>c,subscribe:()=>c};return c;};client.removeChannel=async()=>{};
client.from=()=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:structuredClone(project),error:null})};return q;};
client.rpc=async(name:string,args:any)=>{
 if(name==='rp_collaborate')return {data:{role:'owner',peers:[],project:null},error:null};
 if(name==='rp_save_changes'){
   await new Promise(r=>setTimeout(r,800));
   if(fail)return {data:null,error:{message:'Failed to fetch',code:'NETWORK'}};
   project={...project,revision:project.revision+1,updated_at:new Date().toISOString(),document:applyChanges(project.document,args.p_changes)};
   return {data:structuredClone(project),error:null};
 }
 throw Error('Unexpected fixture RPC '+name);
};
function Fixture(){const [failure,setFailure]=useState(true);const [stored,setStored]=useState('Not read yet');return <>
 <div style={{padding:6,display:'flex',gap:8,flexWrap:'wrap',background:'white'}}>
 <button onClick={()=>{fail=!failure;setFailure(fail);}}>Network failure: {failure?'on':'off'}</button>
 <button onClick={()=>setStored(`Persisted revision ${project.revision}, ${project.document.items.length} objects`)}>Read stored document</button><output>{stored}</output></div>
 <div style={{height:'calc(100dvh - 70px)'}}><CloudEditor project={project} role="owner" user={{id:'fixture-owner'} as any}/></div>
 </>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
