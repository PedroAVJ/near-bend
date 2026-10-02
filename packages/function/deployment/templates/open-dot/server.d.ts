import type {Server} from 'node:http';
import type {GPTLiveClient,GPTLiveSessionConfig} from 'near-v/ai/gpt-live';
import type {createGPTLiveCallBridge} from 'near-v/dot/gpt-live';
import type {OpenAIRealtimeClient,RealtimeSocketFactory,RealtimeSessionConfig} from 'near-v/ai/live';
import type {AssetStore} from 'near-v/dot/assets';
import type {ElevenLabsTranscriber} from 'near-v/dot/transcription';
import type {Assistant} from 'near-v/dot';
import type {OpenRouterClient,OpenRouterRequest,OpenAIClient,OpenAIRequest,AnthropicClient,AnthropicRequest,ClaudeCliAdapter} from 'near-v/ai';
import type {ApplicationRequirements,DeploymentTarget,Observation,DeploymentPlan} from 'near-v/deploy';
export type TemplateProvider = {kind:'mock'}
 | {kind:'openrouter';apiKey?:string;model:string;allowPaidRequests:true;fetch?:typeof globalThis.fetch;client?:OpenRouterClient;options?:Omit<OpenRouterRequest,'model'|'messages'>}
 | {kind:'openai';apiKey?:string;model:string;allowPaidRequests:true;fetch?:typeof globalThis.fetch;client?:OpenAIClient;options?:Omit<OpenAIRequest,'model'|'input'|'previous_response_id'>}
 | {kind:'anthropic';apiKey?:string;model:string;allowPaidRequests:true;fetch?:typeof globalThis.fetch;client?:AnthropicClient;maxTokens?:number;options?:Omit<AnthropicRequest,'model'|'messages'|'max_tokens'>}
 | {kind:'claudeCli';allowExecution:true;allowedTools?:string[];runtime?:ClaudeCliAdapter;executable?:string;spawn?:NonNullable<ConstructorParameters<typeof ClaudeCliAdapter>[0]>['spawn'];cwd?:string};
export type TemplateTranscription = {kind:'elevenlabs';apiKey?:string;allowPaidRequests:true;client?:NonNullable<ConstructorParameters<typeof ElevenLabsTranscriber>[0]>['client'];request?:NonNullable<ConstructorParameters<typeof ElevenLabsTranscriber>[0]>['request']} | {kind:'offline-fixture';client:NonNullable<NonNullable<ConstructorParameters<typeof ElevenLabsTranscriber>[0]>['offlineClient']>;request?:NonNullable<ConstructorParameters<typeof ElevenLabsTranscriber>[0]>['request']};
export interface TemplateOptions {storage:'none'|'memory'|'file';storagePath?:string;provider?:TemplateProvider;cameraContext?:'none'|'realtime-images'|'vision-summary';visionDelegate?:(frame:{id:string;dataURI:string;capturedAtMs:number},options:{signal:AbortSignal})=>Promise<string>;transcription?:TemplateTranscription;realtime?:{apiKey?:string;model:string;allowPaidRequests:true;client?:OpenAIRealtimeClient;socketFactory?:RealtimeSocketFactory;session?:RealtimeSessionConfig};gptLive?:{apiKey?:string;model:string;allowPaidRequests:true;client?:GPTLiveClient;socketFactory?:RealtimeSocketFactory;session?:Partial<Omit<GPTLiveSessionConfig,'model'>>;executeDelegation?:NonNullable<Parameters<typeof createGPTLiveCallBridge>[0]>['executeDelegation']};port?:number;host?:'127.0.0.1'|'localhost'}
export interface LocalAssistantTemplate {server:Server;assistant:Assistant;assetStore:AssetStore;config:Readonly<{provider:TemplateProvider['kind'];storage:'none'|'memory'|'file';liveAudio:boolean;voiceProtocol:'openaiRealtime'|'gptLive'|null;transcription:'elevenlabs'|'offline-fixture'|null;cameraContext:'none'|'realtime-images'|'vision-summary';localOnly:true}>;requirements:ApplicationRequirements;plan(observation?:Observation,target?:DeploymentTarget):DeploymentPlan;listen():Promise<string>;close():Promise<void>}
export declare function createTemplateServer(options:TemplateOptions):LocalAssistantTemplate;
