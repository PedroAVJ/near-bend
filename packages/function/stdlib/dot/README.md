# Dot in near-function

A composable assistant standard library exported as `near-function/dot`, with a typed Bend 2 lifecycle, `near-function/browser` presentation and `near-function/ai/mock` agent adapter. Chat, typed call transcripts and tasks share one session. The default agent is offline; no credentials, paid calls, disk persistence or microphone capture occur.

```js
import {createAssistant} from 'near-function/dot';
const dot = createAssistant();
dot.subscribe(snapshot => console.log(snapshot));
await dot.send('Prepare a task');
const task = await dot.addTask('Review release plan');
await dot.completeTask(task.id);
```

`setPermission('microphone', true)` enables the simulated call transcript surface. `transcript()` uses the same agent and history as chat. This flag never acquires a device; an audio adapter must obtain actual OS/browser permission separately. Ending or revoking a call aborts an active transcript run and preserves conversation continuity. `cancel()` aborts the active adapter and ignores late chunks. Provider errors remain visible in the snapshot. Agent streams must emit exactly one terminal `result` event; truncated streams or post-terminal events fail visibly.

Tasks can be managed and run without a UI. They default to local checklist entries. `runTask(id, executor)` requires a supplied executor and records running/done/failed/cancelled state. No executors or scheduler run implicitly. For work needing approval, use `addTask(title, {requiresApproval: true})`, then `decideTask(id, true)` before execution. Rejection blocks execution; restoration re-requests approval for unfinished work. `cancelTask(id)` aborts the executor signal and ignores late results. Applications own the executor's effect policy and must honor cancellation.

```js
const task = await dot.addTask('Prepare local report', {requiresApproval: true});
await dot.decideTask(task.id, true); // application records the user's explicit choice
await dot.runTask(task.id, async (task, {signal}) => {
  signal.throwIfAborted();
  return 'Prepared locally';
});
```

Persistence requires an explicit adapter plus `setPermission('persistence', true)`. Memory persistence survives only while the adapter object lives; it is not disk storage. Restore validates snapshots and resets transient lifecycle/device state. Device consent stays with the current session and is never loaded from saved content. Revoking persistence stops future writes, but does not delete existing data; `clear()` deletes adapter data only while permission is enabled. Applications must choose retention and access policies. Snapshots contain conversation content and should not be logged in production.

Run the root template script to open the local Dot deployment example. The template uses these same exported modules. Browser entry: `near-function/dot/browser`; Bend source: `near-function/dot/bend`. The generated lifecycle lives in `src/generated/session.mjs`; `scripts/build.mjs` compiles with telemetry disabled, from any working directory using the workspace's vendored compiler. The JS bridge owns IO, public snapshot conversion and subscriptions; compiled Bend reducers own record transitions.

Current limits: no background scheduler, authentication, encrypted disk store or remote synchronization. Voice transports are injectable and tested offline; real device permission and live provider interoperability were not exercised. Task execution requires an explicit application executor; approval flags do not themselves sandbox effects. Provider adapters are injectable and must implement the declared `Agent` interface. Server-only `near-function/dot/adapters` now normalizes OpenRouter chat, OpenAI Responses, Anthropic Messages, and official Claude CLI streams into this contract. The module imports the server SDK and must never be eagerly imported by browser code. This is an offline-tested standard-library slice, not a complete production assistant.

## Server adapters

```js
import {createAssistant} from 'near-function/dot';
import {OpenRouterAgent, OpenAIResponsesAgent, AnthropicMessagesAgent, ClaudeAgent} from 'near-function/dot/adapters';
// The application supplies its authorized SDK client; constructing Dot makes no call.
const agent = new OpenRouterAgent({client, model: 'chosen/provider-model'});
const dot = createAssistant({agent});
```

`OpenAIResponsesAgent({client, model, options})` retains a completed response ID per Dot session and supplies `previous_response_id` for later turns. `AnthropicMessagesAgent({client, model, maxTokens, options})` sends Dot history. OpenRouter and Anthropic use explicit transcript history; Responses and CLI use their native continuation. `reset(sessionId)` forgets the adapter's local continuation mapping, without deleting provider or CLI data. Mappings are in-memory, not recovered automatically from persisted Dot snapshots.

`ClaudeAgent({runtime, allowedTools: []})` accepts the SDK's official `ClaudeCliAdapter`. Its SDK execution gate remains disabled by default. The application must explicitly enable execution and separately authorize any tools. Authentication belongs to the unmodified official CLI. The adapter consumes partial text, suppresses duplicate full assistant text, commits resume IDs only after successful terminal result and child exit, and forwards abort/errors. No private endpoints, token extraction or subscription emulation are used. See the [official programmatic CLI guide](https://code.claude.com/docs/en/headless).

Provider options stay on their native SDK request types. These Dot adapters expose a text conversation slice, not provider-feature parity: provider tool calls and incomplete turns fail explicitly; thinking/usage/media remain available through the native SDK, not Dot's text events. Claude's official runtime owns its tool loop when explicitly allowed. Continuation is isolated by Dot session ID and concurrent runs for the same adapter/session are rejected. No provider API or CLI was invoked live during verification; actual SDK clients were exercised with injected fake HTTP streams and subprocesses.

