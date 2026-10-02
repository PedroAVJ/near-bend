import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeMcpUI, authorizeMcpAction } from '../../protocol/mcp-ui.mjs';
const host={connectedServices:['service'],trustedServices:['service'],grantedPermissions:['mcp-ui','tasks'],capabilities:['text','button','form'],actionPolicies:{service:{'create-task':['tasks']}} };
const resource={kind:'declarative',serviceId:'service',nodes:[{id:'intro',type:'text',text:'<script>not executable</script>'},{id:'task',type:'button',text:'Create task',action:'create-task',permissions:['tasks']}]};
test('composes generic text/actions and checks authorization again after permission revocation',()=>{
 const ui=composeMcpUI(resource,host); assert.equal(ui.nodes[0].text,resource.nodes[0].text); assert.ok(Object.isFrozen(ui.nodes));
 assert.equal(authorizeMcpAction(ui,'task',host),true);
 for(const change of [{grantedPermissions:['mcp-ui']},{connectedServices:[]},{trustedServices:[]},{actionPolicies:{}},{capabilities:['text']}]) assert.equal(authorizeMcpAction(ui,'task',{...host,...change}),false);
 assert.equal(authorizeMcpAction(ui,'intro',host),false);
});
test('requires connection, service trust, consent and declared capabilities',()=>{
 for(const change of [{connectedServices:[]},{trustedServices:[]},{grantedPermissions:['tasks']},{capabilities:['text']}]) assert.throws(()=>composeMcpUI(resource,{...host,...change}));
});
test('rejects arbitrary scripts/html/frame fields, unallowed actions and malformed nodes',()=>{
 for(const node of [{id:'x',type:'iframe',text:'x'},{id:'x',type:'text',text:'x',html:'<b>x</b>'},{id:'x',type:'button',text:'x',action:'delete-account'},{id:'x',type:'button',text:'x',action:'create-task',permissions:['camera']},{id:'x',type:'text',text:'x'.repeat(4097)}]) assert.throws(()=>composeMcpUI({...resource,nodes:[node]},host));
 assert.throws(()=>composeMcpUI({...resource,nodes:[resource.nodes[0],resource.nodes[0]]},host));
 assert.throws(()=>composeMcpUI({...resource,nodes:Array(101).fill(resource.nodes[0])},host));
});

test('service-scoped host policy requires task permission even when resource omits it',()=>{
 const bare={...resource,nodes:[{id:'task',type:'button',text:'Task',action:'create-task'}]};
 assert.throws(()=>composeMcpUI(bare,{...host,grantedPermissions:['mcp-ui']}));
 assert.throws(()=>composeMcpUI({...bare,serviceId:'other'},{...host,connectedServices:['other'],trustedServices:['other']}));
});
