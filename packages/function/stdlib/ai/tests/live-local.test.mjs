import test from 'node:test';import assert from 'node:assert/strict';import {WebSocketServer} from 'ws';
import {OpenAIRealtimeClient,defaultSocketFactory} from '../src/live.mjs';
test('installed ws transport authenticates only the local mock host and carries the audio protocol',async()=>{
 const server=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise((ok,fail)=>{server.once('listening',ok);server.once('error',fail)});let authorization,remoteURL;const received=[];
 server.on('connection',(socket,request)=>{authorization=request.headers.authorization;socket.send(JSON.stringify({type:'session.created',session:{id:'fixture-session'}}));socket.on('message',data=>{const event=JSON.parse(String(data));received.push(event);if(event.type==='response.create'){
  socket.send(JSON.stringify({type:'response.created',response:{id:'fixture-response'}}));socket.send(JSON.stringify({type:'response.output_audio.delta',response_id:'fixture-response',delta:'AA=='}));socket.send(JSON.stringify({type:'response.done',response:{id:'fixture-response',status:'completed'}}));
 }})});
 const client=new OpenAIRealtimeClient({apiKey:'fixture-local-key',model:'fixture-model',socketFactory:async(url,options)=>{remoteURL=url;return defaultSocketFactory(`ws://127.0.0.1:${server.address().port}`,options)}});let session;
 try{session=await client.connect();assert.equal(authorization,'Bearer fixture-local-key');assert.match(remoteURL,/^wss:\/\/api\.openai\.com\/v1\/realtime\?/);assert.equal(session.sessionId,'fixture-session');session.configure({type:'realtime',output_modalities:['audio']});session.appendAudio('AA==');session.commitAudio();session.createResponse();const events=[];
  for await(const event of session.events()){events.push(event);if(event.type==='response.done')break;}
  assert(events.some(e=>e.type==='response.output_audio.delta'));assert.deepEqual(received.map(e=>e.type),['session.update','input_audio_buffer.append','input_audio_buffer.commit','response.create']);assert.equal(JSON.stringify(received).includes('fixture-local-key'),false,'credentials belong only in host handshake headers');
 }finally{session?.close();for(const socket of server.clients)socket.terminate();await new Promise(ok=>server.close(ok));}
});

test('installed ws carries distinct GPT-Live session start, continuous audio and finalized close offline',async()=>{
 const {GPTLiveClient}=await import('../src/gpt-live.mjs');
 const server=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise((ok,fail)=>{server.once('listening',ok);server.once('error',fail)});
 const received=[];let authorization,remoteURL,session;
 server.on('connection',(socket,request)=>{authorization=request.headers.authorization;socket.on('message',data=>{const event=JSON.parse(String(data));received.push(event);
  if(event.type==='session.start')socket.send(JSON.stringify({type:'session.started',session:{id:'fixture-gpt-live'}}));
  if(event.type==='session.close')socket.send(JSON.stringify({type:'session.closed',reason:'client_requested',usage:{seconds:0.25}}));
 })});
 const client=new GPTLiveClient({apiKey:'fixture-live-key',socketFactory:async(url,options)=>{remoteURL=url;return defaultSocketFactory(`ws://127.0.0.1:${server.address().port}`,options)}});
 try{
  session=await client.connect({session:{model:'fixture-model',audio:{format:{type:'audio/pcm',rate:24000}},delegation:{type:'client'},store:false}});
  assert.equal(authorization,'Bearer fixture-live-key');assert.equal(remoteURL,'wss://api.openai.com/v1/live/sessions');
  assert.equal(session.sessionId,'fixture-gpt-live');session.appendAudio('AAA=');const final=await session.close();
  assert.equal(final.type,'session.closed');assert.equal(session.finalized,true);assert.equal(session.usageSeconds,0.25);
  assert.deepEqual(received.map(event=>event.type),['session.start','session.input_audio.append','session.close']);
  assert.equal(JSON.stringify(received).includes('fixture-live-key'),false);
 }finally{session?.abort();for(const socket of server.clients)socket.terminate();await new Promise(ok=>server.close(ok));}
});
