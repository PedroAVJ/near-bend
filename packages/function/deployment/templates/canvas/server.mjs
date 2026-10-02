import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {canvasRequirements} from 'near-function/requirements';
import {planApplication} from 'near-function/deploy';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
/** Preview a prebuilt canvas artifact explicitly chosen by the caller; no build or setup command. */
export function createCanvasPreview({artifactRoot,port=9472,host='127.0.0.1'}={}){
 if(typeof artifactRoot!=='string'||!artifactRoot.trim())throw new TypeError('Choose a prebuilt canvas artifactRoot explicitly');
 if(!['127.0.0.1','localhost'].includes(host))throw new TypeError('Canvas preview binds loopback only');
 if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('Invalid preview port');
 const root=resolve(artifactRoot);
 const server=createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(req.headers.host!==`${host}:${server.address()?.port??port}`){res.writeHead(403,headers);res.end('Host rejected');return}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return}
  try{
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(path.includes('\0'))throw Error('Invalid path');
   const candidate=resolve(root,'.'+(path==='/'?'/index.html':path));
   if(candidate!==root&&!candidate.startsWith(root+sep)){res.writeHead(403,headers);res.end();return}
   const realRoot=await realpath(root),file=await realpath(candidate);
   if(!file.startsWith(realRoot+sep)||(await stat(file)).isDirectory()){res.writeHead(403,headers);res.end();return}
   res.writeHead(200,{...headers,'Content-Type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch{res.writeHead(404,headers);res.end('Prebuilt canvas artifact unavailable')}
 });
 return {server,requirements:canvasRequirements,plan(observation,target={kind:'local',host,ports:{inspector:port}}){return planApplication(canvasRequirements,target,observation)},async listen(){await stat(resolve(root,'index.html'));await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});return `http://${host}:${server.address().port}`},async close(){if(!server.listening)return;server.closeAllConnections();await new Promise((ok,fail)=>server.close(e=>e?fail(e):ok()))}};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const preview=createCanvasPreview({artifactRoot:process.env.NEAR_CANVAS_ARTIFACT,port:Number(process.env.PORT??9472)});console.log(`Canvas prebuilt preview: ${await preview.listen()}`);for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{void preview.close().then(()=>process.exit(0))})}
