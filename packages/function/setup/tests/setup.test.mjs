import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineBackend, checkConnection, setupPresentation } from '../client.mjs';
import { createSetupAuthority } from '../server.mjs';
const backend = { id: 'desktop', kind: 'local-desktop', endpoint: 'http://127.0.0.1:9450/' };
const callback = 'near-dot://setup/complete';
const make = () => {
 let clock = 1000;
 const authority = createSetupAuthority({ dots: [{ id: 'personal', ownerId: 'owner', backend, permissions: ['chat', 'mcp-ui'] }], callbackURLs: [callback], now: () => clock });
 return { authority, issue: () => authority.issue({ dotId: 'personal', ownerId: 'owner', audience: 'mobile', consent: true, callback, ttl: 100 }), advance: () => { clock += 100; } };
};
const redeem = (authority, link, extra = {}) => authority.redeem({ link, audience: 'mobile', consent: true, acceptedPermissions: ['chat'], ...extra });
test('personal QR/manual pairing uses same audience-bound one-use link and chooses paired Dot', () => {
 const {authority, issue} = make(); const grant = issue();
 assert.equal(authority.choose({dotId:'personal', audience:'mobile'}).code, 'pairing-required');
 assert.deepEqual(setupPresentation(grant), {qrPayload:grant.link,manualLink:grant.link,expiresAt:1100});
 assert.equal(new URL(grant.link).searchParams.size, 1);
 const result = redeem(authority, grant.link); assert.equal(result.ok,true);
 assert.equal(result.callback,callback); assert.deepEqual(result.pairing.permissions,['chat']);
 assert.equal(authority.choose({dotId:'personal',audience:'mobile'}).ok,true);
 assert.equal(redeem(authority,grant.link).code,'replayed');
});
test('owner consent and exact callback allowlist are required', () => {
 const {authority} = make(); const args={dotId:'personal',ownerId:'owner',audience:'mobile',consent:true,callback};
 assert.throws(()=>authority.issue({...args,ownerId:'other'}), /owner consent/);
 assert.throws(()=>authority.issue({...args,consent:false}), /owner consent/);
 for(const bad of ['https://attacker.invalid/callback',callback+'?redirect=https://attacker.invalid',callback+'#x']) assert.throws(()=>authority.issue({...args,callback:bad}),/allowlisted/);
 assert.throws(()=>authority.issue({...args,ttl:300001}),/TTL/);
});
test('wrong audience, denied consent and permissions allow safe retry without consuming code', () => {
 const {authority,issue}=make(); const {link}=issue();
 assert.equal(redeem(authority,link,{audience:'other'}).code,'wrong-audience');
 assert.equal(redeem(authority,link,{consent:false}).code,'consent-required');
 assert.equal(redeem(authority,link,{acceptedPermissions:['camera']}).code,'permission-denied');
 assert.equal(redeem(authority,link).ok,true);
});
test('expiry, cancellation, abort and replay are explicit', () => {
 const {authority,issue,advance}=make(); const first=issue(); advance();
 assert.equal(redeem(authority,first.link).code,'expired'); assert.equal(redeem(authority,first.link).code,'expired');
 const second=issue(); assert.equal(authority.cancel({link:second.link,ownerId:'other'}).code,'not-authorized');
 assert.equal(authority.cancel({link:second.link,ownerId:'owner'}).ok,true); assert.equal(redeem(authority,second.link).code,'cancelled');
 const third=issue(); const control=new AbortController(); control.abort();
 assert.equal(redeem(authority,third.link,{signal:control.signal}).code,'cancelled');
 assert.equal(redeem(authority,third.link).ok,true);
});
test('only validated deep links redeem; callback injection and duplicate codes fail', () => {
 const {authority,issue}=make(); const {link}=issue();
 for(const bad of [link+'&callback=https://evil.invalid',link+'&code=x',link+'#fragment',link.replace('near-dot:','https:'),link.replace('/pair','/other')]) assert.equal(redeem(authority,bad).code,'invalid-code');
 assert.equal(redeem(authority,link).ok,true);
});
test('install and pairing do not imply authentication, backend reachability or platform support', () => {
 const client={installed:true,authenticated:false,platform:'desktop'}, evidence={network:'reachable',backend:'running',protocol:'compatible',authorization:'verified',route:'loopback'};
 assert.equal(checkConnection(backend,client,evidence).code,'authentication-required');
 assert.equal(checkConnection(backend,{...client,authenticated:true,platform:'ios'},evidence).code,'local-backend-unreachable');
 assert.equal(checkConnection(backend,{...client,authenticated:true},{...evidence,network:'unknown'}).code,'network-unverified');
 assert.equal(checkConnection(backend,{...client,authenticated:true},{...evidence,backend:'stopped'}).code,'backend-unavailable');
 assert.equal(checkConnection(backend,{...client,authenticated:true},evidence).ok,true);
 assert.equal(checkConnection(backend,{...client,authenticated:true,platform:'ios'},{...evidence,route:'private-route',privateEndpoint:'https://desktop.private.invalid/'}).ok,true);
 assert.equal(checkConnection(backend,{...client,authenticated:true},{...evidence,protocol:'unknown'}).code,'protocol-unverified');
 assert.equal(checkConnection(backend,{...client,authenticated:true},{...evidence,authorization:'denied'}).code,'backend-authorization-required');
 const remote=defineBackend({id:'remote',kind:'remote-private',endpoint:'https://private.invalid/'});
 assert.equal(checkConnection(remote,{...client,authenticated:true,platform:'android'},evidence).ok,true);
 for(const endpoint of ['https://user:secret@private.invalid/','http://private.invalid/','https://private.invalid/?token=secret']) assert.throws(()=>defineBackend({...remote,endpoint}));
});

test('private mobile route requires a credential-free HTTPS endpoint',()=>{
 const client={installed:true,authenticated:true,platform:'android'};
 const evidence={network:'reachable',backend:'running',protocol:'compatible',authorization:'verified',route:'private-route'};
 assert.equal(checkConnection(backend,client,evidence).code,'local-backend-unreachable');
 for(const privateEndpoint of ['http://desktop.private.invalid/','https://localhost/','https://user:secret@desktop.private.invalid/','https://desktop.private.invalid/?token=secret']) assert.equal(checkConnection(backend,client,{...evidence,privateEndpoint}).code,'unsafe-private-route');
});

test('private routes reject all literal loopback aliases',()=>{
 for(const endpoint of ['https://127.0.0.2/','https://127.255.255.254/','https://[::ffff:127.0.0.1]/','https://localhost./','https://device.localhost/']) {
  assert.throws(()=>defineBackend({id:'remote',kind:'remote-private',endpoint}),/transport/);
  assert.equal(checkConnection(backend,{installed:true,authenticated:true,platform:'ios'},{network:'reachable',backend:'running',protocol:'compatible',authorization:'verified',route:'private-route',privateEndpoint:endpoint}).code,'unsafe-private-route');
 }
 assert.equal(defineBackend({id:'local',kind:'local-desktop',endpoint:'http://127.0.0.2/'}).kind,'local-desktop');
});
