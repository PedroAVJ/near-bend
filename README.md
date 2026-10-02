# F(s) — near-function

Experimental composable UI, typed AI protocol and assistant libraries, with inert deployment planning. MIT licensed. The JavaScript package version is **0.1.0**; the Bend Hub module version is **0.1.0.0**. These identify different distribution formats, not interchangeable package-manager versions.

The source contains reusable libraries, a generic local assistant template, and the reusable framework canvas/inspector. Application code, customer data, artwork, diagnostics and private history are excluded.

- `near-function`: UI/state primitives and in-process authorized mutations with revision checking.
- `near-function/browser`: browser rendering of compiled Bend UI exports.
- `near-function/ai`: provider-specific JavaScript clients; typed Bend request/event/lifecycle modules are available separately.
- `near-function/ai/native-host`: explicit raw transport effects and sequential compiled Bend IO embedding.
- `near-function/dot`: shared conversation, tasks, permissions and bounded media references.
- `near-function/deploy`: deployment definition/check/planning, with no deployment executor.

```js
import {createStateChannel} from 'near-function';
const channel = createStateChannel({
  initial:{count:0}, reduce:(state,amount)=>({count:state.count+amount})
});
await channel.mutate(1,{expectedRevision:0});
```

The generic assistant template defaults to a mock provider and no live calls:

```js
import {createTemplateServer} from 'near-function/templates/open-dot/server';
const app = createTemplateServer({storage:'memory',provider:{kind:'mock'},port:9462});
console.log(await app.listen());
// await app.close();
```

Storage requires an explicit choice and session consent. Real provider, CLI, transcription and voice profiles require explicit host configuration and authorization. Browser microphone/camera access requires an explicit user action. Hardware and paid model execution remain unverified. An offline fixture does not demonstrate live provider availability.

```sh
near-function dryrun --template dot --first-install
near-function dryrun definition.json snapshot.json
```

The CLI only plans; it cannot deploy. Missing observations remain unverified. Cloud setup, infrastructure observation, rollout/rollback and production authentication policy are unfinished. State-channel subscriptions are in-process; distributed durability and reconnect replay are unfinished. Native Bend transport embedding is JavaScript-only, sequential and coupled to the pinned compiler; general Base concurrency and a C transport backend are unsupported. JavaScript provider clients remain a separate compatibility implementation rather than pretending to be native Bend execution.

See the [package guide](packages/function/README.md), [AI guide](packages/function/stdlib/ai/README.md), [assistant guide](packages/function/stdlib/dot/README.md), [deployment guide](packages/function/deployment/README.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Module-specific documentation defines supported protocol subsets and remaining gaps.

## Installation

Bend Hub uses four-part version `0.1.0.0`. Select the pure entry or individual modules:

```bend
import near-function@0.1.0.0/near-function.bend as Near
import near-function@0.1.0.0/stdlib/ai/bend/requests.bend as Requests
```

`hub.bend` is the distribution inventory and includes native IO sources. The pure `near-function.bend` entry remains independent of IO. Native asynchronous IO requires the separate explicit JavaScript host/embedding; the stock synchronous runner does not await it.

The companion Node/browser package is distributed as a GitHub release tarball, with no npm registry publication:

```sh
npm install https://github.com/PedroAVJ/near-bend/releases/download/v0.1.0/near-function-0.1.0.tgz
```

To verify from source with Node22+ and Bun1.4.2:

```sh
npm ci --ignore-scripts --cache node_modules/.npm-cache
npm run verify
```

The included compiler is pinned Bend2.0.34 with its upstream Apache-2.0 license. CI runs offline/mock verification; no provider credentials or production deployment are used.

The framework canvas is available with `npm run canvas:build`, `npm run canvas:test`, and `npm run canvas`. See [the canvas documentation](examples/canvas/README.md). Its specimens contain neutral component examples; application-specific screens remain in their own repositories.

## Package naming and compatibility

The package is `near-function`; the framework is **F**, written **F(s)** in visual notation. The repository remains `near-bend`. The `near-v` executable alias and `near-v.bend` source entry are retained for local source/CLI compatibility in this same package. Existing JavaScript consumers must update their package dependency and bare imports to `near-function`; there is no second `near-v` package.

The internal `near-v.native-host.v1` and `near-v.native-io.async.v1` global symbol keys remain unchanged as a versioned native-host ABI, so compiled IO and its installed host continue to agree. They are not package names. No namespace registration or publication is implied by this local rename.
