import {prepareTranscription,readTranscriptionJSON,abortable} from './transcription.mjs';
export {transcriptionCapabilities} from './transcription.mjs';
import { spawn as nodeSpawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export class ProviderError extends Error {
  constructor(provider, code, message, { status = 0, requestId, retryAfter } = {}) {
    super(message); this.name = 'ProviderError'; Object.assign(this, { provider, code, status, requestId, retryAfter });
  }
}
function protocol(provider, message) { return new ProviderError(provider, 'protocol', message); }
function requireString(value, name) { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`); }
function aborted(signal) { signal?.throwIfAborted(); }
export async function* parseSSE(body, { signal, maxFrameBytes = 1024 * 1024 } = {}) {
  if (!body) throw protocol('transport', 'Missing stream body');
  if (!Number.isInteger(maxFrameBytes) || maxFrameBytes < 1) throw new TypeError('Positive maxFrameBytes required');
  const reader = body.getReader(); const decoder = new TextDecoder(); const encoder = new TextEncoder(); let buffer = '', data = [], event, frameBytes = 0;
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      aborted(signal); const chunk = await reader.read(); aborted(signal);
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let pos;
      while ((pos = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, pos).replace(/\r$/, ''); buffer = buffer.slice(pos + 1);
        frameBytes += encoder.encode(line).length;
        if (frameBytes > maxFrameBytes) throw protocol('transport', 'SSE frame exceeds size limit');
        if (!line) { if (data.length) yield { event, data: data.join('\n') }; data = []; event = undefined; frameBytes = 0; }
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        else if (line.startsWith('event:')) event = line.slice(6).trim();
      }
      if (frameBytes + encoder.encode(buffer).length > maxFrameBytes) throw protocol('transport', 'SSE frame exceeds size limit');
      if (chunk.done) {
        if (buffer.trim() || data.length) throw protocol('transport', 'Truncated SSE frame');
        return;
      }
    }
  } finally { signal?.removeEventListener('abort', cancel); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
class HTTPClient {
  constructor(provider, options, baseURL, headers) {
    requireString(options.apiKey, 'apiKey');
    this.provider = provider; this.fetch = options.fetch ?? globalThis.fetch;
    this.baseURL = (options.baseURL ?? baseURL).replace(/\/$/, '');
    if (!this.baseURL.startsWith('https://') && !options.allowInsecureLocalhost) throw new TypeError('HTTPS baseURL required');
    if (options.allowInsecureLocalhost && !/^https:\/\//.test(this.baseURL) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(this.baseURL)) throw new TypeError('Insecure transport only allowed on localhost');
    this.headers = { 'content-type': 'application/json', ...headers(options.apiKey) };
  }
  async request(path, body, { signal } = {}) {
    aborted(signal);
    const response = await this.fetch(this.baseURL + path, { method: 'POST', headers: this.headers, body: JSON.stringify(body), signal, redirect: 'error' });
    if (!response.ok) {
      // Provider messages can echo submitted secrets/prompts. Keep errors metadata-only.
      await response.body?.cancel();
      throw new ProviderError(this.provider, 'http_error', `${this.provider} HTTP ${response.status}`, { status: response.status, requestId: response.headers.get('x-request-id') ?? response.headers.get('request-id'), retryAfter: response.headers.get('retry-after') });
    }
    return response;
  }
  async json(path, body, options) {
    const response = await this.request(path, body, options); let value;
    try { value = await response.json(); } catch { aborted(options?.signal); throw protocol(this.provider, 'Invalid JSON response'); }
    aborted(options?.signal);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw protocol(this.provider, 'Invalid response object');
    return value;
  }
  async *events(path, body, terminal, options = {}) {
    const response = await this.request(path, { ...body, stream: true }, options); let ended = false;
    for await (const frame of parseSSE(response.body, options)) {
      if (frame.data === '[DONE]') { if (this.provider !== 'openrouter') throw protocol(this.provider, 'Unexpected DONE marker'); ended = true; break; }
      let event; try { event = JSON.parse(frame.data); } catch { throw protocol(this.provider, 'Invalid SSE JSON'); }
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw protocol(this.provider, 'Invalid stream event');
      if (event.error || event.type === 'error') throw new ProviderError(this.provider, 'stream_error', `${this.provider} stream failed`);
      yield event;
      if (terminal(event)) { ended = true; if (this.provider !== 'openrouter') break; }
    }
    if (!ended) throw protocol(this.provider, 'Stream ended before terminal event');
  }
}
export class OpenRouterClient extends HTTPClient {
  constructor(options) { super('openrouter', options, 'https://openrouter.ai/api/v1', key => ({ authorization: `Bearer ${key}`, ...(options.referer ? { 'HTTP-Referer': options.referer } : {}), ...(options.title ? { 'X-OpenRouter-Title': options.title } : {}) })); }
  complete(request, options) { requireString(request.model, 'model'); return this.json('/chat/completions', { ...request, stream: false }, options); }
  stream(request, options) { requireString(request.model, 'model'); return this.events('/chat/completions', request, () => false, options); }
}
export class OpenAIClient extends HTTPClient {
  constructor(options) { super('openai', options, 'https://api.openai.com/v1', key => ({ authorization: `Bearer ${key}` })); }
  createResponse(request, options) { requireString(request.model, 'model'); return this.json('/responses', { ...request, stream: false }, options); }
  async *streamResponse(request, options) {
    requireString(request.model, 'model');
    for await (const event of this.events('/responses', request, e => ['response.completed','response.failed','response.incomplete'].includes(e.type), options)) {
      if (event.type === 'response.failed' || event.type === 'response.incomplete') throw new ProviderError('openai', event.type, 'Response did not complete');
      yield event;
    }
  }
}
export class AnthropicClient extends HTTPClient {
  constructor(options) { super('anthropic', options, 'https://api.anthropic.com/v1', key => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' })); }
  createMessage(request, options) { requireString(request.model, 'model'); if (!Number.isInteger(request.max_tokens) || request.max_tokens < 1) throw new TypeError('Positive max_tokens required'); return this.json('/messages', { ...request, stream: false }, options); }
  streamMessage(request, options) { requireString(request.model, 'model'); if (!Number.isInteger(request.max_tokens) || request.max_tokens < 1) throw new TypeError('Positive max_tokens required'); return this.events('/messages', request, e => e.type === 'message_stop', options); }
}
export class ElevenLabsClient extends HTTPClient {
  async transcribe(request, {signal,maxFileBytes} = {}) {
    aborted(signal);
    const upload=prepareTranscription(request,{maxFileBytes});
    const headers={...this.headers};delete headers['content-type'];
    const response=await abortable(this.fetch(this.baseURL+upload.path,{method:'POST',headers,body:upload.form,signal,redirect:'error'}),signal,r=>{void r.body?.cancel().catch(()=>{})});
    aborted(signal);
    if(!response.ok){void response.body?.cancel().catch(()=>{});throw new ProviderError('elevenlabs','http_error',`elevenlabs HTTP ${response.status}`,{status:response.status,requestId:response.headers.get('request-id')??response.headers.get('x-request-id'),retryAfter:response.headers.get('retry-after')})}
    try{return await readTranscriptionJSON(response,{signal})}catch{aborted(signal);throw protocol('elevenlabs','Invalid transcription response')}
  }
  constructor(options) { super('elevenlabs', options, 'https://api.elevenlabs.io/v1', key => ({ 'xi-api-key': key })); }
  async speech(voiceId, request, { outputFormat = 'mp3_44100_128', signal } = {}) {
    requireString(voiceId, 'voiceId'); requireString(request.text, 'text');
    const response = await this.request(`/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`, request, { signal });
    return { audio: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type'), requestId: response.headers.get('request-id') };
  }
}
export const capabilities = Object.freeze({
  openrouter: Object.freeze(['chat.complete', 'chat.stream', 'tools', 'provider.routing']),
  openai: Object.freeze(['responses.create', 'responses.stream', 'tools']),
  anthropic: Object.freeze(['messages.create', 'messages.stream', 'tools']),
  elevenlabs: Object.freeze(['speech.create', 'speech.transcribe']),
  claudeCli: Object.freeze(['agent.stream', 'agent.resume', 'official.authentication'])
});
export class ClaudeCliAdapter {
  constructor({ executable = 'claude', spawn = nodeSpawn, cwd, allowExecution = false, terminationGraceMs = 1000 } = {}) {
    if (!Number.isInteger(terminationGraceMs) || terminationGraceMs < 1) throw new TypeError('Positive terminationGraceMs required');
    Object.assign(this, { executable, spawn, cwd, allowExecution, terminationGraceMs });
  }
  plan({ prompt, resume, allowedTools = [] }) {
    requireString(prompt, 'prompt'); if (resume) requireString(resume, 'resume');
    const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--include-partial-messages'];
    // Empty --tools disables built-in tools. Explicit tools must be granted by the caller.
    args.push('--tools', allowedTools.join(',')); if (resume) args.push('--resume', resume);
    return { executable: this.executable, args, cwd: this.cwd, authentication: 'owned-by-official-cli' };
  }
  async *run(request, { signal } = {}) {
    if (!this.allowExecution) throw new ProviderError('claude-cli', 'permission_required', 'CLI execution must be explicitly enabled');
    aborted(signal); const plan = this.plan(request);
    const child = this.spawn(plan.executable, plan.args, { cwd: plan.cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let closed = false, terminationTimer, terminating = false;
    const exit = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, sig) => { closed = true; clearTimeout(terminationTimer); resolve({ code, sig }); }); });
    // Mark rejection observed immediately while stdout is consumed.
    exit.catch(() => {});
    child.stderr?.resume();
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const terminate = () => {
      if (closed || terminating) return; terminating = true;
      child.kill('SIGTERM');
      if (!closed) { terminationTimer = setTimeout(() => { if (!closed) child.kill('SIGKILL'); }, this.terminationGraceMs); terminationTimer.unref?.(); }
    };
    const cancel = () => { terminate(); lines.close(); };
    signal?.addEventListener('abort', cancel, { once: true }); let terminal = false;
    if (signal?.aborted) cancel();
    try {
      for await (const line of lines) {
        aborted(signal); if (line.length > 1024 * 1024) throw protocol('claude-cli', 'CLI frame exceeds size limit');
        if (!line.trim()) continue; let frame; try { frame = JSON.parse(line); } catch { throw protocol('claude-cli', 'Invalid CLI JSON'); }
        if (!frame || typeof frame.type !== 'string') throw protocol('claude-cli', 'Invalid CLI event');
        if (frame.type === 'result') { terminal = true; if (frame.is_error) throw new ProviderError('claude-cli', 'agent_error', 'Claude CLI returned an error'); }
        yield frame;
      }
      aborted(signal); const result = await exit; aborted(signal);
      if (result.code !== 0) throw new ProviderError('claude-cli', 'process_error', `Claude CLI exited ${result.code ?? result.sig}`);
      if (!terminal) throw protocol('claude-cli', 'CLI ended before result');
    } finally { signal?.removeEventListener('abort', cancel); lines.close(); if (!closed) terminate(); }
  }
}
export { MockAgent } from './mock.mjs';
