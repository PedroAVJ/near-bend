import type {Server} from 'node:http';
import type {ApplicationRequirements,DeploymentTarget,Observation,DeploymentPlan} from 'near-function/deploy';
export interface CanvasPreviewOptions {artifactRoot:string;port?:number;host?:'127.0.0.1'|'localhost'}
export interface CanvasPreview {server:Server;requirements:ApplicationRequirements;plan(observation?:Observation,target?:DeploymentTarget):DeploymentPlan;listen():Promise<string>;close():Promise<void>}
export declare function createCanvasPreview(options:CanvasPreviewOptions):CanvasPreview;
