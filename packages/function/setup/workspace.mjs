const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(value);
const fail = code => ({ok:false,code});
const fault = code => Object.assign(new Error(code),{code});
const MAX_TEXT = 8192;
/** Explicit offline provider for local integration; never invokes a model or network. */
export async function* fixtureWorkspaceProvider({text,signal}) {
 if(signal?.aborted) return;
 yield `Fixture response: ${text}`;
}
async function* cancellable(source,signal) {
 const iterator=source[Symbol.asyncIterator]();
 try {while(true){
  if(signal?.aborted)throw fault('cancelled');
  let abort;
  const cancelled=new Promise((_,reject)=>{abort=()=>reject(fault('cancelled'));signal?.addEventListener('abort',abort,{once:true});});
  let next;try{next=await Promise.race([iterator.next(),cancelled]);}finally{signal?.removeEventListener('abort',abort);}
  if(next.done)return;yield next.value;
 }}finally{Promise.resolve(iterator.return?.()).catch(()=>{});}
}
/** Durable workspace data shares the setup store transaction boundary. Callers must
 * supply a pairing obtained from the authority, never a request-body pairing. */
export function createWorkspaceRuntime({store,dots,provider=fixtureWorkspaceProvider,transcribe,now=Date.now}) {
 if(typeof store?.transaction!=='function'||!Array.isArray(dots)||typeof provider!=='function')throw TypeError('Store, dots and provider required');
 const catalog=new Map(dots.map(dot=>[dot.id,dot]));
 function scope(pairing,dotId,permission='chat') {
  const dot=catalog.get(dotId);
  let sameEndpoint=false;try{sameEndpoint=new URL(dot?.backend.endpoint).href===new URL(pairing?.backend?.endpoint).href;}catch{}
  if(!id(dotId)||!id(pairing?.audience)||pairing.dotId!==dotId||!dot||dot.backend.id!==pairing.backend?.id||dot.backend.kind!==pairing.backend?.kind||!sameEndpoint||(permission&&(!dot.permissions.includes(permission)||!pairing.permissions?.includes(permission))))throw fault('workspace-denied');
  return JSON.stringify([pairing.audience,pairing.backend.id,dotId]);
 }
 async function check({signal,validateSession}) {
  if(signal?.aborted)throw fault('cancelled');
  if(validateSession && !(await validateSession()))throw fault('session-required');
  if(signal?.aborted)throw fault('cancelled');
 }
 function records(state) {
  state.workspace??={version:1,conversations:{},media:{}};
  if(state.workspace.version!==1||!state.workspace.conversations||!state.workspace.media)throw Error('Invalid workspace state');
  return state.workspace;
 }
 async function update(key,fn) {return store.transaction(state=>{
  const all=records(state).conversations;
  if(!all[key]){if(Object.keys(all).length>=100)throw fault('workspace-capacity');all[key]={messages:[],requests:{}};}
  return fn(all[key]);
 });}
 return Object.freeze({
  list(pairing) {try{scope(pairing,pairing.dotId,null);const dot=catalog.get(pairing.dotId);return {ok:true,dots:[{id:dot.id,name:typeof dot.name==='string'?dot.name.slice(0,128):dot.id}]};}catch(error){return fail(error.code??'workspace-denied');}},
  async history({pairing,dotId,...context}) {try{const key=scope(pairing,dotId);await check(context);return await store.transaction(state=>({ok:true,messages:structuredClone(records(state).conversations[key]?.messages??[])}));}catch(error){return fail(error.code??'workspace-unavailable');}},
  async *stream({pairing,dotId,text,requestId,...context}) {
   let key,admitted=false;
   try {
    key=scope(pairing,dotId);
    if(!id(requestId)||typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>MAX_TEXT)throw fault('invalid-request');
    await check(context);
    const prior=await update(key,conversation=>{
     const prior=conversation.requests[requestId];
     if(prior){if(prior.text!==text)throw fault('request-conflict');if(prior.status!=='complete')throw fault('request-replayed');return structuredClone(prior);}
     if(Object.keys(conversation.requests).length>=100||conversation.messages.length>=100)throw fault('workspace-capacity');
     conversation.requests[requestId]={text,status:'pending',createdAt:now()};return null;
    });
    if(prior){await check(context);yield {type:'delta',text:prior.answer};yield {type:'done'};return;}
    admitted=true;
    const history=await store.transaction(state=>structuredClone(records(state).conversations[key].messages));
    let answer='';
    for await(const chunk of cancellable(provider({text,history,pairing,requestId,signal:context.signal}),context.signal)) {
     await check(context);
     if(typeof chunk!=='string'||Buffer.byteLength(answer+chunk)>MAX_TEXT)throw fault('provider-invalid');
     answer+=chunk;yield {type:'delta',text:chunk};
    }
    await check(context);
    await update(key,conversation=>{conversation.requests[requestId]={...conversation.requests[requestId],status:'complete',answer};conversation.messages.push({role:'user',text,requestId},{role:'assistant',text:answer,requestId});});
    admitted=false;yield {type:'done'};
   }catch(error){yield {type:'error',code:error.code??'workspace-unavailable'};}
   finally {if(admitted)await update(key,conversation=>{conversation.requests[requestId].status='interrupted';}).catch(()=>{});}
  },
  async media({pairing,dotId,mediaId,mimeType,reference,...context}) {
   let key;
   try {
    key=scope(pairing,dotId,'microphone');await check(context);
    if(!id(mediaId)||!['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg'].includes(mimeType)||typeof reference!=='string'||reference.length>2048)throw fault('invalid-request');
    const url=new URL(reference);
    if(!['https:','fixture:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw fault('media-reference-denied');
    const entry={id:mediaId,mimeType,reference,createdAt:now(),transcription:{provider:transcribe?'injected':'fixture',status:transcribe?'queued':'failed',...(transcribe?{}:{code:'transcription-unavailable'})}};
    await store.transaction(state=>{const all=records(state).media;const items=all[key]??={};if(Object.hasOwn(items,mediaId))throw fault('media-replayed');if(Object.keys(items).length>=50||Object.keys(all).length>100)throw fault('workspace-capacity');items[mediaId]=entry;});
    if(transcribe){
     try{const result=await transcribe({media:structuredClone(entry),signal:context.signal});await check(context);if(typeof result?.text!=='string'||Buffer.byteLength(result.text)>MAX_TEXT||!id(result.provider))throw fault('transcription-invalid');entry.transcription={provider:result.provider,status:'complete',text:result.text};}
     catch(error){entry.transcription={provider:'injected',status:'failed',code:error.code??'transcription-failed'};}
     await store.transaction(state=>{records(state).media[key][mediaId]=entry;});
    }
    await check(context);return {ok:true,media:entry};
   }catch(error){return fail(error.code??'workspace-unavailable');}
  },
  async getMedia({pairing,dotId,mediaId,...context}) {try{const key=scope(pairing,dotId,'microphone');await check(context);return store.transaction(state=>{const media=records(state).media[key]?.[mediaId];return media?{ok:true,media:structuredClone(media)}:fail('media-not-found');});}catch(error){return fail(error.code??'workspace-unavailable');}}
 });
}
