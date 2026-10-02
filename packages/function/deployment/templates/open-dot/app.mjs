import {renderAssistant,mountComposer,mountVoiceMessage} from '/browser.mjs';
let state,voice=null,vision=null,visionVoice=null,composer,callStarting=false;const players=new Map();let visionTimer,visionEpoch=0;const $=id=>document.getElementById(id);
const config=await fetch('/api/config').then(r=>r.json());
$('configuration').textContent=`Host provider: ${config.provider} · storage: ${config.storage} · ${config.liveAudio?`optional host ${config.voiceProtocol} audio`:'typed call transcripts'}`;
$('audio-controls').hidden=!config.liveAudio;$('mic-label').textContent=config.liveAudio?'Allow microphone call':'Allow simulated call';
if(config.voiceProtocol==='gptLive'){$('approve').textContent='Approve first task (agent work)';$('run-task').hidden=true}
$('commit-voice').hidden=config.voiceProtocol==='gptLive';$('cancel-voice').hidden=config.voiceProtocol==='gptLive';
$('persist').disabled=config.storage==='none';$('storage-label').textContent=` Allow ${config.storage} storage`;
function render(s){if(voice?.state==='active'&&(!s.inCall||!s.permissions.microphone))void voice.stop();state=s;for(const player of players.values())player.element.remove();$('session').innerHTML=renderAssistant(s);
 const present=new Set();for(const message of s.messages){if(message.kind==='audio'){present.add(message.id);let player=players.get(message.id);if(!player){const container=document.createElement('div');player=mountVoiceMessage(container,message,{onRetryTranscription:id=>action({action:'retryTranscription',id}),onCancelTranscription:id=>action({action:'cancelTranscription',id}),onError:e=>{$('error').textContent=e.message}});players.set(message.id,player)}else player.update(message);const target=[...$('session').querySelectorAll('[data-audio-id]')].find(node=>node.dataset.audioId===message.id);target?.append(player.element)}else if(message.media){const target=[...$('session').querySelectorAll('[data-media-id]')].find(node=>node.dataset.mediaId===message.id);if(target&&/^\/api\/assets\/[A-Za-z0-9_-]+$/.test(message.media.url)){const node=document.createElement(message.kind==='photo'?'img':message.kind==='video'?'video':'a');if(message.kind==='photo'){node.src=message.media.url;node.alt=message.media.name}else if(message.kind==='video'){node.src=message.media.url;node.controls=true;node.preload='metadata'}else{node.href=message.media.url;node.download=message.media.name;node.textContent='Download '+message.media.name}node.style.maxWidth='100%';node.style.display='block';if(message.kind!=='file'){node.style.maxHeight='480px';node.style.objectFit='contain'}target.append(node)}}}
 for(const [id,player]of players)if(!present.has(id)){player.dispose();players.delete(id)}
 if(composer&&s.inCall&&config.liveAudio&&['requesting','recording','stopping'].includes(composer.voice.state))void composer.voice.cancel();
 $('vision').disabled=!s.inCall||!config.liveAudio||config.cameraContext==='none';if(!s.inCall||!s.permissions.microphone)stopVision();$('call').textContent=s.inCall?'End call':config.liveAudio?'Start microphone call':'Start call';$('cancel').disabled=s.phase!=='running';$('mic').checked=s.permissions.microphone;$('persist').checked=s.permissions.persistence;window.openDotState=s}
