import {checkConnection, defineBackend, setupPresentation} from 'near-function/setup';
import {composeMcpUI, authorizeMcpAction} from 'near-function/mcp-ui';
export function createDotClient({adapter, platform='browser'}) {
  let state={phase:'disconnected', deployment:null, pairing:null, presentation:null, ui:null, host:null, error:null};
  let pending=null, generation=0;
  const listeners=new Set();
  const snapshot=()=>structuredClone(state);
  const emit=()=>{for(const fn of listeners)fn(snapshot())};
  const fail=value=>{const code=typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value)?value:'operation-failed';state={...state,phase:'error',error:code};emit();return {ok:false,code}};
  async function run(phase,operation) {
    pending?.abort();const request=new AbortController(),version=++generation;pending=request;
    state={...state,phase,error:null};emit();
    try {const result=await operation(request.signal);if(version!==generation)return {ok:false,code:'cancelled'};if(!result.ok)return fail(result.code);return result}
    catch(error){if(version!==generation)return {ok:false,code:'cancelled'};return fail(request.signal.aborted?'cancelled':'operation-failed')}
    finally {if(version===generation)pending=null}
  }
  return Object.freeze({
    snapshot,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)},
    cancel(){generation++;pending?.abort();pending=null;state={...state,phase:'cancelled',error:'cancelled'};emit()},
    disconnect(){generation++;pending?.abort();pending=null;state={phase:'disconnected',deployment:null,pairing:null,presentation:null,ui:null,host:null,error:null};emit()},
    issue(input){return run('issuing',async signal=>{const grant=await adapter.issue(input,signal);if(signal.aborted)return {ok:false,code:'cancelled'};const presentation=setupPresentation(grant);state={...state,presentation,phase:'pairing'};emit();return {ok:true,presentation}})},
    redeem(input){return run('redeeming',async signal=>{const result=await adapter.redeem(input,signal);if(!result.ok||signal.aborted)return signal.aborted?{ok:false,code:'cancelled'}:result;state={...state,pairing:result.pairing,phase:'paired'};emit();return result})},
    connect(input){return run('connecting',async signal=>{
      if(input.trusted!==true)return {ok:false,code:'deployment-trust-required'};
      const backend=defineBackend(input.backend);
      if(!state.pairing||JSON.stringify(defineBackend(state.pairing.backend))!==JSON.stringify(backend))return {ok:false,code:'pairing-required'};
      // Trust and authentication are adapter evidence, never inferred from installation.
      const result=await adapter.connect({backend,pairing:state.pairing},signal);
      if(signal.aborted)return {ok:false,code:'cancelled'};
      const check=checkConnection(backend,{installed:true,authenticated:result.authenticated===true,platform},result.evidence);
      if(!check.ok)return check;
      const ui=composeMcpUI(result.resource,result.host);
      state={...state,phase:'connected',deployment:backend,host:result.host,ui,error:null};emit();return {ok:true};
    })},
    action(nodeId){return run('acting',async signal=>{
      if(!state.ui||!state.host)return {ok:false,code:'not-connected'};
      // Re-observe authorization before every service action.
      const host=await adapter.observeHost({backend:state.deployment},signal);
      if(signal.aborted)return {ok:false,code:'cancelled'};
      if(!authorizeMcpAction(state.ui,nodeId,host))return {ok:false,code:'action-denied'};
      const node=state.ui.nodes.find(n=>n.id===nodeId);
      const result=await adapter.action({serviceId:state.ui.serviceId,action:node.action,backend:state.deployment},signal);
      if(signal.aborted)return {ok:false,code:'cancelled'};
      if(!result||result.ok!==true)return {ok:false,code:'service-action-failed'};
      state={...state,phase:'connected',host,error:null};emit();return {ok:true,result};
    })},
  });
}
