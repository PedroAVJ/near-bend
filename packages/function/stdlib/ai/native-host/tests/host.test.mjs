import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createNativeHost,installNativeHost} from '../host.mjs';
const ok=(data='')=>({status:1,data});
test('raw operations preserve payload and resolve credentials only host-side',()=>{
  const calls=[];let closed=0;
  const resource={read:()=>({status:3,data:''}),send:data=>(calls.push(data),ok()),write:data=>(calls.push(data),ok()),close:()=>{closed++;return ok();}};
  const factory=request=>(calls.push(request),{...ok('opened'),resource});
  const host=createNativeHost({http:factory,socket:factory,process:factory,credentials:new Map([[7,{secret:'private-test-only'}]])});
  assert.deepEqual(host.dispatch('http.open',[7,'POST','opaque:url','opaque headers','opaque body']),{status:1,handle:1,data:'opened'});
  assert.deepEqual(calls[0],{credential:{secret:'private-test-only'},method:'POST',url:'opaque:url',headers:'opaque headers',body:'opaque body'});
  assert.equal(host.dispatch('socket.open',[0,'raw-socket','raw headers']).handle,2);
  assert.equal(host.dispatch('process.open',[0,'raw executable','raw argv','raw stdin']).handle,3);
  assert.equal(host.dispatch('stream.read',[1]).status,3);
  assert.equal(host.dispatch('socket.send',[2,'raw frame']).status,1);
  assert.equal(host.dispatch('process.write',[3,'raw input']).status,1);
  assert.equal(host.dispatch('transport.close',[1]).status,1);
  assert.equal(host.dispatch('stream.read',[1]).status,4);
  host.dispose();host.dispose();assert.equal(closed,3);assert.equal(host.openHandles,0);
  assert.equal(host.dispatch('socket.open',[0,'x','']).status,4);
});
test('no defaults; missing credentials, errors, Promise results and limits are bounded failures',async()=>{
  let opens=0;
  const host=createNativeHost({maxDataBytes:4,maxHandles:1,http:()=>{opens++;throw Error('private credentials');}});
  assert.equal(host.dispatch('http.open',[7,'GET','x','','']).status,4);assert.equal(opens,0);
  assert.equal(host.dispatch('http.open',[0,'GET','long!','','']).status,4);assert.equal(opens,0);
  assert.deepEqual(host.dispatch('http.open',[0,'GET','x','','']),{status:4,handle:0,data:'transport unavailable'});
  assert.equal(createNativeHost().dispatch('socket.open',[0,'x','']).status,4);
  assert.equal(createNativeHost({http:()=>Promise.reject(Error('private'))}).dispatch('http.open',[0,'GET','x','','']).status,4);
  assert.equal(createNativeHost({http:()=>({status:1,data:'',resource:{close:()=>ok()}}),maxHandles:1}).dispatch('http.open',[0,'GET','x','','']).handle,1);
  const limited=createNativeHost({http:()=>({status:1,data:'',resource:{close:()=>ok()}}),maxHandles:1});
  limited.dispatch('http.open',[0,'GET','x','','']);assert.equal(limited.dispatch('http.open',[0,'GET','x','','']).status,4);limited.dispose();
  await new Promise(resolve=>setImmediate(resolve));
});
test('installation requires explicit host and never replaces another registry',()=>{
  const host=createNativeHost();const remove=installNativeHost(host);
  assert.throws(()=>installNativeHost(createNativeHost()),/already installed/);remove();remove();
  const removeAgain=installNativeHost(host);removeAgain();host.dispose();
});
test('vendored compiler executes actual main IO with raw fake transport, and absent host fails closed',()=>{
  const cwd=resolve(fileURLToPath(new URL('../../../../../..',import.meta.url)));
  const dir=mkdtempSync(join(tmpdir(),'near-native-io-'));
  try {
    const generated=join(dir,'main.js');
    const compile=spawnSync('bun',[join(cwd,'tools/bend/main.ts'),fileURLToPath(new URL('./main.bend',import.meta.url)),'-o',generated],{encoding:'utf8',env:{...process.env,BEND_NO_TELEMETRY:'1'}});
    assert.equal(compile.status,0,compile.stdout+compile.stderr);
    const preload=join(dir,'fake.mjs');
    writeFileSync(preload,`import assert from 'node:assert/strict';\nimport {createNativeHost,installNativeHost} from ${JSON.stringify(new URL('../host.mjs',import.meta.url).href)};\nconst host=createNativeHost({credentials:new Map([[7,'server-private']]),http:r=>{assert.deepEqual(r,{credential:'server-private',method:'POST',url:'https://offline.invalid',headers:'raw-header',body:'raw-body'});return {status:1,data:'200',resource:{read:()=>({status:2,data:'raw-chunk'}),close:()=>({status:1,data:'closed'})}}}});installNativeHost(host);`);
    const run=spawnSync('bun',['--preload',preload,generated],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(run.stdout,'1:1:200\n2:1:raw-chunk\n1:1:closed\n');
    const absent=spawnSync('bun',[generated],{encoding:'utf8'});
    assert.equal(absent.status,0,absent.stderr);assert.equal(absent.stdout,'4:0:transport unavailable\n'.repeat(3));
    const asyncPreload=join(dir,'async-preload.mjs');
    writeFileSync(asyncPreload,`import {createAsyncNativeHost,installNativeHost} from ${JSON.stringify(new URL('../host.mjs',import.meta.url).href)};let called=0;installNativeHost(createAsyncNativeHost({http:async()=>{called++;throw Error('must never run');},credentials:new Map([[7,'private']])}));process.on('exit',()=>{if(called)process.exitCode=1;});`);
    const guarded=spawnSync('bun',['--preload',asyncPreload,generated],{encoding:'utf8'});
    assert.equal(guarded.status,0,guarded.stderr);assert.equal(guarded.stdout,'4:0:transport unavailable\n'.repeat(3));
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('async embedding drives compiled Bend IO with actual fake Promise transport',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'near-native-async-'));
  try {
    const {embedNativeMain}=await import('../async.mjs');
    const {readFileSync}=await import('node:fs');
    const cwd=resolve(fileURLToPath(new URL('../../../../../..',import.meta.url)));
    const output=join(dir,'program.js');
    const compile=spawnSync('bun',[join(cwd,'tools/bend/main.ts'),fileURLToPath(new URL('./main.bend',import.meta.url)),'-o',output],{encoding:'utf8',env:{...process.env,BEND_NO_TELEMETRY:'1'}});
    assert.equal(compile.status,0,compile.stderr);
    writeFileSync(join(dir,'program.mjs'),embedNativeMain(readFileSync(output,'utf8')));
    writeFileSync(join(dir,'driver.mjs'),`import assert from 'node:assert/strict';\nimport main from './program.mjs';\nimport {createAsyncNativeHost,runNativeIO} from ${JSON.stringify(new URL('../async.mjs',import.meta.url).href)};\nimport {installNativeHost} from ${JSON.stringify(new URL('../host.mjs',import.meta.url).href)};\nlet calls=0;const host=createAsyncNativeHost({credentials:new Map([[7,'server-private']]),http:async r=>{calls++;assert.equal(r.credential,'server-private');assert.equal(r.body,'raw-body');return {status:1,data:'200',resource:{read:async()=>({status:2,data:'raw-chunk'}),close:async()=>({status:1,data:'closed'})}}}});const remove=installNativeHost(host);try{await runNativeIO(main(),{dispose:()=>host.dispose()});assert.equal(calls,1);assert.equal(host.openHandles,0);}finally{remove();}`);
    const run=spawnSync('bun',[join(dir,'driver.mjs')],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(run.stdout,'1:1:200\n2:1:raw-chunk\n1:1:closed\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('async driver rejects parked IO, enforces timeout and abort, disposes resources',async()=>{
  const {createAsyncNativeHost,runNativeIO,embedNativeMain}=await import('../async.mjs');
  assert.throws(()=>embedNativeMain('other compiler tail'),/unsupported/);
  await assert.rejects(runNativeIO(()=>({$:'$FFI',need:()=>({read:true}),args:[],run:()=>undefined,kont:x=>x})),/unsupported/);
  const wait=()=>({$:'$FFI',args:[],run:()=>new Promise(()=>{}),kont:x=>({$:'Emit',value:x})});
  let disposed=0;
  await assert.rejects(runNativeIO(wait,{timeoutMs:5,dispose:()=>{disposed++;}}),/timed out/);
  assert.equal(disposed,1);
  const controller=new AbortController();const active=runNativeIO(wait,{signal:controller.signal});controller.abort();await assert.rejects(active,/aborted/);
  let closed=0;const host=createAsyncNativeHost({socket:async()=>({status:1,data:'',resource:{send:async data=>({status:1,data}),read:async()=>({status:3,data:''}),close:async()=>{closed++;return {status:1,data:''};}}})});
  assert.equal((await host.dispatch('socket.open',[0,'raw',''])).handle,1);
  assert.equal((await host.dispatch('socket.send',[1,'native frame'])).data,'native frame');
  await host.dispose();assert.equal(closed,1);assert.equal(host.openHandles,0);
});

test('host refuses a browser realm and bounds stalled cleanup',async()=>{
  const {runNativeIO}=await import('../async.mjs');
  await assert.rejects(runNativeIO(k=>k('done'),{cleanupTimeoutMs:5,dispose:()=>new Promise(()=>{})}),/cleanup timed out/);
  const result=spawnSync('node',['--input-type=module','-e',`globalThis.window={};globalThis.document={};await import(${JSON.stringify(new URL('../host.mjs',import.meta.url).href)});`],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/server-only/);
});

test('async open reservations obey capacity and late resources close after disposal',async()=>{
  const {createAsyncNativeHost}=await import('../async.mjs');let release,opened=0,closed=0;
  const host=createAsyncNativeHost({maxHandles:1,http:()=>{opened++;return new Promise(resolve=>{release=resolve;});}});
  const pending=host.dispatch('http.open',[0,'GET','raw','','']);
  assert.equal((await host.dispatch('http.open',[0,'GET','raw','',''])).status,4);assert.equal(opened,1);
  await host.dispose();release({status:1,data:'',resource:{close:async()=>{closed++;return {status:1,data:''};}}});
  assert.equal((await pending).status,4);assert.equal(closed,1);assert.equal(host.openHandles,0);
});
test('factory disposal aborts pending opens before handles exist; teardown is bounded',async()=>{
  const {createAsyncNativeHost}=await import('../async.mjs');let rejectOpen,aborted=0;
  const http=()=>new Promise((_,reject)=>{rejectOpen=reject;});
  http.dispose=()=>{aborted++;rejectOpen(Error('private physical request aborted'));};
  const host=createAsyncNativeHost({http});const request=host.dispatch('http.open',[0,'GET','raw','','']);
  await host.dispose();assert.equal(aborted,1);assert.equal((await request).status,4);
  const stalled=createAsyncNativeHost({cleanupTimeoutMs:5,socket:()=>({status:1,data:'',resource:{close:()=>new Promise(()=>{})}})});
  await stalled.dispatch('socket.open',[0,'raw','']);await assert.rejects(stalled.dispose(),/cleanup timed out/);assert.equal(stalled.openHandles,0);
});
test('byte reads validate bounded integers in sync and async hosts, including absent capability',async()=>{
  const {createAsyncNativeHost}=await import('../async.mjs');
  for(const factory of [createNativeHost,createAsyncNativeHost]){
    for(const bytes of [[0,127,255],new Uint8Array([0,255]),[256],[-1],[1.5],['1'],[0,1,2,3,4]]){
      const host=factory({maxDataBytes:4,http:()=>({status:1,data:'',resource:{readBytes:()=>({status:1,bytes}),close:()=>({status:1,data:''})}})});
      await host.dispatch('http.open',[0,'GET','x','','']);const reply=await host.dispatch('stream.read_bytes',[1]);
      assert.equal(reply.status,bytes.length<=4&&Array.from(bytes).every(n=>Number.isInteger(n)&&n>=0&&n<=255)?1:4);
      if(reply.status===1)assert.deepEqual(reply.bytes,Array.from(bytes));else assert.deepEqual(reply.bytes,[]);
      await host.dispose();
    }
    const host=factory({http:()=>({status:1,data:'',resource:{close:()=>({status:1,data:''})}})});
    await host.dispatch('http.open',[0,'GET','x','','']);assert.deepEqual(await host.dispatch('stream.read_bytes',[1]),{status:4,handle:0,bytes:[]});await host.dispose();
  }
});
test('actual compiled Bend byte IO marshals Con/Nil with sync CLI and async embedding',async()=>{
  const {readFileSync}=await import('node:fs');const {embedNativeMain}=await import('../async.mjs');
  const dir=mkdtempSync(join(tmpdir(),'near-native-bytes-'));
  try{
    const cwd=resolve(fileURLToPath(new URL('../../../../../..',import.meta.url))),generated=join(dir,'main.js');
    const compile=spawnSync('bun',[join(cwd,'tools/bend/main.ts'),fileURLToPath(new URL('./bytes.bend',import.meta.url)),'-o',generated],{encoding:'utf8',env:{...process.env,BEND_NO_TELEMETRY:'1'}});
    assert.equal(compile.status,0,compile.stdout+compile.stderr);
    const module=JSON.stringify(new URL('../host.mjs',import.meta.url).href);
    const build=(factory)=>`let read=0;const host=${factory}({http:()=>({status:1,data:'200',resource:{readBytes:()=>read++?{status:2,bytes:[]}:{status:1,bytes:new Uint8Array([0,127,255])},close:()=>({status:1,data:''})}})});installNativeHost(host);`;
    const preload=join(dir,'sync.mjs');writeFileSync(preload,`import {createNativeHost,installNativeHost} from ${module};${build('createNativeHost')}`);
    const run=spawnSync('bun',['--preload',preload,generated],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(run.stdout,'opened\n1:1:0,127,255,\n2:1:\nclosed\n');
    writeFileSync(join(dir,'main.mjs'),embedNativeMain(readFileSync(generated,'utf8')));
    const driver=join(dir,'driver.mjs');writeFileSync(driver,`import main from './main.mjs';import {createAsyncNativeHost,installNativeHost,runNativeIO} from ${module};${build('createAsyncNativeHost')}await runNativeIO(main(),{dispose:()=>host.dispose()});`);
    const asyncRun=spawnSync('bun',[driver],{encoding:'utf8'});assert.equal(asyncRun.status,0,asyncRun.stderr);assert.equal(asyncRun.stdout,run.stdout);
    const absent=spawnSync('bun',[generated],{encoding:'utf8'});assert.equal(absent.status,0,absent.stderr);assert.equal(absent.stdout,'opened\n4:0:\n4:0:\nclosed\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
