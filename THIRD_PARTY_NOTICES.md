# Third-party notices

The reusable package is MIT licensed. Retain the complete copyright and permission notices included in each source tree.

- Deployment Bend sources derive from [PedroAVJ/n](https://github.com/PedroAVJ/n) at `1e5e64d`. The upstream MIT license is retained in `packages/function/deployment/LICENSE`; adaptation details are in its `PROVENANCE.md`.
- The internal wire JSON parser is adapted from the standalone MIT-licensed parser identified in `packages/function/stdlib/ai/bend/PROVENANCE.md`. Its complete copyright and permission notice is retained in `packages/function/stdlib/ai/bend/WIRE_JSON_LICENSE`. That license must accompany distributions containing the parser.
- The pinned Bend compiler tooling retains its Apache-2.0 license in `tools/bend/LICENSE`. Compiler tooling and the MIT package have distinct licenses.
- Installed dependencies retain their own licenses. Optional WebSocket transport uses the `ws` package; it is not an application asset or bundled private service.

No rights in private application assets or customer material are granted by this release; those materials are excluded from the public source.
