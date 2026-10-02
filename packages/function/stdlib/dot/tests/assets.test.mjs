import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryAssetStore} from '../src/assets.mjs';
const asset=(id='clip',bytes=new Uint8Array([0,127,255]))=>({id,bytes,mimeType:'audio/webm;codecs=opus',name:'recording.webm',kind:'audio'});
test('assets clone bytes, use safe local URLs, and serialize canonical bounded records',async()=>{
 const store=createMemoryAssetStore({urlFor:id=>'/api/assets/'+id});const input=asset();
 const stored=await store.put(input);input.bytes[0]=42;assert.equal(stored.url,'/api/assets/clip');assert.equal(store.get('clip').bytes[0],0);
 const read=store.get('clip');read.bytes[0]=99;assert.equal(store.get('clip').bytes[0],0);
 const records=await store.export(['clip']);assert.equal(records[0].bytes,'AH//');assert.equal('url' in records[0],false);
 const target=createMemoryAssetStore();await target.import(records);assert.equal(target.get('clip').url,'asset:clip');assert.deepEqual(target.get('clip').bytes,new Uint8Array([0,127,255]));
 await target.delete('clip');assert.equal(target.get('clip'),null);await store.clear();assert.equal(store.totalBytes,0);
});
test('limits, prototype, active MIME/content and URLs are rejected before mutation',async()=>{
 const store=createMemoryAssetStore({maxAssetBytes:3,maxTotalBytes:4,maxAssets:2});await store.put(asset());
 for(const bad of [{...asset('two'),bytes:new Uint8Array(4)},{...asset('../bad')},{...asset(),mimeType:'text/html'},{...asset(),name:'<script>.webm'},Object.assign(Object.create({evil:true}),asset())])await assert.rejects(store.put(bad));
 assert.equal(store.size,1);assert.equal(store.totalBytes,3);await assert.rejects(store.put(asset('two')));
 await assert.rejects(createMemoryAssetStore({urlFor:()=> 'javascript:alert(1)'}).put(asset()));
 await assert.rejects(createMemoryAssetStore().put({id:'html',bytes:new TextEncoder().encode('<html>bad</html>'),mimeType:'text/plain',name:'readme.txt',kind:'file'}));
});
test('import validates all records then atomically replaces with no private paths or object URLs',async()=>{
 const store=createMemoryAssetStore();await store.put(asset('original'));const [record]=await store.export();
 for(const records of [[{...record,bytes:'AB=='}],[record,record],[{...record,id:'../x'}],[{...record,url:'blob:private'}],[{...record,name:'/private/path'}],[{...record,bytes:'????'}]]){
  await assert.rejects(store.import(records));assert.notEqual(store.get('original'),null);
 }
 await store.import([{...record,id:'restored'}]);assert.equal(store.get('original'),null);assert.notEqual(store.get('restored'),null);
});
test('maximum 8 MiB media roundtrips canonical base64 without regexp recursion',async()=>{
 const bytes=new Uint8Array(8*1024*1024);bytes.fill(255);bytes[0]=0;bytes[bytes.length-1]=127;
 const store=createMemoryAssetStore();await store.put(asset('maximum',bytes));const records=await store.export();
 assert.equal(records[0].bytes.length,Math.ceil(bytes.length/3)*4);const restored=createMemoryAssetStore();await restored.import(records);
 assert.equal(restored.totalBytes,bytes.length);assert.deepEqual(restored.get('maximum').bytes,bytes);
 await assert.rejects(restored.import([{...records[0],bytes:records[0].bytes.slice(0,-1)+'!'}]));assert.equal(restored.totalBytes,bytes.length);
});
