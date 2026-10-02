const MAX_FILE_BYTES=32*1024*1024;
const MIME_EXTENSIONS=new Map([['audio/mpeg','mp3'],['audio/mp3','mp3'],['audio/mp4','m4a'],['audio/x-m4a','m4a'],['audio/wav','wav'],['audio/x-wav','wav'],['audio/ogg','ogg'],['audio/webm','webm'],['audio/flac','flac'],['audio/aac','aac']]);
export function validateAudioUpload(file,{mimeType,filename,maxFileBytes=MAX_FILE_BYTES}={}) {
 if(!Number.isSafeInteger(maxFileBytes)||maxFileBytes<1||maxFileBytes>MAX_FILE_BYTES)throw new TypeError('maxFileBytes must be 1..33554432');
 if(!(file instanceof Uint8Array)&&!(file instanceof Blob))throw new TypeError('Audio file must be Blob or Uint8Array');
 const size=file instanceof Blob?file.size:file.byteLength;
 if(size<1||size>maxFileBytes)throw new TypeError('Audio file exceeds local size bounds');
 const raw=mimeType??(file instanceof Blob?file.type:undefined);
 if(typeof raw!=='string'||/[\r\n\0]/.test(raw))throw new TypeError('Valid audio MIME type required');
 const mime=raw.split(';',1)[0].trim().toLowerCase();if(!MIME_EXTENSIONS.has(mime))throw new TypeError('Unsupported audio MIME type');
 const name=filename??`audio.${MIME_EXTENSIONS.get(mime)}`;
 if(typeof name!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/.test(name)||name==='.'||name==='..')throw new TypeError('Audio filename must be a bounded leaf name');
 const blob=file instanceof Blob?file.slice(0,file.size,mime):new Blob([new Uint8Array(file)],{type:mime});
 return {blob,filename:name,mimeType:mime,size};
}
export function prepareTranscription(request,{maxFileBytes}={}) {
 if(!request||typeof request!=='object'||Array.isArray(request))throw new TypeError('Transcription request required');
 const allowed=new Set(['file','filename','mimeType','model_id','language_code','tag_audio_events','num_speakers','timestamps_granularity','diarize','file_format','temperature','seed','enable_logging']);
 for(const key of Object.keys(request))if(!allowed.has(key))throw new TypeError('Unsupported transcription request field');
 const upload=validateAudioUpload(request.file,{mimeType:request.mimeType,filename:request.filename,maxFileBytes});
 const model=request.model_id??'scribe_v2';if(model!=='scribe_v2')throw new TypeError('This transcription slice requires scribe_v2');
 if(request.language_code!=null&&(typeof request.language_code!=='string'||!/^[a-z]{2,3}$/i.test(request.language_code)))throw new TypeError('language_code must be ISO language letters');
 for(const key of ['tag_audio_events','diarize','enable_logging'])if(request[key]!==undefined&&typeof request[key]!=='boolean')throw new TypeError(`${key} must be boolean`);
 if(request.num_speakers!=null&&(!Number.isInteger(request.num_speakers)||request.num_speakers<1||request.num_speakers>32||request.diarize!==true))throw new TypeError('num_speakers requires diarize and 1..32 speakers');
 if(request.timestamps_granularity!==undefined&&!['none','word','character'].includes(request.timestamps_granularity))throw new TypeError('Invalid timestamps_granularity');
 if(request.file_format!==undefined&&!['other','pcm_s16le_16'].includes(request.file_format))throw new TypeError('Invalid file_format');
 if(request.temperature!=null&&(!Number.isFinite(request.temperature)||request.temperature<0||request.temperature>2))throw new TypeError('temperature must be 0..2');
 if(request.seed!=null&&(!Number.isInteger(request.seed)||request.seed<0||request.seed>2147483647))throw new TypeError('seed must be 0..2147483647');
 const form=new FormData();form.append('file',upload.blob,upload.filename);form.append('model_id',model);
 for(const key of ['language_code','tag_audio_events','num_speakers','timestamps_granularity','diarize','file_format','temperature','seed'])if(request[key]!=null)form.append(key,String(request[key]));
 const query=request.enable_logging===undefined?'':`?enable_logging=${request.enable_logging}`;
 return {form,path:'/speech-to-text'+query};
}
export async function abortable(promise,signal,onLate=()=>{}) {
 signal?.throwIfAborted();if(!signal)return promise;
 let listener;
 const guarded=Promise.resolve(promise).then(value=>{if(signal.aborted){onLate(value);signal.throwIfAborted()}return value});
 try{return await Promise.race([guarded,new Promise((_,reject)=>{listener=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));signal.addEventListener('abort',listener,{once:true});if(signal.aborted)listener()})])}
 finally{signal.removeEventListener('abort',listener)}
}
export async function readTranscriptionJSON(response,{signal,maxResponseBytes=4*1024*1024}={}) {
 if(!response.body)throw new TypeError('Missing transcription response');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,raw='';
 const cancel=()=>{void reader.cancel(signal?.reason).catch(()=>{})};signal?.addEventListener('abort',cancel,{once:true});
 try{while(true){signal?.throwIfAborted();const chunk=await reader.read();signal?.throwIfAborted();if(chunk.done){raw+=decoder.decode();break}if(!(chunk.value instanceof Uint8Array))throw new TypeError('Invalid response bytes');size+=chunk.value.byteLength;if(size>maxResponseBytes)throw new TypeError('Transcription response exceeds bounds');raw+=decoder.decode(chunk.value,{stream:true})}return decodeTranscription(JSON.parse(raw))}
 finally{signal?.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});try{reader.releaseLock()}catch{}}
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(value,check,name)=>{if(value!==undefined&&value!==null&&!check(value))throw new TypeError(`Invalid ${name}`)};
const seconds=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
function timing(item){optional(item.start,seconds,'start');optional(item.end,seconds,'end');if(item.start!=null&&item.end!=null&&item.end<item.start)throw new TypeError('Invalid timestamp order')}
export function decodeTranscription(value) {
 if(!object(value)||typeof value.text!=='string'||typeof value.language_code!=='string'||!Number.isFinite(value.language_probability)||value.language_probability<0||value.language_probability>1||!Array.isArray(value.words)||value.words.length>100000||value.transcripts!==undefined)throw new TypeError('Invalid single-channel transcription');
 const words=value.words.map(word=>{
  if(!object(word)||typeof word.text!=='string'||!['word','spacing','audio_event'].includes(word.type)||typeof word.logprob!=='number'||!Number.isFinite(word.logprob)||word.logprob>0)throw new TypeError('Invalid transcription word');
  timing(word);optional(word.speaker_id,v=>typeof v==='string','speaker_id');optional(word.channel_index,v=>Number.isInteger(v)&&v>=0&&v<5,'channel_index');
  const result={text:word.text,type:word.type,logprob:word.logprob};for(const key of ['start','end','speaker_id','channel_index'])if(word[key]!==undefined)result[key]=word[key];
  if(word.characters!==undefined){if(!Array.isArray(word.characters)||word.characters.length>10000)throw new TypeError('Invalid transcription characters');result.characters=word.characters.map(char=>{if(!object(char)||typeof char.text!=='string')throw new TypeError('Invalid transcription character');timing(char);return {text:char.text,...(char.start!==undefined?{start:char.start}:{}),...(char.end!==undefined?{end:char.end}:{})}})}
  return result;
 });
 optional(value.transcription_id,v=>typeof v==='string','transcription_id');optional(value.audio_duration_secs,seconds,'audio_duration_secs');optional(value.channel_index,v=>Number.isInteger(v)&&v>=0&&v<5,'channel_index');
 const result={text:value.text,language_code:value.language_code,language_probability:value.language_probability,words};for(const key of ['transcription_id','audio_duration_secs','channel_index'])if(value[key]!==undefined)result[key]=value[key];return result;
}
export const transcriptionCapabilities=Object.freeze({model:'scribe_v2',batchFileUpload:true,singleChannel:true,wordTimestamps:true,characterTimestamps:true,diarization:true,maxFileBytes:MAX_FILE_BYTES,sourceURL:false,webhooks:false,realtime:false,entityDetection:false,transcriptEditing:false,paidEndToEndVerified:false});
