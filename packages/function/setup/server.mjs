import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { defineBackend } from './client.mjs';

const id = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,96}$/.test(value)) throw new TypeError('Invalid identifier');
  return value;
};
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = code => Object.freeze({ ok: false, code });
const permitted = new Set(['chat', 'tasks', 'microphone', 'camera', 'mcp-ui']);
function permissions(values) {
  if (!Array.isArray(values) || values.some(x => !permitted.has(x))) throw new TypeError('Unknown permission');
  return Object.freeze([...new Set(values)]);
}
// Local reference adapter. Its caller must supply authenticated principal IDs.
// Codes never contain or authorize provider credentials. Map mutation is atomic
// within this process; a multi-process backend must use transactional storage.
export function createSetupAuthority({ dots, callbackURLs, now = Date.now, maxTTL = 300_000 }) {
  if (!Number.isInteger(maxTTL) || maxTTL < 1 || maxTTL > 300_000) throw new TypeError('Maximum TTL is five minutes');
  const callbacks = new Set(callbackURLs.map(value => {
    const url = new URL(value);
    if (!['https:', 'near-dot:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new TypeError('Unsafe callback');
    if (url.protocol === 'near-dot:' && (url.hostname !== 'setup' || url.pathname !== '/complete')) throw new TypeError('Invalid installed-client callback');
    return url.href;
  }));
  const known = new Map(dots.map(dot => [id(dot.id), Object.freeze({ id: dot.id, ownerId: id(dot.ownerId), backend: defineBackend(dot.backend), permissions: permissions(dot.permissions) })]));
  if (known.size !== dots.length) throw new TypeError('Duplicate Dot IDs');
  const grants = new Map();
  const pairings = new Map();
  function issue({ dotId, ownerId, audience, consent, callback, ttl = maxTTL }) {
    const dot = known.get(id(dotId));
    if (!dot || dot.ownerId !== id(ownerId) || consent !== true) throw new Error('Explicit authenticated owner consent required');
    id(audience);
    if (!callbacks.has(callback)) throw new Error('Callback is not allowlisted');
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > maxTTL) throw new TypeError('Invalid TTL');
    for (const [key, grant] of grants) if (now() >= grant.expiresAt + maxTTL) grants.delete(key);
    if (grants.size >= 1000) throw new Error('Local setup storage capacity reached');
    const code = randomBytes(32).toString('base64url');
    const expiresAt = now() + ttl;
    grants.set(digest(code), { dot, audience, callback, expiresAt, state: 'pending' });
    // Installed client handles redemption. No user-provided redirect target.
    const link = new URL('near-dot://setup/pair');
    link.searchParams.set('code', code);
    return Object.freeze({ link: link.href, expiresAt });
  }
  function lookup(link) {
    let url;
    try { url = new URL(link); } catch { return null; }
    if (url.protocol !== 'near-dot:' || url.hostname !== 'setup' || url.pathname !== '/pair' || url.hash || url.username || url.password || [...url.searchParams.keys()].some(k => k !== 'code') || url.searchParams.getAll('code').length !== 1) return null;
    const code = url.searchParams.get('code');
    if (!/^[A-Za-z0-9_-]{43}$/.test(code ?? '')) return null;
    return grants.get(digest(code)) ?? null;
  }
  function redeem({ link, audience, consent, acceptedPermissions, signal }) {
    if (signal?.aborted) return fail('cancelled');
    const grant = lookup(link);
    if (!grant) return fail('invalid-code');
    if (grant.state !== 'pending') return fail(grant.state === 'expired' ? 'expired' : grant.state === 'cancelled' ? 'cancelled' : 'replayed');
    if (now() >= grant.expiresAt) { grant.state = 'expired'; return fail('expired'); }
    // Constant-time comparison after normalized equal-length check.
    const claimed = typeof audience === 'string' && audience.length <= 96 ? Buffer.from(audience) : Buffer.alloc(0);
    const expected = Buffer.from(grant.audience);
    if (claimed.length !== expected.length || !timingSafeEqual(claimed, expected)) return fail('wrong-audience');
    if (consent !== true) return fail('consent-required');
    const accepted = permissions(acceptedPermissions);
    if (accepted.some(p => !grant.dot.permissions.includes(p))) return fail('permission-denied');
    grant.state = 'redeemed';
    const pairing = Object.freeze({ dotId: grant.dot.id, audience: grant.audience, backend: grant.dot.backend, permissions: accepted });
    pairings.set(`${grant.audience}:${grant.dot.id}`, pairing);
    return Object.freeze({ ok: true, pairing, callback: grant.callback });
  }
  function cancel({ link, ownerId }) {
    const grant = lookup(link);
    if (!grant || grant.dot.ownerId !== ownerId) return fail('not-authorized');
    if (grant.state !== 'pending') return fail('not-pending');
    grant.state = 'cancelled';
    return Object.freeze({ ok: true });
  }
  function choose({ dotId, audience }) {
    const pairing = pairings.get(`${id(audience)}:${id(dotId)}`);
    return pairing ? Object.freeze({ ok: true, pairing }) : fail('pairing-required');
  }
  return Object.freeze({ issue, redeem, cancel, choose });
}

