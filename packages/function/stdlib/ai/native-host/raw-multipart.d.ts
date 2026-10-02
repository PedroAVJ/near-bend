import type {AsyncRawFactory,MultipartRawRequest} from './host.js';
export function createMultipartFetchTransport(options?:{fetch?:typeof globalThis.fetch;allowRequests?:boolean;allowedOrigins?:string[];maxUploadBytes?:number;maxChunkBytes?:number;maxBodyBytes?:number;maxResponseBytes?:number;closeTimeoutMs?:number}):AsyncRawFactory<MultipartRawRequest>;
