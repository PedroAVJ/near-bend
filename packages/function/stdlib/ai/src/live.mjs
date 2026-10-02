// Server-only OpenAI Realtime WebSocket transport. Never bundle API keys in a browser.
export class RealtimeError extends Error {
  constructor(code, message) { super(message); this.name = 'RealtimeError'; this.code = code; }
}
const fail = (code, message) => new RealtimeError(code, message);
const nonempty = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
// Bounded linear validation avoids RegExp backtracking/stack growth on full frames.
function imageBase64(value){if(!value.length||value.length%4)return false;let padding=0;for(let i=0;i<value.length;i++){const n=value.charCodeAt(i);if(n===61){if(++padding>2)return false;}else if(padding||!((n>=65&&n<=90)||(n>=97&&n<=122)||(n>=48&&n<=57)||n===43||n===47))return false;}return true;}
export const liveCapabilities = Object.freeze({ provider: 'openai', protocol: 'realtime', transport: 'server-websocket', operations: Object.freeze(['session.update','input_audio_buffer.append','input_audio_buffer.commit','input_audio_buffer.clear','response.create','response.cancel','conversation.item.create']), imageInput:'requires-capable-model', deviceCapture: false, automaticReconnect: false, endToEndLiveVerified: false });
export async function defaultSocketFactory(url, { headers, timeoutMs }) {
  if (typeof window !== 'undefined') throw fail('server_only', 'Long-lived API keys require a server process');
  const { default: WebSocket } = await import('ws');
  return new WebSocket(url, { headers, handshakeTimeout: timeoutMs, followRedirects: false, maxPayload: 1024 * 1024 });
}
export class OpenAIRealtimeClient {
  #apiKey; #factory; #model; #timeoutMs; #imageInput; #sessions = new WeakSet();
  constructor({ apiKey, model, socketFactory = defaultSocketFactory, timeoutMs = 10000, imageInput }) {
    if (typeof window !== 'undefined') throw fail('server_only', 'Long-lived API keys require a server process');
    nonempty(apiKey, 'apiKey'); nonempty(model, 'model');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('Positive timeoutMs required');
    if(imageInput!==undefined&&typeof imageInput!=='boolean')throw new TypeError('imageInput must be boolean');this.#imageInput=imageInput??false; // Explicit caller attestation: selected model supports image input.
    this.#apiKey = apiKey; this.#model = model; this.#factory = socketFactory; this.#timeoutMs = timeoutMs;
  }
  async connect({ signal } = {}) {
    signal?.throwIfAborted(); let socket;
    try { socket = await this.#factory(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.#model)}`, { headers: { Authorization: `Bearer ${this.#apiKey}` }, timeoutMs: this.#timeoutMs }); }
    catch { signal?.throwIfAborted(); throw fail('connect_error', 'Realtime socket creation failed'); }
    // Abort may have arrived while the factory was loading the socket dependency.
    if (signal?.aborted) { socket.on('error', () => {}); socket.close(); signal.throwIfAborted(); }
    const session = new RealtimeSession(socket, signal, this.#timeoutMs, this.#imageInput);
    await session.ready(); this.#sessions.add(session); return session;
  }
  async reconnect(previous, options) {
    if (!(previous instanceof RealtimeSession) || !this.#sessions.has(previous)) throw new TypeError('Previous session must belong to this client');
    previous.close(); return this.connect(options);
  }
}
export class RealtimeSession {
  #socket; #signal; #abort; #listeners; #state = 'connecting'; #sessionId; #active = new Set(); #queue = []; #waiter; #error; #readyPromise; #resolveReady; #rejectReady; #timer; #consumer = false; #imageInput; #imageCounter=0; #imageIds=new Set(); #imagePending=new Map();
  constructor(socket, signal, timeoutMs, imageInput=false) {
    this.#imageInput=imageInput;
    this.#socket = socket; this.#signal = signal;
    this.#readyPromise = new Promise((resolve, reject) => { this.#resolveReady = resolve; this.#rejectReady = reject; });
    this.#readyPromise.catch(() => {});
    this.#listeners = { open: () => { if (this.#state === 'connecting') this.#state = 'open'; }, message: data => this.#receive(data), error: () => this.#fail(fail('transport_error', 'Realtime socket failed')), close: code => { if (!['closed','failed'].includes(this.#state)) this.#fail(fail('disconnected', `Realtime socket closed (${Number(code) || 0}); continuity is not resumed`)); } };
    for (const [event, handler] of Object.entries(this.#listeners)) socket.on(event, handler);
    // Factory may return an already-open connection; readiness still waits for session.created.
    if (socket.readyState === 1) this.#state = 'open';
    this.#abort = () => this.#fail(signal.reason ?? fail('aborted', 'Realtime session aborted'));
    signal?.addEventListener('abort', this.#abort, { once: true });
    this.#timer = setTimeout(() => this.#fail(fail('connect_timeout', 'Realtime session did not become ready')), timeoutMs);
    if (signal?.aborted) this.#abort();
  }
  get state() { return this.#state; }
  get sessionId() { return this.#sessionId; }
  get capabilities(){return Object.freeze({imageInput:this.#imageInput});}
  ready() { return this.#readyPromise; }
  #wake() { this.#waiter?.(); this.#waiter = undefined; }
  #detach() {
    // ws can emit a final error after close() during an unfinished handshake.
    // Drain that error without exposing its payload or producing an unhandled event.
    this.#socket.on('error', () => {});
    clearTimeout(this.#timer); this.#signal?.removeEventListener('abort', this.#abort); for (const [event, handler] of Object.entries(this.#listeners)) this.#socket.off(event, handler); }
  #fail(error) {
    if (['failed','closed'].includes(this.#state)) return;
    this.#imagePending.clear(); this.#state = 'failed'; this.#error = error; this.#rejectReady(error); this.#detach(); this.#socket.close(); this.#wake();
  }
  #receive(data) {
    if (['closed','failed'].includes(this.#state)) return;
    let event;
    try { const text = typeof data === 'string' ? data : data.toString(); if (new TextEncoder().encode(text).length > 1024 * 1024) throw 0; event = JSON.parse(text); }
    catch { this.#fail(fail('protocol_error', 'Invalid or oversized Realtime frame')); return; }
    if (!object(event) || typeof event.type !== 'string') { this.#fail(fail('protocol_error', 'Invalid Realtime event')); return; }
    if (event.type === 'session.created') {
      if (this.#sessionId || !object(event.session) || typeof event.session.id !== 'string' || !event.session.id) { this.#fail(fail('session_mismatch', 'Unexpected session identity')); return; }
      this.#sessionId = event.session.id; this.#state = 'ready'; clearTimeout(this.#timer); this.#resolveReady(this);
    } else if (event.type === 'session.updated' && event.session?.id !== this.#sessionId) { this.#fail(fail('session_mismatch', 'Session update belongs to a different session')); return; }
    else if (!this.#sessionId && event.type !== 'error') { this.#fail(fail('protocol_gap', 'Event arrived before session.created')); return; }
    if (event.type === 'response.created') {
      if (!event.response?.id || this.#active.has(event.response.id)) { this.#fail(fail('protocol_gap', 'Invalid or duplicate response.created')); return; }
      this.#active.add(event.response.id);
    } else if (event.type === 'response.done') {
      if (!event.response?.id || !this.#active.delete(event.response.id)) { this.#fail(fail('protocol_gap', 'response.done has no matching response.created')); return; }
    } else if (event.type.startsWith('response.') && event.response_id && !this.#active.has(event.response_id)) { this.#fail(fail('protocol_gap', 'Response event has no matching response.created')); return; }
    if (event.type === 'error' && !this.#sessionId) { this.#fail(fail('provider_error', 'Realtime server rejected session initialization')); return; }
    if(event.type==='conversation.item.created'&&this.#imagePending.has(event.item?.id)){
      this.#imagePending.delete(event.item.id);
      // Provider echo may include raw image bytes. Keep confirmation metadata only.
      event={type:event.type,event_id:event.event_id,item:{id:event.item.id,type:event.item.type,role:event.item.role,status:event.item.status,content:[{type:'input_image'}]}};
    }else if(event.type==='error'&&event.error?.event_id){for(const[id,pending]of this.#imagePending)if(pending===event.error.event_id)this.#imagePending.delete(id);}
    // Provider error events are delivered to the caller; errors are not universally session-fatal.
    if (this.#queue.length >= 256) { this.#fail(fail('consumer_overflow', 'Realtime consumer queue exceeded 256 events')); return; }
    this.#queue.push(event); this.#wake();
  }
  #send(event) {
    if (this.#state !== 'ready') throw fail('not_ready', 'Realtime session must be ready');
    try { this.#socket.send(JSON.stringify(event)); } catch { const error = fail('send_error', 'Realtime send failed'); this.#fail(error); throw error; }
  }
  configure(session) { if (!object(session)) throw new TypeError('Session configuration required'); this.#send({ type:'session.update', session: { ...session, type:'realtime' } }); }
  appendAudio(audio) { nonempty(audio, 'audio'); if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audio)) throw new TypeError('audio must be padded base64'); this.#send({type:'input_audio_buffer.append',audio}); }
  appendImage(dataURI,{eventId,itemId}={}){
    if(!this.#imageInput)throw fail('unsupported_image_input','Select an image-capable Realtime model');
    if(typeof dataURI!=='string'||dataURI.length>349560)throw new TypeError('Bounded PNG/JPEG data URI required');
    const png=dataURI.startsWith('data:image/png;base64,'),jpeg=dataURI.startsWith('data:image/jpeg;base64,');if(!png&&!jpeg)throw new TypeError('PNG/JPEG data URI required');const payload=dataURI.slice(png?22:23);if(!imageBase64(payload))throw new TypeError('Complete base64 image required');
    const bytes=atob(payload);if(!bytes.length||bytes.length>262144||!bytes.startsWith(png?'\x89PNG\r\n\x1a\n':'\xff\xd8\xff'))throw new TypeError('Complete bounded PNG/JPEG payload required');
    const suffix=++this.#imageCounter;eventId??=`image-event-${suffix}`;itemId??=`image-item-${suffix}`;
    for(const id of[eventId,itemId])if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new TypeError('Safe image identifiers required');
    if(this.#imageIds.has(eventId)||this.#imageIds.has(itemId)||eventId===itemId)throw fail('duplicate_image_id','Image identifiers were already used');
    if(this.#imageIds.size>=2048||this.#imagePending.size>=8)throw fail('image_context_limit','Image context queue exceeded its bound');
    this.#send({type:'conversation.item.create',event_id:eventId,item:{id:itemId,type:'message',role:'user',content:[{type:'input_image',image_url:dataURI}]}});
    this.#imageIds.add(eventId);this.#imageIds.add(itemId);this.#imagePending.set(itemId,eventId);return {eventId,itemId};
  }
  commitAudio() { this.#send({type:'input_audio_buffer.commit'}); }
  clearAudio() { this.#send({type:'input_audio_buffer.clear'}); }
  createResponse(response = {}) { if (!object(response)) throw new TypeError('Response configuration required'); this.#send({type:'response.create',response}); }
  cancelResponse(responseId) { if (responseId !== undefined) nonempty(responseId,'responseId'); this.#send({type:'response.cancel',...(responseId ? {response_id:responseId}: {})}); }
  async *events() {
    if (this.#consumer) throw fail('consumer_exists', 'One event consumer per session is supported'); this.#consumer = true;
    try {
      while (true) {
        if (this.#queue.length) { yield this.#queue.shift(); continue; }
        if (this.#error) throw this.#error;
        if (this.#state === 'closed') return;
        await new Promise(resolve => { this.#waiter = resolve; });
      }
    } finally { this.#consumer = false; this.close(); }
  }
  close() {
    if (['closed','failed'].includes(this.#state)) return;
    if (this.#state !== 'ready') this.#rejectReady(fail('closed', 'Realtime session closed before ready'));
    this.#imagePending.clear();this.#state = 'closed'; this.#detach(); this.#socket.close(); this.#wake();
  }
}
