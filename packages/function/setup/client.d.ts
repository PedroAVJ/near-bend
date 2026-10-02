export type Permission = 'chat' | 'tasks' | 'microphone' | 'camera' | 'mcp-ui';
export interface Backend { readonly id: string; readonly kind: 'local-desktop' | 'remote-private'; readonly endpoint: string }
export interface Dot { id: string; ownerId: string; backend: Backend; permissions: readonly Permission[] }
export interface Pairing { readonly dotId: string; readonly audience: string; readonly backend: Backend; readonly permissions: readonly Permission[] }
export interface Grant { readonly link: string; readonly expiresAt: number }
export interface Failure { readonly ok: false; readonly code: string }
export function defineBackend(input: Backend): Backend;
export function checkConnection(backend: Backend, client: { installed: boolean; authenticated: boolean; platform: 'desktop' | 'ios' | 'android' | 'browser' }, evidence: { network: 'reachable' | 'unreachable' | 'unknown'; backend: 'running' | 'stopped' | 'unknown'; protocol: 'compatible' | 'incompatible' | 'unknown'; authorization: 'verified' | 'denied' | 'unknown'; route: 'loopback' | 'private-route' | 'direct' | 'unknown'; privateEndpoint?: string }): { readonly ok: true } | Failure;
/** QR and manual input represent the exact same bearer link; this does not render QR pixels. */
export function setupPresentation(grant: Grant): { readonly qrPayload: string; readonly manualLink: string; readonly expiresAt: number };
