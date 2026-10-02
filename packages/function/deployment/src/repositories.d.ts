import type {DeploymentSource,SourceObservation} from './provenance.js';
/** Observe explicit local roots, actual Git HEAD/clean/origin, artifact bytes and build receipts. Never builds or deploys. */
export declare function observeSource(source:DeploymentSource,repositoryRoots:Readonly<Record<string,string>>,options?:{signal?:AbortSignal;maxArtifactBytes?:number}):Promise<SourceObservation>;
