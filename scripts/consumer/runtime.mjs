import assert from 'node:assert/strict';
import {createStateChannel} from 'near-function';
import {createRenderer} from 'near-function/browser';
import {OpenRouterClient,MockAgent,ClaudeCliAdapter} from 'near-function/ai';
import {createAssistant,createMemoryPersistence} from 'near-function/dot';
import {defineDeployment,planDeployment} from 'near-function/deploy';
const channel=createStateChannel({initial:{count:0},reduce:(s,n)=>({count:s.count+n})});assert.equal((await channel.mutate(2)).state.count,2);
assert.match(createRenderer({})({$:'components.Text',kind:'body',value:'<prepared>'}),/&lt;prepared&gt;/);
let requests=0;const router=new OpenRouterClient({apiKey:'fixture-key',fetch:async(url,options)=>{requests++;assert.equal(options.headers.authorization,'Bearer fixture-key');return Response.json({id:'fixture',object:'chat.completion',model:'fixture',choices:[],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}})}});assert.equal((await router.complete({model:'fixture',messages:[{role:'user',content:'Hi'}]})).id,'fixture');assert.equal(requests,1);
const dot=createAssistant({agent:new MockAgent(),persistence:createMemoryPersistence()});await dot.send('consumer');assert.equal(dot.snapshot().phase,'idle');assert.match(dot.snapshot().messages.at(-1).text,/consumer/);
const cli=new ClaudeCliAdapter();assert.equal(cli.plan({prompt:'Plan only'}).authentication,'owned-by-official-cli');
const plan=planDeployment(defineDeployment({name:'open-dot',version:'0.1.0',services:[{id:'ui',runtime:'static',artifact:'ui/index.html'}]}));assert.equal(plan.executable,false);assert.equal(plan.mode,'dry-run');
console.log('Packed clean-room runtime consumer passed all umbrella module imports and offline slices.');

const {createTemplateServer}=await import('near-function/templates/open-dot/server');const host=createTemplateServer({storage:'none',provider:{kind:'mock'},port:0});assert.equal(host.server.listening,false);assert.equal(host.assistant.snapshot().permissions.persistence,false);
const {planTemplate}=await import('near-function/templates/plan');const installedPlan=await planTemplate({previous:{stores:[]}});assert.equal(installedPlan.readyForReview,true);assert.equal(installedPlan.executable,false);console.log('Installed Open Dot template imports and artifact dry-run pass without starting a listener.');
const {OpenRouterAgent,ClaudeAgent}=await import('near-function/dot/adapters');
const routerAgent=new OpenRouterAgent({client:new OpenRouterClient({apiKey:'fixture',fetch:async()=>new Response('data: {"choices":[{"index":0,"delta":{"content":"Real SDK mock transport"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', {headers:{'Content-Type':'text/event-stream'}})}),model:'fixture'});
const realAdapterDot=createAssistant({agent:routerAgent});await realAdapterDot.send('host adapter');assert.equal(realAdapterDot.snapshot().messages.at(-1).text,'Real SDK mock transport');
const guardedCLI=new ClaudeAgent({runtime:new ClaudeCliAdapter()});await assert.rejects(async()=>{for await(const _ of guardedCLI.run({prompt:'never execute',sessionId:'fixture'})){}},/explicitly enabled/);
const {OpenAIRealtimeClient,liveCapabilities}=await import('near-function/ai/live');const live=new OpenAIRealtimeClient({apiKey:'fixture',model:'fixture'});assert.equal(JSON.stringify(live).includes('fixture'),false);assert.equal(liveCapabilities.deviceCapture,false);
console.log('Installed real SDK Dot adapter normalization, official CLI execution gate and Realtime key isolation pass offline.');

const {BrowserVoiceSession,mediaCapabilities}=await import('near-function/dot/media');
const {createRealtimeCallBridge}=await import('near-function/dot/live');
const browserVoice=new BrowserVoiceSession({endpoint:'/api/audio'});assert.equal(browserVoice.state,'idle');
assert.equal(mediaCapabilities.hardwareVerified,false);assert.equal(typeof createRealtimeCallBridge,'function');
console.log('Installed browser voice module construction has no device or network side effects.');
const {GPTLiveClient,gptLiveCapabilities}=await import('near-function/ai/gpt-live');const gpt=new GPTLiveClient({apiKey:'fixture'});
assert.equal(JSON.stringify(gpt).includes('fixture'),false);assert.equal(gptLiveCapabilities.audioCommit,false);assert.equal(gptLiveCapabilities.providerCancel,false);
console.log('Installed GPT-Live imports preserve distinct protocol capabilities and key isolation.');
const {createGPTLiveCallBridge}=await import('near-function/dot/gpt-live');assert.equal(typeof createGPTLiveCallBridge,'function');

const {createAsyncNativeHost,nativeHostCapabilities}=await import('near-function/ai/native-host');
const {createFetchTransport}=await import('near-function/ai/native-fetch');
const inertRawHTTP=createFetchTransport({allowRequests:false});
const nativeHost=createAsyncNativeHost({http:inertRawHTTP});
assert.equal(nativeHost.openHandles,0);await nativeHost.dispose();
assert.equal(nativeHostCapabilities.sequentialAsyncIO,true);
console.log('Installed native raw host and fail-closed HTTP transport import without network side effects.');

