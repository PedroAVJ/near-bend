import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAssistant,createMemoryPersistence} from '../src/index.mjs';
import {createMemoryAssetStore} from '../src/assets.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick()}assert.fail('State did not settle')}
const audio=()=>({bytes:new Uint8Array([1,2,3,4]),mimeType:'audio/webm;codecs=opus',name:'voice.webm',durationMs:1200});
const result=text=>({text,words:[{text,type:'word',start:0,end:1,speaker_id:'speaker-1',logprob:-0.1}]});
const find=(a,id)=>a.snapshot().messages.find(m=>m.id===id);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};

test('canonical audio is playable while pending; mandatory ready transcript gates exactly one linked reply',async()=>{
 const gate=deferred();let transcribes=0;const requests=[];const states=[];
 const a=createAssistant({transcriptionAdapter:{model:'scribe_v2',async transcribe(input){transcribes++;assert.deepEqual([...input.bytes],[1,2,3,4]);return gate.promise}},agent:{async *run(request){requests.push(request);yield{type:'result',text:'reply'}}}});a.subscribe(s=>states.push(s));
 const accepted=await a.sendAudio(audio());await until(()=>transcribes===1);assert.equal(accepted.kind,'audio');assert.equal(accepted.text,'');assert.equal(transcribes,1);assert.equal(requests.length,0);assert.ok(states.some(s=>s.messages[0]?.transcription.status==='pending'));assert.deepEqual([...(await a.getAsset(accepted.audio.assetId)).bytes],[1,2,3,4]);assert.equal(a.snapshot().assets,undefined);
 gate.resolve(result('derived speech'));await until(()=>find(a,accepted.id).reply.status==='ready');const recorded=find(a,accepted.id);assert.equal(recorded.text,'');assert.equal(recorded.transcription.status,'ready');assert.equal(recorded.transcription.provider,'elevenlabs');assert.equal(recorded.transcription.sourceAssetId,recorded.audio.assetId);assert.equal(recorded.transcription.words[0].start,0);assert.equal(requests.length,1);assert.equal(requests[0].prompt,'derived speech');assert.deepEqual(requests[0].messages,[{role:'user',text:'derived speech'}]);assert.equal(a.snapshot().messages.length,2);assert.equal(a.snapshot().messages[1].replyTo,accepted.id);await assert.rejects(a.retryTranscription(accepted.id),/already transcribed/);
});
test('missing ElevenLabs configuration preserves audio with visible failed/retry state and no agent call',async()=>{
 let calls=0;const a=createAssistant({agent:{async *run(){calls++;yield{type:'result',text:'bad'}}}});const m=await a.sendAudio(audio());await until(()=>find(a,m.id).transcription.status==='failed');assert.match(find(a,m.id).transcription.error,/not configured/);assert.ok(await a.getAsset(m.audio.assetId));assert.equal(calls,0);
});
test('bounded queue serializes transcription, supports queued cancellation and ignores late active result',async()=>{
 const gate=deferred();let active=0,max=0,calls=0;const a=createAssistant({transcriptionAdapter:{async transcribe(){calls++;active++;max=Math.max(max,active);await gate.promise;active--;return result('late')}},agent:{async *run(){assert.fail('cancelled audio must not reply')}}});
 const first=await a.sendAudio(audio()),second=await a.sendAudio(audio());assert.equal(find(a,second.id).transcription.status,'pending');assert.equal(calls,1);await a.cancelTranscription(second.id);await a.cancelTranscription(first.id);gate.resolve();await tick();await tick();assert.equal(calls,1);assert.equal(max,1);assert.equal(find(a,first.id).transcription.status,'cancelled');assert.equal(find(a,second.id).transcription.attempt,0);assert.ok(await a.getAsset(second.audio.assetId));
});
test('retry keeps stable audio identity, caps attempts at three and redacts provider payload',async()=>{
 let calls=0;const a=createAssistant({transcriptionAdapter:{async transcribe(){calls++;throw Error('fixture-secret-key')}}});const m=await a.sendAudio(audio());await until(()=>find(a,m.id).transcription.status==='failed');const asset=m.audio.assetId;for(let i=0;i<2;i++){await a.retryTranscription(m.id);await until(()=>find(a,m.id).transcription.status==='failed')}
 assert.equal(calls,3);assert.equal(find(a,m.id).audio.assetId,asset);assert.equal(find(a,m.id).transcription.retryRequired,false);assert.ok(!JSON.stringify(a.snapshot()).includes('fixture-secret-key'));await assert.rejects(a.retryTranscription(m.id),/limit/);assert.ok(await a.getAsset(asset));
});
test('successful explicit transcription retry produces one reply and never duplicates original audio',async()=>{
 let fail=true,calls=0;const a=createAssistant({transcriptionAdapter:{async transcribe(){if(fail)throw Error('fail');return result('retry text')}},agent:{async *run(){calls++;yield{type:'result',text:'reply'}}}});const m=await a.sendAudio(audio());await until(()=>find(a,m.id).transcription.status==='failed');fail=false;await a.retryTranscription(m.id);await until(()=>find(a,m.id).reply.status==='ready');assert.equal(calls,1);assert.equal(a.snapshot().messages.filter(m=>m.kind==='audio').length,1);assert.equal(find(a,m.id).transcription.attempt,2);
});
test('clear cancels late transcription, deletes playable bytes and cannot recreate opted-in storage',async()=>{
 const gate=deferred(),p=createMemoryPersistence(),store=createMemoryAssetStore();let signal,calls=0;const a=createAssistant({persistence:p,assetStore:store,transcriptionAdapter:{async transcribe(_,options){signal=options.signal;return gate.promise}},agent:{async *run(){calls++;yield{type:'result',text:'bad'}}}});await a.setPermission('persistence',true);const m=await a.sendAudio(audio());await until(()=>!!signal);assert.ok(p.load().assets.length);await a.clear();assert.equal(signal.aborted,true);gate.resolve(result('late'));await tick();await tick();assert.equal(calls,0);assert.equal(p.load(),null);assert.equal(store.get(m.audio.assetId),null);assert.equal(a.snapshot().messages.length,0);
});
test('opt-in persistence restores playable audio bytes and interrupted transcript requires explicit retry',async()=>{
 const gate=deferred(),p=createMemoryPersistence();let oldCalls=0,newCalls=0;const a=createAssistant({persistence:p,transcriptionAdapter:{async transcribe(){oldCalls++;return gate.promise}}});await a.setPermission('persistence',true);const m=await a.sendAudio(audio());await tick();const b=createAssistant({persistence:p,transcriptionAdapter:{async transcribe(){newCalls++;return result('restored text')}}});await b.setPermission('persistence',true);assert.equal(await b.restore(),true);assert.equal(newCalls,0);assert.equal(find(b,m.id).transcription.status,'pending');assert.equal(find(b,m.id).transcription.retryRequired,true);assert.deepEqual([...(await b.getAsset(m.audio.assetId)).bytes],[1,2,3,4]);await b.retryTranscription(m.id);await until(()=>find(b,m.id).reply.status==='ready');assert.equal(newCalls,1);assert.equal(oldCalls,1);await a.clear();gate.resolve(result('late'));await tick();
});
test('restoring an existing assistant invalidates active transcript epoch and never auto replays saved ready replies',async()=>{
 const gate=deferred(),p=createMemoryPersistence();let calls=0;const a=createAssistant({persistence:p,transcriptionAdapter:{async transcribe(){return gate.promise}},agent:{async *run(){calls++;yield{type:'result',text:'reply'}}}});await a.setPermission('persistence',true);const m=await a.sendAudio(audio());await a.restore();gate.resolve(result('late'));await tick();await tick();assert.equal(calls,0);assert.equal(find(a,m.id).transcription.status,'pending');assert.equal(find(a,m.id).transcription.retryRequired,true);
});
test('photos/video/files retain metadata and assets without transcription or implicit model requests',async()=>{
 let calls=0;const a=createAssistant({transcriptionAdapter:{async transcribe(){calls++;return result('bad')}},agent:{async *run(){calls++;yield{type:'result',text:'bad'}}}});
 for(const[kind,mimeType,name]of [['photo','image/jpeg','photo.jpg'],['video','video/mp4','video.mp4'],['file','application/pdf','file.pdf']]){const m=await a.sendAttachment({bytes:new Uint8Array([1,2]),kind,mimeType,name});assert.equal(m.kind,kind);assert.equal(m.text,'');assert.equal(m.transcription,undefined);assert.ok(await a.getAsset(m.media.assetId))}assert.equal(calls,0);assert.equal(await a.getAsset('not-referenced'),null);
 await assert.rejects(a.sendAttachment({bytes:new Uint8Array([1]),kind:'photo',mimeType:'image/svg+xml',name:'photo.svg'}),/Invalid/);await assert.rejects(a.sendAttachment({bytes:new Uint8Array([1]),kind:'file',mimeType:'text/plain',name:'../private'}),/Invalid/);
});
test('new text context excludes pending audio and files, includes only ready derived audio once',async()=>{
 const gate=deferred(),requests=[];const a=createAssistant({transcriptionAdapter:{async transcribe(){return gate.promise}},agent:{async *run(request){requests.push(request);yield{type:'result',text:'reply'}}}});const m=await a.sendAudio(audio());await a.sendAttachment({bytes:new Uint8Array([1]),mimeType:'application/pdf',name:'file.pdf',kind:'file'});await a.send('typed prompt');assert.ok(!requests[0].messages.some(x=>x.text===''));assert.deepEqual(requests[0].messages,[{role:'user',text:'typed prompt'}]);gate.resolve(result('spoken ready'));await until(()=>find(a,m.id).reply.status==='ready');assert.equal(requests.length,2);
});
test('audio automatic replies wait for an existing agent run and respect shared serialization',async()=>{
 const agentGate=deferred();let running=0,max=0;const requests=[];const a=createAssistant({transcriptionAdapter:{async transcribe(){return result('audio ready')}},agent:{async *run(request){running++;max=Math.max(max,running);requests.push(request.prompt);if(request.prompt==='typed')await agentGate.promise;running--;yield{type:'result',text:'done'}}}});const typed=a.send('typed');await tick();const m=await a.sendAudio(audio());await until(()=>find(a,m.id).transcription.status==='ready');assert.equal(find(a,m.id).reply.status,'pending');assert.deepEqual(requests,['typed']);agentGate.resolve();await typed;await until(()=>find(a,m.id).reply.status==='ready');assert.equal(max,1);assert.deepEqual(requests,['typed','audio ready']);
});

