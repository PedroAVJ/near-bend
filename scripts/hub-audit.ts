import * as Bend from '../tools/bend/bend.ts';
import {readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';import {resolve,dirname,relative,basename,join} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dir,'..'),directory=resolve(root,'packages/function'),entry=resolve(directory,'hub.bend'),seen=new Map<string,string|null>(),book=Bend.book_nil();
await Bend.book_load(book,entry,'',seen);Bend.book_valid(book);if(book.hols)throw Error('Incomplete Hub source');
const files:Record<string,string>={};
function include(logical:string,real:string){if(logical.startsWith('/')||logical.split('/').includes('..'))throw Error('Nonlocal Hub path');files[logical]=readFileSync(real,'utf8').replace(/^\uFEFF/,'');if(readdirSync(dirname(real)).includes('LICENSE'))files[join(dirname(logical),'LICENSE')]=readFileSync(resolve(dirname(real),'LICENSE'),'utf8').replace(/^\uFEFF/,'');}
for(const[real,ns]of seen)if(real!==Bend.BASE_BEND&&ns!==null&&!ns.startsWith('0x'))include(ns===''?basename(entry):ns+'.bend',real);
for(const[key,tld]of Object.entries(book.tlds))if(tld.$==='Def'&&tld.i&&!tld.b&&!key.startsWith('0x'))for(const real of tld.i)include(relative(directory,real),real);
const paths=Object.keys(files).sort(),sha=(data:string)=>createHash('sha256').update(data).digest('hex');const hash='0x'+sha(paths.map(p=>sha(files[p])+' '+p+'\n').join('')).slice(0,32);
for(const path of paths)if(/tests|verification|artifacts|core\.bend|\.png|\.webp/.test(path)||/\/Users\/|\.ts\.net|\bsk-(?:proj-|ant-|or-v1-)[A-Za-z0-9_-]{15,}/.test(files[path]))throw Error('Excluded Hub payload '+path);
for(const path of ['LICENSE','stdlib/ai/bend/LICENSE','stdlib/ai/native-host/LICENSE','deployment/LICENSE','stdlib/ai/bend/runtime.bend','stdlib/ai/bend/transcription-runtime.bend','stdlib/dot/bend/attachments.bend','stdlib/dot/bend/vision.bend'])if(!(path in files))throw Error('Missing Hub file '+path);
writeFileSync(resolve(root,'verification/hub-package.json'),JSON.stringify({hash,files},null,2)+'\n');console.log(JSON.stringify({hash,files:paths.length,bytes:paths.reduce((n,p)=>n+Buffer.byteLength(files[p]),0),license:files.LICENSE.split('\n')[0]}));
