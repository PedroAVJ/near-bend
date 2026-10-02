import test from 'node:test';import assert from 'node:assert/strict';
import {ElevenLabsClient,ProviderError,transcriptionCapabilities} from '../src/index.mjs';
const result=()=>({language_code:'eng',language_probability:0.98,text:'Hello world',words:[{text:'Hello',type:'word',start:0,end:0.5,logprob:-0.124,speaker_id:'speaker_0',characters:[{text:'H',start:0,end:0.1}]},{text:' ',type:'spacing',logprob:0},{text:'world',type:'word',start:0.6,end:1,logprob:-0.1}],audio_duration_secs:1.2,transcription_id:'fixture-transcription'});
const request=()=>({file:new Uint8Array([1,0,255]),mimeType:'audio/webm;codecs=opus',filename:'clip.webm',model_id:'scribe_v2'});
test('ElevenLabs transcription uploads official multipart fields without guessing boundary',async()=>{
 const client=new ElevenLabsClient({apiKey:'fixture-only',fetch:async(url,init)=>{assert.equal(url,'https://api.elevenlabs.io/v1/speech-to-text?enable_logging=true');assert.equal(init.redirect,'error');assert.equal(init.headers['xi-api-key'],'fixture-only');assert.equal(init.headers['content-type'],undefined);assert.ok(init.body instanceof FormData);assert.equal(init.body.get('model_id'),'scribe_v2');assert.equal(init.body.get('num_speakers'),'2');assert.equal(init.body.get('diarize'),'true');assert.equal(init.body.get('timestamps_granularity'),'character');const file=init.body.get('file');assert.equal(file.name,'clip.webm');assert.equal(file.type,'audio/webm');assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[1,0,255]);return Response.json(result())}});
 assert.deepEqual(await client.transcribe({...request(),diarize:true,num_speakers:2,timestamps_granularity:'character',enable_logging:true}),result());assert.equal(transcriptionCapabilities.sourceURL,false);
});
test('transcription rejects invalid files and unsupported provider modes before fetch',async()=>{
 let calls=0;const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>{calls++;return Response.json(result())}});
 for(const invalid of [{file:new Uint8Array(0)}, {mimeType:'text/plain'}, {filename:'../secret.webm'}, {model_id:'unknown'}, {diarize:false,num_speakers:2}, {timestamps_granularity:'sentence'}, {temperature:3}, {seed:-1}, {source_url:'https://private.example'}, {webhook:true}, {language_code:'bad-code'}, {file:new Uint8Array(4)}])await assert.rejects(client.transcribe({...request(),...invalid},{maxFileBytes:3}),TypeError);
 assert.equal(calls,0);
});
test('transcription provider HTTP error cancels body and exposes metadata only',async()=>{
 let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true}});const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>new Response(body,{status:429,headers:{'request-id':'req-fixture','retry-after':'2'}})});
 await assert.rejects(client.transcribe(request()),e=>e instanceof ProviderError&&e.status===429&&e.requestId==='req-fixture'&&e.retryAfter==='2');assert.equal(cancelled,true);
});
test('transcription runtime validates selected result fields without leaking malformed response',async()=>{
 for(const value of [[],{...result(),language_probability:2},{...result(),words:[{type:'word',text:'PRIVATE',logprob:1}]},{...result(),words:[{type:'word',text:'PRIVATE',logprob:-1,start:2,end:1}]},{...result(),transcripts:[]}]){
  const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>Response.json(value)});await assert.rejects(client.transcribe(request()),e=>e.code==='protocol'&&!e.message.includes('PRIVATE'));
 }
 const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>new Response('broken')});await assert.rejects(client.transcribe(request()),ProviderError);
});
test('transcription cancellation before request performs no fetch',async()=>{
 let calls=0;const c=new AbortController();c.abort();const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>{calls++}});await assert.rejects(client.transcribe(request(),{signal:c.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('transcription cancellation while fetch pending settles and disposes late body',async()=>{
 let resolve,cancelled=false;const c=new AbortController();const client=new ElevenLabsClient({apiKey:'fixture',fetch:()=>new Promise(r=>{resolve=r})});const pending=client.transcribe(request(),{signal:c.signal});c.abort();await assert.rejects(pending,{name:'AbortError'});resolve(new Response(new ReadableStream({cancel(){cancelled=true}})));await new Promise(r=>setImmediate(r));assert.equal(cancelled,true);
});
test('transcription cancellation during response read cancels source',async()=>{
 let cancelled=false;const c=new AbortController();const body=new ReadableStream({start(stream){stream.enqueue(new TextEncoder().encode('{"text":'))},cancel(){cancelled=true}});const client=new ElevenLabsClient({apiKey:'fixture',fetch:async()=>new Response(body)});const pending=client.transcribe(request(),{signal:c.signal});await new Promise(r=>setImmediate(r));c.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(cancelled,true);
});
