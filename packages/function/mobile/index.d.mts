export type MobilePlatform='ios'|'android';
export type MobileCapability='ui'|'network'|'microphone'|'camera'|'notifications'|'file-picker'|'secure-storage'|'deep-link';
export type MobileBackend={kind:'local-desktop';id:string;endpoint:string;transport:'lan'|'private-relay'}|{kind:'remote-private';id:string;endpoint:string;transport:'remote'};
export interface MobileTarget {readonly platform:MobilePlatform;readonly applicationId:string;readonly version:string;readonly ui:'html-js'|'structured-ui';readonly capabilities:readonly MobileCapability[];readonly backend:MobileBackend;readonly distribution:'app-store'|'google-play'|'development'}
export interface ExternalApproval {readonly gate:string;readonly status:'approved'|'pending'|'rejected';readonly applicationId:string;readonly version:string;readonly artifactSha256:string;readonly reference:string}
export interface MobileObservation {readonly artifactSha256?:string;readonly signed?:boolean;readonly checks?:Readonly<Record<string,boolean>>;readonly implementedCapabilities?:readonly MobileCapability[];readonly approvals?:readonly ExternalApproval[]}
export interface MobileRequirements {readonly target:MobileTarget;readonly requiredCapabilities:readonly string[];readonly externalApprovals:readonly string[];readonly requiredArtifacts:readonly string[];readonly checks:readonly string[]}
export interface MobilePlan {readonly mode:'dry-run';readonly executable:false;readonly ready:boolean;readonly requirements:MobileRequirements;readonly steps:readonly {readonly id:string;readonly status:'current'|'blocked';readonly detail:string}[];readonly trust:string}
export function defineMobileTarget(value:unknown):MobileTarget;
export function mobileDeploymentRequirements(target:MobileTarget):MobileRequirements;
export function planMobileTarget(target:MobileTarget,observation?:MobileObservation):MobilePlan;
export const mobileCapabilities:Readonly<Record<MobilePlatform,Readonly<Record<MobileCapability,{readonly status:'declared';readonly nativeAdapter:false;readonly api:string}>>>>;
export const mobileCases:readonly {readonly id:string;readonly target:MobileTarget}[];