async function action(body){const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error);render(result);return result}
window.openDot={snapshot:()=>structuredClone(state),action};
render(await fetch('/api/session').then(r=>r.json()));
const events=new EventSource('/api/events');events.onmessage=e=>render(JSON.parse(e.data));
const attempt=fn=>async event=>{event?.preventDefault();$('error').textContent='';try{await fn(event)}catch(e){$('error').textContent=e.message}};
$('mic').onchange=attempt(()=>action({action:'permission',permission:'microphone',allowed:$('mic').checked}));
$('persist').onchange=attempt(()=>action({action:'permission',permission:'persistence',allowed:$('persist').checked}));
$('call').onclick=attempt(async()=>{
 if(callStarting)throw Error('Call setup is already in progress');callStarting=true;$('call').disabled=true;try{
 if(state.inCall){stopVision();await voice?.stop();await action({action:'endCall'});return}
 if(!config.liveAudio){await action({action:'beginCall'});return}
 if(!state.permissions.microphone){await action({action:'beginCall'});return}
 const {BrowserVoiceSession}=await import('/media.mjs');
 voice=new BrowserVoiceSession({endpoint:'/api/audio',beforeConnect:()=>action({action:'beginCall'}),onEvent:event=>{if(event.type==='camera.status')vision?.onEvent(event);if(event.type==='state'&&event.state==='stopped'||event.type==='error')stopVision();if(event.type==='error')$('error').textContent=event.message;if(event.type==='state'||event.type==='status')$('audio-status').textContent=`Audio: ${event.state}`}});
 try{await voice.start()}catch(error){await voice.stop();await action({action:'endCall'});throw error}
 }finally{callStarting=false;$('call').disabled=false}
});
$('commit-voice').onclick=attempt(()=>voice?.commit());$('cancel-voice').onclick=attempt(()=>voice?.cancel());
window.addEventListener('pagehide',()=>{void voice?.stop();stopVision();void composer?.dispose();for(const player of players.values())player.dispose()});
$('cancel').onclick=attempt(()=>action({action:'cancel'}));$('clear').onclick=attempt(()=>action({action:'clear'}));$('restore').onclick=attempt(()=>action({action:'restore'}));
const encode=async blob=>{if(blob.size>8*1024*1024)throw Error('Attachment exceeds 8 MiB');const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text)};
composer=mountComposer($('composer'),{onText:text=>action({action:'send',text}),onVoiceMessage:async record=>action({action:'sendAudio',bytes:await encode(record.blob),mimeType:record.mimeType,durationMs:record.durationMs}),onAttachment:async({file,kind})=>action({action:'sendAttachment',bytes:await encode(file),mimeType:file.type||'application/octet-stream',name:file.name,kind}),onError:e=>{$('error').textContent=e.message}});
$('vision').title=config.cameraContext==='none'?'Camera context is not configured on this host':'Explicit camera snapshots shared with the active call';
$('task').onsubmit=attempt(async()=>{await action({action:'addTask',title:$('title').value,requiresApproval:$('approval').checked});$('title').value=''});
$('complete').onclick=attempt(()=>action({action:'completeTask',id:state.tasks.find(t=>!t.done)?.id}));
$('approve').onclick=attempt(()=>action({action:'decideTask',id:state.tasks.find(t=>t.approval==='pending')?.id,approved:true}));
$('reject').onclick=attempt(()=>action({action:'decideTask',id:state.tasks.find(t=>t.approval==='pending')?.id,approved:false}));
$('run-task').onclick=attempt(()=>action({action:'runTask',id:state.tasks.find(t=>!t.done&&t.approval!=='rejected')?.id}));

function stopVision(){++visionEpoch;clearTimeout(visionTimer);visionTimer=undefined;vision?.stop();$('camera-context-preview').hidden=true;$('vision').textContent='Camera context'}
$('vision').onclick=attempt(async()=>{
 if(vision?.snapshot().active){stopVision();return}
 if(voice?.state!=='active'||config.cameraContext==='none')throw Error('Camera context requires a configured active audio call');
 const {createCameraContext}=await import('/camera-context.mjs');
 if(!vision||visionVoice!==voice){visionVoice=voice;vision=createCameraContext({sendFrame:(frame,options)=>voice.sendCameraFrame(frame,options),sendControl:event=>event.type==='camera.enable'?voice.cameraEnable():voice.cameraDisable(),video:$('camera-context-preview'),inCall:()=>voice?.state==='active'&&state.inCall&&state.permissions.microphone,onStatus:s=>{const label=config.cameraContext==='vision-summary'?'Vision summary':'Image context';$('camera-context-preview').hidden=!s.active;$('vision').textContent=s.active?'Stop camera':'Camera context';$('camera-context-status').textContent=s.phase==='accepted'?`${label} accepted at ${new Date(s.capturedAtMs).toLocaleTimeString()} · snapshots every 2 seconds`:s.phase==='sent'?`${label} sent · waiting for context confirmation`:s.phase==='error'?`Camera context failed: ${s.code||'unknown'}`:s.active?'Camera sharing on · bounded snapshots':'Camera sharing off'}});}
 await vision.start({userGesture:true});const current=++visionEpoch;
 const sample=async()=>{if(current!==visionEpoch||!vision.snapshot().active)return;try{if(['ready','accepted','error'].includes(vision.snapshot().phase))await vision.captureFrame()}catch(error){if(current===visionEpoch)$('camera-context-status').textContent=`Camera context: ${error.code||'capture failed'}`}finally{if(current===visionEpoch&&vision.snapshot().active)visionTimer=setTimeout(sample,2000)}};
 void sample();
});
