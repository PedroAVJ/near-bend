import type {DeploymentSource,SourceObservation} from './provenance.js';
export type {DeploymentSource,SourceObservation,RepositoryPin,ArtifactPin} from './provenance.js';
export type Runtime = 'node' | 'static' | 'container' | 'external';
export interface ServiceDefinition { readonly id: string; readonly runtime: Runtime; readonly artifact: string; readonly dependsOn?: readonly string[]; readonly secretRefs?: readonly string[]; readonly port?: number }
export interface StoreDefinition { readonly id: string; readonly location: string }
export interface DeploymentDefinition { readonly source?:DeploymentSource; readonly name: string; readonly version: string; readonly address?: string; readonly services: readonly ServiceDefinition[]; readonly stores?: readonly StoreDefinition[]; readonly acceptedBreaks?: readonly string[] }
export interface Observation { readonly source?:SourceObservation; readonly services: Readonly<Record<string, {readonly runtime: Runtime; readonly artifact: string; readonly port?: number}>>; readonly artifacts: Readonly<Record<string, boolean>>; readonly availableSecretRefs?: readonly string[]; readonly availableCapabilities?:readonly string[]; readonly previous?: {readonly address?: string; readonly stores: readonly StoreDefinition[]} }
export interface PlanStep { readonly status: 'current' | 'change' | 'blocked' | 'unverified'; readonly subject: string; readonly detail: string }
export interface DeploymentPlan { readonly name: string; readonly version: string; readonly implementation?:{readonly repositoryId:string;readonly intendedRevision:string;readonly root?:string}; readonly mode: 'dry-run'; readonly executable: false; readonly readyForReview: boolean; readonly steps: readonly PlanStep[]; readonly breaks: readonly string[] }
export declare function defineDeployment(value: unknown): DeploymentDefinition;
export declare function defineSnapshot(value: unknown): Observation;
export declare function planDeployment(definition: DeploymentDefinition, observation?: Observation): DeploymentPlan;
export declare function formatPlan(plan: DeploymentPlan): string;
export declare const capabilities: Readonly<{definition:true; offlineChecks:true; snapshotPlanning:true; execution:false; liveObservation:false; automaticRollback:false; bendCompiledBridge:false; repositoryProvenance:true; semanticEquivalence:false}>;
export interface ApplicationRequirements {readonly source?:DeploymentSource;readonly name:string; readonly version:string; readonly entryService:string;readonly requiredArtifacts?:readonly string[];readonly requiredCapabilities?:readonly string[]; readonly services:readonly ServiceDefinition[]; readonly stores?: readonly {readonly id:string;readonly required:boolean}[]}
export interface DeploymentTarget {readonly kind:'local'|'private';readonly host?:string;readonly ports:Readonly<Record<string,number>>;readonly storeLocations?:Readonly<Record<string,string>>;readonly acceptedBreaks?:readonly string[]}
export declare function resolveDeployment(requirements:ApplicationRequirements,target:DeploymentTarget):DeploymentDefinition;
export declare function planApplication(requirements:ApplicationRequirements,target:DeploymentTarget,observation?:Observation):DeploymentPlan;
