/** Pure mobile-host contracts. No native runtime, network probes, or submission executor. */
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const capabilityNames=['ui','network','microphone','camera','notifications','file-picker','secure-storage','deep-link'];
const nativeNames=capabilityNames.filter(x=>!['ui','network'].includes(x));
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=512&&!/[\u0000-\u001f]/.test(x);
export const mobileCapabilities=freeze(Object.fromEntries(['ios','android'].map(platform=>[platform,Object.fromEntries(capabilityNames.map(name=>[name,{status:'declared',nativeAdapter:false,api:({ios:{ui:'WKWebView / UIKit',network:'URLSession / App Transport Security',microphone:'AVAudioSession / microphone consent',camera:'AVFoundation / camera consent',notifications:'UserNotifications / authorization','file-picker':'UIDocumentPickerViewController','secure-storage':'Keychain Services','deep-link':'Universal Links / associated domains'},android:{ui:'WebView / Android views',network:'HTTP client / INTERNET permission',microphone:'AudioRecord / RECORD_AUDIO',camera:'CameraX / CAMERA',notifications:'NotificationManager / notification permission','file-picker':'Storage Access Framework','secure-storage':'Android Keystore','deep-link':'verified Android App Links'}})[platform][name]}]))])));
export function defineMobileTarget(value){
  if(!value||!['ios','android'].includes(value.platform)||!id(value.applicationId)||!text(value.version))throw new TypeError('Mobile platform, applicationId and version required');
  if(!['html-js','structured-ui'].includes(value.ui))throw new TypeError('Unsupported sandbox UI');
  if(!Array.isArray(value.capabilities)||new Set(value.capabilities).size!==value.capabilities.length||value.capabilities.some(x=>!capabilityNames.includes(x)))throw new TypeError('Unknown or repeated mobile capability');
  const b=value.backend;
  if(!b||!['local-desktop','remote-private'].includes(b.kind)||!id(b.id))throw new TypeError('Explicit backend required');
  let endpoint;try{endpoint=new URL(b.endpoint)}catch{throw new TypeError('Backend endpoint required')}
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))throw new TypeError('Mobile backend requires credential-free HTTPS endpoint; phone loopback is not desktop');
  if(!['lan','private-relay','remote'].includes(b.transport)||(b.kind==='local-desktop'&&b.transport==='remote')||(b.kind==='remote-private'&&b.transport!=='remote'))throw new TypeError('Backend transport must match placement');
  if(!['app-store','google-play','development'].includes(value.distribution)||(value.platform==='ios'&&value.distribution==='google-play')||(value.platform==='android'&&value.distribution==='app-store'))throw new TypeError('Invalid distribution');
  return freeze({platform:value.platform,applicationId:value.applicationId,version:value.version,ui:value.ui,capabilities:[...value.capabilities],backend:{kind:b.kind,id:b.id,endpoint:endpoint.href,transport:b.transport},distribution:value.distribution});
}
/** F requirements for V or another planner. Evidence is supplied externally, never inferred from installation. */
export function mobileDeploymentRequirements(target){
  const t=defineMobileTarget(target);
  return freeze({target:t,requiredCapabilities:t.capabilities.map(x=>`${t.platform}.${x}`),externalApprovals:[...(t.distribution==='development'?[]:[t.platform==='ios'?'apple.store-review':'google.play-review']),...(t.platform==='ios'&&t.ui==='html-js'&&t.capabilities.some(x=>nativeNames.includes(x))?['apple.embedded-native-api-permission']:[])],requiredArtifacts:[t.platform==='ios'?'signed-ios-bundle':'signed-android-bundle'],checks:['native-runtime','on-device-tests','owner-authentication','backend-connectivity','per-service-consent','sandbox-isolation','privacy-disclosures',...(t.ui==='html-js'?['trusted-content-origins','embedded-content-policy']:[])]});
}
function approvalMatches(e,gate,t,digest){return e&&e.gate===gate&&e.status==='approved'&&e.applicationId===t.applicationId&&e.version===t.version&&e.artifactSha256===digest&&text(e.reference)}
/** Evaluate caller-provided observations; this does not authenticate receipts or probe devices. */
export function planMobileTarget(target,observation={}){
  const requirements=mobileDeploymentRequirements(target),t=requirements.target,steps=[];
  const check=(id,ok,detail)=>steps.push({id,status:ok?'current':'blocked',detail});
  const digest=observation.artifactSha256;
  check('artifact',typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest)&&observation.signed===true,'Exact signed bundle bytes must be observed');
  for(const c of requirements.checks)check(c,observation.checks?.[c]===true,`${c} needs explicit external observation`);
  for(const c of t.capabilities)check(`adapter:${c}`,observation.implementedCapabilities?.includes(c)===true,`Installed ${t.platform} adapter must implement ${c}`);
  for(const gate of requirements.externalApprovals)check(gate,approvalMatches(observation.approvals?.find(x=>x.gate===gate),gate,t,digest),'Approval must match application, version and exact bundle; policy checks cannot grant approval');
  return freeze({mode:'dry-run',executable:false,ready:steps.every(x=>x.status==='current'),requirements,steps,trust:'caller-supplied external evidence; no authenticity certification'});
}
export const mobileCases=freeze([
 {id:'ios-remote-sandbox',target:defineMobileTarget({platform:'ios',applicationId:'example.dot',version:'0.1.0',ui:'html-js',capabilities:['ui','network','deep-link'],backend:{kind:'remote-private',id:'fixture-dot',endpoint:'https://dot.example.invalid',transport:'remote'},distribution:'app-store'})},
 {id:'android-desktop-private-relay',target:defineMobileTarget({platform:'android',applicationId:'example.dot',version:'0.1.0',ui:'structured-ui',capabilities:['ui','network'],backend:{kind:'local-desktop',id:'fixture-desktop',endpoint:'https://desktop.example.invalid',transport:'private-relay'},distribution:'google-play'})}
]);
