import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const froot=process.env.NEAR_FUNCTION_SETUP_ROOT;
if(!froot) throw new Error('Set NEAR_FUNCTION_SETUP_ROOT to the F directory containing setup/client.mjs and setup/server.mjs');
const {setupPresentation,checkConnection}=await import(pathToFileURL(resolve(froot,'setup/client.mjs')));
const {createSetupAuthority}=await import(pathToFileURL(resolve(froot,'setup/server.mjs')));
const audience='android_client_fixture';
const callback='near-dot://setup/complete';
const desktop={id:'desktop',kind:'local-desktop',endpoint:'http://127.0.0.1:9450/'};
function fixture(){let now=1000;const authority=createSetupAuthority({dots:[{id:'personal',ownerId:'owner',backend:desktop,permissions:['chat','mcp-ui']}],callbackURLs:[callback],now:()=>now});const issue=()=>authority.issue({dotId:'personal',ownerId:'owner',audience,consent:true,callback,ttl:100});return{authority,issue,advance:()=>now+=100};}
const redeem=(authority,link,extra={})=>authority.redeem({link,audience,consent:true,acceptedPermissions:['chat'],...extra});
test('Android audience shares exact desktop QR/manual payload, consent and replay rules',()=>{const {authority,issue}=fixture();const grant=issue();const view=setupPresentation(grant);assert.equal(view.manualLink,view.qrPayload);assert.equal(redeem(authority,grant.link,{consent:false}).code,'consent-required');assert.equal(redeem(authority,grant.link,{audience:'other'}).code,'wrong-audience');assert.equal(redeem(authority,grant.link).ok,true);assert.equal(redeem(authority,grant.link).code,'replayed');});
test('Android expired, cancelled and aborted pairing remain explicit',()=>{const {authority,issue,advance}=fixture();const expired=issue();advance();assert.equal(redeem(authority,expired.link).code,'expired');const cancelled=issue();authority.cancel({link:cancelled.link,ownerId:'owner'});assert.equal(redeem(authority,cancelled.link).code,'cancelled');const retry=issue();const ac=new AbortController();ac.abort();assert.equal(redeem(authority,retry.link,{signal:ac.signal}).code,'cancelled');assert.equal(redeem(authority,retry.link).ok,true);});
test('Android loopback cannot reach desktop without independently observed private route',()=>{const client={installed:true,authenticated:true,platform:'android'}, evidence={network:'reachable',backend:'running',protocol:'compatible',authorization:'verified',route:'loopback'};assert.equal(checkConnection(desktop,client,evidence).code,'local-backend-unreachable');assert.equal(checkConnection(desktop,client,{...evidence,route:'private-route',privateEndpoint:'https://desktop.private.invalid/'}).ok,true);assert.equal(checkConnection(desktop,{...client,authenticated:false},evidence).code,'authentication-required');});
