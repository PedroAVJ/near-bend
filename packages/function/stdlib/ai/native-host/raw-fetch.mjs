/** Generic physical HTTP only. Bend owns request bodies, SSE framing and codecs. */
export function createFetchTransport({fetch:fetchImpl=globalThis.fetch,allowRequests=false,allowedOrigins=[],maxChunkBytes=65536,maxBodyBytes=1048576,maxResponseBytes=8388608,closeTimeoutMs=1000}={}) {
  if(typeof window!=='undefined')throw new Error('Native HTTP credentials require a server process');
  for(const n of [maxChunkBytes,maxBodyBytes,maxResponseBytes,closeTimeoutMs])if(!Number.isSafeInteger(n)||n<1)throw new TypeError('Positive transport limits required');
  const origins=new Set(allowedOrigins.map(value=>{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.href!==u.origin+'/')throw new TypeError('Explicit HTTPS origins required');return u.origin}));
  const controllers=new Set(),resources=new Set();let disposed=false;
  const failure=()=>({status:4,data:''});
  const bytes=value=>new TextEncoder().encode(value).length;
  async function factory({credential,method,url,headers,body}) {
    if(disposed||allowRequests!==true||typeof fetchImpl!=='function')return failure();
    let target,wireHeaders;
    try {
      target=new URL(url);if(!origins.has(target.origin)||target.protocol!=='https:'||target.username||target.password||target.hash)return failure();
      if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method)||typeof body!=='string'||bytes(body)>maxBodyBytes||typeof headers!=='string'||bytes(headers)>16384)return failure();
      const publicHeaders=JSON.parse(headers);if(!publicHeaders||Array.isArray(publicHeaders)||Object.getPrototypeOf(publicHeaders)!==Object.prototype)return failure();
      wireHeaders=new Headers();
      for(const [key,value]of Object.entries(publicHeaders)) {
        if(typeof value!=='string'||['authorization','cookie','x-api-key','xi-api-key','proxy-authorization'].includes(key.toLowerCase()))return failure();
        wireHeaders.set(key,value);
      }
      if(credential!==undefined) {
        if(!credential||typeof credential!=='object'||Array.isArray(credential)||!credential.headers||typeof credential.headers!=='object'||Array.isArray(credential.headers))return failure();
        for(const [key,value]of Object.entries(credential.headers)){if(typeof value!=='string')return failure();wireHeaders.set(key,value)}
      }
    }catch{return failure()}
    const controller=new AbortController();controllers.add(controller);let reader;
    try {
      const response=await fetchImpl(target.href,{method,headers:wireHeaders,body:['GET','HEAD'].includes(method)?undefined:body,redirect:'error',signal:controller.signal});
      if(disposed||controller.signal.aborted){await response.body?.cancel();controllers.delete(controller);return failure()}
      reader=response.body?.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let pending=new Uint8Array(0),total=0,closed=false,eof=false,reading=false,mode=null;
      const resource={
        async read(){
          if(closed||reading||mode==='bytes')return failure();mode='text';if(eof)return {status:2,data:''};reading=true;
          try{
            while(!pending.length){
              const next=await reader?.read()??{done:true};
              if(closed||controller.signal.aborted)return failure();
              if(next.done){eof=true;const tail=decoder.decode();return tail?{status:1,data:tail}:{status:2,data:''}}
              if(!(next.value instanceof Uint8Array))throw Error('Invalid HTTP bytes');
              total+=next.value.byteLength;if(total>maxResponseBytes)throw Error('Response limit');pending=next.value;
            }
            const part=pending.subarray(0,maxChunkBytes);pending=pending.subarray(part.length);
            const text=decoder.decode(part,{stream:true});
            return text?{status:1,data:text}:{status:3,data:''};
          }catch{await resource.close();return failure()}finally{reading=false}
        },
        async readBytes(){
          const failed=()=>({status:4,bytes:[]});
          if(closed||reading||mode==='text')return failed();mode='bytes';if(eof)return {status:2,bytes:[]};reading=true;
          try{
            while(!pending.length){const next=await reader?.read()??{done:true};if(closed||controller.signal.aborted)return failed();if(next.done){eof=true;return {status:2,bytes:[]}}if(!(next.value instanceof Uint8Array))throw Error('Invalid HTTP bytes');total+=next.value.byteLength;if(total>maxResponseBytes)throw Error('Response limit');pending=next.value}
            const part=pending.subarray(0,maxChunkBytes);pending=pending.subarray(part.length);return {status:1,bytes:part};
          }catch{await resource.close();return failed()}finally{reading=false}
        },
        async close(){
          if(closed)return {status:1,data:''};closed=true;controller.abort();controllers.delete(controller);resources.delete(resource);pending=new Uint8Array(0);
          let timer;
          try{await Promise.race([Promise.resolve(reader?.cancel()),new Promise(resolve=>{timer=setTimeout(resolve,closeTimeoutMs)})])}catch{}finally{clearTimeout(timer);try{reader?.releaseLock()}catch{}}
          return {status:1,data:''};
        },
      };
      resources.add(resource);
      // HTTP status is transport metadata; native code decides provider semantics.
      return {status:1,data:String(response.status),resource};
    }catch{controller.abort();controllers.delete(controller);try{await reader?.cancel()}catch{}return failure()}
  }
  factory.dispose=async()=>{if(disposed)return;disposed=true;for(const controller of controllers)controller.abort();await Promise.allSettled([...resources].map(resource=>resource.close()));controllers.clear()};
  return factory;
}
