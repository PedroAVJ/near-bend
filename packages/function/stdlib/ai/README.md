# near-v/ai

Server-only provider clients and explicit agent adapters in the near-v standard library. No UI dependency, mandatory database, credential discovery, automatic retries, or uniform feature promise. Node 22+; the HTTP clients have zero runtime dependencies. Explicit server socket connections use optional `ws`.

This is an incremental preparation release with native Bend request encoders, wire codecs, stream reducers, and explicit raw IO bindings. `ai-sdk.bend` imports the proof-safe Requests, Codecs, Protocol, Speech, and Voice modules. Foreign transport orchestration lives separately in `bend/runtime.bend`. Earlier record types remain for source compatibility. The JavaScript provider clients are independent compatibility adapters; native Bend provider decoding does not call them. The pure entry is `near-v/ai/bend`, and individual native modules are exposed under `near-v/ai/bend/*`.

## Native Bend supported slices

| Module | Implemented slice | Boundary and remaining scope |
| --- | --- | --- |
| `requests.bend` | Typed OpenRouter, OpenAI Responses, Anthropic Messages, ElevenLabs MP3 requests; escaped JSON encoding; official Claude literal argument arrays | OpenRouter temperature is optional integer 0–2; Anthropic system text is separate and system-role messages are rejected; native tools, multimodal inputs, and full provider request schemas remain outside these slices |
| `codecs.bend` | Provider-specific text-event decoding into typed events and safe error codes | OpenRouter selects one text choice and records typed usage; nontext/tool events fail explicitly; native Responses/Anthropic thinking, tools, full usage schemas, and complete lifecycle/identity validation remain gaps |
| `protocol.bend` | Raw decoded-text SSE/NDJSON chunk framing, CRLF/comments/multiline data, text accumulation, completion, cancellation, transport/protocol errors and truncation | OpenRouter and Anthropic require a stop reason before their terminal event; official Claude requires its successful result after model message-stop; UTF-8 byte decoding belongs to the physical transport |
| `speech.bend` | Incremental binary MP3 prefix validation, lossless byte events, EOF, cancellation, error and size bounds | Buffers the first two bytes until an ID3/frame-sync prefix can be checked; it is not a full MP3 decoder or device playback engine |
| `voice.bend` | Distinct typed Realtime and GPT-Live commands, selected native events and session reducers | PCM16 mono24kHz/client-delegation subset; broader provider schemas, automatic reconnection, device capture and paid end-to-end operation remain unverified |
| `runtime.bend` | Native text/CLI and speech start/read/cancel orchestration over raw foreign IO; terminal cleanup closes the scoped handle | HTTP open metadata must contain canonical decimal status; only 2xx enters decoding, rejected/malformed status closes the acquired handle; physical process/socket factories still require explicit host configuration |

Native text limits are 100,000 frames, 1,048,576 characters per framed payload/line and accumulated text. Native speech limits are 65,536 bytes per chunk and 32 MiB total. Oversized or malformed inputs fail explicitly. Terminal and cancelled states ignore late provider data. These bounds do not imply model token limits or complete media validation.

For an installed Bend consumer, import the actual sources, for example `./node_modules/near-v/stdlib/ai/bend/requests.bend` and `./node_modules/near-v/stdlib/ai/bend/protocol.bend`. `Requests.openrouter(...)` returns a typed `HTTPRequest` result. `Protocol.raw_initial(Codecs.OpenRouter{}, Protocol.SSE{})` creates stream state; `Protocol.feed(rawChunk, state)` returns typed events and next state. `Protocol.raw_end` detects truncated input and `Protocol.raw_cancel` ends the stream. JSON remains internal to wire parsing rather than a public request/event hole.

## Native physical transport and async embedding

`near-v/ai/native-host` supplies raw, bounded foreign HTTP/read/read-bytes/socket/process/close operations and server-private opaque credential references. It performs no provider request encoding, SSE/NDJSON framing, JSON event decoding or lifecycle normalization. `Runtime.openrouter`, `Runtime.responses`, `Runtime.anthropic`, `Runtime.claude`, and `Runtime.speech` use that boundary and expose native typed sessions. Read status 3 means pending and preserves state; open status 3 cannot create a session because the raw host allocates handles only for successful opens. Claude process metadata follows a separate path from HTTP status parsing.

