import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraContext,createCameraContextRelay,validateCameraFrame} from '../src/camera-context.mjs';
const png='data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\n'+'fixture');
const frame=(id='camera-1',at=1000)=>({id,dataURI:png,capturedAtMs:at});
const fixture=options=>{let stopped=0,hardware=0,at=1000;const states=[],sent=[];const camera=createCameraContext({sendFrame:async value=>{sent.push(value);return {status:'sent',eventId:'event-'+value.id}},sendControl:value=>sent.push(value),mediaDevices:{async getUserMedia(constraints){hardware++;assert.equal(constraints.audio,false);return {getTracks:()=>[{stop(){stopped++}}]}}},video:{videoWidth:640,videoHeight:480,play:async()=>{}},canvas:{},capture:()=>png,now:()=>at,onStatus:s=>states.push(s),...options});return {camera,states,sent,get stopped(){return stopped},get hardware(){return hardware},set time(value){at=value}}};
test('camera capture requires explicit gesture and active call, no construction permission',async()=>{
 const f=fixture();assert.equal(f.hardware,0);await assert.rejects(f.camera.start(),e=>e.code==='camera_user_gesture');assert.equal(f.hardware,0);await f.camera.start({userGesture:true});assert.equal(f.hardware,1);assert.equal(f.camera.snapshot().phase,'ready');f.camera.stop();assert.equal(f.stopped,1);
 const noCall=fixture({inCall:()=>false});await assert.rejects(noCall.camera.start({userGesture:true}),e=>e.code==='camera_call_required');assert.equal(noCall.hardware,0);
});
test('camera status waits for a matching provider acknowledgment without persisting image',async()=>{
 const f=fixture();await f.camera.start({userGesture:true});const s=await f.camera.captureFrame();assert.equal(s.phase,'sent');assert.ok(!JSON.stringify(s).includes('base64'));assert.ok(f.states.some(x=>x.phase==='pending'));
 f.camera.onEvent({type:'camera.status',phase:'accepted',id:'wrong',eventId:'event-camera-1'});assert.equal(f.camera.snapshot().phase,'sent');f.camera.onEvent({type:'camera.status',phase:'accepted',id:'camera-1',eventId:'event-camera-1'});assert.equal(f.camera.snapshot().phase,'accepted');
 await assert.rejects(f.camera.captureFrame(),e=>e.code==='camera_rate_limit');f.time=2000;await f.camera.captureFrame();f.camera.stop();assert.equal(f.camera.snapshot().phase,'off');
});
test('camera off stops tracks and suppresses late hardware or capture results',async()=>{
 let resolveMedia;const tracks={stopCalls:0,stop(){this.stopCalls++}};const f=fixture({mediaDevices:{getUserMedia:()=>new Promise(resolve=>{resolveMedia=resolve})}});const started=f.camera.start({userGesture:true});f.camera.stop();resolveMedia({getTracks:()=>[tracks]});await started;assert.equal(tracks.stopCalls,1);assert.equal(f.camera.snapshot().phase,'off');
 let resolveCapture;const g=fixture({capture:()=>new Promise(resolve=>{resolveCapture=resolve})});await g.camera.start({userGesture:true});const capturing=g.camera.captureFrame();g.camera.stop();resolveCapture(png);await assert.rejects(capturing);assert.equal(g.sent.filter(x=>x.type==='camera.frame').length,0);assert.equal(g.stopped,1);
});
test('camera permission denial is explicit native error state with no active stream',async()=>{
 const f=fixture({mediaDevices:{async getUserMedia(){throw Object.assign(new Error('denied'),{name:'NotAllowedError'})}}});await assert.rejects(f.camera.start({userGesture:true}));assert.equal(f.camera.snapshot().phase,'error');assert.equal(f.camera.snapshot().code,'camera_permission_denied');assert.equal(f.camera.snapshot().active,false);
});
test('bounded frame validation rejects remote URLs, metadata, wrong signatures and excessive bytes',()=>{
 assert.equal(validateCameraFrame(frame(),{now:1000}).byteLength,15);
 const maxFrame={...frame(),dataURI:'data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\n'+'x'.repeat(262136))};assert.equal(validateCameraFrame(maxFrame,{now:1000}).byteLength,262144);
 for(const value of [{...frame(),dataURI:'https://example.com/photo.png'},{...frame(),dataURI:'data:image/png;base64,AA=='},{...frame(),capturedAtMs:40000},{...frame(),id:'private/path'},{...frame(),dataURI:'data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\n'+'x'.repeat(262144))}])assert.throws(()=>validateCameraFrame(value,{now:1000}));
});
test('Realtime camera relay is explicitly enabled and waits for item creation',async()=>{
 const sent=[],statuses=[];const relay=createCameraContextRelay({mode:'realtime-images',session:{appendImage:(dataURI,opts)=>sent.push({dataURI,...opts})},emitStatus:s=>statuses.push(s),now:()=>1000});await assert.rejects(relay.receive(frame()),e=>e.code==='camera_not_enabled');relay.enable();const result=await relay.receive(frame());assert.equal(result.status,'sent');assert.equal(relay.snapshot().phase,'sent');assert.equal(sent.length,1);assert.equal(relay.onEvent({type:'conversation.item.created',item:{id:'wrong'}}),false);relay.onEvent({type:'conversation.item.created',item:{id:'image-camera-1'}});assert.equal(relay.snapshot().phase,'accepted');assert.ok(!JSON.stringify(statuses).includes('base64'));relay.close();
});
test('GPT-Live vision sends only an explicitly delegated bounded textual result',async()=>{
 assert.throws(()=>createCameraContextRelay({mode:'vision-summary',session:{}}));const received=[],sent=[];const relay=createCameraContextRelay({mode:'vision-summary',session:{appendInstructions:(id,text,options)=>sent.push({id,text,...options})},visionDelegate:async image=>{received.push(image);return 'The caller holds a blue mug.'},now:()=>1000});relay.enable();await relay.receive(frame());assert.equal(received.length,1);assert.equal(sent[0].id,null);assert.ok(sent[0].text.includes('blue mug'));assert.ok(!sent[0].text.includes('base64'));assert.equal(relay.snapshot().phase,'sent');relay.onEvent({type:'session.instructions.appended',client_event_id:'context-camera-1'});assert.equal(relay.snapshot().phase,'accepted');relay.close();
});
test('camera relay rejects unsupported summaries and cancels late delegated results on off',async()=>{
 const bad=createCameraContextRelay({mode:'vision-summary',session:{appendInstructions(){throw Error('must not send')}},visionDelegate:async()=> 'x'.repeat(1201),now:()=>1000});bad.enable();await assert.rejects(bad.receive(frame()),e=>e.code==='camera_summary_limit');assert.equal(bad.snapshot().phase,'error');bad.close();
 let resolve;let sent=0;const relay=createCameraContextRelay({mode:'vision-summary',session:{appendInstructions(){sent++}},visionDelegate:()=>new Promise(r=>{resolve=r}),now:()=>1000});relay.enable();const run=relay.receive(frame());relay.disable();resolve('late');await assert.rejects(run);assert.equal(sent,0);assert.equal(relay.snapshot().phase,'off');relay.close();
});
test('camera context rejects provider errors without accepting or retaining images',async()=>{
 const relay=createCameraContextRelay({mode:'realtime-images',session:{appendImage(){}},now:()=>1000});relay.enable();await relay.receive(frame());assert.equal(relay.onEvent({type:'error',error:{event_id:'context-camera-1',message:'private'}}),true);assert.equal(relay.snapshot().phase,'error');assert.equal(relay.snapshot().code,'camera_provider_rejected');assert.ok(!JSON.stringify(relay.snapshot()).includes('private'));relay.close();
});