test('ready audio restores playable bytes without automatically replaying its completed assistant reply',async()=>{
 const p=createMemoryPersistence();let calls=0;const options={persistence:p,transcriptionAdapter:{async transcribe(){return result('saved audio')}},agent:{async *run(){calls++;yield{type:'result',text:'saved reply'}}}};const a=createAssistant(options);await a.setPermission('persistence',true);const m=await a.sendAudio(audio());await until(()=>find(a,m.id).reply.status==='ready');await tick();const b=createAssistant(options);await b.setPermission('persistence',true);await b.restore();await tick();assert.equal(calls,1);assert.equal(find(b,m.id).transcription.status,'ready');assert.equal(find(b,m.id).text,'');assert.ok(await b.getAsset(m.audio.assetId));await assert.rejects(b.replyToAudio(m.id),/already/);
});
test('persistence remains opt-in and original asset bytes cannot be mutated through inputs or getter results',async()=>{
 const p=createMemoryPersistence(),asset=audio();const gate=deferred();const a=createAssistant({persistence:p,transcriptionAdapter:{async transcribe(){return gate.promise}}});const submitting=a.sendAudio(asset);asset.bytes[0]=255;const m=await submitting;const stored=await a.getAsset(m.audio.assetId);assert.equal(stored.bytes[0],1);stored.bytes[0]=0;assert.equal((await a.getAsset(m.audio.assetId)).bytes[0],1);assert.equal(p.load(),null);await a.clear();gate.resolve(result('late'));await tick();
});
test('malformed persisted media is rejected before replacing current records or assets',async()=>{
 const p=createMemoryPersistence();const a=createAssistant({persistence:p,transcriptionAdapter:{async transcribe(){throw Error('offline')}}});await a.setPermission('persistence',true);const m=await a.sendAudio(audio());await until(()=>find(a,m.id).transcription.status==='failed');await tick();const saved=p.load();saved.messages[0].audio.assetId='missing';const b=createAssistant({persistence:{load:()=>saved,save(){},clear(){}}});await b.setPermission('persistence',true);await assert.rejects(b.restore(),/Invalid saved/);assert.equal(b.snapshot().messages.length,0);
});

