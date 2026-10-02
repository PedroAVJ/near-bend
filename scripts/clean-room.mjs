import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),out=mkdtempSync(join(tmpdir(),'near-function-consumer-')),payload=join(out,'payload'),consumer=join(out,'consumer');mkdirSync(payload);mkdirSync(consumer);
const cache=join(out,'npm-cache');
const events=[];function run(command,args,cwd=consumer,quiet=false){const r=spawnSync(command,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BEND_NO_TELEMETRY:'1'}});events.push({command:[command,...args],status:r.status,output:r.stdout+r.stderr});if(!quiet)process.stdout.write(r.stdout+r.stderr);if(r.status!==0){writeFileSync(join(root,'verification/clean-room.json'),JSON.stringify({directory:out,events},null,2));throw Error(`Failed ${command}`);}return r.stdout;}
const pack=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',payload,'--cache',cache],join(root,'packages/function'),true))[0];
const dotPack=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',payload,'--cache',cache],join(root,'packages/dot'),true))[0];
writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'near-function-clean-room',private:true,type:'module'}));
// Pack the exact installed lockfile dependency closure; a fresh CI npm cache
// need not contain registry metadata for packages already installed by npm ci.
const tools=['typescript','@types/node','undici-types'].map(name=>JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',payload,'--cache',cache],join(root,'node_modules',name),true))[0].filename);
run('npm',['install','--offline','--omit=optional','--ignore-scripts','--no-audit','--cache',cache,join(payload,pack.filename),join(payload,dotPack.filename),...tools.map(name=>join(payload,name))]);
for(const f of ['index.mts','runtime.mjs'])copyFileSync(join(root,'scripts/consumer',f),join(consumer,f));
run('node',['runtime.mjs']);run('node',['node_modules/typescript/bin/tsc','--strict','--noEmit','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--lib','ES2022,DOM','--types','node','index.mts']);
const pkg=join(consumer,'node_modules/near-function');
function checkImports(at){for(const f of readdirSync(at,{withFileTypes:true})){const p=join(at,f.name);if(f.isDirectory())checkImports(p);else if(f.name.endsWith('.bend'))for(const m of readFileSync(p,'utf8').matchAll(/^import\s+(\S+)/gm))if(m[1]!=='Base'&&!m[1].startsWith('./')&&!m[1].startsWith('../'))throw Error(`Nonlocal Bend dependency ${m[1]}`);}}
checkImports(pkg);
for(const entry of ['near-function.bend','near-v.bend','f.bend','stdlib/ai/ai-sdk.bend','stdlib/dot/bend/session.bend','stdlib/dot/bend/agent.bend','stdlib/dot/bend/native.bend','stdlib/dot/bend/attachments.bend','stdlib/dot/bend/vision.bend','deployment/near-function.bend'])run('bun',[join(root,'tools/bend/main.ts'),join(pkg,entry),'--check-only']);
writeFileSync(join(root,'verification/clean-room.json'),JSON.stringify({directory:out,package:pack.filename,events,passed:true},null,2)+'\n');console.log('Packed JS runtime, strict TS consumer and Base/local Bend closures pass in isolated consumer.');

for(const bin of ['near-function.js','near-v.js'])run('node',[join(pkg,'deployment/bin',bin),'dryrun','--template','dot','--first-install']);

run(process.execPath,['scripts/build.mjs'],join(consumer,'node_modules/near-dot'));
