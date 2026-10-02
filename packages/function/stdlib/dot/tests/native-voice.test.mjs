// Root builds native.mjs serially after AI voice source is stable. This file
// injects runtime strings/data and deliberately does not launch a compiler.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import native from '../src/generated/native.mjs';
const tag=v=>v.$.split('.').at(-1);
const payload=v=>Object.entries(v).find(([key])=>key!=='$')?.[1];
const done=v=>{assert.equal(tag(v),'Done');return payload(v)};
const wire=event=>JSON.stringify(event);
const session=()=>native.begin_call(native.microphone_permission(true,native.session_initial()));
const input=wire({type:'conversation.item.input_audio_transcription.completed',item_id:'input-1',transcript:'spoken input'});
const output=wire({type:'response.output_audio_transcript.done',response_id:'response-1',transcript:'spoken output'});
const fragment=wire({type:'session.input_transcript.delta',delta:' exact fragment ',start_ms:1,end_ms:10});
const delegation=wire({type:'session.delegation.created',delegation:{id:'delegation-1',target:'client'},offset_ms:10});

test('compiled native Realtime codec writes real transcript records into shared Dot history',()=>{
 let h=done(native.realtime_wire(input,'message-1',session(),native.history_initial()));
 h=done(native.realtime_wire(output,'message-2',session(),h));
 assert.equal(h.messages.head.text,'spoken input');assert.equal(tag(h.messages.head.role),'UserMessage');
 assert.equal(h.messages.tail.head.text,'spoken output');assert.equal(tag(h.messages.tail.head.status),'CompleteMessage');
});
test('compiled native voice history requires consent, active call and uncancelled session',()=>{
 for(const s of [native.session_initial(),native.microphone_permission(true,native.session_initial()),native.end_call(session()),native.cancel_call(session()),native.microphone_permission(false,session())]){
  assert.equal(tag(done(native.realtime_wire(input,'message-1',s,native.history_initial())).messages),'Nil');
  assert.equal(tag(done(native.live_wire(delegation,'task-1',s,native.history_initial())).tasks),'Nil');
 }
});
test('compiled GPT-Live fragments preserve exact text and typed timestamps without fabricated turns',()=>{
 const h=done(native.live_wire(fragment,'message-1',session(),native.history_initial()));
 assert.equal(h.messages.head.text,' exact fragment ');assert.equal(tag(h.messages.head.status),'FragmentMessage');
 const optional=done(native.live_fragment_wire(fragment,'message-1'));assert.equal(tag(optional),'Some');
 const recorded=payload(optional);assert.equal(recorded.start_ms,1);assert.equal(recorded.end_ms,10);assert.equal(recorded.message.text,' exact fragment ');
 const second=wire({type:'session.output_transcript.delta',delta:'repeat ',start_ms:11,end_ms:20});
 const h2=done(native.live_wire(second,'message-2',session(),h));assert.equal(h2.messages.tail.head.text,'repeat ');
});
test('compiled native delegation produces metadata-only approval task and blocks unapproved work',()=>{
 const h=done(native.live_wire(delegation,'task-1',session(),native.history_initial()));
 assert.equal(h.tasks.head.title,'Live delegation delegation-1');assert.equal(tag(h.tasks.head.approval),'AwaitingApproval');
 assert.equal(tag(native.task_start('task-1',h).tasks.head.status),'TaskReady');
 const running=native.task_start('task-1',native.task_decision('task-1',true,h));assert.equal(tag(running.tasks.head.status),'TaskRunning');
 const result=native.task_result('task-1','injected verified facts',running);assert.equal(result.tasks.head.result,'injected verified facts');assert.equal(tag(result.tasks.head.status),'TaskDone');
});
test('compiled rejected/cancelled native delegation cannot accept a late successful result',()=>{
 const h=done(native.live_wire(delegation,'task-1',session(),native.history_initial()));
 assert.equal(tag(native.task_start('task-1',native.task_decision('task-1',false,h)).tasks.head.approval),'ExecutionRejected');
 const cancelled=native.task_cancel('task-1',native.task_start('task-1',native.task_decision('task-1',true,h)));
 const late=native.task_result('task-1','late',cancelled);assert.equal(tag(late.tasks.head.status),'TaskCancelled');assert.equal(late.tasks.head.result,'');
});
test('compiled native malformed wire frames return typed failures rather than records',()=>{
 for(const method of ['realtime_wire','live_wire'])assert.equal(tag(native[method]('{broken','message-1',session(),native.history_initial())),'Fail');
 assert.equal(tag(done(native.live_wire(wire({type:'session.input_transcript.delta',delta:'wrong',start_ms:10,end_ms:1}),'message-1',session(),native.history_initial())).messages),'Nil');
});
