// Protocol fixtures inject raw frames into compiled Bend; JS performs no decoding/state work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../../../../..');
const temp=mkdtempSync(join(tmpdir(),'near-function-native-voice-'));
process.on('exit',()=>rmSync(temp,{recursive:true,force:true}));
const source=join(root,'packages/function/stdlib/ai/bend/voice.bend'),out=join(temp,'voice.mjs');
const compile=spawnSync('bun',[join(root,'tools/bend/main.ts'),source,'-o',out],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,env:{...process.env,BEND_NO_TELEMETRY:'1'}});
assert.equal(compile.error,undefined,compile.error?.message);
assert.equal(compile.status,0,compile.stdout+compile.stderr);
const V=(await import(pathToFileURL(out))).default;
const tag=(name,fields={})=>({$:name,...fields});
const kind=value=>value.$.split('.').at(-1);
const wire=value=>typeof value==='string'?value:JSON.stringify(value);
function decoded(name,value){const result=V[name](wire(value));assert.equal(kind(result),'Done',JSON.stringify(result));return result.value;}
const rtEvent=value=>decoded('realtime_decode',value);
const liveEvent=value=>decoded('live_decode',value);
const rtFeed=(state,value)=>V.realtime_reduce(rtEvent(value),state);
const liveFeed=(state,value)=>V.live_reduce(liveEvent(value),state);
const readyRT=()=>rtFeed(V.realtime_initial(),{type:'session.created',session:{id:'rt-1'}});
const responseRT=()=>rtFeed(readyRT(),{type:'response.created',response:{id:'r-1'}});
const readyLive=()=>liveFeed(V.live_initial(),{type:'session.started',session:{id:'live-1'}});
const delegated=()=>liveFeed(readyLive(),{type:'session.delegation.created',offset_ms:1000,delegation:{id:'d-1',type:'delegation',target:'client'}});
const context=(id='result-1',delegation='d-1',kind='Commentary')=>tag('AppendContext',{event_id:id,delegation_id:delegation===null?tag('None'):tag('Some',{value:delegation}),kind:tag(kind),content:'Confirmed offline result'});
function prepared(command,state=delegated()){const result=V.live_prepare(command,state);assert.equal(kind(result),'Done',JSON.stringify(result));return result.value;}
const pending=()=>prepared(context());
test('native voice wire encoding preserves protocol-specific commands and escaping',()=>{
 const command=context();command.content='hello\n"world" 😀';
 assert.deepEqual(JSON.parse(V.live_encode(command)),{type:'session.commentary.append',event_id:'result-1',delegation_id:'d-1',content:command.content});
 assert.deepEqual(JSON.parse(V.realtime_encode(tag('CancelResponse',{response_id:'r-1'}))),{type:'response.cancel',response_id:'r-1'});
 const start=JSON.parse(V.live_encode(tag('StartSession',{event_id:'start',config:tag('LiveConfig',{model:'fixture',instructions:'brief',voice:'fixture',store:false})})));
 assert.equal(start.session.delegation.type,'client');assert.equal(start.session.audio.format.rate,24000);assert.equal(start.session.store,false);
 const configure=JSON.parse(V.realtime_encode(tag('Configure',{config:tag('RealtimeConfig',{instructions:'brief',voice:'fixture',transcription_model:'fixture'})})));
 assert.equal(configure.session.type,'realtime');assert.equal(configure.session.audio.input.turn_detection,null);
});
test('native PCM16 validator rejects incomplete samples, invalid alphabet and oversized frames',()=>{
 for(const value of ['AAA=','AAAAAA==','A'.repeat(262144)])assert.equal(V.pcm16_frame(value),true);
 for(const value of ['AA==','AAAA','==AA','!AAA','','A'.repeat(262148)])assert.equal(V.pcm16_frame(value),false);
 assert.equal(kind(V.realtime_prepare(tag('AppendAudio',{pcm16_base64:'AA=='}),readyRT())),'Fail');
 assert.equal(kind(V.live_prepare(tag('LiveAudio',{pcm16_base64:'AA=='}),readyLive())),'Fail');
});
test('native Realtime readiness prevents commands and frames before session identity',()=>{
 assert.equal(kind(V.realtime_prepare(tag('CommitAudio'),V.realtime_initial())),'Fail');
 assert.equal(kind(rtFeed(V.realtime_initial(),{type:'response.created',response:{id:'early'}}).phase),'Broken');
 assert.equal(kind(readyRT().phase),'Ready');
});
test('native Realtime tracks audio, transcripts, cancellation status and final usage',()=>{
 let s=responseRT();s=rtFeed(s,{type:'response.output_audio.delta',response_id:'r-1',delta:'AAA='});
 const transcript=rtEvent({type:'response.output_audio_transcript.done',response_id:'r-1',transcript:'hello'});assert.equal(transcript.text,'hello');s=V.realtime_reduce(transcript,s);
 const terminal=rtEvent({type:'response.done',response:{id:'r-1',status:'cancelled',usage:{input_tokens:3,output_tokens:5}}});
 assert.equal(kind(terminal.status),'Cancelled');assert.equal(terminal.usage.input_tokens,3);s=V.realtime_reduce(terminal,s);
 assert.equal(kind(s.phase),'Ready');assert.equal(kind(s.active_responses),'Nil');
 const unavailable=rtEvent({type:'response.done',response:{id:'r-1',status:'failed',usage:null}});assert.equal(kind(unavailable.usage),'UsageUnavailable');
});
test('native Realtime rejects identity changes, duplicate responses and unmatched output',()=>{
 assert.equal(kind(rtFeed(readyRT(),{type:'session.updated',session:{id:'other'}}).phase),'Broken');
 assert.equal(kind(rtFeed(responseRT(),{type:'response.created',response:{id:'r-1'}}).phase),'Broken');
 assert.equal(kind(rtFeed(readyRT(),{type:'response.output_audio.delta',response_id:'missing',delta:'AAA='}).phase),'Broken');
 assert.equal(kind(V.realtime_prepare(tag('CancelResponse',{response_id:'missing'}),responseRT())),'Fail');
 assert.equal(kind(V.realtime_prepare(tag('CancelResponse',{response_id:'r-1'}),responseRT())),'Done');
 let many=readyRT();for(let i=0;i<64;i++)many=rtFeed(many,{type:'response.created',response:{id:`stress-${i}`}});
 for(let i=0;i<64;i++)many=rtFeed(many,{type:'response.done',response:{id:`stress-${i}`,status:'completed',usage:null}});assert.equal(kind(many.active_responses),'Nil');
});
test('native Realtime distinguishes initialization failure from recoverable provider errors',()=>{
 const error={type:'error',error:{code:'provider_code',message:'fixture error'}};
 assert.equal(kind(rtFeed(V.realtime_initial(),error).phase),'Broken');assert.equal(kind(rtFeed(readyRT(),error).phase),'Ready');
 const closed=V.realtime_close(responseRT());assert.equal(kind(closed.phase),'Closed');assert.equal(kind(rtFeed(closed,{type:'session.created',session:{id:'late'}}).phase),'Closed');
});
test('native GPT-Live requires ready identity and explicit client delegation ownership',()=>{
 assert.equal(kind(V.live_prepare(context(),V.live_initial())),'Fail');
 assert.equal(kind(V.live_prepare(context('result','foreign'),delegated())),'Fail');
 assert.equal(kind(liveFeed(delegated(),{type:'session.delegation.created',offset_ms:1,delegation:{id:'d-1',target:'client'}}).phase),'Broken');
 assert.equal(kind(V.live_decode(wire({type:'session.delegation.created',offset_ms:1,delegation:{id:'d-2',target:'responses'}}))),'Fail');
});
test('native GPT-Live correlates acknowledgments with result metadata and rejects reused IDs',()=>{
 const s=pending(),ack=liveEvent({type:'session.commentary.appended',client_event_id:'result-1'});
 const receipt=V.live_receipt(ack,s);assert.equal(kind(receipt),'Some');assert.equal(receipt.value.delegation_id.value,'d-1');assert.equal(kind(receipt.value.kind),'Commentary');
 const next=V.live_reduce(ack,s);assert.equal(kind(next.phase),'Ready');assert.equal(kind(next.pending),'Nil');
 assert.equal(kind(V.live_prepare(context(),next)),'Fail');
 assert.equal(kind(liveFeed(s,{type:'session.thinking.appended',client_event_id:'result-1'}).phase),'Broken');
 let many=delegated();for(let i=0;i<128;i++)many=prepared(context(`stress-${i}`),many);
 for(let i=0;i<128;i++)many=liveFeed(many,{type:'session.commentary.appended',client_event_id:`stress-${i}`});assert.equal(kind(many.pending),'Nil');
});
test('native GPT-Live decodes continuous audio and transcript timestamps without Realtime commit',()=>{
 const audio=liveEvent({type:'session.output_audio.delta',delta:'AAA='});assert.equal(audio.pcm16_base64,'AAA=');
 for(const side of ['input','output']){const event=liveEvent({type:`session.${side}_transcript.delta`,delta:'hello',start_ms:1,end_ms:2});assert.equal(event.start_ms,1);assert.equal(event.end_ms,2);assert.equal(event.text,'hello');}
 assert.equal(kind(liveEvent({type:'input_audio_buffer.commit'})),'UnknownLive');
 assert.equal(kind(V.live_prepare(tag('LiveAudio',{pcm16_base64:'AAA='}),readyLive())),'Done');
});
test('native GPT-Live mute acknowledgments and command-specific errors clear pending state',()=>{
 let s=prepared(tag('Mute',{event_id:'mute-1'}),readyLive());s=liveFeed(s,{type:'session.input_audio.muted',client_event_id:'mute-1'});assert.equal(kind(s.pending),'Nil');
 s=liveFeed(pending(),{type:'error',error:{code:'rejected',message:'fixture',client_event_id:'result-1'}});assert.equal(kind(s.pending),'Nil');assert.equal(kind(s.phase),'Ready');
});
test('native GPT-Live close waits for matching final identity and monotonic fractional usage',()=>{
 let s=liveFeed(readyLive(),{type:'session.usage.updated',usage:{seconds:1.25}});s=prepared(tag('CloseSession'),s);assert.equal(kind(s.phase),'Closing');assert.equal(s.finalized,false);
 s=liveFeed(s,{type:'session.closed',reason:'close_requested',session:{id:'live-1'},usage:{seconds:2.5}});assert.equal(kind(s.phase),'Closed');assert.equal(s.finalized,true);assert.equal(s.usage_seconds,2.5);
 assert.equal(kind(V.live_abort(s).phase),'Closed');
 for(const event of [{type:'session.closed',reason:'close_requested',session:{id:'wrong'},usage:{seconds:3}},{type:'session.usage.updated',usage:{seconds:1}}])assert.equal(kind(liveFeed(liveFeed(readyLive(),{type:'session.usage.updated',usage:{seconds:2}}),event).phase),'Broken');
});
test('native GPT-Live abort leaves final usage unconfirmed and ignores late events',()=>{
 const aborted=V.live_abort(readyLive());assert.equal(kind(aborted.phase),'Broken');assert.equal(aborted.phase.code,'aborted_without_final_usage');assert.equal(aborted.finalized,false);
 assert.equal(liveFeed(aborted,{type:'session.closed',reason:'late',usage:{seconds:1}}).finalized,false);
 const unknown=liveEvent({type:'future.protocol.event'});assert.equal(kind(unknown),'UnknownLive');
});
test('native strict codecs reject malformed types, invalid PCM and U32 overflow',()=>{
 for(const event of ['{',{type:'session.closed',reason:'close_requested',usage:{seconds:'fake'}},{type:'session.output_audio.delta',delta:'AA=='},{type:'session.input_transcript.delta',delta:'x',start_ms:4294967296,end_ms:2},{type:'session.input_transcript.delta',delta:'x',start_ms:1.5,end_ms:2}])assert.equal(kind(V.live_decode(wire(event))),'Fail');
 assert.equal(kind(V.realtime_decode(wire({type:'response.done',response:{id:'r',status:'completed',usage:{input_tokens:4294967296,output_tokens:1}}}))),'Fail');
 const last=liveEvent({type:'session.input_transcript.delta',delta:'x',start_ms:4294967295,end_ms:4294967295});assert.equal(last.start_ms,4294967295);
 for(const name of ['realtime_decode','live_decode']){const result=V[name]('x'.repeat(1048577));assert.equal(kind(result),'Fail');assert.equal(result.error,'frame_limit');}
});
