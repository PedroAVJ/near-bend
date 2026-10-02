import {createFetchTransport} from './raw-fetch.mjs';
/** Generic physical multipart factory: field names and values are encoded by Bend. */
export function createMultipartFetchTransport({fetch:fetchImpl=globalThis.fetch,maxUploadBytes=32*1024*1024,...options}={}) {
 if(typeof window!=='undefined')throw new Error('Native multipart credentials require a server process');
 if(!Number.isSafeInteger(maxUploadBytes)||maxUploadBytes<1||maxUploadBytes>32*1024*1024)throw new TypeError('Positive bounded maxUploadBytes required');
 const children=new Set();let disposed=false;
 const fail=()=>({status:4,data:''});
 const factory=async({credential,url,headers,fields,filename,mimeType,bytes})=>{
  if(disposed||options.allowRequests!==true)return fail();
  try {
   if(!Array.isArray(fields)||fields.length>64||!(bytes instanceof Uint8Array)&&!Array.isArray(bytes)||bytes.length<1||bytes.length>maxUploadBytes||!Array.from(bytes).every(v=>Number.isInteger(v)&&v>=0&&v<=255))return fail();
   if(typeof filename!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/.test(filename)||typeof mimeType!=='string'||!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(mimeType))return fail();
   const form=new FormData();let fieldBytes=0;const seen=new Set();
   for(const field of fields){if(!field||typeof field.name!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(field.name)||typeof field.value!=='string'||field.name==='file'||seen.has(field.name))return fail();seen.add(field.name);fieldBytes+=new TextEncoder().encode(field.name+field.value).byteLength;if(fieldBytes>16384)return fail();form.append(field.name,field.value)}
   const publicHeaders=JSON.parse(headers);if(!publicHeaders||Array.isArray(publicHeaders)||Object.keys(publicHeaders).some(k=>k.toLowerCase()==='content-type'))return fail();
   if(credential?.headers&&Object.keys(credential.headers).some(k=>k.toLowerCase()==='content-type'))return fail();
   form.append('file',new Blob([new Uint8Array(bytes)],{type:mimeType}),filename);
   const transport=createFetchTransport({...options,fetch:(target,init)=>fetchImpl(target,{...init,body:form})});children.add(transport);
   const result=await transport({credential,method:'POST',url,headers,body:''});
   if(!result.resource){children.delete(transport);return result}
   const original=result.resource.close;
   result.resource.close=async()=>{try{return await original()}finally{children.delete(transport)}};
   return result;
  }catch{return fail()}
 };
 factory.dispose=async()=>{if(disposed)return;disposed=true;await Promise.allSettled([...children].map(child=>child.dispose()));children.clear()};
 return factory;
}
