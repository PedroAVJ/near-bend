import type {RequestOptions,ScribeV2Options,TranscriptionRequest,SpeechToTextResult} from '../../ai/src/index.js';
export interface AudioTranscriptionInput {bytes:Uint8Array;mimeType:string;filename?:string}
export interface TranscriptionClient {transcribe(request:TranscriptionRequest,options?:RequestOptions & {maxFileBytes?:number}):Promise<SpeechToTextResult>}
export interface ElevenLabsTranscriberOptions {/** Trusted injection explicitly promises no network calls. */offlineClient?:TranscriptionClient;client?:TranscriptionClient;apiKey?:string;allowPaidRequests?:boolean;request?:ScribeV2Options;maxFileBytes?:number}
export class ElevenLabsTranscriber {
 constructor(options:ElevenLabsTranscriberOptions);
 readonly model:'scribe_v2';
 readonly capabilities:Readonly<{provider:'elevenlabs';model:'scribe_v2';fileUpload:true;automaticRetry:false;paidRequestsEnabled:boolean;offline:boolean}>;
 transcribe(input:AudioTranscriptionInput,options?:RequestOptions):Promise<SpeechToTextResult>;
}
