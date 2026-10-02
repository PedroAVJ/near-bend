const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const KINDS=new Set(['audio','photo','video','file']);
const plain=x=>x!==null&&typeof x==='object'&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const allowed=new Set(['id','bytes','mimeType','name','kind']);
function canonicalId(id){if(typeof id!=='string'||!ID.test(id)||['constructor','prototype'].includes(id))throw new TypeError('Invalid asset id');return id;}
function metadata(record){
 if(!plain(record)||Object.keys(record).some(k=>!allowed.has(k)))throw new TypeError('Invalid asset record');
 const id=canonicalId(record.id),{kind,name,mimeType}=record;
 if(!KINDS.has(kind)||typeof name!=='string'||!name||name.length>128||/[\\/<>\x00-\x1f\x7f]/.test(name))throw new TypeError('Invalid asset metadata');
 if(typeof mimeType!=='string'||mimeType.length>128||!/^[-a-zA-Z0-9.+]+\/[-a-zA-Z0-9.+]+(?:;[a-zA-Z0-9= ._-]+)?$/.test(mimeType))throw new TypeError('Invalid asset MIME type');
 const base=mimeType.split(';')[0].toLowerCase();
 if(/(?:html|xml|svg|javascript|ecmascript)/.test(base)||/\.(?:html?|svg|xml|js|mjs)$/i.test(name))throw new TypeError('Active content assets are not supported');
 if(kind==='audio'&&!base.startsWith('audio/'))throw new TypeError('Audio MIME type required');
 if(kind==='photo'&&!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(base))throw new TypeError('Supported photo MIME type required');
 if(kind==='video'&&!base.startsWith('video/'))throw new TypeError('Video MIME type required');
 return {id,mimeType,name,kind};
}
function base64(bytes){
 if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');
 let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);
}
function decode(text,max){
 if(typeof text!=='string'||text.length>Math.ceil(max/3)*4||text.length%4)throw new TypeError('Invalid asset base64');
 const padding=text.endsWith('==')?2:text.endsWith('=')?1:0,end=text.length-padding;
 for(let i=0;i<end;i++){const c=text.charCodeAt(i);if(!((c>=65&&c<=90)||(c>=97&&c<=122)||(c>=48&&c<=57)||c===43||c===47))throw new TypeError('Invalid asset base64');}
 const bytes=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(text,'base64')):Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 if(bytes.length>max||base64(bytes)!==text)throw new TypeError('Noncanonical asset base64');return bytes;
}
export function createMemoryAssetStore({maxAssetBytes=8*1024*1024,maxTotalBytes=32*1024*1024,maxAssets=128,urlFor=id=>'asset:'+id}={}){
 for(const n of [maxAssetBytes,maxTotalBytes,maxAssets])if(!Number.isSafeInteger(n)||n<=0)throw new TypeError('Positive asset limits required');
 if(typeof urlFor!=='function')throw new TypeError('Asset URL function required');
 let records=new Map(),total=0;
 function prepare(record){
  const meta=metadata(record);
  if(!(record.bytes instanceof Uint8Array)||!record.bytes.length||record.bytes.length>maxAssetBytes)throw new TypeError('Asset byte limit exceeded');
  const bytes=new Uint8Array(record.bytes);
  const prefix=new TextDecoder().decode(bytes.subarray(0,512)).trimStart();
  if(/^(?:<!doctype\s+html|<html\b|<script\b|<svg\b)/i.test(prefix))throw new TypeError('Active content assets are not supported');
  const url=urlFor(meta.id);
  if(typeof url!=='string'||(url!=='asset:'+meta.id&&url!=='/api/assets/'+encodeURIComponent(meta.id)))throw new TypeError('Unsafe asset URL');
  return {...meta,bytes,size:bytes.length,url};
 }
 const stored=r=>({id:r.id,url:r.url,mimeType:r.mimeType,size:r.size,name:r.name,kind:r.kind});
 return Object.freeze({
  async put(record){const r=prepare(record),size=total-(records.get(r.id)?.size??0)+r.size;if(size>maxTotalBytes||(!records.has(r.id)&&records.size>=maxAssets))throw new TypeError('Asset store limit exceeded');records.set(r.id,r);total=size;return stored(r);},
  get(id){const r=records.get(canonicalId(id));return r?{...stored(r),bytes:new Uint8Array(r.bytes)}:null;},
  async delete(id){id=canonicalId(id);const r=records.get(id);if(!r)return false;records.delete(id);total-=r.size;return true;},
  async clear(){records=new Map();total=0;},
  async export(ids=[...records.keys()]){if(!Array.isArray(ids)||ids.length>maxAssets||new Set(ids).size!==ids.length)throw new TypeError('Invalid export asset ids');return ids.map(id=>{const r=records.get(canonicalId(id));if(!r)throw new TypeError('Referenced asset is missing');return {id:r.id,mimeType:r.mimeType,name:r.name,kind:r.kind,bytes:base64(r.bytes)};});},
  async import(values){
   if(!Array.isArray(values)||values.length>maxAssets)throw new TypeError('Asset import limit exceeded');
   const replacement=new Map();let size=0;
   for(const value of values){if(!plain(value)||Object.keys(value).some(k=>!allowed.has(k)))throw new TypeError('Invalid asset record');const r=prepare({...metadata(value),bytes:decode(value.bytes,maxAssetBytes)});if(replacement.has(r.id))throw new TypeError('Duplicate asset id');size+=r.size;if(size>maxTotalBytes)throw new TypeError('Asset store limit exceeded');replacement.set(r.id,r);}
   records=replacement;total=size;
  },
  get size(){return records.size;},get totalBytes(){return total;}
 });
}
