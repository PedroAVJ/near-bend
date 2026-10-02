import { readdirSync, readFileSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const names=['near-function','near-dot'];
const dirs=['function','dot'];
const compiler=join(root,'tools/bend/main.ts');
for(let i=0;i<dirs.length;i++) {
 const at=join(root,'packages',dirs[i]); const p=JSON.parse(readFileSync(join(at,'package.json')));
 if(p.name!==names[i])throw Error(`Wrong package name: ${p.name}`);
 if(!p.files?.length || !p.exports || !(p.types || p.exports['.']?.types))throw Error(`Missing package surface: ${p.name}`);
 for(const value of Object.values(p.exports)){for(const path of typeof value==='string'?[value]:Object.values(value)){if(!path.includes('*')&&!existsSync(join(at,path)))throw Error(`Missing export target ${path}`);}}
 if(p.name==='near-function'&&Object.keys(p.dependencies??{}).some(x=>['near-bend-ai-sdk','near-open-dot','near-v','near-function','near-dot'].includes(x)))throw Error('Old standalone dependency');
 if(p.name==='near-dot'){if(p.dependencies?.['near-function']!=='0.1.0')throw Error('Dot requires F');continue;}
 for(const entry of ['near-function.bend','near-v.bend','f.bend','stdlib/ai/ai-sdk.bend','stdlib/dot/bend/session.bend','stdlib/dot/bend/agent.bend','stdlib/dot/bend/native.bend','stdlib/dot/bend/attachments.bend','stdlib/dot/bend/vision.bend','deployment/near-function.bend','deployment/tests/planner.bend','deployment/tests/source.bend','mobile/tests/native.bend']){
  readFileSync(join(at,entry));
  const r=spawnSync('bun',[compiler,join(at,entry),'--check-only'],{cwd:root,encoding:'utf8',timeout:120000,env:{...process.env,BEND_NO_TELEMETRY:'1'}});
  process.stdout.write(r.stdout+r.stderr); if(r.status!==0)process.exit(r.status??1);
 }
}
function walk(at){for(const f of readdirSync(at)) {if(['node_modules','.git','dist'].includes(f))continue; const p=join(at,f),s=lstatSync(p); if(s.isSymbolicLink()){if(!realpathSync(p).startsWith(root+'/'))throw Error(`External symlink: ${relative(root,p)}`);continue;} if(s.isDirectory())walk(p);else if(/\.(mjs|js)$/.test(f)){ const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8',timeout:120000});if(r.status)throw Error(r.stderr);}}}
walk(join(root,'packages'));console.log('Package names, dependency boundary, Bend closures, internal symlinks and JS syntax pass.');

const native=spawnSync('bun',[compiler,join(root,'packages/function/deployment/tests/source.bend')],{cwd:root,encoding:'utf8',timeout:120000,env:{...process.env,BEND_NO_TELEMETRY:'1'}});process.stdout.write(native.stdout+native.stderr);if(native.status!==0)process.exit(native.status??1);

const mobileNative=spawnSync('bun',[compiler,join(root,'packages/function/mobile/tests/native.bend')],{cwd:root,encoding:'utf8',timeout:120000,env:{...process.env,BEND_NO_TELEMETRY:'1'}});process.stdout.write(mobileNative.stdout+mobileNative.stderr);if(mobileNative.status!==0)process.exit(mobileNative.status??1);
