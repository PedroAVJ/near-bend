import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkspaceRuntime} from '../workspace.mjs';
import {createFileSetupStore,createDurableSetupAuthority} from '../host.mjs';
const dot={id:'one',name:'Fixture Dot',ownerId:'owner',backend:{id:'local',kind:'local-desktop',endpoint:'http://127.0.0.1:9000'},permissions:['chat','microphone']};
const pairing={dotId:'one',audience:'client',backend:dot.backend,permissions:dot.permissions};
async function fixture(t,options={}) {const directory=await mkdtemp(join(tmpdir(),'f-workspace-'));t.after(()=>rm(directory,{recursive:true,force:true}));const store=createFileSetupStore(directory);return {store,runtime:createWorkspaceRuntime({store,dots:[dot],...options}),restart:()=>createWorkspaceRuntime({store:createFileSetupStore(directory),dots:[dot],...options})};}
const request={pairing,dotId:'one',text:'hello',requestId:'request_one'};
const collect=async iterable=>{const result=[];for await(const event of iterable)result.push(event);return result;};
test('offline chat persists history and replays a request without running provider twice',async t=>{
 let calls=0;const f=await fixture(t,{provider:async function*({history}){calls++;assert.equal(history.length,0);yield 'Hello ';yield 'fixture';}});
 assert.deepEqual(f.runtime.list(pairing),{ok:true,dots:[{id:'one',name:'Fixture Dot'}]});
 assert.deepEqual(await collect(f.runtime.stream(request)),[{type:'delta',text:'Hello '},{type:'delta',text:'fixture'},{type:'done'}]);
 const restarted=f.restart();assert.equal((await restarted.history(request)).messages.length,2);
 assert.deepEqual(await collect(restarted.stream(request)),[{type:'delta',text:'Hello fixture'},{type:'done'}]);assert.equal(calls,1);
 assert.equal((await collect(restarted.stream({...request,text:'changed'})))[0].code,'request-conflict');
 assert.deepEqual((await restarted.history({...request,pairing:{...pairing,audience:'other'}})).messages,[]);
});
test('scope, permissions and input bounds fail before invoking a provider',async t=>{
 let calls=0;const f=await fixture(t,{provider:async function*(){calls++;yield 'bad';}});
 for(const patch of [{dotId:'other'},{pairing:{...pairing,permissions:[]}},{pairing:{...pairing,backend:{...dot.backend,endpoint:'https://other.invalid'}}}])assert.equal((await collect(f.runtime.stream({...request,...patch})))[0].code,'workspace-denied');
 assert.equal((await collect(f.runtime.stream({...request,text:'a'.repeat(8193)})))[0].code,'invalid-request');assert.equal(calls,0);
});
test('aborted stalled provider returns promptly and never commits partial chat',async t=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await fixture(t,{provider:async function*(){yield 'partial';await gate;yield 'late';}});
 const controller=new AbortController(),stream=f.runtime.stream({...request,signal:controller.signal});
 assert.equal((await stream.next()).value.text,'partial');const pending=stream.next();controller.abort();
 assert.equal((await pending).value.code,'cancelled');await stream.next();release();
 assert.deepEqual((await f.runtime.history(request)).messages,[]);
 assert.equal((await collect(f.runtime.stream(request)))[0].code,'request-replayed');
});
test('live authority revocation prevents further deltas and durable completion',async t=>{
 const f=await fixture(t),authority=createDurableSetupAuthority({store:f.store,dots:[dot],callbackURLs:['near-dot://setup/complete']});
 const grant=await authority.issue({dotId:'one',ownerId:'owner',audience:'client',callback:'near-dot://setup/complete',consent:true});
 const redemption=await authority.redeem({link:grant.link,audience:'client',consent:true,acceptedPermissions:['chat']});assert.equal(redemption.ok,true);
 const runtime=createWorkspaceRuntime({store:f.store,dots:[dot],provider:async function*(){yield 'first';yield 'second';}});
 const stream=runtime.stream({...request,pairing:redemption.pairing,validateSession:async()=> (await authority.session(redemption.session.token)).ok});
 assert.equal((await stream.next()).value.text,'first');await authority.revoke(redemption.session.token);
 assert.equal((await stream.next()).value.code,'session-required');await stream.next();assert.deepEqual((await runtime.history(request)).messages,[]);
});
test('media reference and injected transcription persist; unauthorized refs fail closed',async t=>{
 const f=await fixture(t,{transcribe:async({media})=>{assert.equal(media.reference,'fixture://audio/one');return {provider:'fixture',text:'offline transcript'};}});
 const audio={pairing,dotId:'one',mediaId:'audio_one',mimeType:'audio/webm',reference:'fixture://audio/one'};
 const saved=await f.runtime.media(audio);assert.equal(saved.ok,true);assert.equal(saved.media.transcription.text,'offline transcript');
 assert.deepEqual((await f.restart().getMedia(audio)).media,saved.media);
 assert.equal((await f.runtime.getMedia({...audio,pairing:{...pairing,audience:'other'}})).code,'media-not-found');
 assert.equal((await f.runtime.media({...audio,mediaId:'other',reference:'https://user:secret@host.invalid/audio'})).code,'media-reference-denied');
 assert.equal((await f.runtime.media({...audio,mediaId:'other',pairing:{...pairing,permissions:['chat']}})).code,'workspace-denied');
 assert.equal((await f.runtime.media(audio)).code,'media-replayed');
});
test('provider and transcription failures have stable public codes and no partial history',async t=>{
 const f=await fixture(t,{provider:async function*(){yield 'partial';throw Error('private adapter details');},transcribe:async()=>{throw Error('private provider details');}});
 const events=await collect(f.runtime.stream(request));assert.deepEqual(events.at(-1),{type:'error',code:'workspace-unavailable'});assert.deepEqual((await f.runtime.history(request)).messages,[]);
 const audio=await f.runtime.media({pairing,dotId:'one',mediaId:'audio',mimeType:'audio/wav',reference:'fixture://audio/test'});assert.equal(audio.media.transcription.code,'transcription-failed');
});
