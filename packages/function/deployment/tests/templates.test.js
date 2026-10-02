import test from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTemplateServer} from '../templates/open-dot/server.mjs';
import {openDotRequirements,dotRequirementsFor} from 'near-v/requirements';
import {planApplication} from '../src/index.js';
const packageRoot=fileURLToPath(new URL('../..',import.meta.url));
const monorepo=resolve(packageRoot,'../..');
async function observed(requirements){const artifacts={};for(const file of [...requirements.services.map(s=>s.artifact),...requirements.requiredArtifacts]){try{artifacts[file]=(await stat(join(file.startsWith('examples/')?monorepo:packageRoot,file))).isFile()}catch{artifacts[file]=false}}return {services:{},artifacts,availableSecretRefs:[],previous:{stores:[]}}}
test('assistant artifact snapshot resolves through the inert planner',async()=>{
 for(const [requirements,ports] of [[openDotRequirements,{assistant:9462}]]){
  const snapshot=await observed(requirements);assert(Object.values(snapshot.artifacts).every(Boolean),JSON.stringify(snapshot));
  const plan=planApplication(requirements,{kind:'local',ports},snapshot);assert.equal(plan.readyForReview,true);assert.equal(plan.executable,false);
 }
 const snapshot=await observed(openDotRequirements);
 assert.equal(planApplication(dotRequirementsFor('openrouter'),{kind:'private',host:'dot.example.internal',ports:{assistant:9443}},snapshot).readyForReview,false,'real-provider profile requires observed secret reference');
});
test('template construction is inert and storage/provider choices are explicit',async()=>{
 assert.throws(()=>createTemplateServer(),/Choose storage/);assert.throws(()=>createTemplateServer({storage:'file'}),/storagePath/);
 assert.throws(()=>createTemplateServer({storage:'none',host:'0.0.0.0'}),/loopback/);
 assert.throws(()=>createTemplateServer({storage:'none',provider:{kind:'openrouter',apiKey:'not-real',model:'test'}}),/allowPaidRequests/);
 const dir=await mkdtemp(join(tmpdir(),'near-v-template-inert-'));try{
  let requests=0;const app=createTemplateServer({storage:'file',storagePath:join(dir,'history.json'),provider:{kind:'openrouter',allowPaidRequests:true,model:'test',apiKey:'not-real',fetch:()=>{requests++;throw Error('No network')}}});
  assert.equal(app.server.listening,false);assert.equal(requests,0);assert.deepEqual(await readdir(dir),[]);assert.equal(app.assistant.snapshot().permissions.persistence,false);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('mock host template permissions, lifecycle, continuity and explicit file persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'near-v-template-local-'));const path=join(dir,'history.json');
 const app=createTemplateServer({storage:'file',storagePath:path,port:0});
 try{
  const url=await app.listen();
  async function action(value){const r=await fetch(url+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});return {status:r.status,body:await r.json()}}
  const config=await fetch(url+'/api/config').then(r=>r.json());assert.equal(config.provider,'mock');assert.equal(config.storage,'file');assert(!JSON.stringify(config).includes(path));
  assert.equal((await action({action:'beginCall'})).status,400);
  await action({action:'send',text:'first chat'});assert.deepEqual(await readdir(dir),[],'without persistence permission no disk writes');
  await action({action:'permission',permission:'persistence',allowed:true});await action({action:'permission',permission:'microphone',allowed:true});await action({action:'beginCall'});
  let response=await action({action:'send',text:'typed call'});assert.equal(response.body.messages.length,4);assert.equal(response.body.messages[2].source,'call');
  assert.equal((await stat(path)).mode&0o777,0o600);assert.equal(JSON.parse(await readFile(path,'utf8')).messages.length,4);
  response=await action({action:'addTask',title:'offline',requiresApproval:true});const id=response.body.tasks[0].id;
  assert.equal((await action({action:'runTask',id})).status,400);await action({action:'decideTask',id,approved:true});response=await action({action:'runTask',id});assert.equal(response.body.tasks[0].done,true);
  assert.equal((await fetch(url+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://unexpected.invalid'},body:'{}'})).status,403);
  assert.equal(await new Promise((ok,fail)=>{const req=request(url+'/api/session',{headers:{Host:'untrusted.invalid'}},res=>{res.resume();ok(res.statusCode)});req.on('error',fail);req.end()}),403);assert.equal((await fetch(url+'/api/session')).status,200);assert.equal((await fetch(url+'/unknown')).status,404);
  await action({action:'endCall'});assert.equal(app.assistant.snapshot().inCall,false);await action({action:'restore'});assert.equal(app.assistant.snapshot().tasks.length,1);
 }finally{await app.close();await rm(dir,{recursive:true,force:true})}
});
test('read-only template plans observe actual artifacts and distinguish absent history/artifacts',async()=>{
 const {planTemplate}=await import('../templates/plan.mjs');
 assert.equal((await planTemplate({application:'dot'})).readyForReview,false,'no history snapshot remains unverified');
 assert.equal((await planTemplate({application:'dot',previous:{stores:[]}})).readyForReview,true);
});
test('host template wires actual SDK HTTP clients and provider-specific terminal streams with mocked transports',async()=>{
 const sse=(...events)=>new Response(events.map(e=>`data: ${typeof e==='string'?e:JSON.stringify(e)}\n\n`).join(''));
 for(const kind of ['openrouter','openai','anthropic']){
  let calls=0;const provider={kind,apiKey:'fixture-only-key',model:'fixture-model',allowPaidRequests:true,maxTokens:123,fetch:async(url,init)=>{
   calls++;assert.equal(JSON.parse(init.body).model,'fixture-model');assert.equal(init.signal instanceof AbortSignal,true);
   if(kind==='openrouter'){assert.match(url,/openrouter.ai/);return sse({choices:[{index:0,delta:{content:'normalized'},finish_reason:null}]},{choices:[{index:0,delta:{},finish_reason:'stop'}]},'[DONE]')}
   if(kind==='openai'){assert.match(url,/api.openai.com/);return sse({type:'response.output_text.delta',delta:'normalized'},{type:'response.completed',response:{id:'fixture-response',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'normalized'}]}]}})}
   assert.match(url,/api.anthropic.com/);assert.equal(JSON.parse(init.body).max_tokens,123);return sse({type:'message_start',message:{content:[]}},{type:'content_block_delta',delta:{type:'text_delta',text:'normalized'}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'});
  }};
  const app=createTemplateServer({storage:'none',provider});assert.equal(calls,0);assert.equal(app.server.listening,false);
  await app.assistant.send('hello');assert.equal(calls,1);const state=app.assistant.snapshot();assert.equal(state.phase,'idle');assert.equal(state.messages[1].text,'normalized');assert.equal(state.messages[1].status,'complete');assert(!JSON.stringify(app.config).includes('fixture-only-key'));
  assert.throws(()=>createTemplateServer({storage:'none',provider:{...provider,allowPaidRequests:false}}),/allowPaidRequests/);
 }
});
test('host official CLI wiring uses only injected fake subprocess and retains execution/tools/resume gates',async()=>{
 const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const calls=[];
 const spawn=(file,args,options)=>{
  calls.push({file,args,options});const child=new EventEmitter();Object.assign(child,{stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null});child.kill=()=>{child.exitCode=143;child.stdout.end();queueMicrotask(()=>child.emit('close',143,'SIGTERM'));return true};
  queueMicrotask(()=>{child.stdout.write(JSON.stringify({type:'system',session_id:'fixture-cli-session'})+'\n');child.stdout.write(JSON.stringify({type:'assistant',message:{id:'fixture-message',content:[{type:'text',text:'normalized cli'}]}})+'\n');child.stdout.write(JSON.stringify({type:'result',result:'normalized cli',session_id:'fixture-cli-session'})+'\n');child.stdout.end();child.exitCode=0;child.emit('close',0,null)});return child;
 };
 assert.throws(()=>createTemplateServer({storage:'none',provider:{kind:'claudeCli',spawn}}),/allowExecution/);
 const app=createTemplateServer({storage:'none',provider:{kind:'claudeCli',allowExecution:true,executable:'fixture-claude-never-executed',spawn}});assert.equal(calls.length,0);await app.assistant.send('one');await app.assistant.send('two');assert.equal(app.assistant.snapshot().phase,'idle');assert.equal(app.assistant.snapshot().messages[1].text,'normalized cli');assert.equal(calls.length,2);assert.equal(calls[0].file,'fixture-claude-never-executed');assert.equal(calls[0].options.shell,false);assert.equal(calls[0].args[calls[0].args.indexOf('--tools')+1],'');assert.equal(calls[1].args[calls[1].args.indexOf('--resume')+1],'fixture-cli-session');
});
test('host provider failure reaches Dot lifecycle and redacts provider payload',async()=>{
 const app=createTemplateServer({storage:'none',provider:{kind:'openai',allowPaidRequests:true,apiKey:'fixture-secret',model:'fixture',fetch:async()=>new Response(JSON.stringify({error:'fixture-secret'}),{status:500})}});
 await app.assistant.send('hello');const state=app.assistant.snapshot();assert.equal(state.phase,'failed');assert.equal(state.messages[1].status,'failed');assert.match(state.error,/HTTP 500/);assert(!JSON.stringify(state).includes('fixture-secret'));
});
test('host template cancellation aborts the injected SDK stream and preserves cancelled lifecycle',async()=>{
 let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\n'))},cancel(){cancelled=true}});
 const app=createTemplateServer({storage:'none',provider:{kind:'openrouter',allowPaidRequests:true,apiKey:'fixture',model:'fixture',fetch:async()=>new Response(body)}});
 const running=app.assistant.send('hello');await new Promise(ok=>setImmediate(ok));app.assistant.cancel();await running;assert.equal(cancelled,true);assert.equal(app.assistant.snapshot().phase,'cancelled');assert.equal(app.assistant.snapshot().messages[1].status,'cancelled');
});
test('host template clear discards provider-native continuation state',async()=>{
 const bodies=[];const app=createTemplateServer({storage:'none',provider:{kind:'openai',apiKey:'fixture',model:'fixture',allowPaidRequests:true,fetch:async(_,init)=>{bodies.push(JSON.parse(init.body));return new Response(`data: ${JSON.stringify({type:'response.completed',response:{id:`fixture-${bodies.length}`,status:'completed',output:[]}})}\n\n`)}}});
 await app.assistant.send('one');await app.assistant.send('two');assert.equal(bodies[1].previous_response_id,'fixture-1');await app.assistant.clear();await app.assistant.send('fresh');assert.equal(bodies[2].previous_response_id,undefined);assert.deepEqual(bodies[2].input,[{role:'user',content:'fresh'}]);
});
test('template CLI capability readiness requires explicit caller attestation and never inspects authentication',async()=>{
 const {planTemplate}=await import('../templates/plan.mjs');
 assert.equal((await planTemplate({provider:'claudeCli',previous:{stores:[]}})).readyForReview,false);
 assert.equal((await planTemplate({provider:'claudeCli',previous:{stores:[]},availableCapabilities:['claude-cli.authenticated']})).readyForReview,true);
});
test('clearing an in-flight SDK stream waits for cancellation cleanup before resetting native state',async()=>{
 let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\n'))},cancel(){cancelled=true}});
 const app=createTemplateServer({storage:'none',provider:{kind:'openrouter',allowPaidRequests:true,apiKey:'fixture',model:'fixture',fetch:async()=>new Response(body)}});
 const running=app.assistant.send('hello');await new Promise(ok=>setImmediate(ok));await assert.rejects(app.assistant.send('concurrent'),/already active/);await app.assistant.clear();await running;assert.equal(cancelled,true);assert.deepEqual(app.assistant.snapshot().messages,[]);assert.equal(app.assistant.snapshot().phase,'idle');
});
