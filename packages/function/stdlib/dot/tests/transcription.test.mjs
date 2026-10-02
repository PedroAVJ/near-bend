import test from 'node:test';import assert from 'node:assert/strict';import {ElevenLabsTranscriber} from '../src/transcription.mjs';
const response={text:'Audio transcript',language_code:'eng',language_probability:0.9,words:[]};
test('Dot transcription is explicitly gated or offline injected and keeps keys private',()=>{
 assert.throws(()=>new ElevenLabsTranscriber({apiKey:'fixture'}),/allowPaidRequests/);assert.throws(()=>new ElevenLabsTranscriber({client:{transcribe:async()=>response}}),/allowPaidRequests/);const adapter=new ElevenLabsTranscriber({offlineClient:{transcribe:async()=>response}});assert.equal(adapter.capabilities.offline,true);assert.equal(JSON.stringify(adapter).includes('fixture'),false);assert.throws(()=>new ElevenLabsTranscriber({offlineClient:{},client:{}}),/Choose one/);
});
test('Dot transcription sends immutable bounded audio to shared SDK contract',async()=>{
 let uploaded;const adapter=new ElevenLabsTranscriber({offlineClient:{async transcribe(request){uploaded=request;return response}},request:{diarize:true},maxFileBytes:4});const bytes=new Uint8Array([1,2,3]);assert.deepEqual(await adapter.transcribe({bytes,mimeType:'audio/ogg',filename:'voice.ogg'}),response);assert.equal(uploaded.model_id,'scribe_v2');assert.equal(uploaded.diarize,true);assert.ok(uploaded.file instanceof Blob);bytes.fill(9);assert.deepEqual([...new Uint8Array(await uploaded.file.arrayBuffer())],[1,2,3]);await assert.rejects(adapter.transcribe({bytes:new Uint8Array(5),mimeType:'audio/ogg'}),TypeError);
});
test('Dot transcription abort and malformed offline responses stay explicit',async()=>{
 let calls=0;const adapter=new ElevenLabsTranscriber({offlineClient:{async transcribe(){calls++;return {text:'PRIVATE'}}}});const c=new AbortController();c.abort();await assert.rejects(adapter.transcribe({bytes:new Uint8Array([1]),mimeType:'audio/wav'},{signal:c.signal}),{name:'AbortError'});assert.equal(calls,0);await assert.rejects(adapter.transcribe({bytes:new Uint8Array([1]),mimeType:'audio/wav'}),e=>e.code==='protocol'&&!e.message.includes('PRIVATE'));
});
