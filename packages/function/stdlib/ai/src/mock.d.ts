export type MockAgentEvent = {type:'text_delta';text:string}|{type:'result';text:string;sessionId:string};
export class MockAgent {run(request:{prompt:string},options?:{signal?:AbortSignal}):AsyncGenerator<MockAgentEvent>}
