import {spawnSync} from 'node:child_process';
import {mkdirSync,copyFileSync,writeFileSync,readdirSync} from 'node:fs';
import {generate,OUTPUT} from './gen/kit_canvas.mjs';
for(const name of ['kit','metrics','nearling','primitives','symbols','tokens'])copyFileSync('../../packages/function/'+name+'.bend','src/'+name+'.bend');
for(const name of ['schema','render','glass','nearling-player','shapes'])copyFileSync('../../packages/function/adapters/browser/'+name+'.mjs','src/'+name+'.mjs');
const generated=generate();
if(process.argv.includes('--check')){if((await import('node:fs')).readFileSync(OUTPUT,'utf8')!==generated)throw Error('Canvas generation drift');process.exit(0)}
writeFileSync(OUTPUT,generated);mkdirSync('dist/build',{recursive:true});
for(const args of [['src/canvas.bend','--check-only'],['src/preview.bend','-o','dist/build/app.mjs']]){const r=spawnSync('bun',['../../tools/bend/main.ts',...args],{encoding:'utf8',env:{...process.env,BEND_NO_TELEMETRY:'1'}});process.stdout.write(r.stdout+r.stderr);if(r.status!==0)process.exit(r.status??1)}
mkdirSync('dist/src',{recursive:true});
for(const f of ['schema.mjs','drive.mjs','library-client.mjs','canvas-layout.mjs','nearling-player.mjs','render.mjs','glass.mjs','shapes.mjs'])copyFileSync('src/'+f,'dist/src/'+f);
copyFileSync('src/components.css','dist/components.css');copyFileSync('src/index.html','dist/index.html');
for(const f of readdirSync('assets'))copyFileSync('assets/'+f,'dist/'+f);
