/** Browser audio-message capture. Construction never asks for device access. */
export class VoiceMessageError extends Error {constructor(code,message){super(message);this.name='VoiceMessageError';this.code=code}}
const failure=(code,message)=>new VoiceMessageError(code,message);
export function createVoiceRecorder(options={}){
 const {mediaDevices=globalThis.navigator?.mediaDevices,MediaRecorder:Recorder=globalThis.MediaRecorder,now=()=>performance.now(),onState=()=>{},maxBytes=8*1024*1024,maxDurationMs=120000}=options;
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isFinite(maxDurationMs)||maxDurationMs<=0)throw TypeError('Positive recording limits required');
 let state='idle',pending=false,epoch=0,stream,recorder,chunks=[],size=0,started=0,timer,finish;
 const notify=next=>{state=next;try{onState(next)}catch{}};
 const cleanup=()=>{clearTimeout(timer);timer=undefined;if(recorder){recorder.ondataavailable=recorder.onstop=recorder.onerror=null;if(recorder.state!=='inactive')try{recorder.stop()}catch{}}for(const track of stream?.getTracks()??[])try{track.stop()}catch{}stream=recorder=undefined;chunks=[];size=0};
 const reject=error=>{const settle=finish;finish=undefined;++epoch;notify('failed');cleanup();settle?.reject(error);try{options.onError?.(error)}catch{}};
 const result=()=>{const mimeType=recorder?.mimeType||chunks.find(chunk=>chunk.type)?.type||'audio/webm',durationMs=Math.min(maxDurationMs,Math.max(0,Math.round(now()-started)));return{blob:new Blob(chunks,{type:mimeType}),mimeType,durationMs}};
 async function start(){
  if(pending||['requesting','recording','stopping'].includes(state))throw failure('already_recording','A recording is already active');
  if(!mediaDevices?.getUserMedia||typeof Recorder!=='function')throw failure('unavailable','Audio recording is unavailable in this browser');
  pending=true;const current=++epoch;notify('requesting');
  try{const acquired=await mediaDevices.getUserMedia({audio:true,video:false});if(current!==epoch){for(const track of acquired.getTracks())track.stop();throw failure('cancelled','Recording was cancelled')}stream=acquired;
   const mimeType=(options.mimeTypes??['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4']).find(type=>Recorder.isTypeSupported?.(type));recorder=new Recorder(stream,mimeType?{mimeType}:{});chunks=[];size=0;started=now();
   recorder.ondataavailable=event=>{if(current!==epoch||!event.data?.size)return;size+=event.data.size;if(size>maxBytes){reject(failure('recording_limit','Recording exceeds the audio message size limit'));return}chunks.push(event.data)};
   recorder.onerror=()=>{if(current===epoch)reject(failure('recording_failed','Audio recording failed'))};
   recorder.onstop=()=>{if(current!==epoch)return;const captured=result(),settle=finish;finish=undefined;notify('stopped');cleanup();if(!captured.blob.size){settle?.reject(failure('empty_recording','No audio was recorded'));return}settle?.resolve(captured)};
   recorder.start(250);notify('recording');timer=setTimeout(()=>{if(current===epoch&&state==='recording')void stop().then(captured=>{try{options.onLimit?.(captured)}catch{}},()=>{})},maxDurationMs);return api;
  }catch(error){if(current===epoch){notify('failed');cleanup()}throw error instanceof VoiceMessageError?error:failure('capture_failed','Microphone access was denied or recording could not start')}
  finally{pending=false}
 }
 function stop(){if(state!=='recording')return Promise.reject(failure('not_recording','No recording is active'));notify('stopping');clearTimeout(timer);const stoppingEpoch=epoch;return new Promise((resolve,rejectStop)=>{finish={resolve,reject:rejectStop};timer=setTimeout(()=>{if(stoppingEpoch===epoch)reject(failure('recording_timeout','Audio recording could not finish'))},5000);try{recorder.stop()}catch{reject(failure('recording_failed','Audio recording could not finish'))}})}
 async function cancel(){++epoch;const settle=finish;finish=undefined;notify('cancelled');cleanup();settle?.reject(failure('cancelled','Recording was cancelled'))}
 const api={start,stop,cancel,dispose:cancel,get state(){return state}};return api;
}

