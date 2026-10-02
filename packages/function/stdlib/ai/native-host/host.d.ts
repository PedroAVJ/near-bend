/** Raw transport status; provider interpretation belongs to Bend codecs. */
export interface RawReply {status:1|2|3|4; data:string}
export interface RawByteReply {status:1|2|3|4;bytes:readonly number[]|Uint8Array}
export interface HostByteReply {status:1|2|3|4;handle:number;bytes:number[]}
export interface HostReply extends RawReply {handle:number}
export interface RawResource {
  readBytes?():RawByteReply;
  read?():RawReply;
  send?(data:string):RawReply;
  write?(data:string):RawReply;
  close():RawReply;
}
export interface AsyncRawResource {
  readBytes?():RawByteReply|Promise<RawByteReply>;
  read?():RawReply|Promise<RawReply>;
  send?(data:string):RawReply|Promise<RawReply>;
  write?(data:string):RawReply|Promise<RawReply>;
  close():RawReply|Promise<RawReply>;
}
export interface HttpRawRequest {credential:unknown;method:string;url:string;headers:string;body:string}
export interface FormField {name:string;value:string}
export interface MultipartRawRequest {credential:unknown;url:string;headers:string;fields:readonly FormField[];filename:string;mimeType:string;bytes:readonly number[]|Uint8Array}
export interface SocketRawRequest {credential:unknown;url:string;headers:string}
export interface ProcessRawRequest {credential:unknown;executable:string;args:string;input:string}
export interface RawOpen extends RawReply {resource?:RawResource}
export interface AsyncRawOpen extends RawReply {resource?:AsyncRawResource}
export interface Limits {credentials?:Map<number,unknown>;maxDataBytes?:number;maxHandles?:number;maxUploadBytes?:number;cleanupTimeoutMs?:number}
export interface NativeHost {dispatch(operation:'stream.read_bytes',args:unknown[]):HostByteReply;dispatch(operation:'http.open'|'http.multipart_open'|'stream.read'|'socket.open'|'socket.send'|'process.open'|'process.write'|'transport.close',args:unknown[]):HostReply;dispatch(operation:string,args:unknown[]):HostReply|HostByteReply;dispose():void;readonly openHandles:number}
export interface AsyncNativeHost {readonly async:true;dispatch(operation:'stream.read_bytes',args:unknown[]):Promise<HostByteReply>;dispatch(operation:'http.open'|'http.multipart_open'|'stream.read'|'socket.open'|'socket.send'|'process.open'|'process.write'|'transport.close',args:unknown[]):Promise<HostReply>;dispatch(operation:string,args:unknown[]):Promise<HostReply|HostByteReply>;dispose():Promise<void>;readonly openHandles:number}
export type RawFactory<Request> = ((request:Request)=>RawOpen) & {dispose?:()=>void};
export type AsyncRawFactory<Request> = ((request:Request)=>AsyncRawOpen|Promise<AsyncRawOpen>) & {dispose?:()=>void|Promise<void>};
export function createNativeHost(options?:Limits & {http?:RawFactory<HttpRawRequest>;multipart?:RawFactory<MultipartRawRequest>;socket?:RawFactory<SocketRawRequest>;process?:RawFactory<ProcessRawRequest>}):NativeHost;
export function createAsyncNativeHost(options?:Limits & {http?:AsyncRawFactory<HttpRawRequest>;multipart?:AsyncRawFactory<MultipartRawRequest>;socket?:AsyncRawFactory<SocketRawRequest>;process?:AsyncRawFactory<ProcessRawRequest>}):AsyncNativeHost;
/** Installs one explicit trusted host in this realm. Returned function removes it. */
export function installNativeHost(host:NativeHost|AsyncNativeHost):()=>void;
/** Entry returned by embedNativeMain must be called once to obtain this CPS action. */
export type NativeAction=(continuation:(value:unknown)=>unknown)=>unknown;
export function runNativeIO(action:NativeAction,options?:{signal?:AbortSignal;timeoutMs?:number;maxSteps?:number;cleanupTimeoutMs?:number;dispose?:()=>void|Promise<void>}):Promise<unknown>;
/** Only accepts the pinned compiler's exact emitted .js main entry tail. */
export function embedNativeMain(source:string):string;

export const nativeHostCapabilities: Readonly<{backend:'javascript';sequentialAsyncIO:true;defaultTransports:false;baseConcurrency:false;cBackend:false}>;
