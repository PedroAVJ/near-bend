import type { Dot, Grant, Pairing, Permission, Failure } from './client.js';
/** Server-only reference adapter; principal IDs must come from caller-owned authentication. */
export function createSetupAuthority(options: { dots: readonly Dot[]; callbackURLs: readonly string[]; now?: () => number; maxTTL?: number }): {
 issue(request: { dotId: string; ownerId: string; audience: string; consent: boolean; callback: string; ttl?: number }): Grant;
 redeem(request: { link: string; audience: string; consent: boolean; acceptedPermissions: readonly Permission[]; signal?: AbortSignal }): { readonly ok: true; readonly pairing: Pairing; readonly callback: string } | Failure;
 cancel(request: { link: string; ownerId: string }): { readonly ok: true } | Failure;
 choose(request: { dotId: string; audience: string }): { readonly ok: true; readonly pairing: Pairing } | Failure;
};
