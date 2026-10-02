export interface RepositoryPin {readonly id:string;readonly revision:string;readonly origin?:string}
export interface ArtifactPin {readonly path:string;readonly sha256:string;readonly receipt:string}
export type DeploymentSource = ({readonly kind:'same-repo';readonly repository:RepositoryPin}|{readonly kind:'mirror';readonly model:RepositoryPin;readonly implementation:RepositoryPin}) & {readonly artifacts:readonly ArtifactPin[]};
export type RepositoryEvidence = {readonly id:string;readonly status:'missing'|'not-git'|'error'}|{readonly id:string;readonly status:'verified';readonly root:string;readonly revision:string;readonly clean:boolean;readonly origin:string|null};
export type BuildReceiptEvidence = {readonly status:'missing'|'invalid'|'unsafe'|'error'}|{readonly status:'verified';readonly repositoryId:string;readonly revision:string;readonly artifactPath:string;readonly sha256:string};
export type ArtifactEvidence = {readonly status:'missing'|'unsafe'|'error'}|{readonly status:'verified';readonly repositoryId:string;readonly revision:string;readonly sha256:string;readonly receipt:BuildReceiptEvidence};
export interface SourceObservation {readonly model:RepositoryEvidence;readonly implementation:RepositoryEvidence;readonly artifacts:Readonly<Record<string,ArtifactEvidence>>}
export declare function defineSource(value:unknown):DeploymentSource;
export declare function defineSourceObservation(value:unknown):SourceObservation;
export declare function implementationPin(source:DeploymentSource):RepositoryPin;
export declare function modelPin(source:DeploymentSource):RepositoryPin;
export declare function relativeArtifactPath(path:unknown):path is string;
export declare function sourceSteps(source:DeploymentSource,observation?:SourceObservation):readonly import('./index.js').PlanStep[];