## Native voice bridges

`near-function/dot/live` exports `createRealtimeCallBridge({assistant, client, browser, session, signal})` for an injected server-side `OpenAIRealtimeClient`. The assistant must already be in a call with its microphone flag enabled. This bridge forwards PCM audio, commits manual turns, cancels native responses, and records completed native transcripts directly into the same history without invoking the text agent again. Configure `session.audio.input.transcription` with a caller-selected supported model to receive user-input transcript continuity; no transcription model or availability is assumed. Without that configuration, audio still flows but native input transcript events may be absent. The browser media entry obtains actual device consent separately. End call, permission revocation, restore, clear, cancellation and errors close owned transports and ignore late events. Errors sent to the browser are redacted.

`near-function/dot/gpt-live` exports `createGPTLiveCallBridge({assistant, client, browser, session, signal, executeDelegation?})` for the distinct `GPTLiveClient` and `session.delegation.type: 'client'`. GPT-Live continuously accepts audio; it has no invented commit or native response-cancellation operation. The template hides these Realtime controls for GPT-Live. `cancel()` cancels application-owned delegated tasks, clears/suppresses local playback and sends an instruction hint; it cannot guarantee provider-side hard cancellation. `close()` waits for native final usage acknowledgment; forced abort or timeout leaves finalization unconfirmed.

Native transcript deltas remain timestamped fragments with exact spaces and repeated words; they are not fabricated completed turns. On startup, the bridge seeds at most the last 128 message records in the documented native text-item schema. It does not group fragmented speech into turns, summarize context, enforce the provider's 8192-token history budget or recover the provider session across reloads. Supply bounded `session.input` explicitly for long histories. Applications must decide how fragment grouping, long-history compaction and persistence should work.

Client delegation metadata supplies an ID/offset rather than authoritative task text. Every delegation becomes an approval-required Dot task, with no backend call before explicit user approval. Approved work uses `executeDelegation` when supplied, or `runAgentTask` on the same injected text agent and shared session/history. This uses a generic context prompt, not inferred provider task arguments. Tasks retain the full backend result; compact commentary returns useful facts to the matching native delegation ID. A commentary acknowledgment confirms context injection, not that speech finished or a user heard it. Rejection/error/cancellation cannot return a successful late result. Application executors remain responsible for effect permissions and honoring their abort signal.

