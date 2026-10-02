import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const root=new URL('..',import.meta.url);
const args=process.argv.slice(2);
if(args.length && (args.length!==2||args[0]!=='--source-ref'||!/^refs\/heads\/[A-Za-z0-9/_-]+$/.test(args[1])))throw Error('Usage: history-audit.mjs [--source-ref refs/heads/main]');
const sourceRef=args[1];
function git(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout}
const rules=[['application fixture',/DEMO 1042|Sucursal Centro|Proveedor Demo|Tomate recibido|Foto de la remisi[oó]n|Recibir pedido|delivery-photo\.svg|core\.AddEmployee|core\.Employee/],['private artwork',/nearling-original\.png|near-reference\.png|pet_[a-f0-9]{20,}/],['local identifier',/\/Users\/|\/private\/var\/folders\/|\.ts\.net|pedroantoniovillanuevajuarez/],['credential',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-|ant-|or-v1-)[A-Za-z0-9_-]{15,}|\bgh[pousr]_[A-Za-z0-9]{30,}|Bearer [A-Za-z0-9_-]{25,}/]];
const auditPaths=new Set(['scripts/audit.mjs','scripts/history-audit.mjs']);
const refs=git(['for-each-ref','--format=%(refname)']).trim().split('\n').filter(Boolean);
if(sourceRef&&!refs.includes(sourceRef))throw Error('Missing source ref');
if(!sourceRef&&(refs.length!==1||refs[0]!=='refs/heads/main'))throw Error('Unexpected history refs: '+refs.join(','));
const commits=git(['rev-list',sourceRef??'--all']).trim().split('\n').filter(Boolean);
if(!commits.length)throw Error('Clean history requires a reachable commit');
const allowed=/^(?:\.github\/|AGENTS\.md$|LICENSE$|README\.md$|RELEASE_NOTES\.md$|THIRD_PARTY_NOTICES\.md$|\.gitignore$|package(?:-lock)?\.json$|packages\/(?:function|dot)\/|scripts\/|tools\/bend\/|examples\/canvas\/)/;
let scans=0;
for(const commit of commits){
 const files=git(['ls-tree','-r','--format=%(objectname) %(path)',commit]).trim().split('\n');
 for(const line of files){const split=line.indexOf(' '),id=line.slice(0,split),path=line.slice(split+1);if(!allowed.test(path)||/^(?:evidence|verification|artifacts)\/|\/core\.bend$|\/src\/(?:app|screens|review|screens_canvas)\.bend$|\.(?:tgz|png|webp|jpe?g|mp4|wav)$/.test(path))throw Error('Forbidden tree path: '+path);const text=git(['cat-file','blob',id]);if(!auditPaths.has(path))for(const [name,pattern]of rules)if(pattern.test(text))throw Error(name+' in '+path);scans++}
 const message=git(['show','-s','--format=%B',commit]);for(const [name,pattern]of rules)if(pattern.test(message))throw Error(name+' in commit metadata');
}
if(sourceRef){console.log(JSON.stringify({passed:true,mode:'source-ref',sourceRef,commits:commits.length,filesScanned:scans,repositoryObjectHygiene:'not assessed; unrelated concurrent refs preserved'}));process.exit(0);}
const objects=git(['cat-file','--batch-all-objects','--batch-check=%(objectname) %(objecttype)']).trim().split('\n');
const reached=new Set(git(['rev-list','--objects','--all']).trim().split('\n').map(l=>l.split(' ')[0]));
for(const line of objects)if(!reached.has(line.split(' ')[0]))throw Error('Unreachable object retained: '+line);
const fsck=git(['fsck','--full','--no-reflogs']);if(/dangling|unreachable/.test(fsck))throw Error(fsck);
console.log(JSON.stringify({passed:true,refs,commits:commits.length,filesScanned:scans,objects:objects.length,unreachableObjects:0}));
