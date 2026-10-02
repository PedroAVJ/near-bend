import {createStateChannel} from 'near-v';
import {createRenderer, glassTier} from 'near-v/browser';
import {OpenRouterClient, OpenAIClient, AnthropicClient, ElevenLabsClient, MockAgent, ClaudeCliAdapter} from 'near-v/ai';
import {createAssistant, createMemoryPersistence} from 'near-v/dot';
import {defineDeployment, planDeployment,planApplication} from 'near-v/deploy';
import {openDotRequirements} from 'near-v/requirements';
planApplication(openDotRequirements,{kind:'local',ports:{assistant:9462}});
const channel=createStateChannel({initial:{count:0},reduce:(state,delta:number)=>({count:state.count+delta})});
await channel.mutate(1,{expectedRevision:0});
const renderer=createRenderer({});const markup:string=renderer({$:'components.Text',kind:'body',value:'Prepared'});glassTier('');
const dot=createAssistant({agent:new MockAgent(),persistence:createMemoryPersistence()});await dot.send('hello');
const router=new OpenRouterClient({apiKey:'test',fetch:async()=>new Response('{}')});
const result=await router.complete({model:'test/model',messages:[{role:'user',content:'Hi'}],provider:{order:['Test'],allow_fallbacks:false}});result.choices[0]?.message.content;
const openai=new OpenAIClient({apiKey:'test'});void openai;const anthropic=new AnthropicClient({apiKey:'test'});void anthropic;const speech=new ElevenLabsClient({apiKey:'test'});void speech;
const cli=new ClaudeCliAdapter();cli.plan({prompt:'Plan only',allowedTools:[]});
const plan=planDeployment(defineDeployment({name:'open-dot',version:'0.1.0',services:[{id:'ui',runtime:'static',artifact:'ui/index.html'}]}));const dryRun:'dry-run'=plan.mode;const inert:false=plan.executable;
// @ts-expect-error provider-specific API: OpenAI Responses requests do not accept chat messages
const invalid: import('near-v/ai').OpenAIRequest={model:'test',messages:[]};
void [markup,dryRun,inert,invalid];

import {createTemplateServer} from 'near-v/templates/open-dot/server';
import {planTemplate} from 'near-v/templates/plan';
const host=createTemplateServer({storage:'none',provider:{kind:'mock'},port:0});
void [host,planTemplate];
import {OpenAIRealtimeClient,liveCapabilities} from 'near-v/ai/live';
import {OpenRouterAgent,OpenAIResponsesAgent,AnthropicMessagesAgent,ClaudeAgent} from 'near-v/dot/adapters';
const live=new OpenAIRealtimeClient({apiKey:'fixture',model:'caller-selected'});void [live,liveCapabilities];
const routed=createAssistant({agent:new OpenRouterAgent({client:router,model:'fixture'})});void routed;
void new OpenAIResponsesAgent({client:openai,model:'fixture'});
void new AnthropicMessagesAgent({client:anthropic,model:'fixture',maxTokens:32});
void new ClaudeAgent({runtime:cli});

import {createRealtimeCallBridge} from 'near-v/dot/live';
import {BrowserVoiceSession,mediaCapabilities} from 'near-v/dot/media';
const browserVoice=new BrowserVoiceSession({endpoint:'/api/audio',onEvent:event=>{void event.type}});
const voiceBridge=createRealtimeCallBridge({assistant:dot,client:live,browser:{send(event){void event.type},subscribe(){return ()=>{}},close(){}}});
void [browserVoice,voiceBridge,mediaCapabilities];
import {GPTLiveClient,gptLiveCapabilities} from 'near-v/ai/gpt-live';
const gptLive=new GPTLiveClient({apiKey:'fixture'});void [gptLive,gptLiveCapabilities];
import {createGPTLiveCallBridge} from 'near-v/dot/gpt-live';
const gptBridge=createGPTLiveCallBridge({assistant:dot,client:gptLive,session:{model:'fixture',audio:{format:{type:'audio/pcm',rate:24000}},delegation:{type:'client'},store:false},browser:{send(event){void event.type},subscribe(){return ()=>{}},close(){}}});
void gptBridge;

import {createAsyncNativeHost,nativeHostCapabilities} from 'near-v/ai/native-host';
import {createFetchTransport} from 'near-v/ai/native-fetch';
const rawHTTP=createFetchTransport({allowRequests:false});
const nativeHost=createAsyncNativeHost({http:rawHTTP,credentials:new Map<number,unknown>()});
await nativeHost.dispose();void nativeHostCapabilities;

import {createMemoryAssetStore} from 'near-v/dot/assets';
import {ElevenLabsTranscriber} from 'near-v/dot/transcription';
import {mountComposer} from 'near-v/dot/composer';
import {mountVoiceMessage} from 'near-v/dot/voice-message';
import {createCameraContext} from 'near-v/dot/camera-context';
import {createMultipartFetchTransport} from 'near-v/ai/native-multipart';
const audioDot=createAssistant({agent:new MockAgent(),assetStore:createMemoryAssetStore(),transcriptionAdapter:new ElevenLabsTranscriber({offlineClient:speech})});
const audioMessage=await audioDot.sendAudio({bytes:new Uint8Array([1]),mimeType:'audio/webm',durationMs:100});
const transcriptionStatus:import('near-v/dot').TranscriptionState['status']|undefined=audioMessage.transcription?.status;
await audioDot.sendAttachment({bytes:new Uint8Array([1]),mimeType:'image/jpeg',name:'photo.jpg',kind:'photo'});
void [mountComposer,mountVoiceMessage,createCameraContext,createMultipartFetchTransport,transcriptionStatus];

import {renderAssistant} from 'near-v/dot/browser';void renderAssistant(audioDot.snapshot());

import {createCanvasPreview} from 'near-v/templates/canvas/server';
import {canvasRequirements} from 'near-v/requirements';
const canvas=createCanvasPreview({artifactRoot:'neutral-built-canvas',port:0});
const canvasPlan:import('near-v/deploy').DeploymentPlan=canvas.plan({services:{},artifacts:{},availableSecretRefs:[],previous:{stores:[]}}, {kind:'local',ports:{inspector:9472}});
void [canvasRequirements,canvasPlan];await canvas.close();
