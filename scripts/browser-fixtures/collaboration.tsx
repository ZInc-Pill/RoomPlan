import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import '../../src/index.css';
import '../../src/cloud/cloud.css';
import { emptyDocument } from '../../src/utils/documentHistory';
import { SharePanel } from '../../src/cloud/CloudWorkspace';
import { supabase } from '../../src/cloud/client';
// This fixture replaces only its own SDK instance with an in-memory transport.
const links: any[] = [];
if (supabase) {
  const client = supabase as any;
  client.from = (table: string) => {
    const query = { select:()=>query,eq:()=>query,order:()=>query,
      then:(resolve,reject)=>Promise.resolve({data:table==='rp_guest_links'?[...links]:[],error:null}).then(resolve,reject) };
    return query;
  };
  client.rpc = async (name:string,args:any) => {
    if(name==='rp_create_guest_link') {
      const created={token:crypto.randomUUID(),role:args.p_role,created_at:new Date().toISOString(),expires_at:args.p_duration==='unlimited'?null:new Date(Date.now()+({'1h':3600000,'24h':86400000,'7d':604800000}[args.p_duration])).toISOString(),revoked_at:null};
      links.unshift(created); return {data:created,error:null};
    }
    if(name==='rp_revoke_guest_link') links.find(l=>l.token===args.p_token).revoked_at=new Date().toISOString();
    return {data:null,error:null};
  };
}
function Fixture() {
  const [doc,setDoc]=useState({...emptyDocument(),comments:[{id:'live',x:120,y:120,text:'Original comment'}]});
  const [point,setPoint]=useState('No cursor');
  const [sharing,setSharing]=useState(false);
  const onCursor = useCallback(c=>setPoint(c?`${c.view} cursor ${Math.round(c.x)}, ${Math.round(c.y)}`:'No cursor'),[]);
  return <div style={{height:'100dvh',display:'flex',flexDirection:'column'}}>
    <div style={{padding:4,background:'white'}}><button onClick={()=>setDoc(d=>({...d,comments:[{...d.comments[0],text:'Updated without refresh'}]}))}>Receive remote comment</button><button onClick={()=>setSharing(true)}>Test share dialog</button><output>{point}</output></div>
    <div style={{flex:1,minHeight:0}}><App embedded readOnly initial={doc} external={doc} collaborators={[{id:'test-peer',name:'Alex',cursor:{x:180,y:190,view:'2d'}},{id:'3d-peer',name:'Jamie',cursor:{x:0.45,y:0.3,view:'3d'}}]} onCursor={onCursor} /></div>
    {sharing && <SharePanel project={{id:'test',owner_id:'owner',title:'RoomPlan test',document:doc,revision:0,archived:false,updated_at:new Date().toISOString()}} close={()=>setSharing(false)} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
