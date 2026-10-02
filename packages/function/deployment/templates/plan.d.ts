import type {DeploymentTarget,Observation,DeploymentPlan} from 'near-function/deploy';
export interface TemplatePlanOptions {application?:'dot'|'canvas';provider?:'mock'|'openrouter'|'openai'|'anthropic'|'claudeCli';voiceProtocol?:'openaiRealtime'|'gptLive';availableCapabilities?:readonly string[];target?:DeploymentTarget;packageRoot?:string;workspaceRoot?:string;previous?:Observation['previous']}
/** Read-only local artifact metadata observation; no provider or deployment execution. */
export declare function planTemplate(options?:TemplatePlanOptions):Promise<DeploymentPlan>;
