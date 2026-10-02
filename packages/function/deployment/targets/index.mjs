/** Selectable release readiness contracts. This module performs no I/O or execution. */
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
const specs={
 'github-source':[['source-integrity','Source revision, clean contents and provenance'],['secrets-audit','Source/history contents inspected for private material'],['destination','Intended repository identity and source-sync scope'],['namespace','Repository destination ownership or availability'],['authentication','Source-host authorization observed'],['source-policy','Branch/history and license policy checks']],
 'hub-package':[['manifest','Installable package name, version and entry points'],['dependency-closure','Published imports resolve from package contents'],['compiler','Compiler and public declaration checks'],['tests','Applicable package tests'],['generation','Generated files match source'],['package-contents','Package archive audited for secrets and private paths'],['consumer','Isolated package consumer checks'],['namespace','Package namespace ownership or availability'],['authentication','Package registry authorization observed']],
 backend:[['artifact','Exact deployment artifact bytes and provenance'],['runtime','Required server runtime is implemented and available'],['configuration','Explicit service/store configuration'],['secret-refs','Required server-side credential references observed'],['connectivity','Target/backend connectivity observed'],['lifecycle','Startup, cancellation and failure behavior verified'],['authentication','Deployment destination authorization observed']],
 'macos-app':[['artifact','Exact macOS application bundle'],['native-runtime','Required native host adapters implemented'],['device-tests','Application behavior observed on macOS'],['signing','Signing evidence for exact bundle'],['entitlements','Entitlements reviewed for intended distribution'],['distribution-review','Notarization/store/distribution evidence as applicable']],
 'ios-app-store':[['artifact','Exact iOS bundle'],['native-runtime','Required iOS sandbox and adapters implemented'],['device-tests','Application behavior observed on iOS'],['signing','Signing evidence for exact bundle'],['privacy-content','Privacy, embedded-content and permission requirements checked'],['store-review','External Apple review evidence for exact app/version/bundle']],
 'android-play':[['artifact','Exact Android application bundle'],['native-runtime','Required Android sandbox and adapters implemented'],['device-tests','Application behavior observed on Android'],['signing','Signing evidence for exact bundle'],['privacy-content','Privacy, embedded-content and permission requirements checked'],['store-review','External Google Play review evidence for exact app/version/bundle']],
 web:[['artifact','Exact web build and dependency closure'],['browser-tests','Desktop/mobile browser flows verified'],['configuration','Explicit hosting configuration'],['security','Content origins, callback routing and client-secret audit'],['connectivity','Hosting/backend connectivity observed'],['authentication','Hosting destination authorization observed']]
};
export const releaseOperationMeanings=freeze({push:'Git source remote synchronization',build:'Artifact compilation',release:'Version designation',publish:'Package distribution',deploy:'Runtime target activation',submit:'Store review submission'});
const operations={'github-source':['push'],'hub-package':['build','release','publish'],backend:['build','deploy'],'macos-app':['build','release','publish'],'ios-app-store':['build','release','submit'],'android-play':['build','release','submit'],web:['build','deploy']};
export const releaseTargetCatalog=freeze(Object.fromEntries(Object.entries(specs).map(([id,checks])=>[id,{id,operations:operations[id],checks:checks.map(([id,requirement])=>({id,requirement}))}])));
export const releaseCheckStatuses=freeze(['passed','failed','absent','unimplemented','not-observed']);
export function defineReleaseTargets(selected){
 if(!Array.isArray(selected)||selected.length===0||selected.some(x=>typeof x!=='string'||!Object.hasOwn(releaseTargetCatalog,x))||new Set(selected).size!==selected.length)throw new TypeError('Select one or more distinct supported release targets');
 return freeze([...selected]);
}
/** Observations are caller supplied evidence, not credential probes or approval certification. */
export function planReleaseTargets(selected,observations={}){
 const targets=defineReleaseTargets(selected);
 if(!observations||typeof observations!=='object'||Array.isArray(observations))throw new TypeError('Observations must be keyed by target');
 const plans=targets.map(target=>{
  const supplied=observations[target]??{};
  if(typeof supplied!=='object'||Array.isArray(supplied))throw new TypeError(`Invalid observation for ${target}`);
  const known=releaseTargetCatalog[target].checks.map(x=>x.id);
  for(const key of Object.keys(supplied))if(!known.includes(key))throw new TypeError(`Unknown check ${target}:${key}`);
  const checks=releaseTargetCatalog[target].checks.map(({id,requirement})=>{
   const evidence=supplied[id];
   if(evidence===undefined)return {id,target,status:'not-observed',reason:`No observation supplied for ${target}:${id}. Required: ${requirement}.`};
   if(!evidence||!releaseCheckStatuses.includes(evidence.status)||typeof evidence.reason!=='string'||!evidence.reason.trim()||evidence.reason.length>2048||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(evidence.reason))throw new TypeError(`Check ${target}:${id} needs a supported status and exact reason`);
   return {id,target,status:evidence.status,reason:evidence.reason};
  });
  return {target,ready:checks.every(x=>x.status==='passed'),checks};
 });
 const blockers=plans.flatMap(p=>p.checks.filter(x=>x.status!=='passed'));
 return freeze({mode:'dry-run',executable:false,authority:'preparation-only',ready:plans.every(x=>x.ready),selected:targets,targets:plans,blockers,trust:'caller-supplied evidence; no live observation or approval certification'});
}
export function formatReleaseTargets(plan){
 return [`Release preparation: ${plan.ready?'ready for review':'blocked'}; dry-run only`,...plan.targets.flatMap(t=>[`${t.target}: ${t.ready?'ready for review':'blocked'}`,...t.checks.map(c=>`  ${c.status} ${c.id}: ${c.reason}`)])].join('\n');
}
