import test from 'node:test';
import assert from 'node:assert/strict';
import {createTemplateServer} from '../templates/open-dot/server.mjs';
async function action(url,value){const response=await fetch(url+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
async function waitSession(url,predicate,{timeoutMs=3000}={}){
 const deadline=Date.now()+timeoutMs;let snapshot;
 do{const response=await fetch(url+'/api/session',{signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});assert.equal(response.status,200);snapshot=await response.json();if(predicate(snapshot))return snapshot;await new Promise(resolve=>setTimeout(resolve,15));}while(Date.now()<deadline);
 assert.fail('Timed out waiting for asynchronous media state: '+JSON.stringify(snapshot));
}
const upload={action:'sendAudio',bytes:'AH//',mimeType:'audio/webm',durationMs:100,name:'recording.webm'};
test('unconfigured transcription retains playable raw audio with explicit failure and no bytes in public state',async()=>{
 const app=createTemplateServer({storage:'memory',port:0});const url=await app.listen();
 try{
  assert.equal(app.config.transcription,null);const submitted=await action(url,upload);const id=submitted.messages.find(m=>m.kind==='audio').id;const snapshot=await waitSession(url,s=>s.messages.find(m=>m.id===id)?.transcription.status==='failed');const message=snapshot.messages.find(m=>m.id===id);
  assert.equal(message.transcription.status,'failed');assert.equal(typeof message.audio.assetId,'string');assert.equal('bytes' in message.audio,false);
  const response=await fetch(url+message.audio.url);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,127,255]));
  const denied=await fetch(url+message.audio.url,{headers:{Origin:'https://foreign.invalid'}});assert.equal(denied.status,403);
  const attempt=message.transcription.attempt;await action(url,{action:'retryTranscription',id:message.id});const retried=await waitSession(url,s=>{const t=s.messages.find(m=>m.id===message.id)?.transcription;return t?.status==='failed'&&t.attempt>attempt;});assert.equal(retried.messages.find(m=>m.id===message.id).text,'');assert.equal(retried.messages.filter(m=>m.replyTo===message.id).length,0);
 }finally{await app.close();}
});
test('explicit offline fixture is labelled; persistence restore preserves byte-backed URLs after consent',async()=>{
 let calls=0;const app=createTemplateServer({storage:'memory',port:0,transcription:{kind:'offline-fixture',client:{async transcribe(){calls++;return {text:'Offline transcript',language_code:'en',language_probability:1,words:[]};}}}});const url=await app.listen();
 try{
  assert.equal(app.config.transcription,'offline-fixture');await action(url,{action:'permission',permission:'persistence',allowed:true});
  const submitted=await action(url,upload),id=submitted.messages.find(m=>m.kind==='audio').id;
  let snapshot=await waitSession(url,s=>{const m=s.messages.find(m=>m.id===id);return m?.transcription.status==='ready'&&m.reply.status==='ready'&&s.phase==='idle';});
  const message=snapshot.messages.find(m=>m.id===id);assert.equal(message.transcription.status,'ready');assert.equal(message.transcription.text,'Offline transcript');assert.equal(message.text,'');assert.equal(message.kind,'audio');assert.equal(calls,1);
  const replies=snapshot.messages.filter(m=>m.replyTo===id);assert.equal(replies.length,1);assert.equal(replies[0].role,'assistant');assert.equal(replies[0].status,'complete');assert.ok(replies[0].text.trim());assert.equal(message.reply.messageId,replies[0].id);
  const savedUrl=message.audio.url;const restored=await action(url,{action:'restore'});const restoredAudio=restored.messages.find(m=>m.id===id);assert.equal(restoredAudio.kind,'audio');assert.equal(restoredAudio.text,'');assert.equal(restoredAudio.transcription.status,'ready');assert.equal(restoredAudio.transcription.text,'Offline transcript');assert.equal(restoredAudio.reply.status,'ready');assert.equal(restored.messages.filter(m=>m.replyTo===id).length,1);const response=await fetch(url+savedUrl);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,127,255]));
  snapshot=await action(url,{action:'sendAttachment',bytes:'YWJj',mimeType:'text/plain',name:'note.txt',kind:'file'});const attachment=snapshot.messages.find(m=>m.kind==='file');const file=await fetch(url+attachment.media.url);assert.match(file.headers.get('content-disposition'),/^attachment;/);
  await action(url,{action:'clear'});assert.equal((await fetch(url+savedUrl)).status,404);
 }finally{await app.close();}
});
test('unsafe upload content and noncanonical base64 fail without retaining assets or enabling paid calls',async()=>{
 assert.throws(()=>createTemplateServer({storage:'none',transcription:{kind:'elevenlabs',apiKey:'unused'}}),/allowPaidRequests/);
 const app=createTemplateServer({storage:'none',port:0});const url=await app.listen();
 try{
  for(const value of [{...upload,bytes:'AB=='},{...upload,name:'<script>.html'},{action:'sendAttachment',bytes:'PGh0bWw+PC9odG1sPg==',mimeType:'text/html',name:'x.html',kind:'file'}]){
   const response=await fetch(url+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});assert.equal(response.status,400);
  }
  assert.equal(app.assetStore.size,0);
 }finally{await app.close();}
});
