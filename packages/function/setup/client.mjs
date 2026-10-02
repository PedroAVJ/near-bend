const fail = code => Object.freeze({ ok: false, code });
const id = value => { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,96}$/.test(value)) throw new TypeError('Invalid identifier'); return value; };
export function defineBackend(input) {
  id(input.id);
  if (!['local-desktop', 'remote-private'].includes(input.kind)) throw new TypeError('Invalid backend kind');
  const endpoint = new URL(input.endpoint);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new TypeError('Backend URL must not contain credentials or parameters');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (input.kind === 'local-desktop' ? !loopback || !['http:', 'https:'].includes(endpoint.protocol) : endpoint.protocol !== 'https:' || loopback) throw new TypeError('Invalid backend transport');
  return Object.freeze({ id: input.id, kind: input.kind, endpoint: endpoint.href });
}
export function checkConnection(backend, client, evidence) {
  defineBackend(backend);
  if (!client.installed) return fail('not-installed');
  if (!client.authenticated) return fail('authentication-required');
  if (evidence.protocol !== 'compatible') return fail('protocol-unverified');
  if (evidence.authorization !== 'verified') return fail('backend-authorization-required');
  if (backend.kind === 'local-desktop' && client.platform !== 'desktop') {
    if (evidence.route !== 'private-route' || typeof evidence.privateEndpoint !== 'string') return fail('local-backend-unreachable');
    try { defineBackend({id: 'private-route', kind: 'remote-private', endpoint: evidence.privateEndpoint}); } catch { return fail('unsafe-private-route'); }
  }
  if (evidence.network !== 'reachable') return fail('network-unverified');
  if (evidence.backend !== 'running') return fail('backend-unavailable');
  return Object.freeze({ ok: true });
}

export function setupPresentation(grant) {
  const url = new URL(grant.link);
  if (url.protocol !== 'near-dot:' || url.hostname !== 'setup' || url.pathname !== '/pair' || url.hash || url.username || url.password || [...url.searchParams.keys()].some(k => k !== 'code') || url.searchParams.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code') ?? '') || !Number.isFinite(grant.expiresAt)) throw new TypeError('Invalid setup grant');
  return Object.freeze({ qrPayload: url.href, manualLink: url.href, expiresAt: grant.expiresAt });
}
