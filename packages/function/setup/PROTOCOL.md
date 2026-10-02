# Authenticated local setup host

`near-function/setup/host` adds `createFileSetupStore`, `createDurableSetupAuthority`, and a Node HTTP handler. Protocol identifier: `near-function.setup.v1`. All responses are JSON with `Cache-Control: no-store`. JSON POST bodies are limited to 16 KiB. Origins must be exactly allowlisted; native requests may omit Origin. The reference handler limits each source address to 120 requests/minute and 1,000 address buckets. Configure server request/header timeouts and trusted proxy handling in the owning host.

The host must inject an authentication verifier returning an authenticated `{id}` principal. Request bodies cannot choose ownerId or redemption audience. This module does not configure an identity provider, TLS, networking, credentials or a live service. Session tokens are separate from authentication credentials and last at most fifteen minutes. Pairing links remain `near-dot://setup/pair?code=...`, valid at most five minutes and single use. QR and manual entry use identical payloads.

| Method/path | Request | Successful response |
|---|---|---|
| GET /v1/protocol | Host authentication | `{ok:true,protocol,capabilities:['pairing','sessions','declarative-mcp-ui']}` |
| POST /v1/pairing/issue | Host authentication; `{dotId,audience,consent,callback,ttl?}` | `{link,expiresAt}` |
| POST /v1/pairing/redeem | Host authentication; `{link,consent,acceptedPermissions}` | `{ok:true,pairing,callback,session:{token,expiresAt}}` |
| POST /v1/pairing/cancel | Host authentication; `{link}` | `{ok:true}` |
| GET /v1/session | Session Bearer token | `{ok:true,pairing,expiresAt,protocol}` |
| POST /v1/session/revoke | Session Bearer token; `{}` | `{ok:true}` |
| GET /v1/mcp-ui/:serviceId | Session Bearer token | `{ok:true,ui,host}` |
| POST /v1/mcp-ui/:serviceId/action | Session Bearer token; `{nodeId,input?}` | `{ok:true,result}` |

`pairing` is the existing F `{dotId,audience,backend,permissions}` contract. `ui` and `host` use F `UIResource` and `UIHost`. Host policy is recomputed for each resource/action request and its granted permissions intersect session consent. The optional action dispatcher receives the validated service action, pairing and input. Treat input as untrusted and validate against the owning tool schema. Failures are `{ok:false,code}` with HTTP 400/401/403/404/405/413/415/429/503. A failed authentication never issues a pairing/session. Declined or wrong-audience redemption leaves the code available until expiry. Revocation removes the pairing and every associated session.

The private filesystem store commits grants, pairings and sessions together using an exclusive directory lock, fsynced temporary file, atomic rename and directory fsync. It stores hashes of codes/session tokens, not raw bearer secrets. Use a dedicated directory with mode 0700 on a trusted local filesystem. State files use 0600 and a 4 MiB limit; sessions/grants are bounded. Every process accessing this store must use its transaction API. Lock contention fails closed; a crash can leave a lock requiring explicit operator inspection. No automatic stale-lock deletion occurs. This is a local durable store, not a distributed transactional database. The generic store interface permits a separately reviewed database implementation.

Verification uses temporary directories, fixture authentication and a real loopback HTTP server. No persistent account credentials or live access configuration are created. Production identity validation, TLS/private device routing and distributed storage remain unverified. Declarative resource/action hosting is supported; arbitrary HTML, iframe sandboxing and the full MCP Apps JSON-RPC bridge are not implemented. An optional `createWorkspaceRuntime` supports scoped Dot listing, durable chat and retained media references with an injected transcription adapter. The default chat provider is explicitly offline. Binary media upload/serving and live provider access remain unimplemented.

## Optional workspace routes

Configure `createSetupHttpHandler({workspace})` with `createWorkspaceRuntime({store,dots,provider?,transcribe?})`. Authenticated session pairings determine audience, backend and Dot scope; body-supplied pairings are rejected. Protocol capabilities add `workspace-chat` and `media-references` only when configured.

| Method/path | Request | Response |
|---|---|---|
| GET /v1/dots | Session Bearer | `{ok:true,dots:[{id,name}]}` for the paired Dot |
| POST /v1/chat | `{dotId,text,requestId}` | `application/x-ndjson`, `{type:'delta',text}`, then `{type:'done'}` or `{type:'error',code}` |
| GET /v1/dots/:dotId/history | Session Bearer | `{ok:true,messages:[{role,text,requestId}]}` |
| POST /v1/media | `{dotId,mediaId,mimeType,reference}` | `{ok:true,media:{id,mimeType,reference,createdAt,transcription}}` |
| GET /v1/dots/:dotId/media/:mediaId | Session Bearer | `{ok:true,media}` |

Text requests and aggregate responses are bounded to 8192 bytes. Request IDs are durably admitted before provider execution; a completed request replays its saved answer, while pending/interrupted IDs fail closed rather than execute again. Each audience/backend/Dot has isolated history. Revocation/expiry and client cancellation are checked throughout streaming. Media requires microphone consent and retains only a bounded credential-free HTTPS or explicit fixture reference; it neither fetches nor uploads bytes. Failed transcription retains the playable reference with an explicit failed status. Store capacity limits are enforced; no implicit retention deletion occurs.
