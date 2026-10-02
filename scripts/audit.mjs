import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');mkdirSync(join(root,'verification'),{recursive:true});
const rules=[['credential',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-|ant-|or-v1-)[A-Za-z0-9_-]{15,}|\bgh[pousr]_[A-Za-z0-9]{30,}|Bearer [A-Za-z0-9_-]{25,}/],['private host/path',/\/Users\/|\/private\/var\/folders\/|\.ts\.net|\/Documents\/Codex\/|\/Developer\/Chat\//],['excluded application/artwork',/nearling-original|near-reference\.png|delivery-photo\.svg|Recibir pedido|Sucursal Centro|Tomate recibido|DEMO 1042|bakery|panader[ií]a/i]];
let files=0;
function scan(path,data){for(const [name,pattern]of rules)if(!['scripts/audit.mjs','scripts/history-audit.mjs'].includes(path)&&pattern.test(data.toString()))throw Error(`Audit rejected ${path}: ${name}`);files++;}
function walk(at){for(const f of readdirSync(at)){if(['node_modules','.git','verification','artifacts','.build','.gradle','build'].includes(f)||f==='dist'&&relative(root,at).startsWith('packages/dot/native/'))continue;const p=join(at,f),s=lstatSync(p);if(s.isSymbolicLink())throw Error('Public symlinks forbidden');if(s.isDirectory())walk(p);else{if(/\.(png|jpe?g|webp|gif|mp[34]|wav|tgz)$/i.test(f))throw Error('Public media/archive forbidden: '+relative(root,p));scan(relative(root,p),readFileSync(p));}}}
walk(root);
for(const directory of ['function','dot']){
 const packed=spawnSync('npm',['pack','--dry-run','--json','--ignore-scripts','--cache',join(root,'node_modules/.npm-cache')],{cwd:join(root,'packages',directory),encoding:'utf8',timeout:120000});if(packed.status!==0)throw Error(packed.stderr);const report=JSON.parse(packed.stdout)[0];
 for(const f of report.files){if(/(^|\/)(tests|verification|artifacts|\.git|\.env|node_modules|dist\/macos|dist\/ios-simulator)(\/|$)/.test(f.path))throw Error('Unexpected payload '+f.path);scan(f.path,readFileSync(join(root,'packages',directory,f.path)));}
 writeFileSync(join(root,'verification',directory==='function'?'npm-pack.json':'npm-pack-dot.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.name} package audit: ${report.files.length} files, ${report.unpackedSize} bytes.`);
}
console.log(`Public source/package audit passed (${files} scans); no credentials, private paths or application artwork. Third-party notices retained.`);
