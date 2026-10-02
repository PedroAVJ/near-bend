# F(s) — near-function 0.1.0

An experimental MIT-licensed package combining modular UI/state primitives, AI protocols, an assistant core and deployment planning. Bend Hub distribution uses version `0.1.0.0`; the Node tarball uses version `0.1.0`.

The UI library includes composable shape/layout primitives, tokens, standard components, metrics, symbols and animation. `near-function/bend/kit` resolves the typed Bend source. Node does not execute Bend files; compile them with a compatible Bend compiler. `near-function/browser` accepts your compiled export map and exposes renderer/shape/sprite factories. Generated constructor namespaces depend on the compilation root, so preserve the module names expected by the host adapters.

Sprite animation contains generic timing and crop helpers only; no private artwork,
original atlas identifiers or asset paths are included. `nearling.sample()` returns
an artwork-free placeholder. `nearling.sample_asset()` accepts a caller-owned URL
for a generic 8-column, 11-row atlas with 64px cells; callers may supply typed Frame
geometry for another layout. The renderer does not request an image for a blank
placeholder. Artwork licenses remain the caller's responsibility.

`createStateChannel({initial,reduce,authorize})` provides isolated snapshots, synchronous reduction, optimistic revisions, caller-defined authorization and async subscriptions with abort/unsubscribe. It is an in-process state slice. The host must supply authentication and protocol validation; distributed persistence, offline rebasing and reconnect replay are unfinished.

```js
import {createStateChannel} from 'near-function';
const channel = createStateChannel({initial:{count:0},reduce:(s,n)=>({count:s.count+n})});
await channel.mutate(1,{expectedRevision:0});
```

AI, assistant and deployment modules remain separate imports within this distributable: `near-function/ai`, `near-function/dot`, `near-function/deploy`. Import server-only provider code on the host; browser modules do not contain credentials. Native typed AI request/event/state definitions live in `stdlib/ai/bend`. Raw foreign IO and its explicit sequential JavaScript embedding live in `stdlib/ai/native-host`. JavaScript provider adapters remain a compatibility lane.

The reusable assistant template is `near-function/templates/open-dot/server`. It defaults to mock and requires an explicit storage choice. Optional text, transcription, voice and camera profiles require explicit configuration; no live-provider or hardware readiness is implied. Deployment commands are exclusively dry-run. No application-specific inspector, artwork or customer fixtures are distributed.

For a source checkout, use the documented repository verification scripts and `npm pack --dry-run` before release. For an installed package, begin with the mock template or a pure deployment dry-run. Refer to the module READMEs for supported protocols, permission boundaries and incomplete production capabilities. This experimental release does not implement cloud deployment or a production identity system.

The generic canvas preview server is `near-function/templates/canvas/server`. It serves an explicitly selected prebuilt artifact on loopback. The reusable canvas sources and specimen inspector live in `examples/canvas` in the source repository; build them with the repository’s `canvas:build` command. They contain neutral framework examples.

## Package naming and compatibility

The package is `near-function`; the framework is **F**, written **F(s)** in visual notation. The repository remains `near-bend`. The `near-v` executable alias and `near-v.bend` source entry are retained for local source/CLI compatibility in this same package. Existing JavaScript consumers must update their package dependency and bare imports to `near-function`; there is no second `near-v` package.

The internal `near-v.native-host.v1` and `near-v.native-io.async.v1` global symbol keys remain unchanged as a versioned native-host ABI, so compiled IO and its installed host continue to agree. They are not package names. No namespace registration or publication is implied by this local rename.
