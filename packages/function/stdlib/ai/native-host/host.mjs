if (typeof window !== 'undefined' && typeof document !== 'undefined') throw new Error('native transport host is server-only');
/** Raw synchronous transport registry for compiled Bend IO. No default dial/spawn. */
const HOST = Symbol.for('near-v.native-host.v1');
const failed = () => ({status:4,handle:0,data:'transport unavailable'});
const uint = n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
export function createNativeHost({http, multipart, socket, process: subprocess, credentials=new Map(), maxDataBytes=1048576, maxHandles=256, maxUploadBytes=33554432}={}) {
  if (!(credentials instanceof Map) || !uint(maxDataBytes) || !uint(maxHandles) || !maxHandles || !uint(maxUploadBytes) || !maxUploadBytes || maxUploadBytes>33554432) throw new TypeError('invalid host limits');
  const secrets=new Map(credentials), handles=new Map(); let next=1, disposed=false;
  const validText = text => typeof text==='string' && new TextEncoder().encode(text).length<=maxDataBytes;
  function result(value,handle=0) {
    if (value && typeof value.then==='function') { value.catch?.(()=>{}); return failed(); }
    if (!value || ![1,2,3,4].includes(value.status) || !validText(value.data)) return failed();
    return {status:value.status,handle,data:value.status===4?'transport failed':value.data};
  }
  function open(factory,request) {
    if (typeof factory!=='function' || handles.size>=maxHandles || next>0xffffffff) return failed();
    const value=factory(request), reply=result(value);
    if (reply.status!==1 || !value.resource || typeof value.resource.close!=='function') { try { const closing=value?.resource?.close(); closing?.catch?.(()=>{}); } catch {} return failed(); }
    const id=next++; handles.set(id,value.resource); return {...reply,handle:id};
  }
  function credential(id) {
    if (!uint(id) || (id!==0 && !secrets.has(id))) throw new Error('unknown credential handle');
    return id===0?undefined:secrets.get(id);
  }
  function byteResult(value,handle) {
    if(value && typeof value.then==='function'){value.catch?.(()=>{});return {status:4,handle:0,bytes:[]};}
    if(!value || ![1,2,3,4].includes(value.status) || !(Array.isArray(value.bytes)||value.bytes instanceof Uint8Array) || value.bytes.length>maxDataBytes || !Array.from(value.bytes).every(n=>Number.isInteger(n)&&n>=0&&n<=255))return {status:4,handle:0,bytes:[]};
    return {status:value.status,handle,bytes:value.status===4?[]:Array.from(value.bytes)};
  }
  const multipartArgs=args=>{const [id,url,headers,fields,filename,mimeType,bytes]=args;return args.length===7&&[url,headers,filename,mimeType].every(validText)&&Array.isArray(fields)&&fields.length<=64&&fields.every(f=>f&&typeof f.name==='string'&&typeof f.value==='string'&&new TextEncoder().encode(f.name+f.value).length<=16384)&&(Array.isArray(bytes)||bytes instanceof Uint8Array)&&bytes.length>0&&bytes.length<=maxUploadBytes&&Array.from(bytes).every(v=>Number.isInteger(v)&&v>=0&&v<=255)};
  function dispatch(operation,args) {
    const fail=()=>operation==='stream.read_bytes'?{status:4,handle:0,bytes:[]}:failed();
    if (disposed || !Array.isArray(args)) return fail();
    try {
      switch(operation) {
        case 'stream.read_bytes': {
          const [id]=args,resource=uint(id)?handles.get(id):undefined;
          if(args.length!==1||!resource||typeof resource.readBytes!=='function')return fail();
          return byteResult(resource.readBytes(),id);
        }
        case 'http.multipart_open': {
          if(!multipartArgs(args))return failed();const [id,url,headers,fields,filename,mimeType,bytes]=args;return open(multipart,{credential:credential(id),url,headers,fields,filename,mimeType,bytes});
        }
        case 'http.open': {
          const [key,method,url,headers,body]=args;
          if(args.length!==5 || ![method,url,headers,body].every(validText)) return failed();
          return open(http,{credential:credential(key),method,url,headers,body});
        }
        case 'socket.open': {
          const [key,url,headers]=args;
          if(args.length!==3 || ![url,headers].every(validText)) return failed();
          return open(socket,{credential:credential(key),url,headers});
        }
        case 'process.open': {
          const [key,executable,argv,input]=args;
          if(args.length!==4 || ![executable,argv,input].every(validText)) return failed();
          return open(subprocess,{credential:credential(key),executable,args:argv,input});
        }
        case 'stream.read': case 'socket.send': case 'process.write': case 'transport.close': {
          const [id,data]=args, resource=uint(id)?handles.get(id):undefined;
          const method={'stream.read':'read','socket.send':'send','process.write':'write','transport.close':'close'}[operation];
          const writes=method==='send'||method==='write';
          if(!resource || args.length!==(writes?2:1) || (writes&&!validText(data)) || typeof resource[method]!=='function') return failed();
          if(method==='close') handles.delete(id);
          return result(resource[method](...(writes?[data]:[])),id);
        }
        default: return failed();
      }
    } catch { return fail(); }
  }
  function dispose() {
    if(disposed)return; disposed=true;
    for(const factory of new Set([http,multipart,socket,subprocess]))try{const closing=factory?.dispose?.();closing?.catch?.(()=>{});}catch{}
    for(const resource of handles.values())try { const value=resource.close(); value?.catch?.(()=>{}); } catch {}
    handles.clear(); secrets.clear();
  }
  return Object.freeze({dispatch,dispose,get openHandles(){return handles.size;}});
}
export function installNativeHost(host) {
  if (!host || typeof host.dispatch!=='function') throw new TypeError('raw host required');
  if(globalThis[HOST])throw new Error('a native host is already installed');
  globalThis[HOST]=host; let removed=false;
  return () => { if(removed)return; removed=true; if(globalThis[HOST]===host)delete globalThis[HOST]; };
}

export {createAsyncNativeHost,runNativeIO,embedNativeMain} from './async.mjs';

export const nativeHostCapabilities = Object.freeze({backend:'javascript',sequentialAsyncIO:true,defaultTransports:false,baseConcurrency:false,cBackend:false});
