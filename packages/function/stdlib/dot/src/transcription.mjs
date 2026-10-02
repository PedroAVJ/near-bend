import {ElevenLabsClient,ProviderError} from '../../ai/src/index.mjs';
import {validateAudioUpload,decodeTranscription,abortable} from '../../ai/src/transcription.mjs';
/** Server-only batch transcriber. An offlineClient is trusted to perform no network I/O. */
export class ElevenLabsTranscriber {
 #client;#request;#maxFileBytes;
 constructor({offlineClient,client,apiKey,allowPaidRequests=false,request={},maxFileBytes=32*1024*1024}={}) {
  if(typeof window!=='undefined')throw new Error('Transcription credentials require a server process');
  if(offlineClient&&client)throw new TypeError('Choose one transcription client');
  if(!Number.isSafeInteger(maxFileBytes)||maxFileBytes<1||maxFileBytes>32*1024*1024)throw new TypeError('maxFileBytes must be 1..33554432');
  if(!offlineClient&&allowPaidRequests!==true)throw new Error('Paid transcription requires explicit allowPaidRequests');
  const selected=offlineClient??client??new ElevenLabsClient({apiKey});
  if(!selected||typeof selected.transcribe!=='function')throw new TypeError('Transcription client required');
  if(!request||typeof request!=='object'||Array.isArray(request)||['file','mimeType','filename'].some(key=>key in request))throw new TypeError('Only transcription provider options belong in request');
  if(request.model_id!==undefined&&request.model_id!=='scribe_v2')throw new TypeError('This adapter requires scribe_v2');
  this.#client=selected;this.#request=Object.freeze({...request,model_id:'scribe_v2'});this.#maxFileBytes=maxFileBytes;
  this.capabilities=Object.freeze({provider:'elevenlabs',model:'scribe_v2',fileUpload:true,automaticRetry:false,paidRequestsEnabled:!offlineClient,offline:!!offlineClient});
 }
 get model(){return 'scribe_v2'}
 async transcribe({bytes,mimeType,filename},{signal}={}) {
  signal?.throwIfAborted();
  if(!(bytes instanceof Uint8Array))throw new TypeError('Audio bytes must be Uint8Array');
  const upload=validateAudioUpload(bytes,{mimeType,filename,maxFileBytes:this.#maxFileBytes});
  const result=await abortable(this.#client.transcribe({...this.#request,file:upload.blob,mimeType:upload.mimeType,filename:upload.filename},{signal,maxFileBytes:this.#maxFileBytes}),signal);
  signal?.throwIfAborted();
  try{return decodeTranscription(result)}catch{throw new ProviderError('elevenlabs','protocol','Invalid transcription response')}
 }
}
