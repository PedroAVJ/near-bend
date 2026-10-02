import test from 'node:test';
import assert from 'node:assert/strict';
import Vision from '../src/generated/vision.mjs';
const tag=(name,fields={})=>({$:name,...fields});
const start=()=>{let state=Vision.initial();for(const event of ['BeginCall','Consent','StartRequested','CameraStarted'])state=Vision.reduce(tag(event),state);return state};
const metadata=(id='camera-1',at=1000n,size=32)=>tag('Metadata',{id,captured_at_ms:at,byte_length:size});
test('native Bend vision state owns independent consent and active-call gating',()=>{
 const initial=Vision.initial();assert.equal(Vision.available(initial),false);assert.equal(Vision.status(Vision.reduce(tag('StartRequested'),initial)),'off');const active=start();assert.equal(Vision.available(active),true);assert.equal(Vision.status(active),'ready');const revoked=Vision.reduce(tag('Revoke'),active);assert.equal(Vision.available(revoked),false);assert.equal(Vision.status(revoked),'off');
});
test('native Bend vision phase requires send and matching acknowledgement before accepted',()=>{
 let state=Vision.reduce(tag('Queue',{metadata:metadata()}),start());assert.equal(Vision.status(state),'pending');state=Vision.reduce(tag('Acknowledged',{id:'camera-1',event_id:'event-1'}),state);assert.equal(Vision.status(state),'pending');state=Vision.reduce(tag('Submitted',{id:'camera-1',event_id:'event-1'}),state);assert.equal(Vision.status(state),'sent');state=Vision.reduce(tag('Acknowledged',{id:'wrong',event_id:'event-1'}),state);assert.equal(Vision.status(state),'sent');state=Vision.reduce(tag('Acknowledged',{id:'camera-1',event_id:'event-1'}),state);assert.equal(Vision.status(state),'accepted');
 assert.equal(Vision.queue_allowed(metadata('camera-2',1500n),state),false);assert.equal(Vision.queue_allowed(metadata('camera-2',2000n),state),true);assert.equal(Vision.queue_allowed(metadata('camera-2',2000n,262145),state),false);
});
test('native Bend vision lifecycle discards late acknowledgements after call end',()=>{
 let state=Vision.reduce(tag('Queue',{metadata:metadata()}),start());state=Vision.reduce(tag('Submitted',{id:'camera-1',event_id:'event-1'}),state);state=Vision.reduce(tag('EndCall'),state);state=Vision.reduce(tag('Acknowledged',{id:'camera-1',event_id:'event-1'}),state);assert.equal(Vision.status(state),'off');assert.equal(state.in_call,false);assert.equal(state.latest_id,'');assert.equal(Vision.status(Vision.reduce(tag('Failed',{code:'permission_denied'}),Vision.initial())),'error');
});
test('native Bend image codec emits documented image input and GPT-Live text-only context',()=>{
 const image=tag('ImageContext',{metadata:metadata(),format:tag('PNG'),payload_base64:'iVBORw0KGgo='});const request=JSON.parse(Vision.realtime_image('event-1','item-1',image));assert.equal(request.type,'conversation.item.create');assert.equal(request.item.content[0].type,'input_image');assert.equal(request.item.content[0].image_url,'data:image/png;base64,iVBORw0KGgo=');assert.equal(request.item.role,'user');const live=JSON.parse(Vision.live_context('event-2','Visual findings "quoted"'));assert.equal(live.type,'session.instructions.append');assert.equal(live.delegation_id,null);assert.equal(live.content,'Visual findings "quoted"');assert.ok(!JSON.stringify(live).includes('base64'));
});
