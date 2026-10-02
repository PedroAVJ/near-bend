import {randomBytes, createHash} from 'node:crypto';
import {mkdir, readFile, open, rename, rm, lstat} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createSetupAuthority} from './server.mjs';
import {composeMcpUI, authorizeMcpAction} from '../protocol/mcp-ui.mjs';
export const setupProtocol = 'near-function.setup.v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const failure = code => ({ok:false,code});
/** Private local filesystem store. All readers/writers must use this transaction API.
 * Lock contention fails closed; crashes may leave a lock requiring operator review.
 * It is not a distributed/network-filesystem database. */
export function createFileSetupStore(directory) {
 const root=resolve(directory), file=join(root,'state.json'), lock=join(root,'transaction.lock');
 return Object.freeze({async transaction(operation) {
  await mkdir(root,{recursive:true,mode:0o700});
  const info=await lstat(root);
  if(!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077)) throw Error('Setup store requires a private directory');
  try {await mkdir(lock,{mode:0o700});} catch(e) {if(e.code==='EEXIST')throw Error('Setup store busy');throw e;}
  let temp;
  try {
   let state={version:1,grants:[],pairings:[],sessions:[]};
   try {const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077)||info.size>4*1024*1024)throw Error('Unsafe setup state');state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(state.version!==1 || !['grants','pairings','sessions'].every(k=>Array.isArray(state[k])))throw Error('Invalid setup state');
   const result=await operation(state);
   const data=JSON.stringify(state);if(Buffer.byteLength(data)>4*1024*1024)throw Error('Setup store capacity reached');
   temp=join(root,`state-${randomBytes(12).toString('hex')}.tmp`);
   const handle=await open(temp,'wx',0o600);try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
   await rename(temp,file);temp=undefined;
   const dir=await open(root,'r');try{await dir.sync();}finally{await dir.close();}
   return result;
  } finally {if(temp)await rm(temp,{force:true});await rm(lock,{recursive:true});}
 }});
}
export function createDurableSetupAuthority({store,sessionTTL=900000,now=Date.now,...options}) {
 if(!store?.transaction || !Number.isInteger(sessionTTL)||sessionTTL<1||sessionTTL>900000)throw TypeError('Transactional store and bounded session TTL required');
 async function transact(fn){return store.transaction(async state=>{
  const grants=new Map(state.grants),pairings=new Map(state.pairings),sessions=new Map(state.sessions);
  for(const [key,s]of sessions)if(now()>=s.expiresAt)sessions.delete(key);
  const authority=createSetupAuthority({...options,now,state:{grants,pairings}});
  const result=await fn(authority,sessions,pairings);
  state.grants=[...grants];state.pairings=[...pairings];state.sessions=[...sessions];return result;
 });}
 return Object.freeze({
  issue:request=>transact(a=>a.issue(request)),cancel:request=>transact(a=>a.cancel(request)),choose:request=>transact(a=>a.choose(request)),
  redeem:request=>transact((a,sessions)=>{
   const result=a.redeem(request);if(!result.ok)return result;
   if(sessions.size>=1000)throw Error('Session capacity reached');
   const token=randomBytes(32).toString('base64url'),expiresAt=now()+sessionTTL;
   sessions.set(hash(token),{pairing:result.pairing,expiresAt});return {...result,session:{token,expiresAt}};
  }),
  session:token=>transact((a,sessions,pairings)=>{
   if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))return failure('session-required');
   const session=sessions.get(hash(token));if(!session)return failure('session-required');
   const pairing=pairings.get(`${session.pairing.audience}:${session.pairing.dotId}`);
   if(!pairing)return failure('session-required');
   return {ok:true,pairing:session.pairing,expiresAt:session.expiresAt};
  }),
  revoke:token=>transact((a,sessions,pairings)=>{
   if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))return failure('session-required');
   const session=sessions.get(hash(token));if(!session)return failure('session-required');
   const key=`${session.pairing.audience}:${session.pairing.dotId}`;pairings.delete(key);
   for(const [digest,s]of sessions)if(`${s.pairing.audience}:${s.pairing.dotId}`===key)sessions.delete(digest);
   return {ok:true};
  })
 });
}
/** Node HTTP handler. Authentication/trust configuration is supplied by the host,
 * never by request JSON. Bind only to an explicitly selected local interface. */
