#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {planDeployment,formatPlan} from '../src/index.js';
const [command,...args]=process.argv.slice(2);
try{
 if(command!=='dryrun')throw Error('Only offline dryrun is supported. No deploy command is available.');
 let plan;
 if(args[0]==='--template'){
  const application=args[1];if(!['dot','canvas'].includes(application))throw Error('Template must be dot or canvas');
  const options={application};let firstInstall=false;
  for(let i=2;i<args.length;i++){
   if(args[i]==='--first-install'){firstInstall=true;options.previous={stores:[]};}
   else if(args[i]==='--workspace'&&args[i+1])options.workspaceRoot=resolve(args[++i]);
   else throw Error(`Unsupported dryrun option: ${args[i]}`);
  }
  const {planTemplate}=await import('../templates/plan.mjs');plan=await planTemplate(options);
  if(firstInstall)console.log('Prior deployment explicitly declared empty for this first-install review.');
 }else{
  const [definitionFile,snapshotFile,...extra]=args;if(!definitionFile||extra.length)throw Error('Usage: near-v dryrun <definition.json> [snapshot.json] OR near-v dryrun --template dot|canvas [--workspace <path>] [--first-install]');
  const definition=JSON.parse(await readFile(definitionFile,'utf8'));
  const snapshot=snapshotFile?JSON.parse(await readFile(snapshotFile,'utf8')):undefined;
  plan=planDeployment(definition,snapshot);
 }
 console.log(formatPlan(plan));if(!plan.readyForReview)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=2}
