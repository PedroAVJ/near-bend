import {defineSource,defineSourceObservation,sourceSteps,implementationPin} from './provenance.js';
/** Offline deployment planning. This module has no I/O or execution adapters. */
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const version = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const stringList = value => Array.isArray(value) && value.every(x => typeof x === 'string');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** @param {unknown} value @returns {import('./index.js').DeploymentDefinition} */
export function defineDeployment(value) {
  const problems = [];
  if (!record(value)) throw new TypeError('Deployment definition must be an object');
  if (!identifier.test(value.name ?? '')) problems.push('name must be an identifier');
  if (!version.test(value.version ?? '')) problems.push('version must be semantic version');
  if (!Array.isArray(value.services) || !value.services.length) problems.push('services must be nonempty');
  const ids = new Set();
  for (const s of value.services ?? []) {
    if (!record(s)) { problems.push('service must be an object'); continue; }
    if (!identifier.test(s.id ?? '')) problems.push('service id must be an identifier');
    if (ids.has(s.id)) problems.push(`duplicate service ${s.id}`);
    ids.add(s.id);
    if (!['node', 'static', 'container', 'external'].includes(s.runtime)) problems.push(`${s.id}: unknown runtime`);
    if (typeof s.artifact !== 'string' || !s.artifact || s.artifact.startsWith('/') || s.artifact.split(/[\\/]/).includes('..')) problems.push(`${s.id}: artifact must be a relative path without traversal`);
    if (!stringList(s.dependsOn ?? [])) problems.push(`${s.id}: dependsOn must contain identifiers`);
    if (!stringList(s.secretRefs ?? []) || !(s.secretRefs ?? []).every(x => /^[A-Z][A-Z0-9_]*$/.test(x))) problems.push(`${s.id}: secretRefs must contain environment variable names only`);
    if (s.port !== undefined && (!Number.isInteger(s.port) || s.port < 1 || s.port > 65535)) problems.push(`${s.id}: invalid port`);
    if (s.secrets !== undefined || s.env !== undefined) problems.push(`${s.id}: inline secrets/environment values are forbidden; use secretRefs`);
  }
  if (!Array.isArray(value.stores ?? []) || !(value.stores ?? []).every(s => record(s) && identifier.test(s.id ?? '') && typeof s.location === 'string' && !!s.location)) problems.push('stores require identifiers and locations');
  const stores = new Set();
  for (const s of value.stores ?? []) { if (stores.has(s.id)) problems.push(`duplicate store ${s.id}`); stores.add(s.id); }
  if (value.address !== undefined) {
    try { const url = new URL(value.address); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { problems.push('address must be HTTP(S) without embedded credentials'); }
  }
  if (!stringList(value.acceptedBreaks ?? [])) problems.push('acceptedBreaks must contain strings');
  if (problems.length) throw new TypeError(problems.join('; '));
  const normalized = {
    name: value.name, version: value.version,
    ...(value.address === undefined ? {} : { address: value.address }),
    services: value.services.map(s => ({ id: s.id, runtime: s.runtime, artifact: s.artifact, dependsOn: [...(s.dependsOn ?? [])], secretRefs: [...(s.secretRefs ?? [])], ...(s.port === undefined ? {} : {port: s.port}) })),
    stores: (value.stores ?? []).map(s => ({id: s.id, location: s.location})),
    acceptedBreaks: [...(value.acceptedBreaks ?? [])],
    ...(value.source===undefined?{}:{source:defineSource(value.source)}),
  };
  // Graph structure stays an implementation detail; callers work with deployment services.
  for (const s of normalized.services) for (const dependency of s.dependsOn) {
    if (!ids.has(dependency)) throw new TypeError(`${s.id}: missing dependency ${dependency}`);
  }
  orderedServices(normalized.services);
  if(normalized.source)for(const service of normalized.services)if(service.runtime!=='external'&&!normalized.source.artifacts.some(a=>a.path===service.artifact))throw new TypeError(service.id+': service artifact must be pinned in the actual implementation source');
  return deepFreeze(normalized);
}

function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
function orderedServices(services) {
  const byId = new Map(services.map(s => [s.id, s]));
  const active = new Set(), done = new Set(), result = [];
  function visit(id) {
    if (active.has(id)) throw new TypeError(`dependency cycle at ${id}`);
    if (done.has(id)) return;
    active.add(id);
    byId.get(id).dependsOn.forEach(visit);
    active.delete(id); done.add(id); result.push(byId.get(id));
  }
  services.forEach(s => visit(s.id));
  return result;
}

/** Validate an explicit offline snapshot; never observes the host or providers. */
export function defineSnapshot(value) {
  if (!record(value) || !record(value.services) || !stringList(value.availableSecretRefs ?? []) || !stringList(value.availableCapabilities ?? []) || !record(value.artifacts)) throw new TypeError('Snapshot requires services, artifacts and availableSecretRefs');
  const services = {};
  for (const [id, s] of Object.entries(value.services)) {
    if (!identifier.test(id) || !record(s) || typeof s.artifact !== 'string' || !['node','static','container','external'].includes(s.runtime) || (s.port !== undefined && (!Number.isInteger(s.port) || s.port < 1 || s.port > 65535))) throw new TypeError(`invalid snapshot service ${id}`);
    services[id] = { runtime: s.runtime, artifact: s.artifact, ...(s.port === undefined ? {} : {port: s.port}) };
  }
  for (const [path, exists] of Object.entries(value.artifacts)) if (typeof exists !== 'boolean') throw new TypeError(`artifact ${path} must be a boolean`);
  if (value.previous !== undefined) {
    if (!record(value.previous) || !Array.isArray(value.previous.stores) || !value.previous.stores.every(s => record(s) && identifier.test(s.id ?? '') && typeof s.location === 'string') || (value.previous.address !== undefined && typeof value.previous.address !== 'string')) throw new TypeError('invalid previous deployment');
  }
  return deepFreeze({ ...(value.source===undefined?{}:{source:defineSourceObservation(value.source)}), services, artifacts: {...value.artifacts}, availableSecretRefs: [...(value.availableSecretRefs ?? [])], ...(value.availableCapabilities===undefined?{}:{availableCapabilities:[...value.availableCapabilities]}), ...(value.previous === undefined ? {} : {previous: {address: value.previous.address, stores: value.previous.stores.map(s => ({id:s.id, location:s.location}))}}) });
}

/** @returns {import('./index.js').DeploymentPlan} */
export function planDeployment(definition, observation) {
  const d = defineDeployment(definition);
  const o = observation === undefined ? undefined : defineSnapshot(observation);
  const steps = [];
  const add = (status, subject, detail) => steps.push({status, subject, detail});
  const breaks = [];
  if (!o) add('unverified', 'snapshot', 'Supply an explicit offline observation to verify artifacts, secrets and previous deployment.');
  const ports = new Map();
  for (const s of orderedServices(d.services)) {
    if (s.port !== undefined && s.runtime !== 'external') {
      if (ports.has(s.port)) add('blocked', s.id, `port ${s.port} conflicts with ${ports.get(s.port)}`);
      ports.set(s.port, s.id);
    }
    if (o) {
      if (o.artifacts[s.artifact] === undefined) add('unverified', s.id, `artifact ${s.artifact} not observed`);
      else if (!o.artifacts[s.artifact]) add('blocked', s.id, `artifact ${s.artifact} missing`);
      for (const ref of s.secretRefs) if (!o.availableSecretRefs.includes(ref)) add('blocked', s.id, `secret reference ${ref} unavailable`);
    }
    const wanted = {runtime: s.runtime, artifact: s.artifact, ...(s.port === undefined ? {} : {port:s.port})};
    const current = o?.services[s.id];
    add(current && same(current, wanted) ? 'current' : 'change', s.id, current ? 'service configuration differs' : 'would prepare service');
  }
  if (o?.previous) {
    if (o.previous.address !== undefined && o.previous.address !== d.address) breaks.push('address-change');
    for (const old of o.previous.stores) {
      const wanted = d.stores.find(s => s.id === old.id);
      if (!wanted) breaks.push(`store-remove:${old.id}`);
      else if (wanted.location !== old.location) breaks.push(`store-move:${old.id}`);
    }
    for (const change of breaks) add(d.acceptedBreaks.includes(change) ? 'change' : 'blocked', change, d.acceptedBreaks.includes(change) ? 'declared accepted breaking change' : 'breaking change requires explicit acceptedBreaks declaration');
    for (const id of Object.keys(o.services)) if (!d.services.some(s => s.id === id)) add('blocked', id, 'observed service removal requires a separate reviewed migration');
  } else add('unverified', 'previous-deployment', 'No prior deployment snapshot supplied; data continuity cannot be verified.');
  if(d.source)steps.push(...sourceSteps(d.source,o?.source));
  const blocked = steps.some(s => s.status === 'blocked');
  const verified = !steps.some(s => s.status === 'unverified');
  return deepFreeze({name:d.name, version:d.version, mode:'dry-run', executable:false, ...(d.source?{implementation:{repositoryId:implementationPin(d.source).id,intendedRevision:implementationPin(d.source).revision,...(o?.source?.implementation.status==='verified'?{root:o.source.implementation.root}:{})}}:{}), readyForReview:!blocked && verified, steps, breaks});
}

export function formatPlan(plan) {
  return [`${plan.name}@${plan.version} — dry-run only`, ...(plan.implementation?[`Implementation: ${plan.implementation.repositoryId}@${plan.implementation.intendedRevision}`]:[]), ...plan.steps.map(s => `${s.status.padEnd(10)} ${s.subject}: ${s.detail}`), `Ready for review: ${plan.readyForReview ? 'yes' : 'no'}. Execution is unavailable.`].join('\n');
}
export const capabilities = Object.freeze({definition:true, offlineChecks:true, snapshotPlanning:true, execution:false, liveObservation:false, automaticRollback:false, bendCompiledBridge:false, repositoryProvenance:true, semanticEquivalence:false});

/** Resolve inert application requirements against an explicit target. Never observes or configures it. */
export function resolveDeployment(requirements,target) {
  if(!record(requirements)||!identifier.test(requirements.entryService??'')||!Array.isArray(requirements.services)||!Array.isArray(requirements.stores??[]))throw new TypeError('Application requirements need entryService, services and stores');
  if(!record(target)||!['local','private'].includes(target.kind)||!record(target.ports??{})||!record(target.storeLocations??{}))throw new TypeError('Choose a local or private target with port/storage mappings');
  const host=target.host??(target.kind==='local'?'127.0.0.1':undefined);
  if(typeof host!=='string'||!host||!/^[a-zA-Z0-9.-]+$/.test(host))throw new TypeError('Target host must be a hostname or IPv4 address');
  if(target.kind==='local'&&!['127.0.0.1','localhost'].includes(host))throw new TypeError('Local target must use loopback');
  const services=requirements.services.map(s=>({...s,...(target.ports?.[s.id]===undefined?{}:{port:target.ports[s.id]})}));
  const entry=services.find(s=>s.id===requirements.entryService);
  if(!entry||entry.port===undefined)throw new TypeError('Target needs a port for the entry service');
  const stores=[];
  for(const s of requirements.stores??[]) {
    if(!record(s)||!identifier.test(s.id??'')||typeof s.required!=='boolean')throw new TypeError('Store requirements need identifier and required flag');
    const location=target.storeLocations?.[s.id];
    if(location===undefined){if(s.required)throw new TypeError(`Target storage required: ${s.id}`)}else stores.push({id:s.id,location});
  }
  return defineDeployment({name:requirements.name,version:requirements.version,address:`${target.kind==='local'?'http':'https'}://${host}:${entry.port}`,services,stores,acceptedBreaks:target.acceptedBreaks??[],...(requirements.source===undefined?{}:{source:requirements.source})});
}
export function planApplication(requirements,target,observation) {
  if(!stringList(requirements.requiredCapabilities??[])||!stringList(observation?.availableCapabilities??[]))throw new TypeError('Capabilities must be explicit names');
  if(!stringList(requirements.requiredArtifacts??[]))throw new TypeError('requiredArtifacts must be file paths');
  const plan=planDeployment(resolveDeployment(requirements,target),observation);
  const steps=[...plan.steps];
  for(const path of requirements.requiredArtifacts??[]) {
    if(typeof path!=='string'||!path||path.startsWith('/')||path.split(/[\\/]/).includes('..'))throw new TypeError('Required artifact must be a relative path without traversal');
    if(requirements.source&&!requirements.source.artifacts.some(a=>a.path===path))steps.push({status:'blocked',subject:path,detail:'required application artifact has no implementation provenance pin'});
    const exists=observation?.artifacts?.[path];
    if(exists===undefined)steps.push({status:'unverified',subject:path,detail:'required application artifact not observed'});
    else if(exists!==true)steps.push({status:'blocked',subject:path,detail:'required application artifact missing'});
  }
  for(const capability of requirements.requiredCapabilities??[]) {
    if(!observation || observation.availableCapabilities===undefined)steps.push({status:'unverified',subject:capability,detail:'required host capability not observed'});
    else if(!observation.availableCapabilities.includes(capability))steps.push({status:'blocked',subject:capability,detail:'required host capability unavailable'});
  }
  return deepFreeze({...plan,steps,readyForReview:!steps.some(s=>s.status==='blocked'||s.status==='unverified')});
}
