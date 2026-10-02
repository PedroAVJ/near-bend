import {createServer} from 'node:http';import {readFile,realpath,stat} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {fileURLToPath} from 'node:url';
import {createFixture} from '../src/fixture.mjs';
export function createDotPreview({port=0,artifactRoot=fileURLToPath(new URL('../dist/',import.meta.url))}={}) {
  const fixture=createFixture();let origin;
  const server=createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'");res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(!origin||req.headers.host!==new URL(origin).host){res.writeHead(403);return res.end()}
    const url=new URL(req.url,'http://localhost');
    try{
      if(url.pathname.startsWith('/fixture/')){
        if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json'){res.writeHead(403);return res.end()}
        const method=url.pathname.slice(9);if(!Object.hasOwn(fixture.adapter,method)){res.writeHead(404);return res.end()}
        let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>16384){res.writeHead(413);return res.end()}}
        const result=await fixture.adapter[method](JSON.parse(body),new AbortController().signal);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
      }
      if(req.method!=='GET'){res.writeHead(405);return res.end()}
      const path=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const target=resolve(artifactRoot,path);
      if(!target.startsWith(resolve(artifactRoot)+'/')){res.writeHead(403);return res.end()}
      const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css'};res.setHeader('Content-Type',types[extname(target)]||'application/octet-stream');const actualRoot=await realpath(artifactRoot),actual=await realpath(target);if(!actual.startsWith(actualRoot+'/')||!(await stat(actual)).isFile()){res.writeHead(403);return res.end()}res.end(await readFile(actual));
    }catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code:'fixture-request-invalid'}))}
  });
  return {listen:()=>new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;ok(origin)})}),close:()=>new Promise((ok,no)=>server.close(error=>error?no(error):ok()))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const app=createDotPreview({port:Number(process.env.PORT||9463)});console.log('Fixture preview '+await app.listen());for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0)})}
