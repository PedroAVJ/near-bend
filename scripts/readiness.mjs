import {readFile} from 'node:fs/promises';
import {planReleaseTargets,formatReleaseTargets} from 'near-function/deploy/targets';
const [selected='github-source',file]=process.argv.slice(2);
const plan=planReleaseTargets(selected.split(','),file?JSON.parse(await readFile(file,'utf8')):{});
console.log(formatReleaseTargets(plan));if(!plan.ready)process.exitCode=1;
