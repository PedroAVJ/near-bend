/** Pure F deployment source/provenance model. No filesystem, process or network access. */
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const revision=/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const digest=/^[0-9a-f]{64}$/;
export function relativeArtifactPath(path){return typeof path==='string'&&!!path&&!/[\\\u0000-\u001f:]/.test(path)&&!path.startsWith('/')&&!path.split('/').some(x=>!x||['.','..','.git'].includes(x));}
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
function pin(value){if(!record(value)||!id.test(value.id??'')||!revision.test(value.revision??''))throw new TypeError('Repository pin needs id and full lowercase Git commit revision');if(value.origin!==undefined){if(typeof value.origin!=='string'||!value.origin)throw new TypeError('Repository origin must be a credential-free URL');let ok=/^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+$/.test(value.origin);try{const u=new URL(value.origin);ok=['https:','ssh:'].includes(u.protocol)&&!u.password&&!u.search&&!u.hash&&(!u.username||(u.protocol==='ssh:'&&u.username==='git'))}catch{}if(!ok)throw new TypeError('Repository origin must be a credential-free HTTPS or SSH URL')}return{id:value.id,revision:value.revision,...(value.origin===undefined?{}:{origin:value.origin})}}
export function defineSource(value){
 if(!record(value)||!['same-repo','mirror'].includes(value.kind))throw new TypeError('Source kind must be same-repo or mirror');
 const binding=value.kind==='same-repo'?{kind:value.kind,repository:pin(value.repository)}:{kind:value.kind,model:pin(value.model),implementation:pin(value.implementation)};
 if(binding.kind==='mirror'&&binding.model.id===binding.implementation.id)throw new TypeError('Mirror and implementation require distinct repository ids');
 if(!Array.isArray(value.artifacts)||!value.artifacts.length)throw new TypeError('Source needs nonempty produced artifact pins');
 const seen=new Set();const artifacts=value.artifacts.map(a=>{if(!record(a)||!relativeArtifactPath(a.path)||!relativeArtifactPath(a.receipt)||!digest.test(a.sha256??''))throw new TypeError('Artifact pin requires safe relative path, receipt and SHA-256');if(seen.has(a.path))throw new TypeError('Duplicate artifact pin '+a.path);seen.add(a.path);return{path:a.path,receipt:a.receipt,sha256:a.sha256}});
 return freeze({...binding,artifacts});
}
export const implementationPin=source=>source.kind==='mirror'?source.implementation:source.repository;
export const modelPin=source=>source.kind==='mirror'?source.model:source.repository;
function repositoryEvidence(v){
 if(!record(v)||!id.test(v.id??'')||!['verified','missing','not-git','error'].includes(v.status))throw new TypeError('Malformed repository observation');
 if(v.status!=='verified')return{id:v.id,status:v.status};
 if(typeof v.root!=='string'||!v.root||!revision.test(v.revision??'')||typeof v.clean!=='boolean'||!(v.origin===null||typeof v.origin==='string'))throw new TypeError('Verified repository observation needs root, revision, clean and origin');
 // Origins must also be credential-free in user-supplied snapshots.
 if(v.origin!==null)pin({id:v.id,revision:v.revision,origin:v.origin});
 return{id:v.id,status:v.status,root:v.root,revision:v.revision,clean:v.clean,origin:v.origin};
}
function receiptEvidence(v){if(!record(v)||!['verified','missing','invalid','unsafe','error'].includes(v.status))throw new TypeError('Malformed build receipt observation');if(v.status!=='verified')return{status:v.status};if(!id.test(v.repositoryId??'')||!revision.test(v.revision??'')||!relativeArtifactPath(v.artifactPath)||!digest.test(v.sha256??''))throw new TypeError('Malformed verified build receipt');return{status:v.status,repositoryId:v.repositoryId,revision:v.revision,artifactPath:v.artifactPath,sha256:v.sha256}}
export function defineSourceObservation(value){
 if(!record(value)||!record(value.artifacts))throw new TypeError('Source observation needs model, implementation and artifacts');
 const artifacts=Object.create(null);for(const [path,v]of Object.entries(value.artifacts)){if(!relativeArtifactPath(path)||!record(v)||!['verified','missing','unsafe','error'].includes(v.status))throw new TypeError('Malformed artifact observation');if(v.status!=='verified'){artifacts[path]={status:v.status};continue}if(!id.test(v.repositoryId??'')||!revision.test(v.revision??'')||!digest.test(v.sha256??''))throw new TypeError('Malformed verified artifact');artifacts[path]={status:v.status,repositoryId:v.repositoryId,revision:v.revision,sha256:v.sha256,receipt:receiptEvidence(v.receipt)}}
 return freeze({model:repositoryEvidence(value.model),implementation:repositoryEvidence(value.implementation),artifacts});
}
export function sourceSteps(definition,observation){
 const source=defineSource(definition),steps=[],add=(status,subject,detail)=>steps.push({status,subject,detail});
 if(observation===undefined){add('unverified','implementation-repository','Supply a source observation for the actual implementation repository and produced artifacts.');return steps}
 const o=defineSourceObservation(observation);
 function check(role,p,e){const subject=role+'-repository';if(e.status!=='verified'){add('blocked',subject,'actual repository '+e.status);return}if(e.id!==p.id)add('blocked',subject,'repository identity differs from declared '+p.id);if(e.revision!==p.revision)add('blocked',subject,'actual Git HEAD differs from intended revision');if(!e.clean)add('blocked',subject,'repository has uncommitted changes');if(p.origin!==undefined&&e.origin!==p.origin)add('blocked',subject,'repository origin differs from declared identity')}
 check('model',modelPin(source),o.model);check('implementation',implementationPin(source),o.implementation);
 if(o.model.status==='verified'&&o.implementation.status==='verified'){
  if(source.kind==='mirror'&&o.model.root===o.implementation.root)add('blocked','source-binding','mirror resolves to the implementation repository; distinct roots are required');
  if(source.kind==='same-repo'&&o.model.root!==o.implementation.root)add('blocked','source-binding','same-repo binding resolved to different roots');
 }
 const wanted=implementationPin(source);
 for(const a of source.artifacts){const subject='artifact:'+a.path,e=o.artifacts[a.path];if(!e){add('unverified',subject,'actual implementation artifact not observed');continue}if(e.status!=='verified'){add('blocked',subject,'implementation artifact '+e.status);continue}if(e.repositoryId!==wanted.id||e.revision!==wanted.revision)add('blocked',subject,'artifact observation belongs to a different repository or revision');if(e.sha256!==a.sha256)add('blocked',subject,'artifact bytes differ from the declared SHA-256');const r=e.receipt;if(r.status!=='verified')add('blocked',subject,'build receipt '+r.status);else if(r.repositoryId!==wanted.id||r.revision!==wanted.revision||r.artifactPath!==a.path||r.sha256!==a.sha256)add('blocked',subject,'build receipt is stale or mismatches repository, revision, path or digest')}
 if(!steps.length)add('current','implementation-provenance',wanted.id+'@'+wanted.revision+' and produced artifact bytes/receipts match; semantic equivalence is not certified');
 return steps;
}