test('cancelling an abort-ignoring hung adapter releases the next queue slot',async()=>{
 const hung=deferred();let calls=0,replies=0;
 const a=createAssistant({transcriptionTimeoutMs:1000,transcriptionAdapter:{transcribe(){return ++calls===1?hung.promise:Promise.resolve(result('next'))}},agent:{async *run(){replies++;yield{type:'result',text:'reply'}}}});
 const first=await a.sendAudio(audio()),second=await a.sendAudio(audio());await a.cancelTranscription(first.id);
 await until(()=>find(a,second.id).reply.status==='ready');assert.equal(calls,2);assert.equal(replies,1);assert.equal(find(a,first.id).transcription.status,'cancelled');
 hung.resolve(result('late ignored'));await tick();assert.equal(replies,1);assert.equal(find(a,first.id).transcription.text,'');
});

test('whole-request timeout aborts hung adapter, preserves asset and releases queue; late result ignored',async()=>{
 const hung=deferred();let calls=0,replies=0,signal;
 const a=createAssistant({transcriptionTimeoutMs:10,transcriptionAdapter:{transcribe(_,options){if(++calls===1){signal=options.signal;return hung.promise}return Promise.resolve(result('next'))}},agent:{async *run(){replies++;yield{type:'result',text:'reply'}}}});
 const first=await a.sendAudio(audio()),second=await a.sendAudio(audio());await new Promise(r=>setTimeout(r,25));await until(()=>find(a,second.id).reply.status==='ready');
 assert.equal(signal.aborted,true);assert.equal(find(a,first.id).transcription.status,'failed');assert.match(find(a,first.id).transcription.error,/timed out/);assert.ok(await a.getAsset(first.audio.assetId));assert.equal(replies,1);
 hung.resolve(result('late ignored'));await tick();assert.equal(find(a,first.id).transcription.text,'');assert.equal(replies,1);
});

test('clear releases hung transcription and permits a new recording without late recreation',async()=>{
 const hung=deferred();let calls=0;
 const a=createAssistant({transcriptionTimeoutMs:1000,transcriptionAdapter:{transcribe(){return ++calls===1?hung.promise:Promise.resolve(result('fresh'))}}});
 await a.sendAudio(audio());await until(()=>calls===1);await a.clear();const fresh=await a.sendAudio(audio());await until(()=>find(a,fresh.id).reply.status==='ready');
 hung.resolve(result('obsolete'));await tick();assert.equal(a.snapshot().messages.filter(m=>m.kind==='audio').length,1);assert.equal(find(a,fresh.id).transcription.text,'fresh');
});

test('transcription deadline configuration is bounded',()=>{
 for(const transcriptionTimeoutMs of [0,-1,120001,NaN,Infinity,'10',1.5])assert.throws(()=>createAssistant({transcriptionTimeoutMs}),/timeout/);
});
