import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const check=process.argv.includes('--check');
const temporary=check?mkdtempSync(join(tmpdir(),'near-dot-generation-')):null;
try{
 for(const name of ['session','agent','native','attachments','vision']){
  const generated=resolve(root,`src/generated/${name}.mjs`);
  const output=check?join(temporary,`${name}.mjs`):generated;
  if(!check)mkdirSync(dirname(generated),{recursive:true});
  const result=spawnSync('bun',[resolve(root,'../../../../tools/bend/main.ts'),resolve(root,`bend/${name}.bend`),'-o',output],{encoding:'utf8',timeout:120000,env:{...process.env,BEND_NO_TELEMETRY:'1'}});
  process.stdout.write((result.stdout??'')+(result.stderr??''));
  if(result.status!==0){process.exitCode=result.status??1;break}
  if(check){if(!readFileSync(output).equals(readFileSync(generated))){console.error(`Dot generation drift: rebuild stdlib/dot/src/generated/${name}.mjs`);process.exitCode=1}else console.log(`Dot generated ${name} matches Bend source`)}
 }
}finally{if(temporary)rmSync(temporary,{recursive:true,force:true})}
