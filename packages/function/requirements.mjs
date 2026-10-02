import {defineSource} from './deployment/src/provenance.js';
/** F-owned application requirements. Deployment targets/configuration belong to V. */
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const openDotRequirements = freeze({
  name: 'open-dot', version: '0.1.0', entryService: 'assistant',
  services: [{id: 'assistant', runtime: 'node', artifact: 'deployment/templates/open-dot/server.mjs', dependsOn: [], secretRefs: []}],
  stores: [{id: 'continuity', required: false}],
  requiredArtifacts: ['stdlib/dot/src/generated/session.mjs', 'stdlib/dot/src/browser.mjs', 'adapters/browser/render.mjs'],
});
export const canvasRequirements = freeze({
  name: 'canvas', version: '0.1.0', entryService: 'inspector',
  services: [{id: 'inspector', runtime: 'node', artifact: 'deployment/templates/canvas/server.mjs', dependsOn: [], secretRefs: []}],
  stores: [],
  requiredArtifacts: ['examples/canvas/dist/index.html', 'examples/canvas/dist/build/app.mjs', 'examples/canvas/dist/components.css'],
});
/** Provider profiles contain reference names, never credential values. */
export function dotRequirementsFor(provider = 'mock', options = {}) {
  if (options.realtime === true && options.gptLive === true) throw new TypeError('Choose one voice protocol');
  const refs = {mock: [], openrouter: ['OPENROUTER_API_KEY'], openai: ['OPENAI_API_KEY'], anthropic: ['ANTHROPIC_API_KEY'], claudeCli: []};
  if (!Object.hasOwn(refs, provider)) throw new TypeError('Unsupported template provider');
  const hasAudio = options.realtime === true || options.gptLive === true;
  const protocolArtifacts = options.gptLive === true
    ? ['stdlib/ai/src/gpt-live.mjs', 'stdlib/dot/src/gpt-live-bridge.mjs']
    : ['stdlib/ai/src/live.mjs', 'stdlib/dot/src/live-bridge.mjs'];
  return freeze({
    ...openDotRequirements,
    ...(hasAudio ? {requiredArtifacts: [...openDotRequirements.requiredArtifacts, ...protocolArtifacts, 'stdlib/dot/src/media.mjs', 'stdlib/dot/src/capture-worklet.mjs']} : {}),
    ...(provider === 'claudeCli' ? {requiredCapabilities: ['claude-cli.authenticated']} : {}),
    services: openDotRequirements.services.map(service => ({
      ...service,
      secretRefs: [...new Set([...refs[provider], ...(hasAudio ? ['OPENAI_API_KEY'] : [])])],
    })),
  });
}

/** Attach an explicit same-repository or mirror implementation binding to F requirements. */
export function withDeploymentSource(requirements,source){return freeze({...structuredClone(requirements),source:defineSource(source)})}
