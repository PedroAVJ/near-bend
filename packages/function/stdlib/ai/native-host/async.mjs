if (typeof window !== 'undefined' && typeof document !== 'undefined') throw new Error('native transport host is server-only');
const ACTIVE=Symbol.for('near-v.native-io.async.v1');
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
const failure=()=>({status:4,handle:0,data:'transport unavailable'});
/** Optional async host; factories and resources are supplied explicitly. */
export function createAsyncNativeHost({http,multipart,socket,process:subprocess,credentials=new Map(),maxDataBytes=1048576,maxHandles=256,maxUploadBytes=33554432,cleanupTimeoutMs=1000}={}) {
  if(!(credentials instanceof Map)||!uint(maxDataBytes)||!uint(maxHandles)||!maxHandles||!uint(maxUploadBytes)||!maxUploadBytes||maxUploadBytes>33554432||!Number.isFinite(cleanupTimeoutMs)||cleanupTimeoutMs<=0)throw new TypeError('invalid host limits');
  const secrets=new Map(credentials),handles=new Map();let next=1,pending=0,disposed=false;
  const text=x=>typeof x==='string'&&new TextEncoder().encode(x).length<=maxDataBytes;
  const pack=(value,id=0)=>value&&[1,2,3,4].includes(value.status)&&text(value.data)?{status:value.status,handle:id,data:value.status===4?'transport failed':value.data}:failure();
  const key=id=>{if(!uint(id)||(id!==0&&!secrets.has(id)))throw Error('unknown credential handle');return id===0?undefined:secrets.get(id);};
  async function open(factory,request) {
    if(typeof factory!=='function'||handles.size+pending>=maxHandles||next>0xffffffff)return failure();
    pending++;
    try {
      const value=await factory(request),reply=pack(value);
      if(disposed||reply.status!==1||typeof value.resource?.close!=='function'){try{await value?.resource?.close();}catch{}return failure();}
      const id=next++;handles.set(id,value.resource);return {...reply,handle:id};
    }finally{pending--;}
  }
  const bytePack=(value,id)=>value&&[1,2,3,4].includes(value.status)&&(Array.isArray(value.bytes)||value.bytes instanceof Uint8Array)&&value.bytes.length<=maxDataBytes&&Array.from(value.bytes).every(n=>Number.isInteger(n)&&n>=0&&n<=255)?{status:value.status,handle:id,bytes:value.status===4?[]:Array.from(value.bytes)}:{status:4,handle:0,bytes:[]};
  const multipartArgs=args=>{const [id,url,headers,fields,filename,mimeType,bytes]=args;return args.length===7&&[url,headers,filename,mimeType].every(text)&&Array.isArray(fields)&&fields.length<=64&&fields.every(f=>f&&typeof f.name==='string'&&typeof f.value==='string'&&new TextEncoder().encode(f.name+f.value).length<=16384)&&(Array.isArray(bytes)||bytes instanceof Uint8Array)&&bytes.length>0&&bytes.length<=maxUploadBytes&&Array.from(bytes).every(v=>Number.isInteger(v)&&v>=0&&v<=255)};
  async function dispatch(op,args) {
    const fail=()=>op==='stream.read_bytes'?{status:4,handle:0,bytes:[]}:failure();
    if(disposed||!Array.isArray(args))return fail();
    try {
      if(op==='stream.read_bytes'){const [id]=args,resource=uint(id)?handles.get(id):undefined;if(args.length!==1||!resource||typeof resource.readBytes!=='function')return fail();return bytePack(await resource.readBytes(),id);}
      if(op==='http.multipart_open'){if(!multipartArgs(args))return failure();const [id,url,headers,fields,filename,mimeType,bytes]=args;return await open(multipart,{credential:key(id),url,headers,fields,filename,mimeType,bytes});}
      if(op==='http.open') {const [id,method,url,headers,body]=args;if(args.length!==5||![method,url,headers,body].every(text))return failure();return await open(http,{credential:key(id),method,url,headers,body});}
      if(op==='socket.open') {const [id,url,headers]=args;if(args.length!==3||![url,headers].every(text))return failure();return await open(socket,{credential:key(id),url,headers});}
      if(op==='process.open') {const [id,executable,argv,input]=args;if(args.length!==4||![executable,argv,input].every(text))return failure();return await open(subprocess,{credential:key(id),executable,args:argv,input});}
      const method={'stream.read':'read','socket.send':'send','process.write':'write','transport.close':'close'}[op];
      const [id,data]=args,resource=uint(id)?handles.get(id):undefined,writes=method==='write'||method==='send';
      if(!method||!resource||args.length!==(writes?2:1)||(writes&&!text(data))||typeof resource[method]!=='function')return failure();
      if(method==='close')handles.delete(id);
      return pack(await resource[method](...(writes?[data]:[])),id);
    }catch{return fail();}
  }
  async function dispose(){
    if(disposed)return;disposed=true;const all=[...handles.values()];handles.clear();secrets.clear();
    const cleanup=[];
    for(const factory of new Set([http,multipart,socket,subprocess]))if(typeof factory?.dispose==='function')try{cleanup.push(Promise.resolve(factory.dispose()));}catch{}
    for(const resource of all)try{cleanup.push(Promise.resolve(resource.close()));}catch{}
    let timer;try{await Promise.race([Promise.allSettled(cleanup),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('native host cleanup timed out')),cleanupTimeoutMs);})]);}finally{clearTimeout(timer);}
  }
  return Object.freeze({async:true,dispatch,dispose,get openHandles(){return handles.size;}});
}
/** Sequential IO only. Rejects Base parked fd/time/fork/channel operations. */
export async function runNativeIO(action,{signal,timeoutMs=30000,maxSteps=100000,cleanupTimeoutMs=1000,dispose}={}) {
  if(typeof action!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isInteger(maxSteps)||maxSteps<=0||!Number.isFinite(cleanupTimeoutMs)||cleanupTimeoutMs<=0)throw new TypeError('invalid native IO options');
  if(globalThis[ACTIVE])throw Error('native IO driver already active');
  let rejectBoundary,timer;const boundary=new Promise((_,reject)=>{rejectBoundary=reject;});
  const abort=()=>rejectBoundary(new Error('native IO aborted'));
  if(signal?.aborted)throw new Error('native IO aborted');
  signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>rejectBoundary(new Error('native IO timed out')),timeoutMs);
  globalThis[ACTIVE]=true;
  try {
    let operation=action(value=>({$: 'Emit',value}));
    for(let step=0;step<maxSteps;step++) {
      while(operation?.$==='$JMP')operation=operation.f(...operation.x);
      if(operation?.$==='Emit')return operation.value;
      if(operation?.$==='Halt')throw new Error('Bend IO halted');
      if(operation?.$!=='$FFI'||typeof operation.run!=='function'||typeof operation.kont!=='function'||!Array.isArray(operation.args)||operation.need)throw new Error('unsupported parked or concurrent Bend IO');
      const value=await Promise.race([Promise.resolve().then(()=>operation.run(...operation.args,operation.kont)),boundary]);
      if(value===undefined)throw new Error('unsupported parked Bend IO');
      operation=operation.kont(value);
    }
    throw new Error('native IO step limit reached');
  }finally {delete globalThis[ACTIVE];clearTimeout(timer);signal?.removeEventListener('abort',abort);if(dispose){let cleanupTimer;try{await Promise.race([Promise.resolve().then(dispose),new Promise((_,reject)=>{cleanupTimer=setTimeout(()=>reject(new Error('native IO cleanup timed out')),cleanupTimeoutMs);})]);}finally{clearTimeout(cleanupTimer);}}}
}
/** Adapt only the pinned compiler's emitted CLI tail; source is compiled code. */
export function embedNativeMain(source) {
  const tail='cli(process.argv.slice(1));\nio_exit($main$, null);';
  if(typeof source!=='string'||!source.endsWith(tail))throw new Error('unsupported Bend compiler entry format');
  return source.slice(0,-tail.length)+'export default function nativeMain() { return run_loop($main$()); }\n';
}