These slices do not implement Responses-server delegation, reconnect/replay, complete tool orchestration, VAD policy, native speech turn grouping, all voice events or every provider audio format. The local template defaults to offline mock and requires separate explicit paid-request configuration for either native voice profile. Tests use actual SDK clients with injected fake sockets; no real microphone, provider charge or Claude process was used. Protocol references: [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [GPT-Live](https://developers.openai.com/api/docs/guides/live), [client delegation](https://developers.openai.com/api/docs/guides/live-delegation), [Live conversation context](https://developers.openai.com/api/docs/guides/live-conversations).

## Bend data ownership

`bend/session.bend` now owns typed conversation records (roles, sources and streaming/complete/cancelled/failed/fragment statuses), continuity lists, task approvals and execution states/results/errors, permission decisions, restore reapproval, and source authorization for call-history writes. The runnable JavaScript assistant calls those compiled reducers for history insertion, streamed text outcomes, task lifecycle and permissions. `history_record` rejects call records unless the typed session has an active call and granted microphone flag. Terminal text/task reductions ignore late results after cancellation; task start requires approved or approval-free work. These are actual runtime reducers, not declaration-only schemas.

JavaScript currently retains public snapshot conversion, identity/epoch bookkeeping, fragment timestamp metadata, native transport framing/validation, abort controllers, effect dispatch, storage validation and subscriptions. Snapshot storage remains an application boundary. `tests/fixtures/native-domain.bend` is a typed Bend consumer compiled during testing to exercise the data policies independently of the JavaScript assistant.

`bend/agent.bend` directly consumes the AI standard library's typed protocol transitions. `reduce_frame(AI.Frame, AI.StreamState, Dot.Message)` returns a typed `NativeTransition` containing the updated stream, actual Dot message, and safe error summary. Provider frame parsing, terminal recognition and truncation/transport errors stay in AI Bend code; message state stays in Dot Bend code. The text module compiles independently of native voice. A fresh compiled consumer exercises real OpenRouter frame strings through completion, cancellation, malformed JSON, premature EOF and transport failure. `src/generated/agent.mjs` is generated, not hand-maintained; the build/drift check covers both agent and session modules.

`bend/native.bend` composes typed Realtime transcript events and GPT-Live fragments/delegation metadata into the same Dot continuity. Generic `realtime_wire`/`live_wire` entry points parse caller-injected wire frames with the AI codecs; they enforce Dot microphone/call/cancellation state before inserting records or approval-required tasks. They extract continuity from already ordered native events; transport owners must also apply the AI voice protocol reducers for provider session/response/acknowledgment ordering. `agent.bend` remains independent so text-only consumers do not import voice codecs. Pure task entry points preserve explicit approval and suppress late successful results after cancellation. These functions perform no effect or provider call.

Generation includes `session`, `agent`, `native`, `attachments` and `vision`. The generic native voice fixture injects runtime JSON into generated Bend rather than compiling closed JSON terms. Build and generation drift checks cover all five modules.

## Recorded audio and attachments

`sendAudio({bytes, mimeType, durationMs, name?})` accepts a playable original asset and immediately queues mandatory ElevenLabs transcription. Supply `transcriptionAdapter`, normally the server-only ElevenLabs adapter. Missing host configuration produces a visible failed transcript while retaining the original audio; transcription is not silently optional. The accepted audio record keeps `text: ''`. Derived text, provider/model/source-asset provenance and timed words live under `transcription`; original audio bytes are never replaced by text. Transcript presentation starts collapsed.

The bounded queue processes one transcription at a time. `transcriptionTimeoutMs` defaults to 60000 and accepts 1–120000 milliseconds; this deadline covers asset retrieval and the adapter request. Timeout or cancellation releases the queue even when an injected adapter ignores abort, and late results are discarded. The queue uses `pending`, `running`, `ready`, `failed` and `cancelled` states and at most three attempts per stable message ID. `retryTranscription(id)` explicitly retries failed, cancelled or restored interrupted work. `cancelTranscription(id)` removes queued work or aborts the active request. Clear and restore invalidate old callbacks; late results cannot recreate messages, replies or persisted assets.

After a transcript becomes ready, Dot automatically schedules one linked text-agent response with `replyTo` pointing to the original audio record. It never adds a duplicate user text message. Pending, partial, failed and cancelled transcripts cannot trigger the agent. Agent work is serialized with existing chat/delegated runs. `replyToAudio(id)` explicitly retries a failed or cancelled reply. Restoring saved records does not automatically rerun transcription or replay an already produced reply. This slice feeds a ready derived transcript to the text SDK; it does not claim native audio-model input.

`sendAttachment({bytes, mimeType, name, kind: 'photo' | 'video' | 'file'})` adds an independent asset record without calling transcription or the model. Passive photo/video MIME types, safe filenames, duration, size and asset references are validated. `getAsset(id)` exposes copied bytes only for assets referenced by the current session. In-memory assets are the default; public snapshots contain metadata rather than raw bytes.

With explicit persistence consent, private snapshots include bounded serialized assets. Restore validates metadata and bytes, imports assets into the supplied store and obtains fresh playable URLs; object URLs are never persisted. Interrupted transcriptions become pending with explicit retry required. Applications own retention, URL authorization and durable storage. All five Dot modules generated successfully in the serial compiler slot. The 18 audio-domain fixtures and two actual compiled attachment-reducer fixtures passed (20/20), including abort-ignoring cancellation, timeout, clear, retry bounds, persistence/playback restoration and readiness-gated replies. Packed consumers and actual desktop/mobile Chrome media flows also pass with injected devices and explicit offline transcription fixtures. No live transcription, device or provider call has been made.

## Reusable media presentation and camera context

`near-function/dot/composer` exports the standard plus/rounded-text/camera/microphone composer and explicit photo or silent-video attachment capture. Import `near-function/dot/composer.css` with a bundler or serve the included stylesheet. Text submission stays text; recording starts only from its microphone button. The plus menu contains Photos/library and Files. There is no sticker control. `near-function/dot/voice-message` mounts native playback with collapsed transcript, retry/cancel and visible playback errors. Same-URL updates preserve playback and disclosure state. The template uses these same exported components.

`near-function/dot/camera-context` exports bounded camera snapshot capture and a server relay. Camera sharing has an independent explicit gesture, requires an active permitted call, uses video-only tracks, caps capture at 640×480 and 256 KiB, permits one capture/frame at a time, and enforces at least one second between attempts. Visible states distinguish pending, sent, accepted and error; acknowledgment times out within five seconds. Off, hangup and track revocation stop all tracks and invalidate late callbacks. Raw frames are not persisted or retained by the controller. A provider may retain its own conversation input according to its policy.

For an explicitly selected image-capable Realtime model, configure `cameraContext:'realtime-images'`. SDK image support defaults off; the host configuration is the caller's capability attestation. GPT-Live is audio/text only: `cameraContext:'vision-summary'` requires an explicit `visionDelegate(frame,{signal})` that analyzes a snapshot in the backend and returns at most 1200 UTF-8 bytes of findings. The relay sends those text findings, not an image, to GPT-Live. Acceptance means context acknowledged, not visual accuracy or spoken completion. These are snapshots rather than continuous video or an animated assistant avatar.

The template defaults to mock text, memory/none storage and no transcription or camera provider. To enable actual transcription later, construct `createTemplateServer` with an explicit `transcription:{kind:'elevenlabs',allowPaidRequests:true,apiKey}` configuration. Keys stay server-side. Missing configuration fails the mandatory transcription attempt visibly and retains audio. Offline fixtures are labelled explicitly and require an injected no-network client. No real ElevenLabs, camera, microphone or live call has been verified in this preparation.