/** Attach persisted audio using native playback controls; transcript stays collapsed. */
export function mountVoiceMessage(container,message,{document=container.ownerDocument,URL:urls=globalThis.URL,onRetryTranscription,onCancelTranscription,onError=()=>{}}={}){
 let objectURL,disposed=false,current=message;
 const root=document.createElement('div');root.className='dot-voice-message';
 const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.setAttribute('aria-label','Play voice message');
 const details=document.createElement('details');details.className='dot-transcript';const summary=document.createElement('summary');summary.textContent='Transcript';const transcript=document.createElement('div');transcript.className='dot-transcript-content';transcript.setAttribute('aria-live','polite');
 const provenance=document.createElement('div');provenance.className='dot-transcript-provenance';const actions=document.createElement('div');actions.className='dot-transcript-actions';details.append(summary,transcript,actions,provenance);const playbackError=document.createElement('div');playbackError.className='dot-playback-error';playbackError.setAttribute('role','alert');playbackError.hidden=true;root.append(audio,details,playbackError);container.append(root);
 audio.onerror=()=>{if(disposed)return;playbackError.textContent='This audio could not be played. The original voice message is still saved.';playbackError.hidden=false};audio.onplaying=()=>{if(disposed)return;playbackError.textContent='';playbackError.hidden=true};
 const release=()=>{playbackError.textContent='';playbackError.hidden=true;try{audio.pause?.()}catch{}audio.removeAttribute('src');try{audio.load?.()}catch{}if(objectURL){urls.revokeObjectURL(objectURL);objectURL=undefined}};
 const invoke=callback=>async()=>{if(!callback)return;for(const button of actions.children)button.disabled=true;try{const next=await callback(current.id);if(next&&!disposed)update(next)}catch(error){try{onError(error)}catch{}}finally{if(!disposed)for(const button of actions.children)button.disabled=false}};
 function update(next){if(disposed)return;current=next;const asset=next.audio??next.asset??next.media,source=next.blob??asset?.url;
  if(source instanceof Blob){release();objectURL=urls.createObjectURL(source);audio.src=objectURL}else if(typeof source==='string'&&audio.getAttribute('src')!==source){release();audio.src=source}else if(source==null)release();
  const value=next.transcription??{status:'pending'};summary.textContent=['pending','running'].includes(value.status)?'Transcript · transcribing':value.status==='failed'?'Transcript · unavailable':value.status==='cancelled'?'Transcript · cancelled':'Transcript';
  transcript.textContent=['ready','complete'].includes(value.status)?value.text??'':['pending','running'].includes(value.status)?'Transcribing automatically…':value.status==='failed'?'Transcription failed. The audio message is still available.':'Transcription was cancelled. The audio message is still available.';
  provenance.textContent=value.provider?`Transcribed by ${value.provider}${value.model?` · ${value.model}`:''}`:'';actions.replaceChildren();const add=(label,callback,disabled=false)=>{if(!callback)return;const button=document.createElement('button');button.type='button';button.className='dot-transcript-action';button.textContent=label;button.disabled=disabled;button.onclick=invoke(callback);actions.append(button)};
  if(['pending','running'].includes(value.status)&&!value.retryRequired)add('Cancel transcription',onCancelTranscription);if((['failed','cancelled'].includes(value.status)||value.retryRequired))add((value.attempt??0)>=3?'Retry limit reached':'Retry transcription',onRetryTranscription,(value.attempt??0)>=3);
 }
 update(message);return{element:root,audio,update,dispose(){if(disposed)return;disposed=true;audio.onerror=audio.onplaying=null;release();root.remove()}};
}
