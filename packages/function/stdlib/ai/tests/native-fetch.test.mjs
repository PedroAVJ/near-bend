import test from 'node:test';
import assert from 'node:assert/strict';
import {createFetchTransport} from '../native-host/raw-fetch.mjs';
const request={method:'POST',url:'https://fixture.invalid/events',headers:'{"content-type":"application/json"}',body:'{"native":"request"}'};
test('physical HTTP factory is inert and fails closed before any default call',async()=>{
  let calls=0;const disabled=createFetchTransport({fetch:async()=>{calls++}});
  assert.equal((await disabled(request)).status,4);assert.equal(calls,0);
  const configured=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],fetch:async()=>{calls++}});
  assert.equal((await configured({...request,url:'https://other.invalid'})).status,4);
  assert.equal((await configured({...request,headers:'{"Authorization":"never in Bend"}'})).status,4);
  assert.equal(calls,0);await disabled.dispose();await configured.dispose();
});
test('physical bytes preserve split Unicode and raw SSE without provider decoding',async()=>{
  const text='data: {"delta":"á🙂"}\r\n\r\ndata: [DONE]\n\n',raw=new TextEncoder().encode(text);let cancelCount=0,calls=0;
  const transport=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],maxChunkBytes:1,fetch:async(url,options)=>{
    calls++;assert.equal(url,request.url);assert.equal(options.redirect,'error');assert.equal(options.headers.get('authorization'),'fixture-host-secret');assert.equal(options.body,request.body);
    return new Response(new ReadableStream({start(controller){controller.enqueue(raw);},cancel(){cancelCount++}}),{status:200});
  }});
  const opened=await transport({...request,credential:{headers:{authorization:'fixture-host-secret'}}});assert.equal(opened.status,1);assert.equal(opened.data,'200');
  let result='';for(let i=0;i<raw.length;i++){const chunk=await opened.resource.read();assert.ok([1,3].includes(chunk.status));result+=chunk.data}
  assert.equal(result,text);assert.equal(calls,1);assert.equal(JSON.stringify(opened).includes('fixture-host-secret'),false);
  await opened.resource.close();await opened.resource.close();assert.equal(cancelCount,1);await transport.dispose();
});
test('physical HTTP failure and byte limits release resources without payload leakage',async()=>{
  let cancelCount=0;const transport=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],maxResponseBytes:2,fetch:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]))},cancel(){cancelCount++}}))});
  const open=await transport(request);assert.deepEqual(await open.resource.read(),{status:4,data:''});assert.equal(cancelCount,1);await transport.dispose();
  const failed=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],fetch:async()=>{throw Error('private host key')}});assert.deepEqual(await failed(request),{status:4,data:''});await failed.dispose();
});
test('disposing during physical open aborts the pending fetch',async()=>{
  let aborted=false;const transport=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],fetch:async(_,options)=>new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'))},{once:true})})});
  const pending=transport(request);await transport.dispose();assert.deepEqual(await pending,{status:4,data:''});assert.equal(aborted,true);
});

test('physical binary reads preserve arbitrary bytes and reject mixed text mode',async()=>{
 const bytes=new Uint8Array([0,255,128,13,10]);
 const transport=createFetchTransport({allowRequests:true,allowedOrigins:['https://fixture.invalid'],maxChunkBytes:2,fetch:async()=>new Response(bytes)});
 const open=await transport(request);const got=[];for(;;){const chunk=await open.resource.readBytes();if(chunk.status===2)break;assert.equal(chunk.status,1);got.push(...chunk.bytes)}
 assert.deepEqual(got,[...bytes]);assert.deepEqual(await open.resource.read(),{status:4,data:''});await open.resource.close();await transport.dispose();
});
