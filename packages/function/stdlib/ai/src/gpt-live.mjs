import { defaultSocketFactory } from './live.mjs';
export class GPTLiveError extends Error {constructor(code,message){super(message);this.name='GPTLiveError';this.code=code;}}
const fail=(code,message)=>new GPTLiveError(code,message);
const nonempty=(value,name)=>{if(typeof value!=='string'||!value.trim())throw new TypeError(`${name} must be a nonempty string`);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export const gptLiveCapabilities=Object.freeze({protocol:'gpt-live',delegation:'client',transport:'server-websocket',continuousAudio:true,audioCommit:false,providerCancel:false,webRTC:false,sideband:false,liveVerified:false});
export class GPTLiveClient {
  #key;#factory;#timeout;#closeTimeout;#sessions=new WeakSet();
  constructor({apiKey,socketFactory=defaultSocketFactory,timeoutMs=10000,closeTimeoutMs=15000}){
    if(typeof window!=='undefined')throw fail('server_only','GPT-Live project keys require a server process');nonempty(apiKey,'apiKey');
    for(const value of [timeoutMs,closeTimeoutMs])if(!Number.isInteger(value)||value<1)throw new TypeError('Positive timeout required');
    this.#key=apiKey;this.#factory=socketFactory;this.#timeout=timeoutMs;this.#closeTimeout=closeTimeoutMs;
  }
  async connect({session,signal}={}){
    signal?.throwIfAborted();if(!object(session))throw new TypeError('Session configuration required');nonempty(session.model,'session.model');
    if(session.delegation?.type!=='client')throw fail('unsupported_delegation','This slice requires explicit client delegation');
    if(session.audio?.format?.type!=='audio/pcm'||session.audio.format.rate!==24000)throw fail('unsupported_audio','This slice requires PCM16 mono 24kHz');
    if(session.input!==undefined){
      if(!Array.isArray(session.input)||session.input.length>128)throw fail('history_limit','GPT-Live history requires at most 128 messages');
      for(const item of session.input){const part=item?.content?.[0];const kinds=item?.role==='assistant'?['text','output_text']:['input_text'];if(item?.type!=='message'||!['developer','user','assistant'].includes(item.role)||!Array.isArray(item.content)||item.content.length!==1||!object(part)||!kinds.includes(part.type)||typeof part.text!=='string')throw fail('history_protocol','GPT-Live history requires one native text part per message');}
    }
    // Snapshot configuration; caller mutation must not change a pending handshake.
    const snapshot=JSON.parse(JSON.stringify(session));let socket;
    try{socket=await this.#factory('wss://api.openai.com/v1/live/sessions',{headers:{Authorization:`Bearer ${this.#key}`},timeoutMs:this.#timeout});}
    catch{signal?.throwIfAborted();throw fail('connect_error','GPT-Live socket creation failed');}
    if(signal?.aborted){socket.on('error',()=>{});socket.close();signal.throwIfAborted();}
    const live=new GPTLiveSession(socket,snapshot,signal,this.#timeout,this.#closeTimeout);await live.ready();this.#sessions.add(live);return live;
  }
  async reconnect(previous,options){if(!this.#sessions.has(previous))throw new TypeError('Previous session must belong to this client');previous.abort();return this.connect(options);}
}
export class GPTLiveSession {
  #socket;#state='connecting';#id;#queue=[];#consumer=false;#waiter;#error;#listeners;#signal;#abortHandler;#startupTimer;#closeTimer;#closeTimeout;#readyPromise;#resolveReady;#rejectReady;#closedPromise;#resolveClosed;#rejectClosed;#closedEvent;#usageSeconds=0;#delegations=new Set();#pending=new Map();#counter=0;#started=false;#usedCommands=new Set(['start-1']);
  constructor(socket,config,signal,timeout,closeTimeout){
    this.#socket=socket;this.#signal=signal;this.#closeTimeout=closeTimeout;
    this.#readyPromise=new Promise((resolve,reject)=>{this.#resolveReady=resolve;this.#rejectReady=reject;});this.#readyPromise.catch(()=>{});
    this.#closedPromise=new Promise((resolve,reject)=>{this.#resolveClosed=resolve;this.#rejectClosed=reject;});this.#closedPromise.catch(()=>{});
    const start=()=>{if(this.#started||this.#state!=='connecting')return;this.#started=true;this.#state='starting';try{socket.send(JSON.stringify({type:'session.start',event_id:'start-1',session:config}));}catch{this.#fail(fail('send_error','GPT-Live session start failed'));}};
    this.#listeners={open:start,message:data=>this.#receive(data),error:()=>this.#fail(fail('transport_error','GPT-Live transport failed')),close:()=>{if(!['closed','failed'].includes(this.#state))this.#fail(fail('finalization_unconfirmed','Socket closed before session.closed; final usage is unconfirmed'));}};
    for(const[event,handler]of Object.entries(this.#listeners))socket.on(event,handler);
    this.#abortHandler=()=>this.#fail(signal.reason??fail('aborted','GPT-Live session aborted without final usage'));
    signal?.addEventListener('abort',this.#abortHandler,{once:true});
    this.#startupTimer=setTimeout(()=>this.#fail(fail('connect_timeout','GPT-Live did not emit session.started')),timeout);
    if(signal?.aborted)this.#abortHandler();else if(socket.readyState===1)start();
  }
  get state(){return this.#state;}get sessionId(){return this.#id;}get finalized(){return !!this.#closedEvent;}get usageSeconds(){return this.#usageSeconds;}ready(){return this.#readyPromise;}
  #wake(){this.#waiter?.();this.#waiter=undefined;}
  #detach(){clearTimeout(this.#startupTimer);clearTimeout(this.#closeTimer);this.#signal?.removeEventListener('abort',this.#abortHandler);this.#socket.on('error',()=>{});for(const[event,handler]of Object.entries(this.#listeners))this.#socket.off(event,handler);}
  #fail(error){if(['closed','failed'].includes(this.#state))return;this.#error=error;this.#state='failed';this.#rejectReady(error);this.#rejectClosed(error);this.#pending.clear();this.#detach();this.#socket.close();this.#wake();}
  #receive(raw){
    if(['closed','failed'].includes(this.#state))return;let event;
    try{const text=typeof raw==='string'?raw:raw.toString();if(new TextEncoder().encode(text).length>1024*1024)throw 0;event=JSON.parse(text);}catch{this.#fail(fail('protocol_error','Invalid or oversized GPT-Live frame'));return;}
    if(!object(event)||typeof event.type!=='string'){this.#fail(fail('protocol_error','Invalid GPT-Live event'));return;}
    if(event.type==='session.started'){
      if(this.#id||typeof event.session?.id!=='string'||!event.session.id){this.#fail(fail('session_mismatch','Unexpected GPT-Live session identity'));return;}
      this.#id=event.session.id;this.#state='ready';clearTimeout(this.#startupTimer);this.#resolveReady(this);
    }else if(!this.#id){this.#fail(fail(event.type==='error'?'provider_error':'protocol_gap','GPT-Live initialization failed before session.started'));return;}
    else if(event.type==='session.updated'&&event.session?.id!==this.#id){this.#fail(fail('session_mismatch','GPT-Live update belongs to another session'));return;}
    if(event.type==='session.delegation.created'){
      const delegation=event.delegation;if(!object(delegation)||typeof delegation.id!=='string'||!delegation.id||delegation.target!=='client'||this.#delegations.has(delegation.id)){this.#fail(fail('delegation_gap','Invalid, duplicate, or unsupported delegation'));return;}
      if(this.#delegations.size>=128){this.#fail(fail('delegation_overflow','Delegation history exceeded 128 entries'));return;}this.#delegations.add(delegation.id);
    }
    const acknowledgments={'session.commentary.appended':'session.commentary.append','session.thinking.appended':'session.thinking.append','session.instructions.appended':'session.instructions.append','session.input_audio.muted':'session.input_audio.mute','session.input_audio.unmuted':'session.input_audio.unmute'};
    if(acknowledgments[event.type]){
      if(this.#pending.get(event.client_event_id)!==acknowledgments[event.type]){this.#fail(fail('ack_gap','GPT-Live acknowledgment does not match a pending command'));return;}this.#pending.delete(event.client_event_id);
    }else if(event.type==='error'&&event.error?.client_event_id)this.#pending.delete(event.error.client_event_id);
    if(event.type==='session.usage.updated'||event.type==='session.closed'){
      const seconds=event.usage?.seconds;if(!Number.isFinite(seconds)||seconds<this.#usageSeconds){this.#fail(fail('usage_gap','GPT-Live cumulative usage is invalid'));return;}this.#usageSeconds=seconds;
    }
    if(event.type==='session.closed'){
      if(event.session?.id&&event.session.id!==this.#id){this.#fail(fail('session_mismatch','Final session belongs to another session'));return;}
      this.#closedEvent=event;this.#state='closed';this.#pending.clear();this.#detach();this.#resolveClosed(event);this.#socket.close();
    }
    if(this.#queue.length>=256){if(this.#state==='closed'){this.#error=fail('consumer_overflow','Final event queue exceeded its bound');this.#wake();return;}this.#fail(fail('consumer_overflow','GPT-Live event queue exceeded 256 entries'));return;}
    this.#queue.push(event);this.#wake();
  }
  #send(event){if(this.#state!=='ready')throw fail('not_ready','GPT-Live session must be ready');try{this.#socket.send(JSON.stringify(event));}catch{const failure=fail('send_error','GPT-Live command failed');this.#fail(failure);throw failure;}}
  appendAudio(audio){nonempty(audio,'audio');if(audio.length>262144||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audio))throw new TypeError('Complete PCM16 base64 required');const bytes=atob(audio).length;if(bytes%2)throw new TypeError('PCM16 requires complete 16-bit samples');this.#send({type:'session.input_audio.append',audio});}
  #command(type,fields,eventId){const id=eventId??`command-${++this.#counter}`;nonempty(id,'eventId');if(this.#usedCommands.has(id))throw fail('duplicate_command','eventId was already used in this session');if(this.#usedCommands.size>=1024)throw fail('command_history_overflow','Command ID history exceeded 1024 entries');if(this.#pending.size>=256)throw fail('command_overflow','Pending command queue exceeded 256 entries');this.#usedCommands.add(id);this.#pending.set(id,type);try{this.#send({type,event_id:id,...fields});}catch(error){this.#pending.delete(id);throw error;}return id;}
  #append(type,delegationId,content,{eventId}={}){
    if(delegationId!==null){nonempty(delegationId,'delegationId');if(!this.#delegations.has(delegationId))throw fail('unknown_delegation','Context requires a client delegation from this session');}
    nonempty(content,'content');if(new TextEncoder().encode(content).length>4000)throw fail('context_limit','Context exceeds the local 4000-byte bound; provider also requires <=500 tokens');
    return this.#command(type,{delegation_id:delegationId,content},eventId);
  }
  appendCommentary(id,content,options){return this.#append('session.commentary.append',id,content,options);}
  appendThinking(id,content,options){return this.#append('session.thinking.append',id,content,options);}
  appendInstructions(id,content,options){return this.#append('session.instructions.append',id,content,options);}
  muteInput({eventId}={}){return this.#command('session.input_audio.mute',{},eventId);}
  unmuteInput({eventId}={}){return this.#command('session.input_audio.unmute',{},eventId);}
  async *events(){if(this.#consumer)throw fail('consumer_exists','One GPT-Live event consumer is supported');this.#consumer=true;try{while(true){if(this.#queue.length){yield this.#queue.shift();continue;}if(this.#error)throw this.#error;if(this.#state==='closed')return;await new Promise(resolve=>{this.#waiter=resolve;});}}finally{this.#consumer=false;if(!['closed','failed','closing'].includes(this.#state))this.abort();}}
  close(){
    if(this.#state==='closed')return Promise.resolve(this.#closedEvent);if(this.#state==='failed')return this.#closedPromise;if(this.#state==='closing')return this.#closedPromise;
    if(this.#state!=='ready'){this.#fail(fail('closed_before_ready','GPT-Live closed before readiness'));return this.#closedPromise;}
    this.#state='closing';this.#closeTimer=setTimeout(()=>this.#fail(fail('finalization_timeout','No session.closed received; final usage is unconfirmed')),this.#closeTimeout);
    try{this.#socket.send(JSON.stringify({type:'session.close'}));}catch{this.#fail(fail('send_error','GPT-Live close command failed'));}return this.#closedPromise;
  }
  abort(){this.#fail(fail('aborted','GPT-Live transport aborted; final usage is unconfirmed'));}
}