test('camera relay expires missing acknowledgments, ignores late ACKs and clears on disable',async()=>{
 let at=1000;const events=[];const relay=createCameraContextRelay({mode:'realtime-images',session:{appendImage(){}},now:()=>at,ackTimeoutMs:5,emitStatus:event=>events.push(event)});relay.enable();await relay.receive(frame());await new Promise(resolve=>setTimeout(resolve,15));assert.equal(relay.snapshot().phase,'error');assert.equal(relay.snapshot().code,'camera_ack_timeout');assert.equal(relay.onEvent({type:'conversation.item.created',item:{id:'image-camera-1'}}),false);assert.equal(relay.snapshot().phase,'error');assert.equal(relay.onEvent({type:'error',error:{event_id:'context-camera-1'}}),true);at=2000;await relay.receive(frame('camera-2',at));relay.disable();const count=events.length;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(events.length,count);assert.equal(relay.snapshot().phase,'off');relay.close();
});
test('browser camera expires a sent frame without ACK and suppresses late acceptance after off',async()=>{
 const f=fixture({ackTimeoutMs:5});await f.camera.start({userGesture:true});await f.camera.captureFrame();await new Promise(resolve=>setTimeout(resolve,15));assert.equal(f.camera.snapshot().phase,'error');assert.equal(f.camera.snapshot().code,'camera_ack_timeout');f.camera.onEvent({type:'camera.status',phase:'accepted',id:'camera-1',eventId:'event-camera-1'});assert.equal(f.camera.snapshot().phase,'error');f.time=2000;await f.camera.captureFrame();f.camera.stop();const count=f.states.length;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(f.states.length,count);assert.equal(f.stopped,1);
});

test('camera track revocation stops every track and clears pending context',async()=>{
 const target=new EventTarget();let stopped=0;target.stop=()=>{stopped++};const other={stop(){stopped++}};const f=fixture({mediaDevices:{async getUserMedia(){return {getTracks:()=>[target,other]}}}});await f.camera.start({userGesture:true});await f.camera.captureFrame();target.dispatchEvent(new Event('ended'));assert.equal(f.camera.snapshot().phase,'off');assert.equal(stopped,2);target.dispatchEvent(new Event('ended'));assert.equal(stopped,2);f.camera.onEvent({type:'camera.status',phase:'accepted',id:'camera-1',eventId:'event-camera-1'});assert.equal(f.camera.snapshot().phase,'off');
});

test('camera allows only one pending operation while capture itself is deferred',async()=>{
 let release;let captures=0;const f=fixture({capture:()=>{captures++;return new Promise(resolve=>{release=resolve})}});await f.camera.start({userGesture:true});const first=f.camera.captureFrame();f.time=2000;await assert.rejects(f.camera.captureFrame(),error=>error.code==='camera_pending');assert.equal(captures,1);assert.equal(f.sent.filter(event=>event.type==='camera.frame').length,0);release(png);await first;assert.equal(f.sent.filter(event=>event.type==='camera.frame').length,1);f.camera.stop();
});
