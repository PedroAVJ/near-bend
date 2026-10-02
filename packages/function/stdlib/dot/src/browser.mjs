import {createRenderer} from 'near-function/browser';
const renderer=createRenderer({});
const text=(kind,value)=>({$:'components.Text',kind,value});
const mediaText=m=>m.kind==='audio'?'Voice message':m.kind==='photo'?`Photo${m.media?.name?`: ${m.media.name}`:''}`:m.kind==='video'?`Video${m.media?.name?`: ${m.media.name}`:''}`:m.kind==='file'?`File${m.media?.name?`: ${m.media.name}`:''}`:m.text;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=items=>items.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
export function assistantView(snapshot){return {$:'components.Group',kind:'assistant-continuity',children:list([text('save-status',`Session ${snapshot.id} · ${snapshot.phase} · ${snapshot.inCall?'call active':'chat'}`),...snapshot.messages.map(m=>({$:'components.Bubble',id:m.id,role:m.role==='user'?'you':'near',text:`${m.source}: ${mediaText(m)}${m.status==='cancelled'?' (cancelled)':''}`})),...snapshot.tasks.map(t=>text('task',`${t.done?'✓':'○'} ${t.title} · ${t.status} · ${t.approval}`)),...(snapshot.error?[text('error',snapshot.error)]:[])])};}
export function renderAssistant(snapshot){let html=renderer(assistantView(snapshot));for(const message of snapshot.messages){if(!['audio','photo','video','file'].includes(message.kind))continue;const marker=`data-key="message-${escape(message.id)}"`;html=html.replace(marker,`${marker} data-${message.kind==='audio'?'audio':'media'}-id="${escape(message.id)}" data-media-kind="${message.kind}"`)}return html}
export {createVoiceRecorder,mountVoiceMessage,VoiceMessageError} from './voice-message.mjs';
export {mountComposer,createCameraAttachmentCapture} from './composer.mjs';
