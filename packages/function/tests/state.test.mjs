import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStateChannel, RevisionConflict} from '../index.mjs';
test('snapshot isolation, authorized optimistic mutation, realtime lifecycle',async()=>{
 const channel=createStateChannel({initial:{n:0},reduce:(s,c)=>({n:s.n+c}),authorize:p=>p==='owner'});
 const controller=new AbortController(), events=channel.subscribe({signal:controller.signal});
 assert.equal((await events.next()).value.state.n,0);
 await assert.rejects(channel.mutate(1,{principal:'guest'}),/Permission/);
 assert.equal(channel.snapshot().revision,0);
 const next=events.next();const committed=await channel.mutate(2,{principal:'owner',expectedRevision:0});
 assert.deepEqual((await next).value,committed); committed.state.n=99;assert.equal(channel.snapshot().state.n,2);
 await assert.rejects(channel.mutate(1,{principal:'owner',expectedRevision:0}),RevisionConflict);
 const pending=events.next();controller.abort();assert.equal((await pending).done,true);
 await assert.rejects(channel.mutate(1,{principal:'owner',signal:controller.signal}),{name:'AbortError'});
 assert.equal(channel.snapshot().revision,1);
});
test('failed reducer and racing authorized mutations preserve revision',async()=>{
 const channel=createStateChannel({initial:0,reduce:(s,c)=>{if(c<0)throw Error('invalid');return s+c;},authorize:async()=>true});
 await assert.rejects(channel.mutate(-1),/invalid/);assert.equal(channel.snapshot().revision,0);
 const results=await Promise.allSettled([channel.mutate(1,{expectedRevision:0}),channel.mutate(1,{expectedRevision:0})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(channel.snapshot().state,1);
 const stream=channel.subscribe();await stream.next();await stream.return();assert.equal((await stream.next()).done,true);
});
