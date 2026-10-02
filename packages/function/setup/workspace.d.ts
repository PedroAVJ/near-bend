import type {Dot,Pairing,Failure} from './client.js';
import type {SetupStore} from './host.js';
export interface WorkspaceMessage {role:'user'|'assistant';text:string;requestId:string}
export interface WorkspaceContext {signal?:AbortSignal;validateSession?:()=>boolean|Promise<boolean>}
export type WorkspaceEvent = {type:'delta';text:string}|{type:'done'}|{type:'error';code:string};
export interface WorkspaceMedia {id:string;mimeType:string;reference:string;createdAt:number;transcription:{provider:string;status:'queued'|'complete'|'failed';text?:string;code?:string}}
export type WorkspaceProvider = (request:{text:string;history:WorkspaceMessage[];pairing:Pairing;requestId:string;signal?:AbortSignal})=>AsyncIterable<string>;
export function fixtureWorkspaceProvider(request:{text:string;signal?:AbortSignal}):AsyncGenerator<string>;
/** Requires an authority-authenticated pairing. Media references are retained, not fetched. */
export function createWorkspaceRuntime(options:{store:SetupStore;dots:readonly (Dot & {name?:string})[];provider?:WorkspaceProvider;now?:()=>number;transcribe?:(request:{media:WorkspaceMedia;signal?:AbortSignal})=>Promise<{provider:string;text:string}>}): {
 list(pairing:Pairing):{ok:true;dots:{id:string;name:string}[]}|Failure;
 history(request:WorkspaceContext & {pairing:Pairing;dotId:string}):Promise<{ok:true;messages:WorkspaceMessage[]}|Failure>;
 stream(request:WorkspaceContext & {pairing:Pairing;dotId:string;text:string;requestId:string}):AsyncGenerator<WorkspaceEvent>;
 media(request:WorkspaceContext & {pairing:Pairing;dotId:string;mediaId:string;mimeType:string;reference:string}):Promise<{ok:true;media:WorkspaceMedia}|Failure>;
 getMedia(request:WorkspaceContext & {pairing:Pairing;dotId:string;mediaId:string}):Promise<{ok:true;media:WorkspaceMedia}|Failure>;
};