The stock compiler CLI scheduler supports synchronous injected effects. The explicit `embedNativeMain`/`runNativeIO` driver also supports bounded sequential asynchronous foreign IO from a compiled, filled main; it does not modify the vendored compiler. Installing an async host in the stock synchronous CLI fails closed. Base fork/channel/parked concurrency, generic scheduler support, and C backend integration remain gaps. Standard `.mjs` library emission omits IO-returning definitions, so native IO consumers compile a filled main to `.js` and use the documented embedding adapter. See [native host instructions](native-host/README.md).

`near-v/ai/native-fetch` adds a generic physical fetch factory for this asynchronous driver. Construction and import make no calls; requests require `allowRequests: true`, explicit HTTPS origin allowlisting, and server-private credential headers. It enforces response/body/chunk limits, rejects redirects, decodes UTF-8 incrementally for text reads, and preserves arbitrary bytes for binary reads. HTTP status is raw metadata interpreted in Bend; response bodies stay raw. Tests inject fetch and do not contact a provider. Production socket/process physical adapters, paid provider integration, real Claude execution, native microphone permission and device audio quality remain unverified.

## JavaScript compatibility adapters


```js
import { OpenRouterClient, MockAgent } from 'near-v/ai';
// Offline, requires no keys and performs no network calls:
for await (const event of new MockAgent().run({ prompt: 'Hello' })) {
  console.log(event);
}
// Use only in a server process, when live requests are explicitly desired:
const router = new OpenRouterClient({ apiKey: process.env.OPENROUTER_API_KEY });
// await router.complete({model: 'your/chosen-model', messages:[{role:'user',content:'Hello'}]});
```

| Export | Implemented slice | Remaining scope |
| --- | --- | --- |
| `OpenRouterClient` | Chat completion and SSE streaming, typed tool wire definitions/results, provider routing, structured-output request fields, retry/request metadata | Full multimodal schema, tool execution loop, model capability discovery |
| `OpenAIClient` | Responses create/SSE, typed function tools, terminal/failure/incomplete handling, explicit store flag | WebRTC, full Responses event schema, built-in tools; Realtime transport is a separate subpath below |
| `AnthropicClient` | Messages create/SSE, max-token validation, typed tool-use/result blocks, thinking request fields | Full multimodal event coverage, cache-control types, automatic tool loop |
| `ElevenLabsClient` | Binary TTS conversion and typed Scribe v2 file-upload transcription | Realtime STT, source URL/webhook/multichannel features, conversational agent/WebSocket lifecycle |
| `ClaudeCliAdapter` | Official CLI argument planning, explicit execution gate, raw NDJSON event stream, resume ID, tools opt-in, cancellation | Fully typed official event union, permission prompt routing, fully typed permission interactions |
| `MockAgent` | Deterministic text/result events, abort handling, offline use | It is a preview fixture, not an AI model |

`capabilities` reports these wire operations; `tools` means provider protocol support, **not** permission to execute tools or an autonomous tool loop. Model support still varies. Provider events remain distinct. Declarations cover the implemented request subsets and selected event variants; forward-compatible JSON events are retained rather than fabricated into shared parity. Successful HTTP JSON responses are validated as non-array objects, but their complete provider schemas are not runtime-validated. Thinking/signature/redacted Anthropic blocks are preserved in the typed content union.

All clients accept injected `fetch`, explicit `apiKey`, `baseURL`, and `{signal}` per operation. API keys stay in the server process. Non-HTTPS endpoints require `allowInsecureLocalhost: true` and are restricted to loopback. HTTP redirects are rejected to prevent credential forwarding. SSE cancels its reader on abort, early consumer return, protocol failure, or terminal result. Aborting a fetch is a transport cancellation; it does not promise provider-side deletion or reversed billing. Errors expose provider/status/request ID/retry metadata without copying provider error bodies. There is no retry policy or implicit persistence. OpenAI provider-side storage follows its API unless the caller sets `store`; the SDK writes no local history.

