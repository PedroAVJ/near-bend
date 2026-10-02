import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {embedNativeMain,createAsyncNativeHost,runNativeIO} from './node_modules/near-v/stdlib/ai/native-host/async.mjs';
import {installNativeHost} from './node_modules/near-v/stdlib/ai/native-host/host.mjs';
import {createFetchTransport} from './node_modules/near-v/stdlib/ai/native-host/raw-fetch.mjs';
writeFileSync('speech-program.mjs',embedNativeMain(readFileSync('speech-program.js','utf8')));const {default:main}=await import('./speech-program.mjs');
const rows=list=>{const bytes=[];while(list.$==='Con'){bytes.push(list.head);list=list.tail}assert.equal(list.$,'Nil');return bytes};
globalThis.fetch=()=>{throw Error('Network forbidden')};
async function run({payload,status=200,phase='SpeechDone',expected=payload,expectedCount=payload.length}){
 let fetched=0,closed=0;const transport=createFetchTransport({allowRequests:true,allowedOrigins:['https://api.elevenlabs.io'],maxChunkBytes:2,fetch:async(url,options)=>{fetched++;assert.equal(url,'https://api.elevenlabs.io/v1/text-to-speech/voice-fixture/stream?output_format=mp3_44100_128');assert.equal(options.headers.get('xi-api-key'),'offline-speech-private');assert.equal(JSON.parse(options.body).text,'Offline speech');return new Response(new ReadableStream({start(controller){controller.enqueue(Uint8Array.from(payload.slice(0,1)));controller.enqueue(Uint8Array.from(payload.slice(1,2)));controller.enqueue(Uint8Array.from(payload.slice(2)));controller.close()}}),{status})}});
 const http=async request=>{const reply=await transport(request),close=reply.resource.close.bind(reply.resource);reply.resource.close=async()=>{closed++;return close()};return reply};
 const host=createAsyncNativeHost({credentials:new Map([[9,{headers:{'xi-api-key':'offline-speech-private'}}]]),http}),remove=installNativeHost(host);
 try{const receipt=await runNativeIO(main(),{dispose:async()=>{await host.dispose();await transport.dispose()}});assert.ok(receipt.state.phase.$.endsWith('.'+phase),receipt.state.phase.$);assert.equal(receipt.state.bytes_received,expectedCount);assert.deepEqual(rows(receipt.emitted),expected);assert.equal(fetched,1);assert.equal(closed,1);assert.equal(host.openHandles,0);}finally{remove()}
}
await run({payload:[73,68,51,0,255,128]});
await run({payload:[1,2,3],phase:'SpeechBroken',expected:[],expectedCount:3});
await run({payload:[73,68],phase:'SpeechBroken',expected:[],expectedCount:2});
await run({payload:[73,68,51,0],status:401,phase:'SpeechBroken',expected:[],expectedCount:0});
console.log('Actual installed native ElevenLabs typed request → physical fake binary HTTP → checked Bend bytes → MP3-prefix stream state/EOF → exact emitted bytes/close passed (valid, invalid prefix, truncated prefix, HTTP error); no audio decoding or playback claimed.');
