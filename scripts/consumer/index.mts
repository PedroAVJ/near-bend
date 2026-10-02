import {createStateChannel} from 'near-function';
import {createRenderer, glassTier} from 'near-function/browser';
import {OpenRouterClient, OpenAIClient, AnthropicClient, ElevenLabsClient, MockAgent, ClaudeCliAdapter} from 'near-function/ai';
import {createAssistant, createMemoryPersistence} from 'near-function/dot';
import {defineDeployment, planDeployment,planApplication} from 'near-function/deploy';
import {openDotRequirements} from 'near-function/requirements';
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
const invalid: import('near-function/ai').OpenAIRequest={model:'test',messages:[]};
void [markup,dryRun,inert,invalid];

import {createTemplateServer} from 'near-function/templates/open-dot/server';
import {planTemplate} from 'near-function/templates/plan';
const host=createTemplateServer({storage:'none',provider:{kind:'mock'},port:0});
void [host,planTemplate];
import {OpenAIRealtimeClient,liveCapabilities} from 'near-function/ai/live';
import {OpenRouterAgent,OpenAIResponsesAgent,AnthropicMessagesAgent,ClaudeAgent} from 'near-function/dot/adapters';
const live=new OpenAIRealtimeClient({apiKey:'fixture',model:'caller-selected'});void [live,liveCapabilities];
const routed=createAssistant({agent:new OpenRouterAgent({client:router,model:'fixture'})});void routed;
void new OpenAIResponsesAgent({client:openai,model:'fixture'});
void new AnthropicMessagesAgent({client:anthropic,model:'fixture',maxTokens:32});
void new ClaudeAgent({runtime:cli});

import {createRealtimeCallBridge} from 'near-function/dot/live';
import {BrowserVoiceSession,mediaCapabilities} from 'near-function/dot/media';
const browserVoice=new BrowserVoiceSession({endpoint:'/api/audio',onEvent:event=>{void event.type}});
const voiceBridge=createRealtimeCallBridge({assistant:dot,client:live,browser:{send(event){void event.type},subscribe(){return ()=>{}},close(){}}});
void [browserVoice,voiceBridge,mediaCapabilities];
import {GPTLiveClient,gptLiveCapabilities} from 'near-function/ai/gpt-live';
const gptLive=new GPTLiveClient({apiKey:'fixture'});void [gptLive,gptLiveCapabilities];
import {createGPTLiveCallBridge} from 'near-function/dot/gpt-live';
const gptBridge=createGPTLiveCallBridge({assistant:dot,client:gptLive,session:{model:'fixture',audio:{format:{type:'audio/pcm',rate:24000}},delegation:{type:'client'},store:false},browser:{send(event){void event.type},subscribe(){return ()=>{}},close(){}}});
void gptBridge;

import {createAsyncNativeHost,nativeHostCapabilities} from 'near-function/ai/native-host';
import {createFetchTransport} from 'near-function/ai/native-fetch';
const rawHTTP=createFetchTransport({allowRequests:false});
const nativeHost=createAsyncNativeHost({http:rawHTTP,credentials:new Map<number,unknown>()});
await nativeHost.dispose();void nativeHostCapabilities;

import {createMemoryAssetStore} from 'near-function/dot/assets';
import {ElevenLabsTranscriber} from 'near-function/dot/transcription';
import {mountComposer} from 'near-function/dot/composer';
import {mountVoiceMessage} from 'near-function/dot/voice-message';
import {createCameraContext} from 'near-function/dot/camera-context';
import {createMultipartFetchTransport} from 'near-function/ai/native-multipart';
const audioDot=createAssistant({agent:new MockAgent(),assetStore:createMemoryAssetStore(),transcriptionAdapter:new ElevenLabsTranscriber({offlineClient:speech})});
const audioMessage=await audioDot.sendAudio({bytes:new Uint8Array([1]),mimeType:'audio/webm',durationMs:100});
const transcriptionStatus:import('near-function/dot').TranscriptionState['status']|undefined=audioMessage.transcription?.status;
await audioDot.sendAttachment({bytes:new Uint8Array([1]),mimeType:'image/jpeg',name:'photo.jpg',kind:'photo'});
void [mountComposer,mountVoiceMessage,createCameraContext,createMultipartFetchTransport,transcriptionStatus];

import {renderAssistant} from 'near-function/dot/browser';void renderAssistant(audioDot.snapshot());

import {createCanvasPreview} from 'near-function/templates/canvas/server';
import {canvasRequirements} from 'near-function/requirements';
const canvas=createCanvasPreview({artifactRoot:'neutral-built-canvas',port:0});
const canvasPlan:import('near-function/deploy').DeploymentPlan=canvas.plan({services:{},artifacts:{},availableSecretRefs:[],previous:{stores:[]}}, {kind:'local',ports:{inspector:9472}});
void [canvasRequirements,canvasPlan];await canvas.close();

import {defineSource,sourceSteps} from 'near-function/deploy/source';
import {observeSource} from 'near-function/deploy/repositories';
import {withDeploymentSource} from 'near-function/requirements';
const source=defineSource({kind:'mirror',model:{id:'model',revision:'a'.repeat(40)},implementation:{id:'implementation',revision:'b'.repeat(40)},artifacts:[{path:'dist/app.js',receipt:'dist/receipt.json',sha256:'c'.repeat(64)}]});
const sourceObservation=await observeSource(source,{});sourceSteps(source,sourceObservation);withDeploymentSource(openDotRequirements,source);

import {mobileCases,planMobileTarget} from 'near-function/platform';
import {defineBackend,checkConnection,setupPresentation} from 'near-function/setup';
import {createSetupAuthority} from 'near-function/setup/server';
import {composeMcpUI,authorizeMcpAction} from 'near-function/mcp-ui';
const backend=defineBackend({id:'fixture',kind:'local-desktop',endpoint:'http://127.0.0.1:9462'});
const authority=createSetupAuthority({dots:[{id:'fixture',ownerId:'owner',backend,permissions:['chat']}],callbackURLs:['near-dot://setup/complete']});
const grant=authority.issue({dotId:'fixture',ownerId:'owner',audience:'client',consent:true,callback:'near-dot://setup/complete'});setupPresentation(grant);void [mobileCases,planMobileTarget,checkConnection,composeMcpUI,authorizeMcpAction];

import {createDotClient} from 'near-dot';import type {DotAdapter} from 'near-dot';
import {createDotPreview} from 'near-dot/preview';
import {planReleaseTargets} from 'near-function/deploy/targets';
const targetPlan=planReleaseTargets(['github-source']);const dotPreview=createDotPreview();void [createDotClient,targetPlan,dotPreview];const dotAdapter:DotAdapter|undefined=undefined;void dotAdapter;

import {createDurableSetupAuthority,createSetupHttpHandler,setupProtocol} from 'near-function/setup/host';
const durableAuthority=createDurableSetupAuthority({store:{async transaction(operation){return operation({version:1,grants:[],pairings:[],sessions:[]});}},dots:[],callbackURLs:[]});
const httpHandler=createSetupHttpHandler({authority:durableAuthority,authenticate:()=>null});void [httpHandler,setupProtocol];

import {createWorkspaceRuntime} from 'near-function/setup/workspace';
const workspaceRuntime=createWorkspaceRuntime({store:{async transaction(operation){return operation({version:1,grants:[],pairings:[],sessions:[]});}},dots:[]});void workspaceRuntime;