The CLI remains an unmodified, external official installation and owns its authentication. The adapter does not inspect credentials or subscription endpoints. Constructing it or calling `plan()` launches nothing. `run()` requires `allowExecution: true`; it runs `claude -p` using argument arrays and `shell: false`, disables built-in tools by default via `--tools ''`, and passes only explicitly granted tool names. The CLI can load host configuration/plugins/hooks and use its own persistence; review that host configuration before enabling execution. No real Claude process was started during preparation.

## Offline checks

From the monorepo root:

```sh
node --test packages/function/stdlib/ai/tests/native.test.mjs packages/function/stdlib/ai/tests/protocol.test.mjs packages/function/stdlib/ai/tests/live.test.mjs packages/function/stdlib/ai/tests/gpt-live.test.mjs
node --check packages/function/stdlib/ai/src/index.mjs
node packages/function/stdlib/ai/examples/offline.mjs
npm pack --dry-run --json --workspace near-v --cache node_modules/.npm-cache
```

Tests use injected HTTP streams, fake child processes and local socket mocks: provider request shape/headers, SSE framing/comment/chunk/multiline handling, truncation, terminal events, malformed JSON, HTTP retry metadata, binary speech, abort before fetch, abort during stream, early-consumer cleanup, CLI permission gate/result/error/exit lifecycle, and mock events. No paid API calls, credential access, tool execution, authentication changes, or CLI launch are test requirements.

## Source review and protocol references

The cached unofficial Bend OpenAI and Anthropic provider wrappers were inspected but not copied. Their transport wraps provider requests in token-authenticated NDJSON sidecars, with generic JSON options and string status/usage fields. This package replaces that shape with typed provider-specific native APIs and independent JavaScript declarations. The standalone MIT wire JSON parser was adapted internally with attribution and its complete license in [native provenance](bend/PROVENANCE.md); provider wrappers, authentication logic and sidecars were not copied.

Official references checked during implementation:

