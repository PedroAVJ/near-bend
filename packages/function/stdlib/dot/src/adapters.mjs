import {ProviderError} from 'near-function/ai';
const fail=(provider,message)=>{throw new ProviderError(provider,'dot_protocol',message)};
const text=(value,provider)=>{if(typeof value!=='string')fail(provider,'Expected text string');return value};
const history=request=>request.messages?.length?request.messages.map(({role,text})=>({role,content:text})): [{role:'user',content:request.prompt}];
class SessionAdapter {
 constructor(provider){this.provider=provider;this.sessions=new Map();this.running=new Set()}
 async *run(request,{signal}={}){
  signal?.throwIfAborted();const key=request.sessionId??'default';if(this.running.has(key))throw new Error('Adapter session already running');this.running.add(key);
  try{yield* this.events(request,key,signal)}finally{this.running.delete(key)}
 }
 reset(sessionId='default'){if(this.running.has(sessionId))throw new Error('Adapter session is running');this.sessions.delete(sessionId)}
}
/** Text-only OpenRouter slice; provider-native routing/options remain on the injected client request. */
export class OpenRouterAgent extends SessionAdapter {
 constructor({client,model,options={}}){super('openrouter');Object.assign(this,{client,model,options})}
 async *events(request,key,signal){let output='',finished=false;
  for await(const chunk of this.client.stream({...this.options,model:this.model,messages:history(request)},{signal})){
   signal?.throwIfAborted();if(!Array.isArray(chunk.choices))fail(this.provider,'Missing chat choices');
   for(const choice of chunk.choices){if((choice.index??0)!==0)continue;if(choice.delta?.tool_calls?.length)fail(this.provider,'Tool calls require an explicit tool runtime');if(choice.delta?.content!==undefined&&choice.delta.content!==null){if(finished)fail(this.provider,'Text after finish');const delta=text(choice.delta.content,this.provider);output+=delta;yield {type:'text_delta',text:delta}}
    if(choice.finish_reason){if(finished)fail(this.provider,'Duplicate chat finish');if(choice.finish_reason!=='stop')fail(this.provider,`Uncompleted text turn: ${choice.finish_reason}`);finished=true}}
  }
  if(!finished)fail(this.provider,'Missing chat finish reason');signal?.throwIfAborted();yield {type:'result',text:output,sessionId:key};
 }
}
/** Keeps completed Responses IDs per Dot session; continuation IDs commit only after SDK stream success. */
export class OpenAIResponsesAgent extends SessionAdapter {
 constructor({client,model,options={}}){super('openai');Object.assign(this,{client,model,options})}
 async *events(request,key,signal){let output='',completed=null;const previous=this.sessions.get(key);
  for await(const event of this.client.streamResponse({...this.options,model:this.model,input:previous?request.prompt:history(request),previous_response_id:previous},{signal})){
   signal?.throwIfAborted();if(completed)fail(this.provider,'Event after completed response');
   if(event.type==='response.output_text.delta'){const delta=text(event.delta,this.provider);output+=delta;yield {type:'text_delta',text:delta}}
   else if(event.type==='response.function_call_arguments.delta'||event.item?.type==='function_call')fail(this.provider,'Tool calls require an explicit tool runtime');
   else if(event.type==='response.completed'){const response=event.response;if(!response||response.status!=='completed'||typeof response.id!=='string'||!Array.isArray(response.output))fail(this.provider,'Invalid completed response');let final='';for(const item of response.output){if(item.type==='function_call')fail(this.provider,'Tool calls require an explicit tool runtime');if(item.type==='message'){if(!Array.isArray(item.content))fail(this.provider,'Invalid output content');for(const block of item.content){if(block.type==='output_text')final+=text(block.text,this.provider);else if(block.type==='refusal')final+=text(block.refusal,this.provider)}}}completed={id:response.id,text:final||output}}
  }
  if(!completed)fail(this.provider,'Missing completed response');signal?.throwIfAborted();this.sessions.set(key,completed.id);yield {type:'result',text:completed.text,sessionId:key};
 }
}
export class AnthropicMessagesAgent extends SessionAdapter {
 constructor({client,model,maxTokens=1024,options={}}){super('anthropic');Object.assign(this,{client,model,maxTokens,options})}
 async *events(request,key,signal){let output='',started=false,finished=false;
  for await(const event of this.client.streamMessage({...this.options,model:this.model,max_tokens:this.maxTokens,messages:history(request)},{signal})){
   signal?.throwIfAborted();if(finished)fail(this.provider,'Event after message stop');
   if(event.type==='message_start'){if(started)fail(this.provider,'Duplicate message start');started=true;for(const block of event.message?.content??[]){if(block.type==='tool_use')fail(this.provider,'Tool calls require an explicit tool runtime');if(block.type==='text'){const delta=text(block.text,this.provider);output+=delta;if(delta)yield {type:'text_delta',text:delta}}}}
   else if(event.type==='content_block_start'){if(event.content_block?.type==='tool_use')fail(this.provider,'Tool calls require an explicit tool runtime');if(event.content_block?.type==='text'&&event.content_block.text){const delta=text(event.content_block.text,this.provider);output+=delta;yield {type:'text_delta',text:delta}}}
   else if(event.type==='content_block_delta'){if(!started)fail(this.provider,'Delta before message start');if(event.delta?.type==='text_delta'){const delta=text(event.delta.text,this.provider);output+=delta;yield {type:'text_delta',text:delta}}else if(event.delta?.type==='input_json_delta')fail(this.provider,'Tool calls require an explicit tool runtime')}
   else if(event.type==='message_delta'&&event.delta?.stop_reason&&event.delta.stop_reason!=='end_turn'&&event.delta.stop_reason!=='stop_sequence')fail(this.provider,`Uncompleted text turn: ${event.delta.stop_reason}`);
   else if(event.type==='message_stop'){if(!started)fail(this.provider,'Stop before message start');finished=true}
  }
  if(!finished)fail(this.provider,'Missing message stop');signal?.throwIfAborted();yield {type:'result',text:output,sessionId:key};
 }
}
/** Official CLI keeps authentication and its tool loop. No credentials are extracted or private endpoints used. */
export class ClaudeAgent extends SessionAdapter {
 constructor({runtime,allowedTools=[]}){super('claude-cli');Object.assign(this,{runtime,allowedTools})}
 async *events(request,key,signal){let output='',terminal=null,session=this.sessions.get(key),partial=false;const seenMessages=new Set();
  for await(const frame of this.runtime.run({prompt:request.prompt,...(session?{resume:session}:{}),allowedTools:[...this.allowedTools]},{signal})){
   signal?.throwIfAborted();if(terminal!==null)fail(this.provider,'Event after CLI result');if(typeof frame.session_id==='string')session=frame.session_id;
   if(frame.type==='stream_event'&&frame.event?.type==='content_block_delta'&&frame.event.delta?.type==='text_delta'){const delta=text(frame.event.delta.text,this.provider);partial=true;output+=delta;yield {type:'text_delta',text:delta}}
   else if(frame.type==='assistant'){const id=frame.message?.id;if(id&&seenMessages.has(id))continue;if(id)seenMessages.add(id);if(!partial){for(const block of frame.message?.content??[]){if(block.type==='text'){const delta=text(block.text,this.provider);output+=delta;yield {type:'text_delta',text:delta}}}}partial=false}
   else if(frame.type==='result'){if(frame.is_error)fail(this.provider,'CLI returned an error');terminal=text(frame.result,this.provider)}
  }
  if(terminal===null)fail(this.provider,'Missing CLI result');signal?.throwIfAborted();if(session)this.sessions.set(key,session);yield {type:'result',text:terminal,sessionId:session??key};
 }
}
