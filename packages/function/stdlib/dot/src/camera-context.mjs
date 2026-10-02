import Vision from './generated/vision.mjs';
const tag=(name,fields={})=>({$:name,...fields});
const allowedModes=new Set(['realtime-images','vision-summary']);
const fail=code=>Object.assign(new Error(code),{code});
export const cameraLimits=Object.freeze({maxFrameBytes:262144,minIntervalMs:1000,maxWidth:640,maxHeight:480,maxPending:1,retainedFrames:0});
function imageBase64(value){if(!value.length||value.length%4)return false;let padding=0;for(let i=0;i<value.length;i++){const n=value.charCodeAt(i);if(n===61){if(++padding>2)return false;}else if(padding||!((n>=65&&n<=90)||(n>=97&&n<=122)||(n>=48&&n<=57)||n===43||n===47))return false;}return true;}
/** Validates a complete data URI; never fetches remote images or retains raw frames. */
export function validateCameraFrame(frame,{now=Date.now(),maxFrameBytes=cameraLimits.maxFrameBytes}={}){
 if(!frame||typeof frame.id!=='string'||!/^camera-[A-Za-z0-9_-]{1,96}$/.test(frame.id)||!Number.isSafeInteger(frame.capturedAtMs)||frame.capturedAtMs<0||Math.abs(now-frame.capturedAtMs)>30000)throw fail('camera_frame_metadata');
 if(typeof frame.dataURI!=='string'||frame.dataURI.length>Math.ceil(maxFrameBytes/3)*4+32)throw fail('camera_frame_size');
 const png=frame.dataURI.startsWith('data:image/png;base64,'),jpeg=frame.dataURI.startsWith('data:image/jpeg;base64,');if(!png&&!jpeg)throw fail('camera_frame_format');const payload=frame.dataURI.slice(png?22:23);if(!imageBase64(payload))throw fail('camera_frame_format');
 const bytes=atob(payload);if(!bytes.length||bytes.length>maxFrameBytes)throw fail('camera_frame_size');
 if(!bytes.startsWith(png?'\x89PNG\r\n\x1a\n':'\xff\xd8\xff'))throw fail('camera_frame_signature');
 return {id:frame.id,capturedAtMs:frame.capturedAtMs,byteLength:bytes.length,mime:png?'image/png':'image/jpeg'};
}
function bounded(promise,controller,timeoutMs=5000){return new Promise((resolve,reject)=>{const aborted=()=>finish(reject,fail('camera_cancelled'));const timer=setTimeout(()=>{controller.abort();finish(reject,fail('camera_timeout'))},timeoutMs);function finish(fn,value){clearTimeout(timer);controller.signal.removeEventListener('abort',aborted);fn(value)}controller.signal.addEventListener('abort',aborted,{once:true});if(controller.signal.aborted)aborted();Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error))})}
function publicState(s){return Object.freeze({phase:Vision.status(s),active:s.active,id:s.latest_id||undefined,capturedAtMs:Number(s.captured_at_ms),eventId:s.provider_event_id||undefined,code:s.failure_code||undefined})}
function metadata(frame,bytes){return tag('Metadata',{id:frame.id,captured_at_ms:BigInt(frame.capturedAtMs),byte_length:bytes})}
async function captureDefault(video,{canvas,maxWidth,maxHeight}){
 if(!video.videoWidth||!video.videoHeight)throw fail('camera_not_ready');
 const ratio=Math.min(1,maxWidth/video.videoWidth,maxHeight/video.videoHeight);canvas.width=Math.max(1,Math.floor(video.videoWidth*ratio));canvas.height=Math.max(1,Math.floor(video.videoHeight*ratio));
 const context=canvas.getContext('2d');if(!context)throw fail('camera_canvas_unavailable');context.drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.65);
}
/** Device IO is injected in tests; native Bend exclusively owns permission/context state. */
export function createCameraContext({sendFrame,sendControl=()=>{},mediaDevices,video,canvas,capture=captureDefault,now=Date.now,inCall=()=>true,onStatus=()=>{},maxFrameBytes=cameraLimits.maxFrameBytes,minIntervalMs=cameraLimits.minIntervalMs,ackTimeoutMs=5000}={}){
 if(typeof sendFrame!=='function'||!Number.isInteger(maxFrameBytes)||maxFrameBytes<1||maxFrameBytes>cameraLimits.maxFrameBytes||!Number.isInteger(minIntervalMs)||minIntervalMs<cameraLimits.minIntervalMs||!Number.isInteger(ackTimeoutMs)||ackTimeoutMs<1||ackTimeoutMs>5000)throw new TypeError('Bounded camera transport required');
 let state=Vision.initial(),stream=null,currentVideo=video,currentCanvas=canvas,epoch=0,sequence=0,lastAttempt=-Infinity,pendingController=null,startPromise=null,earlyAcceptance=null,ackTimer=null,trackListeners=[];
 const dispatch=event=>{state=Vision.reduce(event,state);const snapshot=publicState(state);onStatus(snapshot);return snapshot};
 const clearAck=()=>{clearTimeout(ackTimer);ackTimer=null};
 const stopTracks=s=>{for(const track of s?.getTracks?.()??[])track.stop()};
 function stop(){clearAck();for(const [track,handler] of trackListeners)track.removeEventListener?.('ended',handler);trackListeners=[];epoch++;pendingController?.abort();pendingController=null;earlyAcceptance=null;stopTracks(stream);stream=null;if(currentVideo)currentVideo.srcObject=null;try{Promise.resolve(sendControl({type:'camera.disable'})).catch(()=>{})}catch{}return dispatch(tag('Stop'));}
 async function start({userGesture=false}={}){
  if(userGesture!==true)throw fail('camera_user_gesture');if(!inCall())throw fail('camera_call_required');if(state.active)return publicState(state);if(startPromise)throw fail('camera_start_pending');
  const token=++epoch;dispatch(tag('BeginCall'));dispatch(tag('Consent'));dispatch(tag('StartRequested'));
  startPromise=(async()=>{let requested=null;try{
   const devices=mediaDevices??globalThis.navigator?.mediaDevices;if(!devices?.getUserMedia)throw fail('camera_unavailable');
   requested=await devices.getUserMedia({audio:false,video:{width:{ideal:640,max:640},height:{ideal:480,max:480},frameRate:{ideal:1,max:5}}});
   if(token!==epoch||!inCall()){stopTracks(requested);return publicState(state)}
   currentVideo??=globalThis.document?.createElement('video');currentCanvas??=globalThis.document?.createElement('canvas');if(!currentVideo||!currentCanvas)throw fail('camera_surface_unavailable');
   stream=requested;for(const track of stream.getTracks?.()??[]){const ended=()=>stop();track.addEventListener?.('ended',ended,{once:true});trackListeners.push([track,ended])}currentVideo.muted=true;currentVideo.playsInline=true;currentVideo.srcObject=stream;await currentVideo.play?.();
   if(token!==epoch||!inCall()){stopTracks(requested);if(stream===requested)stream=null;return publicState(state)}
   dispatch(tag('CameraStarted'));await sendControl({type:'camera.enable'});return publicState(state);
  }catch(error){for(const [track,handler] of trackListeners)track.removeEventListener?.('ended',handler);trackListeners=[];stopTracks(requested);if(token===epoch){stream=null;if(currentVideo)currentVideo.srcObject=null;dispatch(tag('Failed',{code:error?.name==='NotAllowedError'?'camera_permission_denied':error?.code??'camera_start_failed'}))}throw error}finally{startPromise=null}})();return startPromise;
 }
 async function captureFrame(){
  if(!inCall()){stop();throw fail('camera_call_required')}if(pendingController)throw fail('camera_pending');if(!Vision.can_queue(state))throw fail('camera_not_ready');const at=now();if(at-lastAttempt<minIntervalMs)throw fail('camera_rate_limit');lastAttempt=at;
  const token=epoch,controller=new AbortController();pendingController=controller;
  const id=`camera-${++sequence}`;let dataURI;
  try{dataURI=await bounded(capture(currentVideo,{canvas:currentCanvas,maxWidth:640,maxHeight:480,signal:controller.signal}),controller);if(token!==epoch||!state.active)throw fail('camera_stopped');
   const frame={id,dataURI,capturedAtMs:at},info=validateCameraFrame(frame,{now:now(),maxFrameBytes});dispatch(tag('Queue',{metadata:metadata(frame,info.byteLength)}));
   const receipt=await bounded(sendFrame({type:'camera.frame',...frame},{signal:controller.signal}),controller);dataURI=undefined;if(token!==epoch||!state.active)return publicState(state);
   if(!receipt||!['sent','accepted'].includes(receipt.status)||typeof receipt.eventId!=='string')throw fail('camera_receipt');dispatch(tag('Submitted',{id,event_id:receipt.eventId}));if(receipt.status==='accepted'||earlyAcceptance?.id===id&&earlyAcceptance.eventId===receipt.eventId)dispatch(tag('Acknowledged',{id,event_id:receipt.eventId}));earlyAcceptance=null;clearAck();if(Vision.status(state)==='sent'){ackTimer=setTimeout(()=>{ackTimer=null;if(token===epoch&&state.active&&state.latest_id===id&&Vision.status(state)==='sent')dispatch(tag('Failed',{code:'camera_ack_timeout'}))},ackTimeoutMs)}return publicState(state);
  }catch(error){dataURI=undefined;if(token===epoch&&state.active){clearAck();dispatch(tag('Failed',{code:error?.code??'camera_frame_failed'}))}throw error}finally{if(pendingController===controller)pendingController=null}
 }
 function onEvent(event){if(event?.type!=='camera.status'||!state.active)return publicState(state);
  if(event.phase==='accepted'){
   if(Vision.status(state)==='pending'&&state.latest_id===event.id)earlyAcceptance={id:event.id,eventId:event.eventId};
   else if(state.latest_id===event.id&&state.provider_event_id===event.eventId){clearAck();dispatch(tag('Acknowledged',{id:event.id,event_id:event.eventId}));}
  }else if(event.phase==='error'){
   if(typeof event.id==='string'&&state.latest_id===event.id){clearAck();dispatch(tag('Rejected',{id:event.id,code:event.code??'camera_context_error'}));}
   else if(event.id===undefined){clearAck();dispatch(tag('Failed',{code:event.code??'camera_context_error'}));}
  }
  return publicState(state);
 }
 return Object.freeze({start,stop,captureFrame,onEvent,snapshot:()=>publicState(state)});
}
/** Server-only logical relay. GPT-Live requires explicitly injected backend vision. */
export function createCameraContextRelay({mode,session,visionDelegate,emitStatus=()=>{},now=Date.now,isPermitted=()=>true,ackTimeoutMs=5000}={}){
 if(!Number.isInteger(ackTimeoutMs)||ackTimeoutMs<1||ackTimeoutMs>5000)throw new TypeError('Bounded camera acknowledgment timeout required');
 if(!allowedModes.has(mode)||!session||mode==='realtime-images'&&typeof session.appendImage!=='function'||mode==='vision-summary'&&(typeof visionDelegate!=='function'||typeof session.appendInstructions!=='function'))throw new TypeError('Explicit supported camera context mode required');
 let state=Vision.initial(),enabled=false,closed=false,generation=0,pending=null,abort=null,lastAttempt=-Infinity,ackTimer=null;const used=new Set();
 const dispatch=event=>{state=Vision.reduce(event,state);const s=publicState(state);emitStatus({type:'camera.status',...s});return s};
 const clearAck=()=>{clearTimeout(ackTimer);ackTimer=null};
 function disable(){clearAck();enabled=false;generation++;abort?.abort();abort=null;pending=null;return dispatch(tag('Stop'))}
 function enable(){if(closed||!isPermitted())throw fail('camera_call_required');enabled=true;dispatch(tag('BeginCall'));dispatch(tag('Consent'));dispatch(tag('StartRequested'));return dispatch(tag('CameraStarted'))}
 async function receive(frame,{signal}={}){
  if(closed||!enabled||!isPermitted())throw fail('camera_not_enabled');if(pending||!Vision.can_queue(state))throw fail('camera_pending');if(used.size>=1024)throw fail('camera_session_limit');
  const at=now();if(at-lastAttempt<1000)throw fail('camera_rate_limit');lastAttempt=at;const info=validateCameraFrame(frame,{now:at});if(used.has(info.id))throw fail('camera_duplicate_frame');used.add(info.id);
  const token=generation,controller=new AbortController();abort=controller;const aborted=()=>controller.abort(signal?.reason);signal?.addEventListener('abort',aborted,{once:true});if(signal?.aborted)aborted();
  dispatch(tag('Queue',{metadata:metadata(frame,info.byteLength)}));const eventId=`context-${info.id}`,itemId=`image-${info.id}`;pending={id:info.id,eventId,itemId,acknowledged:false};
  try{if(controller.signal.aborted)throw fail('camera_cancelled');if(mode==='realtime-images'){session.appendImage(frame.dataURI,{eventId,itemId})}
   else{const summary=await bounded(visionDelegate({id:info.id,dataURI:frame.dataURI,capturedAtMs:info.capturedAtMs},{signal:controller.signal}),controller);if(controller.signal.aborted||token!==generation||closed||!enabled)throw fail('camera_cancelled');if(typeof summary!=='string'||!summary.trim()||new TextEncoder().encode(summary).length>1200)throw fail('camera_summary_limit');session.appendInstructions(null,`Camera snapshot findings (${info.capturedAtMs}ms): ${summary}`,{eventId})}
   if(token!==generation||closed||!enabled)throw fail('camera_cancelled');if(!pending)throw fail('camera_provider_rejected');dispatch(tag('Submitted',{id:info.id,event_id:eventId}));if(pending?.acknowledged){pending=null;dispatch(tag('Acknowledged',{id:info.id,event_id:eventId}))}else{const p=pending;clearAck();ackTimer=setTimeout(()=>{ackTimer=null;if(pending===p&&token===generation&&enabled&&!closed){pending=null;dispatch(tag('Rejected',{id:p.id,code:'camera_ack_timeout'}))}},ackTimeoutMs)}return {status:'sent',id:info.id,eventId};
  }catch(error){if(token===generation&&enabled){clearAck();pending=null;dispatch(tag('Rejected',{id:info.id,code:error?.code??'camera_context_failed'}))}throw error}finally{signal?.removeEventListener('abort',aborted);if(abort===controller)abort=null}
 }
 function onEvent(event){const errorId=event?.type==='error'?(event.error?.event_id??event.error?.client_event_id):undefined;const cameraError=typeof errorId==='string'&&errorId.startsWith('context-')&&used.has(errorId.slice(8));if(!enabled||closed||!pending)return cameraError;const p=pending;
  const accepted=mode==='realtime-images'?event?.type==='conversation.item.created'&&event.item?.id===p.itemId:event?.type==='session.instructions.appended'&&event.client_event_id===p.eventId;
  if(accepted){if(Vision.status(state)==='pending')p.acknowledged=true;else{clearAck();pending=null;dispatch(tag('Acknowledged',{id:p.id,event_id:p.eventId}))}return true;}
  else if(event?.type==='error'&&(event.error?.event_id===p.eventId||event.error?.client_event_id===p.eventId)){clearAck();pending=null;dispatch(tag('Rejected',{id:p.id,code:'camera_provider_rejected'}));return true;}
  return cameraError;
 }
 return Object.freeze({enable,disable,receive,onEvent,close(){if(closed)return;disable();closed=true;used.clear()},snapshot:()=>publicState(state)});
}