- [OpenRouter API and routing request schema](https://openrouter.ai/docs/api_reference/overview)
- [OpenAI Responses create](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create) and [SSE streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
- [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create)
- [ElevenLabs TTS conversion](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Official Claude Code programmatic use](https://code.claude.com/docs/en/headless)

Before a public release: complete serial installed-consumer and package verification for the native bindings, expand provider contract coverage as needed by consumers, choose supported provider/model versions, review the CLI host configuration policy, and opt in separately to live integration testing. Package preparation does not grant publication or live execution authorization.

## OpenAI Realtime transport (`near-v/ai/live`)

`OpenAIRealtimeClient` implements the OpenAI **Realtime** server WebSocket protocol. It is distinct from GPT-Live and does not promise cross-provider live parity. The default factory dynamically imports optional `ws`; the main AI export and browser-safe mock do not import it. No socket is opened at import or construction. `connect()` is the explicit boundary that can make a paid live provider connection; preparation tests inject sockets and also exercise the installed `ws` transport against a temporary loopback mock server. No provider network connection is made.

```js
import { OpenAIRealtimeClient } from 'near-v/ai/live';
// Server process only; do not pass this key to browser code.
const client = new OpenAIRealtimeClient({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'your-supported-realtime-model',
});
// Live use is deliberately not run by this example:
// const session = await client.connect({signal});
// session.configure({audio:{input:{format:{type:'audio/pcm',rate:24000},turn_detection:null}}});
// session.appendAudio(base64PcmChunk);
// session.commitAudio();
// session.createResponse({output_modalities:['audio']});
// session.cancelResponse(responseId);
// for await (const event of session.events()) { /* handle native provider events */ }
```

The transport uses the official `session.update`, `input_audio_buffer.append`, `input_audio_buffer.commit`, `input_audio_buffer.clear`, `response.create`, and `response.cancel` names. Readiness waits for `session.created`, not merely an open TCP connection. Typed configuration covers current nested `audio.input`/`audio.output` formats and output modalities. Audio is caller-provided padded base64; device capture, resampling, playback, echo cancellation, tool execution, WebRTC, and end-to-end model/audio verification remain outside this slice. The caller must supply audio matching the configured format and provider minimum commit duration.

`events()` delivers native provider events to one consumer. Provider error events after initialization remain visible without automatically discarding a usable session. Malformed frames, response lifecycle gaps, a mismatched session ID, socket failure, timeout, or a queue exceeding 256 events terminate with `RealtimeError`. Opaque `event_id` values are preserved; no invented sequence recovery is claimed. Abort closes the socket, early consumer return closes it, and `cancelResponse()` sends a cancellation request whose result remains a provider `response.done` event. Transport abort does not reverse provider billing.

Reconnect is explicit: `client.reconnect(previousSession)` closes the previous session and creates a new one, with **no audio/request replay and no restored provider conversation**. A session owned by another client/key is rejected. Keys remain private fields, appear only in the server handshake Authorization header, and are not included in session serialization, events, reconnect payloads, or URLs. Browser construction is rejected. Handshake redirects are disabled. Injected socket factories are trusted server code and receive the handshake headers by design.

References verified during implementation: [Realtime server WebSockets](https://developers.openai.com/api/docs/guides/realtime-websocket), [Realtime conversation lifecycle](https://developers.openai.com/api/docs/guides/realtime-conversations), and [Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events). `liveCapabilities` explicitly reports protocol transport support, `deviceCapture: false`, `automaticReconnect: false`, and `endToEndLiveVerified: false`.

CLI abort and early-consumer cleanup signal only the child returned by this invocation. After `terminationGraceMs` (default 1000ms), a still-open child receives SIGKILL. The watchdog is cleared on child close and unreferenced so it does not keep a finished server process alive. Abort stops waiting on stdout immediately. Offline fake-process tests cover ignored SIGTERM, early return, SIGKILL escalation, and a timely close that suppresses escalation; no real CLI was launched.

## GPT-Live client delegation (`near-v/ai/gpt-live`)

`GPTLiveClient` is a separate, server-only GPT-Live WebSocket client, with its own native lifecycle. It connects to `/v1/live/sessions` without query parameters, sends `session.start` first, and becomes ready on `session.started`. Only the documented client-delegation/PCM16 mono24kHz slice is supported. Provider keys are private fields used in server handshake headers; imports/construction never connect.

```js
import { GPTLiveClient } from 'near-v/ai/gpt-live';
const client = new GPTLiveClient({apiKey: process.env.OPENAI_API_KEY});
// Live execution is intentionally commented out:
// const live = await client.connect({session:{
//   model: 'your-supported-live-model',
//   audio: {format:{type:'audio/pcm',rate:24000},output:{voice:'marin'}},
//   delegation:{type:'client'}, store:false,
// }});
// live.appendAudio(base64Pcm);
// live.appendCommentary(delegationId, 'Verified result suitable for the caller');
// await live.close(); // waits for session.closed, including final usage
```

The typed startup history uses native message objects with one role-specific text part. Delegations contain metadata and IDs, not a task prompt. Applications build backend context from transcript fragments and current task state, enforce permissions, and return verified results via `appendCommentary`, `appendThinking`, or `appendInstructions`. The transport validates that non-null IDs belong to this session. Returned command IDs match native acknowledgments through `client_event_id`; acknowledgment means context acceptance, not playback completion. The provider limits appends to 500 tokens; callers must respect that token limit. An additional local 4000-byte guard protects transport memory without claiming token equivalence.

GPT-Live accepts continuous `session.input_audio.append` frames and sends `session.output_audio.delta` frames. It has no Realtime audio-commit command in this slice. Input mute/unmute remain separate from output playback and application-owned delegation cancellation. The library does not manufacture a GPT-Live `response.cancel` or automatic backend executor. `close()` waits for `session.closed` with a bounded timeout and preserves cumulative voice usage; timeout, disconnect, or immediate `abort()` explicitly leaves final usage unconfirmed. Reconnect starts a fresh session, rejects foreign-key ownership, and restores neither context nor delegated work automatically.

Bounds: 1 MiB incoming frame, 256 received events, 256 pending context/control acknowledgments, 1024 command IDs, and 128 client delegation IDs per session. Overflow fails explicitly rather than silently losing audio or claiming continuity. Selected events are typed, while unknown native JSON events remain forward-compatible. Responses-managed delegation, forked sessions, sideband connections, WebRTC, complete provider schema coverage, and paid end-to-end verification remain gaps. `gptLiveCapabilities` reports those distinctions.

Official sources checked: [GPT-Live overview](https://developers.openai.com/api/docs/guides/live), [GPT-Live WebSockets](https://developers.openai.com/api/docs/guides/voice-websockets?api=live), [client delegation](https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client), and [native session/history lifecycle](https://developers.openai.com/api/docs/guides/live-conversations). Tests use injected sockets only. Browser media and host bridging are distinct Dot exports; real microphone permission, device latency/audio quality, and real provider operation remain unverified.

## ElevenLabs batch transcription

`ElevenLabsClient.transcribe(request, {signal, maxFileBytes})` uploads one audio file to the official `/v1/speech-to-text` multipart endpoint. This slice uses `scribe_v2`, supports explicit language, timestamps, diarization and selected sampling settings, and returns validated single-channel transcript text, language confidence and typed word/character timing. `transcriptionCapabilities` identifies the supported subset. It performs no implicit retries or local persistence.

The local file limit is 32 MiB and successful JSON response limit is 4 MiB. A Blob or Uint8Array must have a supported audio MIME type and a bounded leaf filename. MIME codec parameters are normalized to the audio container type. The client lets fetch set the multipart boundary, rejects redirects, exposes metadata-only HTTP errors and cancels response reading on abort. URL sources, webhooks, multichannel requests, realtime STT, transcript editing, entity detection/redaction and speaker-library features remain outside this slice. Duration and actual audio format cannot be proven from a container MIME label; the provider still validates the uploaded media.

`bend/transcription.bend` is the native source for typed file/options, generic multipart field encoding and result decoding. Its public request/result types contain no Json fields. Native timing uses F32 seconds; selected enums distinguish word, spacing and audio events. The native request supports language, timestamps, diarization, speaker count, audio tagging and encoded/PCM16 mono16k formats; native temperature/seed/logging options and broader provider response fields remain gaps. The internal JSON parser additionally caps nesting at 64 and tokens at 65,536.

`bend/transcription-runtime.bend` composes the generic `Host.HTTP.multipart_open` effect with native HTTP status validation, bounded raw response accumulation, typed decoding after EOF, explicit cancellation and scoped handle cleanup. `near-v/ai/native-multipart` supplies `createMultipartFetchTransport` for the sequential asynchronous host driver. That physical factory only assembles caller-supplied generic fields and file bytes into FormData; it never recognizes provider field names or decodes transcripts. It is inert unless `allowRequests: true` and explicit HTTPS origins are configured. Authentication remains in server-private host credential headers.

`ElevenLabsTranscriber` in `near-v/dot/transcription` implements the Dot `transcribe({bytes,mimeType,filename?},{signal})` contract. Construct it with a named `offlineClient` that promises no network work, or explicitly set `allowPaidRequests: true` when supplying a real client/API key. Its read-only `model` is `scribe_v2`. The adapter returns the provider result and leaves playable audio assets, provenance, transcript visibility and persistence to Dot. No provider key belongs in browser configuration or saved audio metadata.

The official [create-transcript API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [batch quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text), and [official SDK response definitions](https://github.com/elevenlabs/elevenlabs-js/blob/main/src/api/types/SpeechToTextWordResponseModel.ts) were checked during implementation. New offline fixtures are authored; serial compiler, test and installed-consumer verification is pending. No paid transcription was performed.
