import type {Agent} from 'near-function/dot';
import type {OpenRouterClient,OpenRouterRequest,OpenAIClient,OpenAIRequest,AnthropicClient,AnthropicRequest,ClaudeCliAdapter} from 'near-function/ai';
declare class SessionAdapter implements Agent {run:Agent['run'];reset(sessionId?:string):void}
export class OpenRouterAgent extends SessionAdapter {constructor(options:{client:OpenRouterClient;model:string;options?:Omit<OpenRouterRequest,'model'|'messages'>})}
export class OpenAIResponsesAgent extends SessionAdapter {constructor(options:{client:OpenAIClient;model:string;options?:Omit<OpenAIRequest,'model'|'input'|'previous_response_id'>})}
export class AnthropicMessagesAgent extends SessionAdapter {constructor(options:{client:AnthropicClient;model:string;maxTokens?:number;options?:Omit<AnthropicRequest,'model'|'messages'|'max_tokens'>})}
export class ClaudeAgent extends SessionAdapter {constructor(options:{runtime:ClaudeCliAdapter;allowedTools?:string[]})}
