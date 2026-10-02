import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, unlink} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createAssistant,createMemoryPersistence} from 'near-v/dot';
import {MockAgent} from 'near-v/ai/mock';
import {OpenRouterClient,OpenAIClient,AnthropicClient,ClaudeCliAdapter} from 'near-v/ai';
import {createMemoryAssetStore} from 'near-v/dot/assets';
import {ElevenLabsTranscriber} from 'near-v/dot/transcription';
import {OpenAIRealtimeClient} from 'near-v/ai/live';
import {OpenRouterAgent,OpenAIResponsesAgent,AnthropicMessagesAgent,ClaudeAgent} from 'near-v/dot/adapters';
import {openDotRequirements,dotRequirementsFor} from 'near-v/requirements';
import {planApplication} from 'near-v/deploy';

const here=dirname(fileURLToPath(import.meta.url));
const packageRoot=resolve(here,'../../..');
/** Host-side configuration; constructing the server makes no network request or storage write. */
export function createTemplateServer({storage,storagePath,provider={kind:'mock'},realtime,gptLive,transcription,cameraContext='none',visionDelegate,port=9462,host='127.0.0.1'}={}){
 if(!['none','memory','file'].includes(storage))throw new TypeError('Choose storage explicitly: none, memory or file');
 if(!['127.0.0.1','localhost'].includes(host))throw new TypeError('Template server binds loopback only');
 if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('Invalid local port');
 if(!['none','realtime-images','vision-summary'].includes(cameraContext))throw new TypeError('Invalid camera context mode');
 if(cameraContext==='realtime-images'&&realtime===undefined)throw new TypeError('Realtime camera context requires explicit Realtime configuration');
 if(cameraContext==='vision-summary'&&(gptLive===undefined||typeof visionDelegate!=='function'))throw new TypeError('GPT-Live camera context requires an explicit vision delegate');
 if(realtime!==undefined&&gptLive!==undefined)throw new TypeError('Choose one explicit voice protocol: realtime or gptLive');
 let realtimeClient=null;
 if(realtime!==undefined){
  if(!realtime||realtime.allowPaidRequests!==true)throw new TypeError('Realtime requires explicit allowPaidRequests');
  if(typeof realtime.model!=='string'||!realtime.model.trim())throw new TypeError('Realtime model required');
  realtimeClient=realtime.client??new OpenAIRealtimeClient({apiKey:realtime.apiKey,model:realtime.model,socketFactory:realtime.socketFactory,imageInput:cameraContext==='realtime-images'});
 }
 let gptLiveClient=null;
 if(gptLive!==undefined){
  if(!gptLive||gptLive.allowPaidRequests!==true)throw new TypeError('GPT-Live requires explicit allowPaidRequests');
  if(typeof gptLive.model!=='string'||!gptLive.model.trim())throw new TypeError('GPT-Live model required');
  if(!gptLive.client&&(typeof gptLive.apiKey!=='string'||!gptLive.apiKey.trim()))throw new TypeError('GPT-Live apiKey required');
  let client=gptLive.client;gptLiveClient={async connect(options){if(!client){const {GPTLiveClient}=await import('near-v/ai/gpt-live');client=new GPTLiveClient({apiKey:gptLive.apiKey,socketFactory:gptLive.socketFactory})}return client.connect(options)}};
 }
 const voiceClient=realtimeClient??gptLiveClient,voiceProtocol=realtimeClient?'openaiRealtime':gptLiveClient?'gptLive':null;
 const assetStore=createMemoryAssetStore({urlFor:id=>'/api/assets/'+encodeURIComponent(id)});
 let transcriptionAdapter;
 if(transcription!==undefined){
  if(!transcription||!['elevenlabs','offline-fixture'].includes(transcription.kind))throw new TypeError('Choose explicit ElevenLabs transcription configuration');
  if(transcription.kind==='elevenlabs'&&transcription.allowPaidRequests!==true)throw new TypeError('ElevenLabs transcription requires explicit allowPaidRequests');
  if(transcription.kind==='offline-fixture'&&(!transcription.client||typeof transcription.client.transcribe!=='function'))throw new TypeError('Offline transcription requires an explicitly injected fixture client');
  transcriptionAdapter=new ElevenLabsTranscriber({apiKey:transcription.apiKey,...(transcription.kind==='offline-fixture'?{offlineClient:transcription.client}:{client:transcription.client}),allowPaidRequests:transcription.kind==='elevenlabs',request:transcription.request,maxFileBytes:8*1024*1024});
 }
 let persistence=null;
 if(storage==='memory')persistence=createMemoryPersistence();
 if(storage==='file'){
  if(typeof storagePath!=='string'||!storagePath.trim())throw new TypeError('File storage requires an explicit storagePath');
  const path=resolve(storagePath);
  persistence={async load(){try{return JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},async save(value){await mkdir(dirname(path),{recursive:true,mode:0o700});await writeFile(path,JSON.stringify(value),{mode:0o600})},async clear(){try{await unlink(path)}catch(e){if(e.code!=='ENOENT')throw e}}};
 }
 let agent;
 if(provider.kind==='mock')agent=new MockAgent();
 else if(['openrouter','openai','anthropic'].includes(provider.kind)){
  if(provider.allowPaidRequests!==true)throw new TypeError(`${provider.kind} requires explicit allowPaidRequests`);
  if(typeof provider.model!=='string'||!provider.model.trim())throw new TypeError(`${provider.kind} model required`);
  const clientOptions={apiKey:provider.apiKey,fetch:provider.fetch};
  if(provider.kind==='openrouter')agent=new OpenRouterAgent({client:provider.client??new OpenRouterClient(clientOptions),model:provider.model,options:provider.options});
  else if(provider.kind==='openai')agent=new OpenAIResponsesAgent({client:provider.client??new OpenAIClient(clientOptions),model:provider.model,options:provider.options});
  else agent=new AnthropicMessagesAgent({client:provider.client??new AnthropicClient(clientOptions),model:provider.model,maxTokens:provider.maxTokens??1024,options:provider.options});
 }else if(provider.kind==='claudeCli'){
  if(provider.allowExecution!==true)throw new TypeError('Official Claude CLI requires explicit allowExecution');
  if(provider.allowedTools!==undefined&&(!Array.isArray(provider.allowedTools)||!provider.allowedTools.every(t=>typeof t==='string')))throw new TypeError('allowedTools must contain explicitly allowed tool names');
  const runtime=provider.runtime??new ClaudeCliAdapter({executable:provider.executable,spawn:provider.spawn,cwd:provider.cwd,allowExecution:true});
  agent=new ClaudeAgent({runtime,allowedTools:provider.allowedTools??[]});
 }else throw new TypeError('Template provider must be mock, openrouter, openai, anthropic or claudeCli');
 const assistant=createAssistant({agent,persistence,assetStore,transcriptionAdapter});
 // Clear waits for cancelled native streams to settle before discarding continuation IDs.
 const clear=assistant.clear.bind(assistant),restore=assistant.restore.bind(assistant),send=assistant.send.bind(assistant);
 let activeSend=null,resetting=false;
 assistant.send=(...args)=>{if(resetting)return Promise.reject(new Error('Session reset is in progress'));if(activeSend)return Promise.reject(new Error('A run is already active'));const run=send(...args);activeSend=run;void run.finally(()=>{if(activeSend===run)activeSend=null}).catch(()=>{});return run};
 assistant.clear=async()=>{if(resetting)throw new Error('Session reset is in progress');resetting=true;try{assistant.cancel();await activeSend?.catch(()=>{});await clear();agent.reset?.(assistant.snapshot().id)}finally{resetting=false}};
 assistant.restore=async()=>{if(resetting)throw new Error('Session reset is in progress');resetting=true;try{const restored=await restore();if(restored)agent.reset?.(assistant.snapshot().id);return restored}finally{resetting=false}};
 const sessions=new Set(),voiceConnections=new Set();let wsServer=null,voiceBusy=false,shuttingDown=false;
 const routes=new Map([['/',resolve(here,'index.html')],['/app.mjs',resolve(here,'app.mjs')],['/browser.mjs',resolve(packageRoot,'stdlib/dot/src/browser.mjs')],['/composer.mjs',resolve(packageRoot,'stdlib/dot/src/composer.mjs')],['/voice-message.mjs',resolve(packageRoot,'stdlib/dot/src/voice-message.mjs')],['/composer.css',resolve(packageRoot,'stdlib/dot/src/composer.css')],['/camera-context.mjs',resolve(packageRoot,'stdlib/dot/src/camera-context.mjs')],['/generated/vision.mjs',resolve(packageRoot,'stdlib/dot/src/generated/vision.mjs')],['/f/render.mjs',resolve(packageRoot,'adapters/browser/render.mjs')],['/f/schema.mjs',resolve(packageRoot,'adapters/browser/schema.mjs')],['/media.mjs',resolve(packageRoot,'stdlib/dot/src/media.mjs')],['/api/dot/capture-worklet.mjs',resolve(packageRoot,'stdlib/dot/src/capture-worklet.mjs')]]);
 const config=Object.freeze({provider:provider.kind,storage,liveAudio:voiceClient!==null,voiceProtocol,cameraContext,transcription:transcription?.kind??null,localOnly:true});
 const requirements=dotRequirementsFor(provider.kind,{realtime:realtimeClient!==null,gptLive:gptLiveClient!==null});
 const server=createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:"};
  const authority=`${host}:${server.address()?.port??port}`;
  const origin=`http://${authority}`;
  if(req.headers.host!==authority){res.writeHead(403,headers);res.end('Host rejected');return}
  if(req.headers.origin && req.headers.origin!==origin){res.writeHead(403,headers);res.end('Origin rejected');return}
  const path=new URL(req.url,origin).pathname;
  try{
   if(req.method==='GET'&&path.startsWith('/api/assets/')){
    const id=decodeURIComponent(path.slice('/api/assets/'.length));
    const asset=typeof assistant.getAsset==='function'?await assistant.getAsset(id):assistant.snapshot().messages.some(m=>m.audio?.assetId===id||m.media?.assetId===id)?assetStore.get(id):null;
    if(!asset){res.writeHead(404,headers);res.end('Asset not found');return}
    res.writeHead(200,{...headers,'Content-Type':asset.mimeType,'Content-Length':asset.size,'Content-Disposition':`${asset.kind==='file'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(asset.name)}`});res.end(asset.bytes);return;
   }
   if(req.method==='GET'&&path==='/api/config'){res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(config));return}
   if(req.method==='GET'&&path==='/api/session'){res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(assistant.snapshot()));return}
   if(req.method==='GET'&&path==='/api/events'){
    res.writeHead(200,{...headers,'Content-Type':'text/event-stream','Connection':'keep-alive'});
    sessions.add(res);const unsubscribe=assistant.subscribe(s=>res.write(`data: ${JSON.stringify(s)}\n\n`));req.on('close',()=>{unsubscribe();sessions.delete(res)});return;
   }
   if(req.method==='POST'&&path==='/api/action'){
    if(req.headers['content-type']!=='application/json'){res.writeHead(415,headers);res.end('JSON required');return}
    const limit=12*1024*1024;
    if(Number(req.headers['content-length'])>limit)throw new Error('Request exceeds limit');
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('Request exceeds limit');chunks.push(chunk)}
    const a=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const upload=()=>{const encoded=a.bytes;if(typeof encoded!=='string'||encoded.length>Math.ceil(8*1024*1024/3)*4||encoded.length%4)throw new TypeError('Canonical base64 upload required');const padding=encoded.endsWith('==')?2:encoded.endsWith('=')?1:0;for(let i=0;i<encoded.length-padding;i++){const c=encoded.charCodeAt(i);if(!((c>=65&&c<=90)||(c>=97&&c<=122)||(c>=48&&c<=57)||c===43||c===47))throw new TypeError('Canonical base64 upload required');}const decoded=Buffer.from(encoded,'base64');if(!decoded.length||decoded.length>8*1024*1024||decoded.toString('base64')!==encoded)throw new TypeError('Upload exceeds limit or is not canonical');return new Uint8Array(decoded)};
    switch(a.action){
     case 'permission':if(typeof a.allowed!=='boolean')throw new TypeError('Permission choice must be boolean');await assistant.setPermission(a.permission,a.allowed);break;
     case 'beginCall':assistant.beginCall();break;
     case 'endCall':assistant.endCall();break;
     case 'send':await (assistant.snapshot().inCall?assistant.transcript(a.text):assistant.send(a.text));break;
     case 'cancel':assistant.cancel();break;
     case 'sendAudio':await assistant.sendAudio({bytes:upload(),mimeType:a.mimeType,name:a.name,durationMs:a.durationMs});break;
     case 'sendAttachment':await assistant.sendAttachment({bytes:upload(),mimeType:a.mimeType,name:a.name,kind:a.kind});break;
     case 'retryTranscription':await assistant.retryTranscription(a.id);break;
     case 'cancelTranscription':await assistant.cancelTranscription(a.id);break;
     case 'addTask':if(a.requiresApproval!==undefined&&typeof a.requiresApproval!=='boolean')throw new TypeError('Task approval requirement must be boolean');await assistant.addTask(a.title,{requiresApproval:a.requiresApproval??false});break;
     case 'completeTask':await assistant.completeTask(a.id);break;
     case 'decideTask':if(typeof a.approved!=='boolean')throw new TypeError('Task approval must be boolean');await assistant.decideTask(a.id,a.approved);break;
     case 'runTask':await assistant.runTask(a.id,async()=> 'Prepared locally; no external action');break;
     case 'cancelTask':await assistant.cancelTask(a.id);break;
     case 'restore':await assistant.restore();break;
     case 'clear':await assistant.clear();break;
     default:throw new Error('Unknown action');
    }
    res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(assistant.snapshot()));return;
   }
   if(req.method!=='GET'||!routes.has(path)){res.writeHead(404,headers);res.end('Not found');return}
   const file=routes.get(path);res.writeHead(200,{...headers,'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(file));
  }catch(error){res.writeHead(400,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({error:error instanceof Error?error.message:'Request failed'}))}
 });
 server.on('upgrade',async(req,socket,head)=>{
  const reject=(status)=>{socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`)};
  if(shuttingDown){reject('503 Service Unavailable');return}
  const authority=`${host}:${server.address()?.port??port}`,origin=`http://${authority}`;
  if(req.headers.host!==authority||req.headers.origin!==origin){reject('403 Forbidden');return}
  if(new URL(req.url,origin).pathname!=='/api/audio'||!voiceClient){reject('404 Not Found');return}
  if(!assistant.snapshot().inCall||!assistant.snapshot().permissions.microphone){reject('403 Forbidden');return}
  if(voiceBusy||voiceConnections.size){reject('409 Conflict');return}const reservation={};voiceBusy=reservation;
  try{
   if(!wsServer){const {WebSocketServer}=await import('ws');wsServer=new WebSocketServer({noServer:true,maxPayload:cameraContext==='none'?65536:393216,perMessageDeflate:false})}
   if(!assistant.snapshot().inCall||!assistant.snapshot().permissions.microphone){if(voiceBusy===reservation)voiceBusy=false;reject('403 Forbidden');return}
   const createVoiceBridge=realtimeClient?(await import('near-v/dot/live')).createRealtimeCallBridge:(await import('near-v/dot/gpt-live')).createGPTLiveCallBridge;
   wsServer.handleUpgrade(req,socket,head,ws=>{
    const close=()=>{ws.close();voiceConnections.delete(connection);if(voiceBusy===reservation)voiceBusy=false};
    const connection={ws,bridge:null};voiceConnections.add(connection);
    ws.on('error',()=>{connection.bridge?.close();close()});ws.on('close',()=>{connection.bridge?.close();voiceConnections.delete(connection);if(voiceBusy===reservation)voiceBusy=false});
    const browser={send(event){const frame=JSON.stringify(event);if(Buffer.byteLength(frame)>262144||ws.bufferedAmount>1048576){connection.bridge?.close();close();return}if(ws.readyState===1)ws.send(frame)},
     subscribe(listener){const onMessage=(data,isBinary)=>{try{if(isBinary)throw Error();const event=JSON.parse(data.toString());if(!event||typeof event!=='object'||typeof event.type!=='string')throw Error();if(data.length>65536&&(event.type!=='camera.frame'||cameraContext==='none'))throw Error();if(event.type==='cancel')event.type='response.cancel';listener(event)}catch{connection.bridge?.close();close()}};ws.on('message',onMessage);return()=>ws.off('message',onMessage)},close};
    connection.bridge=createVoiceBridge({assistant,client:voiceClient,browser,cameraContext,visionDelegate,session:realtimeClient?realtime.session??{}:{audio:{format:{type:'audio/pcm',rate:24000}},delegation:{type:'client'},store:false,...gptLive.session,model:gptLive.model},...(gptLiveClient?{executeDelegation:gptLive.executeDelegation}:{})});
    void connection.bridge.start().catch(()=>{connection.bridge.close();close()});void connection.bridge.done.finally(()=>close()).catch(()=>{});
   });
  }catch{if(voiceBusy===reservation)voiceBusy=false;reject('503 Service Unavailable')}
 });
 return {server,assistant,assetStore,config,requirements,plan(observation,target={kind:'local',host,ports:{assistant:port},storeLocations:storage==='file'?{continuity:storagePath}:{}}){return planApplication(requirements,target,observation)},async listen(){await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});return `http://${host}:${server.address().port}`},async close(){shuttingDown=true;assistant.cancel();const pending=[];for(const message of assistant.snapshot().messages)if(['pending','running'].includes(message.transcription?.status))pending.push(Promise.resolve(assistant.cancelTranscription(message.id)).catch(()=>{}));for(const connection of voiceConnections){pending.push(Promise.resolve(connection.bridge?.close()).catch(()=>{}));connection.ws.terminate()}await Promise.allSettled(pending);voiceConnections.clear();wsServer?.close();for(const res of sessions)res.end();if(!server.listening)return;server.closeAllConnections();await new Promise((ok,fail)=>server.close(e=>e?fail(e):ok()))}};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const provider=process.env.NEAR_PROVIDER??'mock';
 const app=createTemplateServer({storage:process.env.NEAR_STORAGE??'none',storagePath:process.env.NEAR_STORAGE_PATH,port:Number(process.env.PORT??9462),provider:provider==='mock'?{kind:'mock'}:provider==='claudeCli'?{kind:provider,allowExecution:process.env.NEAR_ALLOW_CLAUDE_CLI==='1'}:{kind:provider,apiKey:process.env[{openrouter:'OPENROUTER_API_KEY',openai:'OPENAI_API_KEY',anthropic:'ANTHROPIC_API_KEY'}[provider]],model:process.env.NEAR_MODEL,allowPaidRequests:process.env.NEAR_ALLOW_PAID_API==='1'}});
 console.log(`Open Dot (${app.config.provider}, storage=${app.config.storage}): ${await app.listen()}`);
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{void app.close().then(()=>process.exit(0))});
}
