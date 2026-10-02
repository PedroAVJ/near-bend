import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {createTemplateServer} from '../templates/open-dot/server.mjs';
class NativeSocket extends EventEmitter{
 constructor(){super();this.readyState=1;this.sent=[];this.closed=false}
 frame(event){if(!this.closed)this.emit('message',JSON.stringify(event))}
 send(text){const event=JSON.parse(text);this.sent.push(event);if(event.type==='response.create')queueMicrotask(()=>{this.frame({type:'response.created',response:{id:'response-1'}});this.frame({type:'conversation.item.input_audio_transcription.completed',item_id:'input-1',transcript:'heard user'});this.frame({type:'response.output_audio.delta',response_id:'response-1',item_id:'output-1',delta:'AAA='});this.frame({type:'response.output_audio_transcript.done',response_id:'response-1',item_id:'output-1',transcript:'spoken assistant',content_index:0});this.frame({type:'response.done',response:{id:'response-1',status:'completed'}})})}
 close(){this.closed=true;this.readyState=3;this.emit('close',1000)}
}
const tick=()=>new Promise(ok=>setImmediate(ok));
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(ok=>setTimeout(ok,5))}throw Error('Fixture event timeout')}
function socketFactory(socket,calls){return async(url,options)=>{calls.push({url,options});setImmediate(()=>socket.frame({type:'session.created',session:{id:'fixture-native-session'}}));return socket}}
async function browser(url){const socket=new WebSocket(url.replace(/^http/,'ws')+'/api/audio',{origin:url});const events=[];socket.on('message',raw=>events.push(JSON.parse(raw.toString())));socket.on('error',()=>{});await until(()=>events.some(e=>e.type==='status'&&e.state==='ready'));return {socket,events}}
async function rejected(url,origin,headers={}){return new Promise((ok,fail)=>{const socket=new WebSocket(url.replace(/^http/,'ws')+'/api/audio',{origin,headers});socket.on('error',()=>{});socket.on('unexpected-response',(_,res)=>{res.resume();ok(res.statusCode)});socket.on('open',()=>{socket.close();fail(Error('Unexpected accepted upgrade'))})})}
test('default template disables voice; configured construction is inert and guarded',async()=>{
 assert.equal(createTemplateServer({storage:'none'}).config.liveAudio,false);
 assert.throws(()=>createTemplateServer({storage:'none',realtime:{model:'fixture',apiKey:'fixture'}}),/allowPaidRequests/);
 assert.throws(()=>createTemplateServer({storage:'none',realtime:{allowPaidRequests:true,apiKey:'fixture'}}),/model/);
 const calls=[],native=new NativeSocket();const app=createTemplateServer({storage:'none',port:0,realtime:{model:'fixture',apiKey:'fixture-host-secret',allowPaidRequests:true,socketFactory:socketFactory(native,calls)}});
 try{assert.equal(calls.length,0);const url=await app.listen();assert.equal(await rejected(url,url),403);assert.equal(calls.length,0);await app.assistant.setPermission('microphone',true);app.assistant.beginCall();assert.equal(await rejected(url,'https://untrusted.invalid'),403);assert.equal(await rejected(url,url,{Host:'untrusted.invalid'}),403);assert.equal(calls.length,0);assert(!JSON.stringify(app.config).includes('fixture-host-secret'))}finally{await app.close()}
});
test('actual local WS endpoint normalizes injected native SDK audio/transcripts and cleans on mic revocation',async()=>{
 const calls=[],native=new NativeSocket();const app=createTemplateServer({storage:'memory',port:0,realtime:{model:'fixture',apiKey:'fixture-host-secret',allowPaidRequests:true,socketFactory:socketFactory(native,calls),session:{audio:{input:{transcription:{model:'fixture-transcription'}}}}}});
 try{await app.assistant.setPermission('microphone',true);app.assistant.beginCall();const url=await app.listen();const client=await browser(url);assert.equal(calls.length,1);assert.match(calls[0].url,/wss:\/\/api.openai.com/);assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-host-secret');
  client.socket.send(JSON.stringify({type:'audio.append',audio:'AAA='}));client.socket.send(JSON.stringify({type:'audio.commit'}));await until(()=>client.events.filter(e=>e.type==='transcript').length===2);
  assert(native.sent.some(e=>e.type==='input_audio_buffer.append'));assert(native.sent.some(e=>e.type==='input_audio_buffer.commit'));assert(client.events.some(e=>e.type==='audio.delta'&&e.audio==='AAA='));assert.deepEqual(app.assistant.snapshot().messages.map(m=>[m.role,m.source,m.text]),[['user','call','heard user'],['assistant','call','spoken assistant']]);assert(!JSON.stringify(client.events).includes('fixture-host-secret'));
  native.frame({type:'response.created',response:{id:'response-2'}});await tick();client.socket.send(JSON.stringify({type:'response.cancel'}));await until(()=>native.sent.some(e=>e.type==='response.cancel'&&e.response_id==='response-2'));await app.assistant.setPermission('microphone',false);await until(()=>client.socket.readyState===WebSocket.CLOSED);assert.equal(native.closed,true);assert.equal(app.assistant.snapshot().inCall,false);
 }finally{await app.close()}
});
test('voice endpoint rejects concurrent sessions and oversized frames with native cleanup',async()=>{
 const calls=[],native=new NativeSocket();const app=createTemplateServer({storage:'none',port:0,realtime:{model:'fixture',apiKey:'fixture',allowPaidRequests:true,socketFactory:socketFactory(native,calls)}});
 try{await app.assistant.setPermission('microphone',true);app.assistant.beginCall();const url=await app.listen();const client=await browser(url);assert.equal(await rejected(url,url),409);assert.equal(calls.length,1);client.socket.send(JSON.stringify({type:'audio.append',audio:'A'.repeat(70000)}));await until(()=>client.socket.readyState===WebSocket.CLOSED);assert.equal(native.closed,true);assert.equal(app.assistant.snapshot().inCall,false)}finally{await app.close()}
});
class GPTNativeSocket extends EventEmitter{
 constructor(){super();this.readyState=1;this.sent=[];this.closed=false}
 frame(event){if(!this.closed)this.emit('message',JSON.stringify(event))}
 send(text){const e=JSON.parse(text);this.sent.push(e);if(e.type==='session.start')queueMicrotask(()=>this.frame({type:'session.started',session:{id:'fixture-gpt-live'}}));if(e.type==='session.commentary.append')queueMicrotask(()=>this.frame({type:'session.commentary.appended',client_event_id:e.event_id}));if(e.type==='session.close')queueMicrotask(()=>this.frame({type:'session.closed',reason:'client_closed',usage:{seconds:1},session:{id:'fixture-gpt-live'}}))}
 close(){this.closed=true;this.readyState=3;this.emit('close',1000)}
}
test('distinct GPT-Live host profile uses actual SDK continuous audio/delegation and explicit approved backend work',async()=>{
 const native=new GPTNativeSocket(),calls=[];let executions=0;
 const app=createTemplateServer({storage:'memory',port:0,gptLive:{model:'fixture-gpt-model',apiKey:'fixture-gpt-secret',allowPaidRequests:true,socketFactory:async(url,options)=>{calls.push({url,options});return native},executeDelegation:async()=>{executions++;return 'fixture backend result'}}});
 try{assert.equal(app.config.voiceProtocol,'gptLive');assert.equal(calls.length,0);await app.assistant.setPermission('microphone',true);app.assistant.beginCall();const url=await app.listen();const client=await browser(url);assert.equal(calls.length,1);assert.equal(calls[0].url,'wss://api.openai.com/v1/live/sessions');const start=native.sent.find(e=>e.type==='session.start');assert.equal(start.session.model,'fixture-gpt-model');assert.deepEqual(start.session.delegation,{type:'client'});assert.equal(start.session.store,false);
  client.socket.send(JSON.stringify({type:'audio.append',audio:'AAA='}));await until(()=>native.sent.some(e=>e.type==='session.input_audio.append'));
  native.frame({type:'session.input_transcript.delta',event_id:'fragment-1',delta:'continuous input',start_ms:0,end_ms:500});native.frame({type:'session.output_audio.delta',delta:'AAA='});native.frame({type:'session.output_transcript.delta',event_id:'fragment-2',delta:'continuous output',start_ms:500,end_ms:1000});native.frame({type:'session.delegation.created',offset_ms:1000,delegation:{id:'delegation-1',type:'delegation',target:'client'}});
  await until(()=>client.events.some(e=>e.type==='delegation'&&e.status==='approval_required'));assert.equal(executions,0);const task=app.assistant.snapshot().tasks[0];assert.equal(task.approval,'pending');await app.assistant.decideTask(task.id,true);await until(()=>client.events.some(e=>e.type==='delegation'&&e.acknowledged));assert.equal(executions,1);assert(native.sent.some(e=>e.type==='session.commentary.append'&&e.delegation_id==='delegation-1'));assert(!native.sent.some(e=>['input_audio_buffer.commit','response.create','response.cancel'].includes(e.type)));assert.equal(app.assistant.snapshot().messages[0].source,'call');assert(client.events.some(e=>e.type==='audio.delta'));assert(!JSON.stringify(client.events).includes('fixture-gpt-secret'));
  client.socket.send(JSON.stringify({type:'close'}));await until(()=>native.closed);assert(native.sent.some(e=>e.type==='session.close'));assert.equal(app.assistant.snapshot().inCall,false);
 }finally{await app.close()}
});
