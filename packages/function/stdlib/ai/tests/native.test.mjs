import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../../../../..');
const temp=mkdtempSync(join(tmpdir(),'near-function-native-ai-'));
const modules={};
for(const name of ['requests','codecs','protocol','speech']){
 const source=join(root,'packages/function/stdlib/ai/bend',name+'.bend'),out=join(temp,name+'.mjs');
 const check=spawnSync('bun',[join(root,'tools/bend/main.ts'),source,'--check-only'],{encoding:'utf8',timeout:120000});
 assert.equal(check.status,0,check.stdout+check.stderr);
 const compile=spawnSync('bun',[join(root,'tools/bend/main.ts'),source,'-o',out],{encoding:'utf8',timeout:120000});
 assert.equal(compile.status,0,compile.stdout+compile.stderr);
 modules[name]=(await import(pathToFileURL(out))).default;
}
process.on('exit',()=>rmSync(temp,{recursive:true,force:true}));
const {requests:R,codecs:C,protocol:P}=modules;
const tag=(name,fields={})=>({$:name,...fields});
const rows=xs=>{const result=[];for(;xs.$==='Con';xs=xs.tail)result.push(xs.head);assert.equal(xs.$,'Nil');return result};
const list=xs=>xs.reduceRight((tail,head)=>tag('Con',{head,tail}),tag('Nil'));
const kind=value=>value.$.split('.').at(-1);
const provider=name=>tag('codecs.'+name);
function frames(name,events){let state=P.initial(provider(name));let output=[];for(const data of events){const step=P.reduce(tag('DataFrame',{data:typeof data==='string'?data:JSON.stringify(data)}),state);state=step.state;output.push(step.event)}return {state,output};}
const delta=text=>({choices:[{index:0,delta:{content:text},finish_reason:null}]});
const stop={choices:[{index:0,delta:{},finish_reason:'stop'}]};
const sse=event=>'data: '+(typeof event==='string'?event:JSON.stringify(event))+'\r\n\r\n';
test('native typed request encoders preserve provider fields and escape text',()=>{
 const result=R.openrouter(tag('OpenRouterRequest',{model:'fixture',messages:list([tag('Message',{role:tag('User'),text:'quote "\n😀'})]),max_tokens:32,temperature:tag('Some',{value:1})}));
 assert.equal(result.$,'Done');const body=JSON.parse(result.value.body);assert.equal(body.messages[0].content,'quote "\n😀');assert.equal(body.temperature,1);assert.equal(body.stream_options.include_usage,true);
 const responses=R.responses(tag('ResponsesRequest',{model:'fixture',input:'hi',instructions:'brief',max_output_tokens:12,store:false}));assert.equal(JSON.parse(responses.value.body).store,false);
 const bad=R.anthropic(tag('AnthropicRequest',{model:'fixture',messages:list([tag('Message',{role:tag('System'),text:'bad'})]),system:'brief',max_tokens:8}));assert.equal(bad.$,'Fail');assert.equal(kind(bad.error),'UnsupportedRole');
 assert.equal(R.speech(tag('SpeechRequest',{voice_id:'../private',text:'hi',model_id:'fixture'})).$,'Fail');
 assert.deepEqual(JSON.parse(R.claude_arguments(tag('ClaudeRequest',{prompt:'$(literal)',resume:tag('None'),model:tag('None')}))).slice(-2),['--tools','']);
});
test('native OpenRouter text, usage and required terminal lifecycle',()=>{
 const {state,output}=frames('OpenRouter',[delta('Hello '),delta('😀'),stop,{choices:[],usage:{prompt_tokens:2,completion_tokens:3}},'[DONE]']);
 assert.equal(state.text,'Hello 😀');assert.equal(kind(state.phase),'Completed');assert.equal(state.usage.input_tokens,2);assert.equal(kind(output.at(-1)),'TextComplete');
 assert.equal(kind(P.reduce(tag('DataFrame',{data:'private malformed'}),state).event),'TextIgnored');
});
test('native EOF and missing finish are truncation rather than success',()=>{
 for(const events of [[delta('partial')],[delta('partial'),'[DONE]']]){const {state}=frames('OpenRouter',events);const step=P.reduce(tag('EndFrame'),state);assert.equal(kind(step.state.phase),'Failed');const failure=kind(step.event)==='TextFailed'?step.event:frames('OpenRouter',events).output.at(-1);assert.equal(P.error_summary(failure.error),'truncated_stream')}
});
test('native malformed JSON, nontext tools and provider errors fail safely',()=>{
 for(const data of ['{',{choices:[{delta:{content:4}}]},{choices:[{delta:{tool_calls:[{private:'hidden'}]}}]},{error:{message:'secret body'}}]){
  const {state,output}=frames('OpenRouter',[data]);assert.equal(kind(state.phase),'Failed');assert.ok(!JSON.stringify(output).includes('secret body'));assert.ok(!JSON.stringify(output).includes('hidden'));
 }
});
test('native cancellation and raw transport error preserve accumulated text',()=>{
 const {state}=frames('OpenRouter',[delta('partial')]);const cancel=P.reduce(tag('CancelFrame'),state);assert.equal(kind(cancel.event),'TextCancelled');assert.equal(cancel.state.text,'partial');assert.equal(kind(P.reduce(tag('DataFrame',{data:JSON.stringify(delta('late'))}),cancel.state).event),'TextIgnored');
 const failed=P.reduce(tag('TransportFailed',{status:503,request_id:'safe-id'}),state);assert.equal(failed.event.error.status,503);assert.equal(failed.event.error.request_id,'safe-id');
});
test('native bounded stream frames and text fail without retaining excess',()=>{
 let s=P.initial(provider('OpenRouter'));s.frames=100000;const limit=P.reduce(tag('DataFrame',{data:JSON.stringify(delta('late'))}),s);assert.equal(P.error_summary(limit.event.error),'frame_limit');assert.equal(limit.state.text,'');
 s=P.initial(provider('OpenRouter'));s.text='x'.repeat(1048576);const text=P.reduce(tag('DataFrame',{data:JSON.stringify(delta('late'))}),s);assert.equal(P.error_summary(text.event.error),'frame_limit');assert.equal(text.state.text.length,1048576);
});
test('native SSE byte-text chunk fragmentation, CRLF, comments and multiline data',()=>{
 const wire=': heartbeat\r\nevent: message\r\n'+sse(delta('fragment 😀'))+sse(stop)+sse('[DONE]');
 let state=P.raw_initial(provider('OpenRouter'),tag('SSE'));const output=[];
 for(const chunk of Array.from(wire)){const step=P.feed(chunk,state);state=step.state;output.push(...rows(step.events));}
 assert.equal(P.raw_stream(state).text,'fragment 😀');assert.equal(kind(P.raw_stream(state).phase),'Completed');assert.equal(output.filter(e=>kind(e)==='TextComplete').length,1);
 state=P.raw_initial(provider('OpenRouter'),tag('SSE'));state=P.feed('data: {"choices":\ndata: [{"delta":{"content":"multi"}}]}\n\n',state).state;assert.equal(P.raw_stream(state).text,'multi');
});
test('native raw EOF rejects unflushed SSE and cancellation clears buffered wire',()=>{
 let s=P.raw_initial(provider('OpenRouter'),tag('SSE'));s=P.feed('data: {"choices":',s).state;const eof=P.raw_end(s);assert.equal(kind(P.raw_stream(eof.state).phase),'Failed');assert.equal(P.error_summary(rows(eof.events)[0].error),'truncated_stream');const cancel=P.raw_cancel(s);assert.equal(cancel.state.line,'');assert.equal(kind(P.raw_stream(cancel.state).phase),'Cancelled');
});
test('native Responses and Anthropic text slices keep independent event schemas',()=>{
 const response=frames('Responses',[{type:'response.output_text.delta',delta:'Response'},{type:'response.completed',response:{status:'completed'}}]);assert.equal(response.state.text,'Response');assert.equal(kind(response.state.phase),'Completed');
 const anthropic=frames('Anthropic',[{type:'message_start'},{type:'content_block_delta',delta:{type:'text_delta',text:'Claude'}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}]);assert.equal(anthropic.state.text,'Claude');assert.equal(kind(anthropic.state.phase),'Completed');
 assert.equal(frames('Anthropic',[{type:'content_block_delta',delta:{type:'thinking_delta',thinking:'private'}}]).state.phase.$,'Failed');
});
test('native official Claude NDJSON requires result after model message_stop',()=>{
 const events=[{type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:'CLI'}}},{type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'}}},{type:'stream_event',event:{type:'message_stop'}},{type:'result',subtype:'success',is_error:false}];
 let s=P.raw_initial(provider('Claude'),tag('NDJSON'));for(const event of events){s=P.feed(JSON.stringify(event)+'\n',s).state;if(event.type==='stream_event')assert.equal(kind(P.raw_stream(s).phase),'Streaming')};assert.equal(P.raw_stream(s).text,'CLI');assert.equal(kind(P.raw_stream(s).phase),'Completed');
});

