import {createCameraContextRelay} from './camera-context.mjs';
/** Native OpenAI Realtime bridge. Client/auth stay server-side; no text-agent calls are made. */
export function createRealtimeCallBridge({assistant,client,browser,session={},signal,cameraContext='none',visionDelegate}={}){
 if(!assistant||!client||!browser||typeof browser.subscribe!=='function')throw new TypeError('Assistant, realtime client and browser transport required');
 let camera=null;let native=null,started=false,closed=false,currentResponse=null,awaitingResponse=false,cancelNextResponse=false,unsubscribeBrowser=()=>{},unsubscribeAssistant=()=>{};const abort=new AbortController(),seen=new Set(),cancelled=new Set();let resolveDone;const done=new Promise(resolve=>{resolveDone=resolve});
 const permitted=()=>{const s=assistant.snapshot();return s.inCall&&s.permissions.microphone&&s.phase!=='cancelled'};
 const send=event=>{if(!closed)browser.send(event)};
 const cleanup=()=>{if(closed)return;closed=true;camera?.close();abort.abort();unsubscribeBrowser();unsubscribeAssistant();signal?.removeEventListener('abort',cleanup);try{native?.close()}catch{}try{browser.close()}catch{}if(assistant.snapshot().inCall)assistant.endCall();resolveDone()};
 const error=e=>{if(!closed){try{send({type:'error',code:['provider_error','connect_error','connect_timeout','transport_error','protocol_error','session_mismatch','not_ready','send_error','protocol_gap','consumer_overflow','disconnected'].includes(e?.code)?e.code:'call_error',message:'Realtime call failed'})}catch{}finally{cleanup()}}};
 const cancelledOutput=event=>cancelled.has(event.response_id??currentResponse);
 async function transcript(role,text,key){if(closed||!permitted()||seen.has(key)||typeof text!=='string'||!text.trim())return;seen.add(key);await assistant.recordCallTranscript(role,text);if(!closed&&permitted())send({type:'transcript',role,text})}
 function cancel(){if(closed||!native)return;try{if(currentResponse){cancelled.add(currentResponse);native.cancelResponse(currentResponse)}else if(awaitingResponse)cancelNextResponse=true;native.clearAudio();send({type:'audio.clear'})}catch(e){error(e)}}
 async function receive(event){try{if(closed)return;if(!permitted())return cleanup();if(!event||typeof event.type!=='string')throw new TypeError('Invalid browser audio command');
  if(event.type.startsWith('camera.')){try{if(!camera)throw new Error('Camera context unavailable');if(event.type==='camera.enable')camera.enable();else if(event.type==='camera.disable')camera.disable();else if(event.type==='camera.frame')await camera.receive(event,{signal:abort.signal});else throw new Error('Unknown camera command')}catch(e){send({type:'camera.status',phase:'error',active:camera?.snapshot().active??false,id:typeof event.id==='string'&&/^camera-[A-Za-z0-9_-]{1,96}$/.test(event.id)?event.id:undefined,code:e?.code??'camera_unavailable'})}return;}
  if(event.type==='audio.append')native.appendAudio(event.audio);
  else if(event.type==='audio.commit'){native.commitAudio();awaitingResponse=true;cancelNextResponse=false;native.createResponse({output_modalities:['audio']})}
  else if(event.type==='response.cancel'||event.type==='cancel')cancel();
  else if(event.type==='close')cleanup();else throw new TypeError('Unknown browser audio command');
 }catch(e){error(e)}}
 async function consume(){try{for await(const event of native.events()){
  if(closed||!permitted())break;
  if(camera?.onEvent(event)&&event.type==='error')continue;
  if(event.type==='error')throw Object.assign(new Error('Realtime provider error'),{code:'provider_error'});
  if(event.type==='response.created'){currentResponse=event.response?.id??null;awaitingResponse=false;if(cancelNextResponse&&currentResponse){cancelled.add(currentResponse);native.cancelResponse(currentResponse);cancelNextResponse=false}}
  else if(event.type==='response.output_audio.delta'&&!cancelledOutput(event)){if(typeof event.delta!=='string')throw new TypeError('Invalid output audio frame');send({type:'audio.delta',audio:event.delta})}
  else if(event.type==='conversation.item.input_audio_transcription.completed')await transcript('user',event.transcript,`user:${event.item_id??event.event_id}`);
  else if(['response.output_audio_transcript.done','response.output_text.done'].includes(event.type)&&!cancelledOutput(event))await transcript('assistant',event.transcript??event.text,`assistant:${event.item_id??event.response_id??event.event_id}:${event.content_index??0}`);
  else if(event.type==='conversation.item.input_audio_transcription.failed')throw new Error('Input audio transcription failed');
  else if(event.type==='response.done'){if(['failed','incomplete'].includes(event.response?.status))throw new Error('Realtime response failed');if(currentResponse===event.response?.id)currentResponse=null}
 }}catch(e){if(!closed)error(e)}finally{cleanup()}}
 async function start(){if(started)throw new Error('Realtime bridge already started');if(closed)throw new Error('Realtime bridge closed');if(!permitted()){cleanup();throw new Error('Active call and microphone permission required')}if(signal?.aborted){cleanup();signal.throwIfAborted()}started=true;
  unsubscribeAssistant=assistant.subscribe(()=>{if(!permitted())cleanup()});signal?.addEventListener('abort',cleanup,{once:true});
  try{native=await client.connect({signal:abort.signal});if(closed){native.close();return}if(!permitted()){cleanup();return}native.configure({output_modalities:['audio'],...session,audio:{...session.audio,input:{format:{type:'audio/pcm',rate:24000},turn_detection:null,...session.audio?.input},output:{format:{type:'audio/pcm',rate:24000},...session.audio?.output}}});if(cameraContext!=='none'){if(cameraContext!=='realtime-images'||!native.capabilities?.imageInput)throw new Error('Image-capable Realtime session required');camera=createCameraContextRelay({mode:cameraContext,session:native,emitStatus:send,isPermitted:permitted});}unsubscribeBrowser=browser.subscribe(event=>{void receive(event)});send({type:'status',state:'ready'});void consume()}catch(e){error(e);throw e}
 }
 return {start,close:cleanup,cancel,done};
}
