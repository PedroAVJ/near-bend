# 0.1.0 / Hub 0.1.0.0

Initial experimental MIT release of reusable UI/state primitives, typed provider-specific Bend AI protocol modules, raw host transport effects, shared assistant conversation/task/permission state, bounded media storage and dry-run deployment planning.

The generic assistant template starts with a mock provider. Audio records stay playable, transcription has explicit error/retry states, and successful transcription can create a linked reply. Optional host provider, official CLI, Realtime and GPT-Live profiles preserve distinct capabilities and require explicit authorization. No live hardware/provider success is claimed by offline fixtures.

Review before use:

```sh
npm pack --dry-run
near-v dryrun --template dot --first-install
near-v dryrun definition.json snapshot.json
```

Deployment execution, live infrastructure observation, rollout/rollback, production authentication, distributed state replay, generic native concurrency and a C transport backend remain unfinished. Native IO embedding is coupled to the pinned JavaScript compiler. This release excludes application code, customer data, artwork and local diagnostic/history artifacts.

The source repository also retains the generic local framework canvas and inspector: Primitives and Components pages, layout/focus overlays, motion scrubbers, resize stages, pan/zoom and scheme controls. It contains neutral component specimens and a generated geometric SVG. It does not include application-specific screens or state simulators.
