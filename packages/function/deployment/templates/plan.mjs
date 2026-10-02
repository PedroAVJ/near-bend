import {stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDotRequirements,canvasRequirements,dotRequirementsFor} from 'near-v/requirements';
import {planApplication} from 'near-v/deploy';
const installedPackageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
/** Read-only artifact existence observation for an explicitly selected package/workspace. */
export async function planTemplate({application='dot',provider='mock',voiceProtocol,target,packageRoot=installedPackageRoot,workspaceRoot,previous,availableCapabilities}={}){
 if(!['dot','canvas'].includes(application))throw new TypeError('Choose dot or canvas template');
 const requirements=application==='dot'?dotRequirementsFor(provider,{realtime:voiceProtocol==='openaiRealtime',gptLive:voiceProtocol==='gptLive'}):canvasRequirements;
 const artifacts={};
 for(const path of [...requirements.services.map(s=>s.artifact),...requirements.requiredArtifacts]){
  if(path.startsWith('examples/')&&!workspaceRoot){artifacts[path]=false;continue}
  const root=path.startsWith('examples/')?workspaceRoot:packageRoot;
  try{artifacts[path]=(await stat(resolve(root,path))).isFile()}catch{artifacts[path]=false}
 }
 return planApplication(requirements,target??{kind:'local',ports:application==='dot'?{assistant:9462}:{inspector:9472}}, {services:{},artifacts,availableSecretRefs:[],...(availableCapabilities===undefined?{}:{availableCapabilities}),...(previous===undefined?{}:{previous})});
}
