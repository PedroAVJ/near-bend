import type {CameraFrame,CameraStatusEvent} from './camera-context.js';
import type {Assistant} from 'near-function/dot';
import type {OpenAIRealtimeClient,RealtimeSessionConfig} from 'near-function/ai/live';
export type BrowserAudioCommand={type:'audio.append';audio:string}|{type:'audio.commit'|'response.cancel'|'cancel'|'close'|'camera.enable'|'camera.disable'}|(CameraFrame&{type:'camera.frame'});
export type BrowserCallEvent={type:'audio.delta';audio:string}|{type:'audio.clear'}|{type:'transcript';role:'user'|'assistant';text:string;fragment?:boolean;startMs?:number;endMs?:number}|{type:'error';code:string;message:string}|{type:'status';state:'ready'}|CameraStatusEvent;
export interface BrowserCallTransport{send(event:BrowserCallEvent):void;subscribe(listener:(event:BrowserAudioCommand)=>void):()=>void;close():void}
export function createRealtimeCallBridge(options:{assistant:Assistant;client:OpenAIRealtimeClient;browser:BrowserCallTransport;session?:RealtimeSessionConfig;signal?:AbortSignal;cameraContext?:'none'|'realtime-images'}):{start():Promise<void>;close():void;cancel():void;done:Promise<void>};
