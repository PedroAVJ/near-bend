// Loopback development fixture only. This Node module must never enter browser closure.
import {createSetupAuthority} from 'near-function/setup/server';
export const deployments=[{id:'desktop',kind:'local-desktop',endpoint:'http://127.0.0.1:9450/'},{id:'private',kind:'remote-private',endpoint:'https://fixture.invalid/'}];
export function createFixture({now=Date.now}={}) {
  const authority=createSetupAuthority({dots:deployments.map(backend=>({id:backend.id,ownerId:'fixture-owner',backend,permissions:['mcp-ui','tasks']})),callbackURLs:['near-dot://setup/complete'],now});
  const host={connectedServices:['workspace'],trustedServices:['workspace'],grantedPermissions:['mcp-ui','tasks'],capabilities:['text','button'],actionPolicies:{workspace:{refresh:['tasks']}}};
  let count=0;
  return {authority,host,adapter:{
    async issue(input){return authority.issue({...input,ownerId:'fixture-owner',callback:'near-dot://setup/complete'})},
    async redeem(input,signal){return authority.redeem({...input,signal})},
    async connect(){return {authenticated:true,evidence:{network:'reachable',backend:'running',protocol:'compatible',authorization:'verified',route:'private-route',privateEndpoint:'https://fixture.invalid/'},host,resource:{kind:'declarative',serviceId:'workspace',nodes:[{id:'welcome',type:'text',text:'Connected service workspace'},{id:'refresh',type:'button',text:'Refresh workspace',action:'refresh'}]}}},
    async observeHost(){return host},async action(){return {ok:true,message:`Workspace refreshed ${++count} time${count===1?'':'s'}.`}},
  }};
}