const {createMemoryAssetStore}=await import('near-function/dot/assets');
const {ElevenLabsTranscriber}=await import('near-function/dot/transcription');
const {mountComposer}=await import('near-function/dot/composer');
const {mountVoiceMessage}=await import('near-function/dot/voice-message');
const {createCameraContext}=await import('near-function/dot/camera-context');
const {createMultipartFetchTransport}=await import('near-function/ai/native-multipart');
void [mountComposer,mountVoiceMessage,createCameraContext,createMultipartFetchTransport,ElevenLabsTranscriber];
const mediaPersistence=createMemoryPersistence();const audioDot=createAssistant({agent:new MockAgent(),assetStore:createMemoryAssetStore(),persistence:mediaPersistence,transcriptionAdapter:{model:'scribe_v2',async transcribe(){return {text:'packed audio',words:[]}}}});
await audioDot.setPermission('persistence',true);const audioMessage=await audioDot.sendAudio({bytes:new Uint8Array([1,2,3]),mimeType:'audio/webm',durationMs:1000});
for(let tries=0;tries<100&&audioDot.snapshot().messages.find(m=>m.id===audioMessage.id).reply?.status!=='ready';tries++)await new Promise(resolve=>setImmediate(resolve));
const completedAudio=audioDot.snapshot().messages.find(m=>m.id===audioMessage.id);assert.equal(completedAudio.text,'');assert.equal(completedAudio.transcription.status,'ready');assert.equal(completedAudio.reply.status,'ready');assert.equal(audioDot.snapshot().messages.at(-1).replyTo,audioMessage.id);
const restoredAudio=createAssistant({agent:new MockAgent(),persistence:mediaPersistence});await restoredAudio.setPermission('persistence',true);assert.equal(await restoredAudio.restore(),true);assert.deepEqual([...(await restoredAudio.getAsset(audioMessage.audio.assetId)).bytes],[1,2,3]);
console.log('Packed reusable media entry points, canonical audio, mandatory derived transcription, linked reply and playable persistence pass offline.');

assert.match(import.meta.resolve('near-function/dot/composer.css'),/composer\.css$/);

const {createCanvasPreview}=await import('near-function/templates/canvas/server');
const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
const artifact=await mkdtemp(join(tmpdir(),'packed-neutral-canvas-'));await writeFile(join(artifact,'index.html'),'<title>Framework canvas</title>');
const canvas=createCanvasPreview({artifactRoot:artifact,port:0});
try{const url=await canvas.listen();const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/Framework canvas/);assert.equal((await fetch(url+'/missing')).status,404);assert.equal((await fetch(url,{method:'POST'})).status,405);assert.throws(()=>createCanvasPreview({artifactRoot:artifact,host:'0.0.0.0'}),/loopback/)}finally{await canvas.close();await rm(artifact,{recursive:true})}
console.log('Packed reusable canvas server starts/closes on loopback, serves explicit artifacts, rejects missing paths/mutations and public binds.');

const {defineSource,sourceSteps}=await import('near-function/deploy/source');
const {observeSource}=await import('near-function/deploy/repositories');
const pinned=defineSource({kind:'mirror',model:{id:'model',revision:'a'.repeat(40)},implementation:{id:'implementation',revision:'b'.repeat(40)},artifacts:[{path:'dist/app.js',receipt:'dist/receipt.json',sha256:'c'.repeat(64)}]});
assert.equal(sourceSteps(pinned)[0].status,'unverified');
const missing=await observeSource(pinned,{});assert.equal(missing.implementation.status,'missing');assert.ok(sourceSteps(pinned,missing).some(s=>s.status==='blocked'));
console.log('Installed typed provenance and read-only observer imports fail closed without repository mappings.');

const {mobileCases,planMobileTarget}=await import('near-function/platform');assert.equal(planMobileTarget(mobileCases[0].target).ready,false);
const {defineBackend,checkConnection,setupPresentation}=await import('near-function/setup');
const {createSetupAuthority}=await import('near-function/setup/server');
const {composeMcpUI,authorizeMcpAction}=await import('near-function/mcp-ui');
const backend=defineBackend({id:'fixture',kind:'local-desktop',endpoint:'http://127.0.0.1:9462'});assert.equal(checkConnection(backend,{installed:true,authenticated:false,platform:'ios'},{}).ok,false);
const authority=createSetupAuthority({dots:[{id:'fixture',ownerId:'owner',backend,permissions:['chat']}],callbackURLs:['near-dot://setup/complete']});const grant=authority.issue({dotId:'fixture',ownerId:'owner',audience:'fixture-client',consent:true,callback:'near-dot://setup/complete'});assert.equal(setupPresentation(grant).qrPayload,grant.link);
assert.equal(authority.redeem({link:grant.link,audience:'fixture-client',consent:true,acceptedPermissions:['chat']}).ok,true);assert.equal(authority.redeem({link:grant.link,audience:'fixture-client',consent:true,acceptedPermissions:['chat']}).code,'replayed');void [composeMcpUI,authorizeMcpAction];console.log('Installed mobile declarations and setup single-use authority fail closed; no native or network side effects.');