export function createSetupHttpHandler({authority,authenticate,origins=[],getServiceUI,dispatchAction,workspace}) {
 if(typeof authenticate!=='function')throw TypeError('Host authentication required');
 const allowed=new Set(origins),requests=new Map();
 return async (req,res)=>{
  const controller=new AbortController();req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
  const send=(status,value)=>{if(res.destroyed)return;if(res.headersSent){res.end();return;}res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  try {
   const now=Date.now(),key=req.socket.remoteAddress??'local';
   for(const [address,bucket]of requests)if(now-bucket.start>=60000)requests.delete(address);
   const bucket=requests.get(key)??{start:now,count:0};
   if(requests.size>=1000&&!requests.has(key))return send(429,failure('rate-limited'));
   requests.set(key,bucket);if(++bucket.count>120)return send(429,failure('rate-limited'));
   if(req.headers.origin&&!allowed.has(req.headers.origin))return send(403,failure('origin-denied'));
   if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
   if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');return send(200,{ok:true});}
   const url=new URL(req.url,'http://fixture.invalid');if(url.search)return send(400,failure('invalid-request'));
   const path=url.pathname;
   let body={};
   if(req.method==='POST'){
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(415,failure('json-required'));
    let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)return send(413,failure('body-too-large'));chunks.push(chunk);}
    try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,failure('invalid-json'));}
    if(!body||typeof body!=='object'||Array.isArray(body))return send(400,failure('invalid-request'));
   }else if(req.method!=='GET')return send(405,failure('method-denied'));
   if(path.startsWith('/v1/pairing/') || path==='/v1/protocol'){
    const principal=await authenticate(req);
    if(!principal||typeof principal.id!=='string'||! /^[A-Za-z0-9_-]{1,96}$/.test(principal.id))return send(401,failure('authentication-required'));
    if(path==='/v1/protocol'&&req.method==='GET')return send(200,{ok:true,protocol:setupProtocol,capabilities:['pairing','sessions',...(getServiceUI?['declarative-mcp-ui']:[]),...(workspace?['workspace-chat','media-references']:[])]});
    if(req.method!=='POST')return send(405,failure('method-denied'));
    const fields={issue:['dotId','audience','consent','callback','ttl'],redeem:['link','consent','acceptedPermissions'],cancel:['link']}[path.split('/').pop()];
    if(!fields||Object.keys(body).some(k=>!fields.includes(k)))return send(400,failure('invalid-request'));
    const operation=path.split('/').pop();const result=await authority[operation]({...body,signal:controller.signal,...(operation==='redeem'?{audience:principal.id}:{ownerId:principal.id})});return send(result.ok===false?403:200,result);
   }
   const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
   const session=await authority.session(token);if(!session.ok)return send(401,session);
   if(path==='/v1/session'&&req.method==='GET')return send(200,{...session,protocol:setupProtocol});
   if(path==='/v1/session/revoke'&&req.method==='POST')return send(200,await authority.revoke(token));
   if(workspace){
    const context={pairing:session.pairing,signal:controller.signal,validateSession:async()=> (await authority.session(token)).ok};
    if(path==='/v1/dots'&&req.method==='GET'){const result=workspace.list(session.pairing);return send(result.ok?200:403,result);}
    if(path==='/v1/chat'&&req.method==='POST'){
     if(Object.keys(body).some(k=>!['dotId','text','requestId'].includes(k)))return send(400,failure('invalid-request'));
     res.writeHead(200,{'content-type':'application/x-ndjson','cache-control':'no-store','x-content-type-options':'nosniff'});
     for await(const event of workspace.stream({...body,...context})){
      if(controller.signal.aborted)break;
      if(!res.write(JSON.stringify(event)+'\n'))await new Promise(resolve=>{const complete=()=>{res.off('drain',complete);res.off('close',complete);resolve();};res.once('drain',complete);res.once('close',complete);});
     }
     if(!res.destroyed)res.end();return;
    }
    if(path==='/v1/media'&&req.method==='POST'){
     if(Object.keys(body).some(k=>!['dotId','mediaId','mimeType','reference'].includes(k)))return send(400,failure('invalid-request'));
     const result=await workspace.media({...body,...context});return send(result.ok?200:403,result);
    }
    const history=/^\/v1\/dots\/([A-Za-z0-9_-]{1,96})\/history$/.exec(path);
    if(history&&req.method==='GET'){const result=await workspace.history({...context,dotId:history[1]});return send(result.ok?200:403,result);}
    const media=/^\/v1\/dots\/([A-Za-z0-9_-]{1,96})\/media\/([A-Za-z0-9_-]{1,96})$/.exec(path);
    if(media&&req.method==='GET'){const result=await workspace.getMedia({...context,dotId:media[1],mediaId:media[2]});return send(result.ok?200:403,result);}
   }
   const service=/^\/v1\/mcp-ui\/([A-Za-z0-9_-]{1,96})(\/action)?$/.exec(path);
   if(service && getServiceUI){
    const {resource,host}=await getServiceUI(session.pairing,service[1]);
    // Session consent bounds host policy, even if service configuration is broader.
    const bounded={...host,grantedPermissions:host.grantedPermissions.filter(p=>session.pairing.permissions.includes(p))};
    let ui;try{ui=composeMcpUI(resource,bounded);}catch{return send(403,failure('service-denied'));}if(ui.serviceId!==service[1])return send(403,failure('service-denied'));
    if(!service[2]&&req.method==='GET')return send(200,{ok:true,ui,host:bounded});
    if(service[2]&&req.method==='POST'&&dispatchAction){
     if(Object.keys(body).some(k=>!['nodeId','input'].includes(k))||!authorizeMcpAction(ui,body.nodeId,bounded))return send(403,failure('action-denied'));
     // Revalidate session after asynchronous resource lookup and before dispatch.
     if(!(await authority.session(token)).ok)return send(401,failure('session-required'));
     return send(200,{ok:true,result:await dispatchAction({pairing:session.pairing,serviceId:service[1],action:ui.nodes.find(n=>n.id===body.nodeId).action,input:body.input})});
    }
   }
   return send(404,failure('not-found'));
  }catch(error){return send(error instanceof TypeError?400:503,failure(error instanceof TypeError?'invalid-request':'host-unavailable'));}
 };
}
