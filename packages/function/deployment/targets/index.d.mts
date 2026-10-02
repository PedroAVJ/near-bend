export type ReleaseTarget='github-source'|'hub-package'|'backend'|'macos-app'|'ios-app-store'|'android-play'|'web';
export type ReleaseOperation='push'|'build'|'release'|'publish'|'deploy'|'submit';
export const releaseOperationMeanings:Readonly<Record<ReleaseOperation,string>>;
export type ReleaseCheckStatus='passed'|'failed'|'absent'|'unimplemented'|'not-observed';
export interface ReleaseEvidence {readonly status:ReleaseCheckStatus;readonly reason:string}
export type ReleaseObservations=Partial<Record<ReleaseTarget,Readonly<Record<string,ReleaseEvidence>>>>;
export interface ReleaseCheck extends ReleaseEvidence {readonly id:string;readonly target:ReleaseTarget}
export interface ReleaseTargetPlan {readonly target:ReleaseTarget;readonly ready:boolean;readonly checks:readonly ReleaseCheck[]}
export interface ReleasePlan {readonly mode:'dry-run';readonly executable:false;readonly authority:'preparation-only';readonly ready:boolean;readonly selected:readonly ReleaseTarget[];readonly targets:readonly ReleaseTargetPlan[];readonly blockers:readonly ReleaseCheck[];readonly trust:string}
export const releaseTargetCatalog:Readonly<Record<ReleaseTarget,{readonly id:ReleaseTarget;readonly operations:readonly ReleaseOperation[];readonly checks:readonly {readonly id:string;readonly requirement:string}[]}>>;
export const releaseCheckStatuses:readonly ReleaseCheckStatus[];
export function defineReleaseTargets(selected:readonly ReleaseTarget[]):readonly ReleaseTarget[];
export function planReleaseTargets(selected:readonly ReleaseTarget[],observations?:ReleaseObservations):ReleasePlan;
export function formatReleaseTargets(plan:ReleasePlan):string;
