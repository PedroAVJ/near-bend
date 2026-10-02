import {defineMobileTarget,planMobileTarget,mobileDeploymentRequirements,mobileCapabilities,type MobileTarget,type MobileBackend,type MobileObservation} from '../index.mjs';
const backend:MobileBackend={kind:'local-desktop',id:'desktop',endpoint:'https://example.invalid',transport:'private-relay'};
const target:MobileTarget=defineMobileTarget({platform:'android',applicationId:'fixture.dot',version:'0.1',ui:'structured-ui',capabilities:['network'],backend,distribution:'development'});
const evidence:MobileObservation={checks:{'owner-authentication':false},implementedCapabilities:['network']};
const onlyDryRun:false=planMobileTarget(target,evidence).executable;
const declaration:false=mobileCapabilities.android.camera.nativeAdapter;
mobileDeploymentRequirements(target);
// @ts-expect-error A phone cannot infer desktop loopback connectivity.
const invalid:MobileBackend={kind:'local-desktop',id:'desktop',endpoint:'https://example.invalid',transport:'remote'};
// @ts-expect-error Shell is not a sandbox capability.
const shell:MobileObservation={implementedCapabilities:['shell']};
void [onlyDryRun,declaration,invalid,shell];
