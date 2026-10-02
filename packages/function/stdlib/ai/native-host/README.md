# Native Bend transport host

This server-only boundary lets compiled Bend IO invoke explicit raw transports. The text boundary carries opaque strings. `Stream.read_bytes` separately carries checked binary chunks as a Bend `List<&2,U32>`; it performs no provider decoding. Request encoding, provider-specific frame decoding, protocol lifecycle and Dot state transitions stay in Bend. The host never imports the JavaScript AI SDK. It has no default HTTP client, socket or subprocess and cannot dial or launch Claude unless a caller deliberately supplies such a transport.

`host.bend` contains filled wrappers around foreign JS IO definitions. Each returns `Reply{status,handle,data}`: status 1 success, 2 EOF, 3 pending, 4 failure. `HTTP.open`, `Socket.open` and `Process.open` allocate bounded resource handles; `Stream.read`, `Socket.send`, `Process.write` and `Transport.close` operate on them. `Stream.read_bytes` returns `ByteReply{status,handle,bytes}` with the same statuses. Supply resource `.readBytes()` returning `{status,bytes:number[]|Uint8Array}`; values must be integers 0..255 and chunks fit the configured host `maxDataBytes`, with a foreign ABI ceiling of 1 MiB. Failure returns an empty list. Headers, body, frames and argument strings remain opaque; the host neither encodes JSON nor imposes a provider schema. Process args are an opaque string for the injected transport, never an implicit shell command.

A credential is a U32 reference, with 0 meaning none. Supply a server-private `Map<number,unknown>` to the host. The transport receives the referenced credential inside the host closure. Bend and browser values contain only the reference, never resolved keys. Errors are generic; secret-bearing exception messages do not cross this boundary. Injected transports are trusted code and must not return secrets in successful payloads.

## Compiled IO

The pinned compiler supports foreign definitions returning Base `IO(...)` directly, with `import "./effects.js"` and `io_eff(CID(...),...)` registration. Its stock CLI IO scheduler is synchronous and cannot await Promise transports. `createNativeHost` supports synchronous injected transports and actual compiled CLI `main` execution. `createAsyncNativeHost` requires the explicit sequential embedding driver. Installing an async host and running the stock CLI fails closed before invoking the host.

Compile a Bend program whose filled `main` returns IO to `.js`, adapt it with `embedNativeMain(source)` and write the resulting `.mjs` locally. The adapter checks the exact pinned compiler CLI tail and replaces it with a main factory; it does not modify the compiler or original program. Import that factory, then:

```js
import {createAsyncNativeHost, installNativeHost, runNativeIO} from 'near-function/ai/native-host';
import main from './compiled-main.mjs';
const host = createAsyncNativeHost({http: injectedRawHttp, credentials: privateRefs});
const remove = installNativeHost(host);
try {
  await runNativeIO(main(), {dispose: () => host.dispose()});
} finally { remove(); }
```

The driver awaits foreign effects and resumes compiled continuations. It supports sequential IO only, rejects parked/fd/time/channel/fork effects, enforces operation-count, wall-clock and cleanup limits, and accepts an AbortSignal. Caller disposal invokes optional factory `.dispose()` hooks immediately to abort pending opens, then closes every tracked resource with bounded teardown; injected resource close implementations own cancellation of their pending native work. A timeout cannot forcibly kill arbitrary JavaScript supplied by a caller. Synchronous infinite pure computation likewise cannot be interrupted by this driver. Standard `.mjs` library generation omits IO-returning definitions, so compile a filled main rather than claiming these wrappers are automatically exported functions.

This implementation is coupled to the vendored compiler's `$FFI` representation and constructor namespaces. It provides no C backend, generic Base concurrency scheduler, default WebSocket/process transport adapters or private subscription endpoints. Actual transport connection, provider execution and authentication remain unverified. The offline fixture proves genuine compiled IO through injected sync and async raw transports; it performs no network access, subprocess provider execution or credential discovery.

Check from the workspace:

```sh
node --test packages/function/stdlib/ai/native-host/tests/host.test.mjs
```

The fixture compiles with the vendored compiler, executes actual Bend main IO, checks absent/async-host fail-closed behavior, opaque requests and chunks, host-private credentials, handles, close, limits, timeout and abort. Foreign effects necessarily fall outside `--check-only`'s proof-safe closure; ordinary `-o` compilation still typechecks the program.

`near-function/ai/native-fetch` provides the generic physical HTTPS transport. It is inert by default and requires `allowRequests:true`, explicit allowed HTTPS origins and host-private credential headers. Its text reader performs streaming UTF-8 decoding; its byte reader preserves raw binary. Mixing reader modes is rejected. Body/chunk/response bounds, cancellation and pending-open disposal are verified with injected fetch implementations. Provider request/event interpretation remains in Bend. Actual external HTTPS calls remain unrun.

## Generic multipart uploads

`FormField{name,value}` and `HTTP.multipart_open(credential,url,headers,fields,filename,mime_type,bytes)` extend the raw boundary for binary file uploads. The host marshals a bounded list of string fields and integer bytes; provider field encoding and response decoding remain in Bend. Supply `multipart` alongside other explicit factories when creating the sync or async host. The separate upload bound defaults to 32 MiB, with at most 64 fields. The ABI preserves opaque server-private credential references and fails closed when the host or required async driver is absent.

`createMultipartFetchTransport` (`near-function/ai/native-multipart`) provides a generic physical asynchronous FormData factory. It requires explicit `allowRequests: true` and HTTPS origin allowlisting. It reuses the raw fetch resource's redirect, credential, chunk/response bounds, UTF-8/binary reads and disposal behavior. It owns only physical multipart assembly: all field names and values are caller data. It rejects caller-supplied Content-Type so fetch can create the correct boundary. Production provider operation remains unverified; the new multipart fixtures await serial verification.
