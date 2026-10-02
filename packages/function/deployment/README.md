# Deployment planning

`near-v/deploy` defines and validates deployments for Bend and other codebases. The generic planner is inert: it performs no provider request, DNS change, service setup or deployment. Application requirements from `near-v/requirements` are separate from targets and observations.

```js
import {openDotRequirements} from 'near-v/requirements';
import {planApplication, formatPlan} from 'near-v/deploy';
const target = {kind:'local',ports:{assistant:9462}};
console.log(formatPlan(planApplication(openDotRequirements,target,observedSnapshot)));
```

```sh
near-v dryrun --template dot --first-install
near-v dryrun definition.json snapshot.json
```

`--first-install` explicitly declares an empty previous deployment. Without a previous snapshot, continuity remains unverified. The template helper checks actual artifact existence with read-only metadata. `readyForReview` means supplied observations pass implemented checks; it does not authorize or execute a deployment. Missing artifacts, credentials references, capabilities, dependency cycles, port conflicts and unaccepted address/store changes block readiness. Private target addresses are planned without contacting them.

## Reusable assistant template

```js
import {createTemplateServer} from 'near-v/templates/open-dot/server';
const app = createTemplateServer({storage:'memory',provider:{kind:'mock'},port:9462});
console.log(await app.listen());
// await app.close();
```

Construction makes no network request or storage write. The server binds loopback and checks Host/Origin. Providers, credentials and raw assets stay on the host. Storage choices are explicit: `none`, `memory`, or `file` with a caller-selected path. Persistence also requires session permission. Audio/file records use bounded asset storage; public snapshots contain references, not bytes.

Text profiles support distinct OpenRouter, OpenAI and Anthropic adapters with explicit model and `allowPaidRequests:true`. The official Claude CLI profile requires `allowExecution:true`; the CLI owns authentication and its allowed tools remain explicit. There is no credential harvesting or private subscription endpoint. The default provider is mock. The fixed task runner is an offline demonstration with approval gates, not an external executor or scheduler.

Audio messages remain playable while ElevenLabs Scribe v2 transcription moves through pending, running, ready, failed or cancelled states. A successful transcript can queue one linked assistant reply; it does not replace the audio record. Missing transcription configuration produces a clear failure and explicit retry. Real transcription requires host configuration and paid-request permission. The `offline-fixture` profile is trusted injected test data, not evidence of live provider verification.

Optional voice profiles are separate: OpenAI Realtime uses explicit manual audio turns; GPT-Live uses continuous input and client delegation. Select exactly one protocol and provide its model, host key and paid-request permission. Realtime input transcription requires explicit native configuration. GPT-Live delegation requires approval and does not pretend to implement Realtime commit/cancel semantics. Microphone and camera acquisition are explicit browser actions. Camera context is disabled by default; Realtime image context and a GPT-Live vision-summary delegate have distinct capabilities. Keys never reach the browser.

This is an experimental local template, not a production authentication or infrastructure system. Hardware, paid provider access and deployed operation remain unverified. WebRTC, sideband delegation and production identity policy are outside this release.

## Bend module and remaining work

`near-v/deploy/bend` contains pure architecture, deployment and planning definitions. Its supporting graphs remain internal. The JavaScript planner is a separately maintained slice. Live infrastructure observation, deployment executors, rollout/rollback, persisted deployment records and cloud setup are unimplemented. No command in this release performs deployment. See `PROVENANCE.md` and `LICENSE` for source attribution.
