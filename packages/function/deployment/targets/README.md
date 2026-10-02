# Selectable release target readiness

Pure F deployment preparation contract. It reads no repositories, credentials, accounts or network state and has no executor. The current task permits preparation only; a passing plan does not authorize publication or remote changes.

`push` means Git source remote synchronization; `build` means artifact compilation; `release` means version designation; `publish` means package distribution; `deploy` means runtime target activation; `submit` means store review submission. Catalog operation labels describe these boundaries, not completed actions. Source sync, package publishing, backend deployment and store submission have distinct requirement sets.

```js
import {planReleaseTargets} from 'near-function/deploy/targets';
const plan = planReleaseTargets(['github-source']);
// Only Git source checks are selected. No mobile signing/store gate is introduced.
// Unobserved auth remains not-observed, never inferred absent credentials.
```

Each observation is keyed by selected target and check id, with explicit status and exact reason. Statuses: `passed`, `failed`, `absent`, `unimplemented`, `not-observed`. Missing evidence defaults to `not-observed` with the requirement named. `absent` requires a caller observation establishing absence. Unselected target observations do not affect readiness. Unknown check names on selected targets are rejected to expose typos. Plans and their checks are frozen.

A plan passes only if all checks belonging to selected targets have passed observations. Evidence remains caller supplied, with no approval authenticity certification. Mobile store review stays external; this aggregation cannot confer acceptance. Backend runtime requirements do not invent an iOS/Android executor. Target-specific artifact/provenance and mobile modules supply more detailed evidence before adaptation into these checks; aggregation itself never manufactures evidence.

Integrate package export `./deploy/targets` using `types:./deployment/targets/index.d.mts`, `import:./deployment/targets/index.mjs`; include `tests/targets.test.mjs` in test selection. Tests: nine Node cases and strict TypeScript consumer pass. Synthetic fixtures only; no real credential/auth probes, publication, signing or network changes.
