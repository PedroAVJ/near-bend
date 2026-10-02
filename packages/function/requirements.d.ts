import type {DeploymentSource} from './deployment/src/provenance.js';
export interface ApplicationRequirements {readonly source?:DeploymentSource;readonly name:string;readonly version:string;readonly entryService:string;readonly requiredArtifacts:readonly string[];readonly requiredCapabilities?:readonly string[];readonly services:readonly {readonly id:string;readonly runtime:'node'|'static'|'container'|'external';readonly artifact:string;readonly dependsOn:readonly string[];readonly secretRefs:readonly string[]}[];readonly stores:readonly {readonly id:string;readonly required:boolean}[]}
export const openDotRequirements:ApplicationRequirements;
export const canvasRequirements:ApplicationRequirements;
export function dotRequirementsFor(provider?:'mock'|'openrouter'|'openai'|'anthropic'|'claudeCli',options?:{realtime?:boolean;gptLive?:boolean}):ApplicationRequirements;

export declare function withDeploymentSource(requirements:ApplicationRequirements,source:DeploymentSource):ApplicationRequirements;
