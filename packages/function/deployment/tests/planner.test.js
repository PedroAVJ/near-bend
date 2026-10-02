import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {defineDeployment, defineSnapshot, planDeployment, formatPlan, capabilities} from '../src/index.js';
const definition = {name:'demo', version:'1.2.3', address:'http://localhost:8000', services:[{id:'ui',runtime:'static',artifact:'dist/ui',dependsOn:['api']},{id:'api',runtime:'node',artifact:'dist/api.js',secretRefs:['API_KEY'],port:8001}],stores:[{id:'history',location:'./data'}]};
const observation = {services:{},artifacts:{'dist/ui':true,'dist/api.js':true},availableSecretRefs:['API_KEY'],previous:{address:'http://localhost:8000',stores:[{id:'history',location:'./data'}]}};
const clone = value => structuredClone(value);
test('topological plan, immutable detached inputs and honest capabilities', () => {
  const d = clone(definition), o = clone(observation);
  const p = planDeployment(d,o);
  assert.equal(p.mode,'dry-run'); assert.equal(p.executable,false); assert.equal(p.readyForReview,true);
  assert.deepEqual(p.steps.map(s => s.subject),['api','ui']);
  assert(Object.isFrozen(p.steps[0])); assert.deepEqual(d,definition); assert.deepEqual(o,observation);
  assert.equal(capabilities.liveObservation,false); assert.equal(capabilities.bendCompiledBridge,false);
});
test('unchanged services are current', () => {
  const o = clone(observation); o.services.api={runtime:'node',artifact:'dist/api.js',port:8001};
  assert.equal(planDeployment(definition,o).steps[0].status,'current');
});
test('cycles and dangling dependencies are rejected', () => {
  const d = clone(definition); d.services[1].dependsOn=['ui']; assert.throws(() => defineDeployment(d),/cycle/);
  d.services[1].dependsOn=['missing']; assert.throws(() => defineDeployment(d),/missing dependency/);
});
test('definitions reject duplicates, inline secrets, traversal, invalid ports and credential URLs', () => {
  const d = clone(definition); d.services.push(d.services[0]); assert.throws(() => defineDeployment(d),/duplicate service/);
  for (const mutation of [s=>{s.secrets={key:'never-shipped'};},s=>{s.artifact='../secret';},s=>{s.port=99999;}]) {
    const d=clone(definition); mutation(d.services[0]); assert.throws(() => defineDeployment(d));
  }
  const bad=clone(definition); bad.address='https://user:secret@localhost'; assert.throws(() => defineDeployment(bad),/credentials/);
});
test('missing artifact and secret reference block review', () => {
  const o=clone(observation); o.artifacts['dist/api.js']=false; o.availableSecretRefs=[];
  const p=planDeployment(definition,o); assert.equal(p.readyForReview,false);
  assert.equal(p.steps.filter(s=>s.status==='blocked').length,2);
});
test('missing observations are unverified, never silently treated as checked', () => {
  const p=planDeployment(definition); assert.equal(p.readyForReview,false); assert(p.steps.some(s=>s.status==='unverified'));
  const o=clone(observation); delete o.artifacts['dist/ui']; delete o.previous;
  const q=planDeployment(definition,o); assert.equal(q.steps.filter(s=>s.status==='unverified').length,2);
});
test('address and persistent store breaks require exact acceptance', () => {
  const d=clone(definition); d.address='http://localhost:9000'; d.stores=[];
  const p=planDeployment(d,observation); assert.deepEqual(p.breaks,['address-change','store-remove:history']); assert.equal(p.readyForReview,false);
  d.acceptedBreaks=['address-change','store-remove:history']; assert.equal(planDeployment(d,observation).readyForReview,true);
  d.stores=[{id:'history',location:'./new'}]; assert(planDeployment(d,observation).breaks.includes('store-move:history'));
});
test('port conflict and unreviewed observed service removal block review', () => {
  const d=clone(definition); d.services[0].port=8001; assert.equal(planDeployment(d,observation).readyForReview,false);
  const o=clone(observation); o.services.retired={runtime:'node',artifact:'old.js'}; assert.equal(planDeployment(definition,o).readyForReview,false);
});
test('malformed observation is rejected', () => {
  assert.throws(()=>defineSnapshot({...observation, artifacts:{'dist/ui':'yes'}}),/boolean/);
});
test('pure API performs zero filesystem/network/process work', async () => {
  const originalFetch=globalThis.fetch; let networkCalls=0;
  globalThis.fetch=()=>{networkCalls++;throw new Error('network forbidden');};
  try { for(let i=0;i<10;i++) planDeployment(definition,observation); assert.equal(networkCalls,0); }
  finally {globalThis.fetch=originalFetch;}
  const source=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
  const imports=[...source.matchAll(/import[^;]+from '([^']+)';/g)].map(m=>m[1]);assert.deepEqual(imports,['./provenance.js']);
  const pureSource=await readFile(new URL('../src/provenance.js',import.meta.url),'utf8');
  for(const text of [source.replace(/import[^;]+from '[^']+';/g,''),pureSource])assert.doesNotMatch(text,/\b(import\s|require\(|fetch\(|process\.|child_process|node:fs|XMLHttpRequest)/);
});
test('CLI dryrun leaves fixture files and work directory untouched and rejects deploy', async () => {
  const dir=await mkdtemp(join(tmpdir(),'near-function-offline-'));
  try {
    await writeFile(join(dir,'definition.json'),JSON.stringify(definition)); await writeFile(join(dir,'snapshot.json'),JSON.stringify(observation));
    const before=await readdir(dir); const cli=fileURLToPath(new URL('../bin/near-function.js',import.meta.url));
    const run=spawnSync(process.execPath,[cli,'dryrun','definition.json','snapshot.json'],{cwd:dir,encoding:'utf8',env:{PATH:''}});
    assert.equal(run.status,0,run.stderr); assert.match(run.stdout,/Ready for review: yes/); assert.match(run.stdout,/Execution is unavailable/);
    assert.deepEqual(await readdir(dir),before); assert.deepEqual(JSON.parse(await readFile(join(dir,'definition.json'),'utf8')),definition);
    const deploy=spawnSync(process.execPath,[cli,'deploy','definition.json'],{cwd:dir,encoding:'utf8',env:{PATH:''}});
    assert.equal(deploy.status,2); assert.match(deploy.stderr,/Only offline dryrun/); assert.deepEqual(await readdir(dir),before);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('application requirements resolve targets without executing or mutating inputs', async()=>{
 const {planApplication,resolveDeployment}=await import('../src/index.js');
 const requirements={name:'app',version:'1.0.0',entryService:'server',services:[{id:'server',runtime:'node',artifact:'server.mjs'}],stores:[{id:'history',required:true}],requiredArtifacts:['ui.html']};
 const target={kind:'private',host:'app.example.internal',ports:{server:9443},storeLocations:{history:'./data'}};
 const observation={services:{},artifacts:{'server.mjs':true,'ui.html':true},previous:{stores:[]}};
 const before=structuredClone({requirements,target,observation});
 const p=planApplication(requirements,target,observation);assert.equal(p.readyForReview,true);assert.equal(p.executable,false);
 assert.equal(resolveDeployment(requirements,target).address,'https://app.example.internal:9443');
 assert.deepEqual({requirements,target,observation},before);
 assert.throws(()=>resolveDeployment(requirements,{kind:'local',host:'0.0.0.0',ports:{server:9443},storeLocations:{history:'./data'}}),/loopback/);
 assert.throws(()=>resolveDeployment(requirements,{kind:'local',ports:{server:9443}}),/storage required/);
 delete observation.artifacts['ui.html'];assert.equal(planApplication(requirements,target,observation).readyForReview,false);
});

test('host capability attestations are explicit and survive snapshot validation', async()=>{
 const {dotRequirementsFor}=await import('near-function/requirements');const {defineSnapshot,planApplication}=await import('../src/index.js');
 const requirements=dotRequirementsFor('claudeCli'),target={kind:'local',ports:{assistant:9462}};
 const artifacts=Object.fromEntries([...requirements.services.map(s=>s.artifact),...requirements.requiredArtifacts].map(x=>[x,true]));
 const base={services:{},artifacts,availableSecretRefs:[],previous:{stores:[]}};
 assert.equal(planApplication(requirements,target,base).readyForReview,false);
 assert.equal(planApplication(requirements,target,{...base,availableCapabilities:[]}).readyForReview,false);
 assert.equal(planApplication(requirements,target,defineSnapshot({...base,availableCapabilities:['claude-cli.authenticated']})).readyForReview,true);
 assert.throws(()=>planApplication(requirements,target,{...base,availableCapabilities:'automatic'}),/Capabilities/);
});

test('voice profile requires only named host secret and actual audio artifacts',async()=>{
 const {dotRequirementsFor}=await import('near-function/requirements');
 const req=dotRequirementsFor('openrouter',{realtime:true});
 assert.deepEqual(req.services[0].secretRefs,['OPENROUTER_API_KEY','OPENAI_API_KEY']);
 assert.ok(req.requiredArtifacts.includes('stdlib/dot/src/capture-worklet.mjs'));
 assert.deepEqual(dotRequirementsFor('openai',{realtime:true}).services[0].secretRefs,['OPENAI_API_KEY']);
 assert.equal(JSON.stringify(req).includes('fixture-key'),false);
 const live=dotRequirementsFor('mock',{gptLive:true});assert.deepEqual(live.services[0].secretRefs,['OPENAI_API_KEY']);assert.ok(live.requiredArtifacts.includes('stdlib/ai/src/gpt-live.mjs'));assert.throws(()=>dotRequirementsFor('mock',{gptLive:true,realtime:true}),/one voice/);
});
