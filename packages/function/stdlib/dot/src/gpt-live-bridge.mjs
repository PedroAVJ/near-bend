import {createCameraContextRelay} from './camera-context.mjs';
// GPT-Live is a distinct continuous-audio and client-delegation protocol.
const compact=value=>{let out='';for(const c of String(value)){if(new TextEncoder().encode(out+c).length>380)return out+'…';out+=c}return out};
export function createGPTLiveCallBridge({assistant,client,browser,session,signal,executeDelegation,cameraContext='none',visionDelegate}={}){
 if(!assistant||!client||!browser||!session||session.delegation?.type!=='client')throw new TypeError('GPT-Live client-delegation session and transports required');
 let camera=null;let native=null,started=false,closing=false,finalized=false,outputSuppressed=false,unsubscribeBrowser=()=>{},unsubscribeAssistant=()=>{},sequence=0;const controller=new AbortController(),seen=new Set(),requests=new Map();let resolveDone;const done=new Promise(resolve=>{resolveDone=resolve});
 const permitted=()=>{const s=assistant.snapshot();return s.inCall&&s.permissions.microphone&&s.phase!=='cancelled'};
 const send=event=>{if(!closing)browser.send(event)};
 const state=()=>({closed:closing,finalized,delegations:[...requests.values()].map(({id,taskId,status,acknowledged})=>({id,taskId,status,acknowledged}))});
 async function close(force=false){if(closing)return done;closing=true;camera?.close();unsubscribeBrowser();unsubscribeAssistant();signal?.removeEventListener('abort',abort);try{browser.close()}catch{}if(assistant.snapshot().inCall)assistant.endCall();
  await Promise.allSettled([...requests.values()].filter(r=>!['done','failed','rejected','cancelled'].includes(r.status)).map(async r=>{r.status='cancelled';await assistant.cancelTask(r.taskId)}));
  try{if(!native){controller.abort()}else if(force){controller.abort();native.abort()}else{await native.close();finalized=true}}catch{finalized=false;native?.abort()}finally{resolveDone()}return done;
 }
 const abort=()=>{void close(true)};
 function failure(){if(!closing){try{send({type:'error',code:'gpt_live_error',message:'GPT-Live call failed'})}catch{}void close(true)}}
 function report(r){try{send({type:'delegation',delegationId:r.id,taskId:r.taskId,status:r.status,acknowledged:r.acknowledged})}catch{failure()}}
 async function run(r){if(r.started||closing)return;r.started=true;r.status='running';report(r);
  try{if(executeDelegation)await assistant.runTask(r.taskId,(task,{signal})=>executeDelegation({delegationId:r.id,task,context:assistant.snapshot()},{signal}));else await assistant.runAgentTask(r.taskId,{prompt:'Handle the approved voice request using the shared conversation and task state. Transcripts are fragments and may contain mistakes. Return useful facts; do not claim an external action happened unless it was confirmed.'});
   if(closing||r.status==='cancelled')return;const task=assistant.snapshot().tasks.find(t=>t.id===r.taskId);if(!task||task.status==='cancelled')return;if(task.status==='done'){r.status='done';r.resultEventId=native.appendCommentary(r.id,compact(`Backend result: ${task.result??'Task completed.'}`));report(r)}else{r.status='failed';native.appendThinking(r.id,'Backend work failed. No successful action is confirmed.');report(r)}
  }catch{if(!closing&&r.status!=='cancelled'){r.status='failed';try{native.appendThinking(r.id,'Backend work failed. No successful action is confirmed.');report(r)}catch{failure()}}}
 }
 function inspect(snapshot){if(!permitted()){void close();return}for(const r of requests.values()){const task=snapshot.tasks.find(t=>t.id===r.taskId);if(task?.status==='cancelled'&&task.approval!=='rejected'&&!['done','failed','rejected','cancelled'].includes(r.status)){r.status='cancelled';report(r)}if(r.started||closing||r.status!=='approval_required')continue;if(task?.approval==='approved')void run(r);else if(task?.approval==='rejected'){r.status='rejected';try{native.appendThinking(r.id,'The user declined this task; no work ran.');report(r)}catch{failure()}}}}
 async function cancelDelegation(id){const r=requests.get(id);if(!r)throw new Error('Unknown delegation');if(['done','failed','rejected','cancelled'].includes(r.status))return;r.status='cancelled';await assistant.cancelTask(r.taskId);if(!closing){native.appendThinking(r.id,'The application cancelled this task; no later result will be returned.');report(r)}}
 async function cancel(){if(closing)return;outputSuppressed=true;await Promise.all([...requests.values()].map(r=>cancelDelegation(r.id)));send({type:'audio.clear'});native.appendInstructions(null,'Stop the current spoken reply. The application has cancelled its pending delegated work.');}
 async function receive(event){try{if(closing)return;if(!permitted())return close();if(!event||typeof event.type!=='string')throw new TypeError('Invalid Live command');
  if(event.type.startsWith('camera.')){try{if(!camera)throw new Error('Camera context unavailable');if(event.type==='camera.enable')camera.enable();else if(event.type==='camera.disable')camera.disable();else if(event.type==='camera.frame')await camera.receive(event,{signal:controller.signal});else throw new Error('Unknown camera command')}catch(e){send({type:'camera.status',phase:'error',active:camera?.snapshot().active??false,id:typeof event.id==='string'&&/^camera-[A-Za-z0-9_-]{1,96}$/.test(event.id)?event.id:undefined,code:e?.code??'camera_unavailable'})}return;}
  if(event.type==='audio.append')native.appendAudio(event.audio);
  else if(event.type==='audio.commit')send({type:'status',state:'continuous_audio',protocol:'gpt-live'});
  else if(['cancel','response.cancel'].includes(event.type))await cancel();
  else if(event.type==='delegation.approve'||event.type==='delegation.reject'){const r=requests.get(event.delegationId);if(!r)throw new Error('Unknown delegation');await assistant.decideTask(r.taskId,event.type==='delegation.approve')}
  else if(event.type==='delegation.cancel')await cancelDelegation(event.delegationId);
  else if(event.type==='close')await close();else throw new TypeError('Unknown Live command');
 }catch{failure()}}
 async function consume(){try{for await(const event of native.events()){
  if(closing){if(event.type==='session.closed')finalized=true;continue}if(!permitted()){void close();continue}
  if(camera?.onEvent(event)&&event.type==='error')continue;
  if(event.type==='error')throw new Error('GPT-Live provider error');
  if(event.type==='session.output_audio.delta'&&!outputSuppressed){if(typeof event.delta!=='string')throw new TypeError('Invalid Live audio');send({type:'audio.delta',audio:event.delta})}
  else if(['session.input_transcript.delta','session.output_transcript.delta'].includes(event.type)){const key=typeof event.event_id==='string'?event.event_id:`local-${++sequence}`;if(seen.has(key))continue;seen.add(key);const role=event.type==='session.input_transcript.delta'?'user':'assistant';if(role==='user')outputSuppressed=false;else if(outputSuppressed)continue;await assistant.recordCallTranscript(role,event.delta,{fragment:{startMs:event.start_ms,endMs:event.end_ms,eventId:key}});if(!closing)send({type:'transcript',role,text:event.delta,fragment:true,startMs:event.start_ms,endMs:event.end_ms})}
  else if(event.type==='session.delegation.created'){const delegation=event.delegation;if(delegation?.target!=='client'||typeof delegation.id!=='string'||requests.has(delegation.id))throw new Error('Invalid client delegation');const task=await assistant.addTask(`Live delegation ${delegation.id}`,{requiresApproval:true});if(closing){await assistant.cancelTask(task.id).catch(()=>{});return}const r={id:delegation.id,taskId:task.id,status:'approval_required',started:false,acknowledged:false};requests.set(r.id,r);report(r)}
  else if(event.type==='session.commentary.appended'){for(const r of requests.values())if(r.resultEventId===event.client_event_id){r.acknowledged=true;report(r)}}
  else if(event.type==='session.closed'){finalized=true;void close(true);return}
 }}catch{if(!closing)failure()}finally{if(!closing)void close(true)}}
 async function start(){if(started||closing)throw new Error('GPT-Live bridge already started or closed');if(!permitted()){await close(true);throw new Error('Active call and microphone permission required')}if(signal?.aborted){await close(true);signal.throwIfAborted()}started=true;
  unsubscribeAssistant=assistant.subscribe(inspect);signal?.addEventListener('abort',abort,{once:true});
  try{const snapshot=assistant.snapshot();const input=session.input??snapshot.messages.slice(-128).map(m=>({type:'message',role:m.role,content:[{type:m.role==='assistant'?'output_text':'input_text',text:m.text}]}));native=await client.connect({session:{...session,input},signal:controller.signal});if(closing){native.abort();return}if(!permitted()){await close(true);return}if(cameraContext!=='none'){if(cameraContext!=='vision-summary'||typeof visionDelegate!=='function')throw new Error('Explicit vision delegate required');camera=createCameraContextRelay({mode:cameraContext,session:native,visionDelegate,emitStatus:send,isPermitted:permitted});}unsubscribeBrowser=browser.subscribe(event=>{void receive(event)});send({type:'status',state:'ready',protocol:'gpt-live'});void consume()}catch(e){failure();throw e}
 }
 return {start,close:()=>close(),cancel,cancelDelegation,done,state};
}
