/** Read-only local repository/artifact observation. No build, fetch, checkout or deployment. */
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {realpath,stat,readFile} from 'node:fs/promises';import {createReadStream} from 'node:fs';import {resolve,sep} from 'node:path';import {createHash} from 'node:crypto';
import {defineSource,defineSourceObservation,implementationPin,modelPin,relativeArtifactPath} from './provenance.js';
const exec=promisify(execFile),record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
async function git(root,args,signal){const {stdout}=await exec('git',['--no-optional-locks','-c','core.fsmonitor=false','-C',root,...args],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,signal,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});return stdout.trim()}
async function observeRepository(pin,roots,signal){
 if(typeof roots[pin.id]!=='string'||!roots[pin.id])return{id:pin.id,status:'missing'};
 let root;try{root=await realpath(resolve(roots[pin.id]))}catch{return{id:pin.id,status:'missing'}}
 try{if(await realpath(await git(root,['rev-parse','--show-toplevel'],signal))!==root)return{id:pin.id,status:'not-git'};const revision=await git(root,['rev-parse','--verify','HEAD'],signal),clean=(await git(root,['status','--porcelain=v1','--untracked-files=all'],signal))==='';let origin=null;try{origin=await git(root,['remote','get-url','origin'],signal)}catch{}return{id:pin.id,status:'verified',root,revision,clean,origin}}
 catch{return{id:pin.id,status:'error'}}
}
async function contained(root,path){if(!relativeArtifactPath(path))throw Error('unsafe');let file;try{file=await realpath(resolve(root,path))}catch{throw Error('missing')}if(!file.startsWith(root+sep))throw Error('unsafe');if(!(await stat(file)).isFile())throw Error('unsafe');return file}
async function artifactEvidence(pin,repository,signal,maxArtifactBytes){
 if(repository.status!=='verified')return{status:'missing'};
 let file;try{file=await contained(repository.root,pin.path)}catch(e){return{status:e.message==='unsafe'?'unsafe':'missing'}}
 try{
  const before=await stat(file),hash=createHash('sha256');let size=0;
  for await(const data of createReadStream(file,{signal})){size+=data.length;if(size>maxArtifactBytes)throw Error('too-large');hash.update(data)}
  const after=await stat(file);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('changed');
  let receipt;try{const path=await contained(repository.root,pin.receipt);if((await stat(path)).size>65536)throw Error('invalid');const value=JSON.parse(await readFile(path,'utf8'));receipt={status:'verified',repositoryId:value.repositoryId,revision:value.revision,artifactPath:value.artifactPath,sha256:value.sha256};defineSourceObservation({model:repository,implementation:repository,artifacts:{[pin.path]:{status:'verified',repositoryId:repository.id,revision:repository.revision,sha256:hash.copy().digest('hex'),receipt}}})}catch(e){receipt={status:['missing','unsafe'].includes(e.message)?e.message:'invalid'}}
  return{status:'verified',repositoryId:repository.id,revision:repository.revision,sha256:hash.digest('hex'),receipt};
 }catch{return{status:'error'}}
}
export async function observeSource(definition,repositoryRoots,{signal,maxArtifactBytes=1024*1024*1024}={}){
 const source=defineSource(definition);if(!record(repositoryRoots)||!Object.values(repositoryRoots).every(x=>typeof x==='string'))throw new TypeError('Repository roots must explicitly map repository ids to local directories');if(!Number.isSafeInteger(maxArtifactBytes)||maxArtifactBytes<1)throw new TypeError('Invalid artifact byte bound');
 const implementation=await observeRepository(implementationPin(source),repositoryRoots,signal);
 const model=source.kind==='same-repo'?implementation:await observeRepository(modelPin(source),repositoryRoots,signal);
 const artifacts=Object.create(null);for(const pin of source.artifacts)artifacts[pin.path]=await artifactEvidence(pin,implementation,signal,maxArtifactBytes);
 // HEAD/status changes during the read invalidate the observation. Reobserve before any future execution.
 if(implementation.status==='verified'){const latest=await observeRepository(implementationPin(source),repositoryRoots,signal);if(JSON.stringify(latest)!==JSON.stringify(implementation))implementation.status='error'}
 if(source.kind==='mirror'&&model.status==='verified'){const latest=await observeRepository(modelPin(source),repositoryRoots,signal);if(JSON.stringify(latest)!==JSON.stringify(model))model.status='error'}
 return defineSourceObservation({model,implementation,artifacts});
}
