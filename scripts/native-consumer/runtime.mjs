import assert from 'node:assert/strict';
import App from './compiled.mjs';
assert.equal(App.provider_text(),true);
assert.equal(App.lifecycle(),'idle');
assert.equal(App.microphone_gate(),false);
console.log('Installed Bend provider capability, native lifecycle and microphone gate executed.');
const kind=value=>value.$.split('.').at(-1),rows=list=>{const result=[];while(list.$==='Con'){result.push(list.head);list=list.tail}assert.equal(list.$,'Nil');return result};
assert.equal(App.text_completed().text,'Final');assert.equal(kind(App.text_completed().status),'CompleteMessage');
assert.equal(App.text_cancelled().text,'partial');assert.equal(kind(App.text_cancelled().status),'CancelledMessage');
assert.equal(kind(App.task_denied().status),'TaskReady');assert.equal(kind(App.task_approved().status),'TaskDone');assert.equal(App.task_approved().result,'Done');
assert.equal(kind(App.task_restored().approval),'AwaitingApproval');assert.equal(kind(App.task_restored().status),'TaskReady');
const history=App.history_fixture();assert.equal(rows(history.messages).length,1);assert.equal(rows(history.tasks).length,1);assert.equal(rows(history.messages)[0].source.$.split('.').at(-1),'CallMessage');
console.log('Installed native Dot text terminal/cancellation, approval, restore reauthorization and chat/call/task continuity pass.');
for(const value of [null,true,false,0,-1,1.5,1e20,'quote" slash\\ line\n tab\t unicode 😀',[1,{text:'ñ'}],{unknown:{nested:[false,null]},control:'\u0000'}]){
 const raw=JSON.stringify(value), result=App.json_roundtrip(raw);assert.equal(result.$,'Done',raw);assert.deepEqual(JSON.parse(result.value),value);
}
for(const raw of ['','{','[1,]','{"x":1,}','01','NaN','"\\uD800"','true false','{"x" 1}','"line\n"'])assert.equal(App.json_roundtrip(raw).$,'Fail',raw);
console.log('Installed native JSON wire codec valid escaped/nested roundtrip and malformed input rejection pass.');
async function drive(op){if(typeof op==='function')op=op(value=>({$: 'Emit',value}));while(op?.$==='$FFI')op=op.kont(await op.run(...op.args));if(op?.$==='Halt')throw Error(op.message);assert.equal(op?.$,'Emit');return op.value;}
const rawCalls=[],hostSymbol=Symbol.for('near-v.native-host.v1');let fixtureChunks=['{"choices":[{"delta":{"content":"Hello"}}]}'];
globalThis.fetch=()=>{throw Error('Network forbidden in native consumer')};
globalThis[hostSymbol]={dispatch(operation,args){rawCalls.push({operation,args});if(operation==='http.open')return{status:1,handle:23,data:''};if(operation==='stream.read')return fixtureChunks.length?{status:1,handle:23,data:fixtureChunks.shift()}:{status:2,handle:23,data:''};if(operation==='transport.close')return{status:1,handle:0,data:''};throw Error('Unexpected transport operation')}};
const opened=await drive(App.openrouter_fake(7));assert.equal(opened.status,1);assert.equal(opened.handle,23);assert.deepEqual(rawCalls[0].args.slice(0,3),[7,'POST','https://openrouter.ai/api/v1/chat/completions']);
const sent=JSON.parse(rawCalls[0].args[4]);assert.equal(sent.messages[0].content,'Quote " and newline\n');assert.equal(sent.stream,true);assert.equal(sent.max_tokens,32);assert.ok(!rawCalls[0].args[3].toLowerCase().includes('authorization'));
const raw=await drive(App.read_raw(opened.handle));assert.equal(raw.status,1);assert.equal(JSON.parse(raw.data).choices[0].delta.content,'Hello');assert.equal((await drive(App.read_raw(opened.handle))).status,2);await drive(App.close_raw(opened.handle));
delete globalThis[hostSymbol];assert.equal((await drive(App.openrouter_fake(7))).status,4);
globalThis[hostSymbol]={dispatch:()=>Promise.resolve({status:1,handle:1,data:'invalid async reply'})};assert.equal((await drive(App.openrouter_fake(7))).status,4);delete globalThis[hostSymbol];
console.log('Installed typed OpenRouter request encoder and actual compiled raw IO HTTP/open/read/EOF/close/fail-closed leaf pass.');
const responses=App.responses_request();assert.equal(responses.$,'Done');assert.equal(responses.value.url,'https://api.openai.com/v1/responses');assert.equal(JSON.parse(responses.value.body).store,false);
const anthropic=App.anthropic_request();assert.equal(anthropic.$,'Done');assert.equal(JSON.parse(anthropic.value.headers)['anthropic-version'],'2023-06-01');assert.equal(JSON.parse(anthropic.value.body).system,'Answer briefly');assert.equal(App.anthropic_bad_role().$,'Fail');
const speech=App.speech_request();assert.equal(speech.$,'Done');assert.equal(JSON.parse(speech.value.body).text,'Hola');assert.ok(speech.value.url.endsWith('/voice-fixture/stream?output_format=mp3_44100_128'));assert.equal(App.speech_bad_voice().$,'Fail');
const cli=JSON.parse(App.claude_arguments());assert.equal(cli[1],'literal $(never-run)');assert.ok(cli.includes('--resume'));assert.ok(cli.includes('--model'));assert.equal(cli[cli.indexOf('--tools')+1],'');
console.log('Installed native OpenAI/Anthropic/ElevenLabs typed encoders and literal official CLI argv pass; provider-specific fields preserved.');
