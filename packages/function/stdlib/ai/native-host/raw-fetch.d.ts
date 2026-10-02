export interface PhysicalReply {status:1|2|3|4;data:string}
export interface PhysicalHTTPResource {read():Promise<PhysicalReply>;readBytes():Promise<{status:1|2|3|4;bytes:number[]|Uint8Array}>;close():Promise<PhysicalReply>}
export interface FetchTransportOptions {fetch?:typeof globalThis.fetch;allowRequests?:boolean;allowedOrigins?:string[];maxChunkBytes?:number;maxBodyBytes?:number;maxResponseBytes?:number;closeTimeoutMs?:number}
export function createFetchTransport(options?:FetchTransportOptions):((request:{credential?:unknown;method:string;url:string;headers:string;body:string})=>Promise<PhysicalReply&{resource?:PhysicalHTTPResource}>)&{dispose():Promise<void>};
