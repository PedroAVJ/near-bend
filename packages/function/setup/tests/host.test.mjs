import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createFileSetupStore,createDurableSetupAuthority,createSetupHttpHandler} from '../host.mjs';
const dot={id:'fixture',ownerId:'owner',backend:{id:'fixture',kind:'local-desktop',endpoint:'http://127.0.0.1:9000'},permissions:['chat','mcp-ui']};
const request={dotId:'fixture',ownerId:'owner',audience:'client',consent:true,callback:'near-dot://setup/complete'};
async function fixture(t){const directory=await mkdtemp(join(tmpdir(),'f-host-'));t.after(()=>rm(directory,{recursive:true,force:true}));let time=1000;const options={dots:[dot],callbackURLs:[request.callback],now:()=>time,sessionTTL:100};const authority=()=>createDurableSetupAuthority({...options,store:createFileSetupStore(directory)});return {directory,authority,tick:()=>time+=101};}
test('durable authority survives restart, single-use transaction and revocation',async t=>{
 const f=await fixture(t),a=f.authority(),grant=await a.issue(request);
 const results=await Promise.allSettled([a,f.authority()].map(a=>a.redeem({link:grant.link,audience:'client',consent:true,acceptedPermissions:['mcp-ui']})));
 const successes=results.filter(r=>r.status==='fulfilled'&&r.value.ok);assert.equal(successes.length,1);
 const result=successes[0].value;assert.equal((await f.authority().session(result.session.token)).ok,true);
 assert.equal((await a.redeem({link:grant.link,audience:'client',consent:true,acceptedPermissions:[]})).code,'replayed');
 const state=await readFile(join(f.directory,'state.json'),'utf8');assert.ok(!state.includes(result.session.token));assert.ok(!state.includes(new URL(grant.link).searchParams.get('code')));
 await a.revoke(result.session.token);assert.equal((await a.session(result.session.token)).ok,false);assert.equal((await a.choose({dotId:'fixture',audience:'client'})).ok,false);
});
test('session expiry and failed audience do not consume grant',async t=>{
 const f=await fixture(t),a=f.authority(),grant=await a.issue(request);
 assert.equal((await a.redeem({link:grant.link,audience:'wrong',consent:true,acceptedPermissions:[]})).code,'wrong-audience');
 const result=await a.redeem({link:grant.link,audience:'client',consent:true,acceptedPermissions:[]});f.tick();assert.equal((await a.session(result.session.token)).ok,false);
});
test('store fails closed on existing lock',async t=>{const f=await fixture(t);await mkdir(join(f.directory,'transaction.lock'));await assert.rejects(f.authority().issue(request),/busy/);});
test('real HTTP fixture authenticates principals and binds MCP dispatch to session consent',async t=>{
 const f=await fixture(t),a=f.authority();let permission=true,dispatched=0;
 const handler=createSetupHttpHandler({authority:a,authenticate:req=>({ 'Fixture owner':{id:'owner'},'Fixture client':{id:'client'}}[req.headers.authorization]??null),getServiceUI:()=>({resource:{kind:'declarative',serviceId:'fixture',nodes:[{id:'run',type:'button',text:'Run',action:'run'}]},host:{connectedServices:['fixture'],trustedServices:['fixture'],grantedPermissions:permission?['mcp-ui','chat']:[],capabilities:['button'],actionPolicies:{fixture:{run:['mcp-ui']}}}}),dispatchAction:()=>{dispatched++;return 'fixture-result';}});
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 const call=async(path,body,authorization)=>{const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{authorization:authorization??'','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,value:await response.json()};};
 assert.equal((await call('/v1/protocol')).status,401);
 assert.equal((await call('/v1/pairing/issue',{...request},'Fixture owner')).status,400); // ownerId may not be forged through JSON
 const {ownerId,...issue}=request;const grant=(await call('/v1/pairing/issue',issue,'Fixture owner')).value;
 assert.equal((await call('/v1/pairing/redeem',{link:grant.link,consent:true,acceptedPermissions:['mcp-ui']},'Fixture owner')).value.code,'wrong-audience');
 const redemption=(await call('/v1/pairing/redeem',{link:grant.link,consent:true,acceptedPermissions:['mcp-ui']},'Fixture client')).value;assert.equal(redemption.ok,true);const auth=`Bearer ${redemption.session.token}`;
 assert.equal((await call('/v1/session',undefined,auth)).value.protocol,'near-function.setup.v1');
 const ui=await call('/v1/mcp-ui/fixture',undefined,auth);assert.equal(ui.status,200);assert.deepEqual(ui.value.host.grantedPermissions,['mcp-ui']);
 assert.equal((await call('/v1/mcp-ui/fixture/action',{nodeId:'run'},auth)).value.result,'fixture-result');assert.equal(dispatched,1);
 permission=false;assert.equal((await call('/v1/mcp-ui/fixture/action',{nodeId:'run'},auth)).status,403);assert.equal(dispatched,1);
 await call('/v1/session/revoke',{},auth);assert.equal((await call('/v1/session',undefined,auth)).status,401);
 const denied=await fetch(base+'/v1/protocol',{headers:{origin:'https://untrusted.invalid'}});assert.equal(denied.status,403);
});