const S=modules.speech;
test('native MP3 stream buffers split signature and preserves binary bytes',()=>{
 let state=S.initial();let result=S.reduce(tag('SpeechData',{bytes:list([73])}),state);assert.equal(kind(result.event),'SpeechIgnored');state=result.state;
 result=S.reduce(tag('SpeechData',{bytes:list([68])}),state);assert.equal(kind(result.event),'SpeechIgnored');state=result.state;
 result=S.reduce(tag('SpeechData',{bytes:list([51,0,255,1,128])}),state);assert.equal(kind(result.event),'SpeechBytes');assert.deepEqual(rows(result.event.bytes),[73,68,51,0,255,1,128]);
 const end=S.reduce(tag('SpeechEnd'),result.state);assert.equal(kind(end.event),'SpeechComplete');assert.equal(end.event.bytes_received,7);assert.equal(kind(S.reduce(tag('SpeechData',{bytes:list([9])}),end.state).event),'SpeechIgnored');
});
test('native MP3 validates frame prefix, truncation, byte domain and transport bounds',()=>{
 const good=S.reduce(tag('SpeechData',{bytes:list([255,251,144,0])}),S.initial());assert.equal(kind(good.event),'SpeechBytes');
 for(const bytes of [[1,2,3],[255,232,0],[73,68,999]]){const bad=S.reduce(tag('SpeechData',{bytes:list(bytes)}),S.initial());assert.equal(kind(bad.event),'SpeechFailed');assert.equal(P.error_summary({...bad.event.error,code:tag('codecs.ProtocolError')}),'protocol_error')}
 const partial=S.reduce(tag('SpeechData',{bytes:list([73,68])}),S.initial());assert.equal(kind(S.reduce(tag('SpeechEnd'),partial.state).event),'SpeechFailed');assert.equal(kind(S.reduce(tag('SpeechEnd'),S.initial()).event),'SpeechFailed');
 let full=S.initial();full.accepted=true;full.bytes_received=33554432;assert.equal(kind(S.reduce(tag('SpeechData',{bytes:list([1])}),full).event),'SpeechFailed');
 const cancel=S.reduce(tag('SpeechCancel'),partial.state);assert.equal(kind(cancel.event),'SpeechCancelled');assert.equal(rows(cancel.state.prefix).length,0);
 const error=S.reduce(tag('SpeechTransportError',{status:500,request_id:'fixture'}),S.initial());assert.equal(error.event.error.status,500);
});
