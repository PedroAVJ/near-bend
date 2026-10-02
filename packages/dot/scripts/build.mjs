import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const f=process.env.NEAR_FUNCTION_ROOT||fileURLToPath(new URL('./',import.meta.resolve('near-function/browser')));
const dist=join(root,'dist');await rm(dist,{recursive:true,force:true});await mkdir(join(dist,'vendor'),{recursive:true});
const aliases={'near-function/setup':'./vendor/setup.mjs','near-function/mcp-ui':'./vendor/mcp-ui.mjs','near-function/browser':'./vendor/render.mjs'};
for(const name of ['client.mjs','app.mjs']){let code=await readFile(join(root,'src',name),'utf8');for(const [key,value]of Object.entries(aliases))code=code.replaceAll("'"+key+"'","'"+value+"'");await writeFile(join(dist,name),code)}
for(const name of ['index.html','style.css'])await copyFile(join(root,'src',name),join(dist,name));
for(const [source,destination]of [['setup/client.mjs','setup.mjs'],['protocol/mcp-ui.mjs','mcp-ui.mjs'],['adapters/browser/render.mjs','render.mjs'],['adapters/browser/schema.mjs','schema.mjs']])await copyFile(join(f,source),join(dist,'vendor',destination));
for(const name of ['client.mjs','app.mjs','vendor/setup.mjs','vendor/mcp-ui.mjs','vendor/render.mjs','vendor/schema.mjs']){const code=await readFile(join(dist,name),'utf8');if(/(?:node:|setup\/server|createSetupAuthority|process\.env|provider.*key)/i.test(code))throw Error('Server-only code in browser closure: '+name)}
console.log('Open Dot web built: explicit F browser closure; no Node pairing authority or credentials.');
