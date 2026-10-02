import {test} from 'node:test';import assert from 'node:assert/strict';import native from '../src/generated/attachments.mjs';
const asset={$:'Asset',id:'asset-1',kind:{$:'AudioAsset'},mime_type:'audio/webm',name:'voice.webm',size:4,duration_ms:1200};
const status=m=>native.transcription_status(m.transcription);
test('actual compiled typed attachment reducer ignores stale attempts and retains canonical audio through cancellation',()=>{
 const original=native.audio_new('message-1',asset,'scribe_v2');assert.equal(status(original),'pending');const running=native.reduce_audio({$:'BeginTranscription'},original);assert.equal(status(running),'running');assert.equal(running.transcription.attempt,1);
 const stale=native.reduce_audio({$:'TranscriptReceived',attempt:0,text:'wrong',words:{$:'Nil'}},running);assert.equal(status(stale),'running');
 const cancelled=native.reduce_audio({$:'CancelTranscription',attempt:1},running);const late=native.reduce_audio({$:'TranscriptReceived',attempt:1,text:'late',words:{$:'Nil'}},cancelled);assert.equal(status(late),'cancelled');assert.deepEqual(late.asset,asset);
 const ready=native.reduce_audio({$:'TranscriptReceived',attempt:1,text:'typed text',words:{$:'Nil'}},running);assert.equal(status(ready),'ready');assert.equal(ready.transcription.provenance.source_asset_id,'asset-1');assert.deepEqual(ready.asset,asset);
});
test('actual compiled attachment retry policy is bounded and restore requests explicit retry',()=>{
 let m=native.audio_new('message-1',asset,'scribe_v2');for(let i=1;i<=3;i++){m=native.reduce_audio({$:'BeginTranscription'},m);m=native.reduce_audio({$:'TranscriptFailed',attempt:i,error:'offline'},m)}assert.equal(m.transcription.attempt,3);assert.equal(m.transcription.retry_required,false);m=native.reduce_audio({$:'BeginTranscription'},m);assert.equal(m.transcription.attempt,3);assert.equal(status(m),'failed');
 const pending=native.reduce_audio({$:'RestoreTranscription'},native.reduce_audio({$:'BeginTranscription'},native.audio_new('message-2',asset,'scribe_v2')));assert.equal(status(pending),'pending');assert.equal(pending.transcription.retry_required,true);
});
