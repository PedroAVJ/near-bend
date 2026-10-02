import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {embedNativeMain,createAsyncNativeHost,runNativeIO} from './node_modules/near-function/stdlib/ai/native-host/async.mjs';
import {createFetchTransport} from './node_modules/near-function/stdlib/ai/native-host/raw-fetch.mjs';
import {installNativeHost} from './node_modules/near-function/stdlib/ai/native-host/host.mjs';
writeFileSync('program.mjs',embedNativeMain(readFileSync('program.js','utf8')));const {default:main}=await import('./program.mjs');
globalThis.fetch=()=>{throw Error('Network forbidden')};
const delta=text=>'data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\r\n\r\n';
const finish='data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n';
const usage='data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}\n\n';
const complete='data: [DONE]\n\n';
const success=': heartbeat\r\n'+delta('Hello ')+delta('native')+finish+usage+complete;
async function execute({wire=success,expectedText='Hello native',expectedStatus='CompleteMessage',readFailure=false,abort=false,physical=false,status=200}){
 let reads=0,closes=0,opens=0;// TextDecoder streaming emits complete scalars; never split UTF-16 surrogate pairs as fake text.
 const scalars=Array.from(wire),chunks=[scalars.slice(0,9),scalars.slice(9,37),scalars.slice(37,104),scalars.slice(104,205),scalars.slice(205)].map(part=>part.join('')).filter(Boolean);
 const physicalTransport=physical?createFetchTransport({allowRequests:true,allowedOrigins:['https://openrouter.ai'],maxChunkBytes:4096,fetch:async(url,options)=>{opens++;assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(options.headers.get('authorization'),'offline-private-fixture');assert.equal(JSON.parse(options.body).messages[0].content,'Offline native request');const bytes=new TextEncoder().encode(wire);return new Response(new ReadableStream({start(controller){controller.enqueue(bytes.subarray(0,17));controller.enqueue(bytes.subarray(17,39));controller.enqueue(bytes.subarray(39));controller.close();}}),{status});}}):null;
 const http=physical?async request=>{const reply=await physicalTransport(request);const close=reply.resource.close.bind(reply.resource);reply.resource.close=async()=>{closes++;return close()};return reply}:async request=>{await Promise.resolve();opens++;assert.equal(request.credential,'offline-private-fixture');assert.equal(JSON.parse(request.body).messages[0].content,'Offline native request');assert.equal(request.url,'https://openrouter.ai/api/v1/chat/completions');return{status:1,data:'200',resource:{async read(){await Promise.resolve();reads++;if(abort)return new Promise(()=>{});if(readFailure)throw Error('private-provider-details');return chunks.length?{status:1,data:chunks.shift()}:{status:2,data:''}},async close(){closes++;return{status:1,data:''}}}}};
 const host=createAsyncNativeHost({credentials:new Map([[7,physical?{headers:{authorization:'offline-private-fixture'}}:'offline-private-fixture']]),http});
 const remove=installNativeHost(host),controller=new AbortController();try{
  const running=runNativeIO(main(),{signal:controller.signal,dispose:async()=>{await host.dispose();await physicalTransport?.dispose()}});
  if(abort){setTimeout(()=>controller.abort(),5);await assert.rejects(running,/aborted/);}else{const message=await running;assert.equal(message.text,expectedText);assert.ok(message.status.$.endsWith('.'+expectedStatus),message.status.$);}
  assert.equal(opens,1);assert.equal(closes,1);assert.equal(host.openHandles,0);return{reads,closes,opens};
 }finally{remove()}
}
await execute({physical:true});
await execute({physical:true,status:401,expectedText:'',expectedStatus:'FailedMessage'});
await execute({wire:delta('ñ😀'.repeat(1500))+finish+complete,expectedText:'ñ😀'.repeat(1500),physical:true});
await execute({wire:success+delta('late'),expectedText:'Hello native'});
await execute({wire:delta('partial'),expectedText:'partial',expectedStatus:'FailedMessage'});
await execute({wire:'data: malformed-json\n\n',expectedText:'',expectedStatus:'FailedMessage'});
await execute({wire:'data: {"error":{"message":"private provider details"}}\n\n',expectedText:'',expectedStatus:'FailedMessage'});
await execute({readFailure:true,expectedText:'',expectedStatus:'FailedMessage'});
await execute({abort:true});
console.log('Actual installed compiled Bend main: typed encode → async raw host → split SSE/CRLF framing → typed decode → native Dot state → close passed (success, late events, truncation, malformed, provider error, transport error, cancellation/disposal).');
