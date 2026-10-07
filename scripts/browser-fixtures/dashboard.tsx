// Isolated visual test data. This module is never imported by the production app.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from '../../src/cloud/CloudWorkspace';
import { supabase } from '../../src/cloud/client';
import '../../src/index.css';
const cards = [
  {id:'test-room',title:'A quieter living room',owner_id:'test-owner'},
  {id:'test-studio',title:'Studio · shared with the team',owner_id:'test-teammate'},
  {id:'test-bedroom',title:'Bedroom and reading corner',owner_id:'test-owner'},
].map(p=>({...p,archived:false,revision:1,updated_at:'2026-10-07T10:00:00Z'}));
if (supabase) {
  const client=supabase as any;
  client.from=()=>{const q={select:()=>q,order:()=>q,range:()=>q,then:(resolve,reject)=>Promise.resolve({data:cards,error:null}).then(resolve,reject)};return q;};
  client.rpc=async()=>({data:[],error:null});
  client.auth.signOut=async()=>({error:null});
}
createRoot(document.getElementById('root')!).render(<Dashboard user={{id:'test-owner',email:'designer@example.com'} as any}/>);
