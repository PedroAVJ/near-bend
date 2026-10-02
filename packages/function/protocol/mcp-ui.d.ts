import type { Permission } from '../setup/client.js';
export type NodeType = 'text' | 'button' | 'form';
export interface UINode { readonly id: string; readonly type: NodeType; readonly text: string; readonly action?: string; readonly permissions?: readonly Permission[] }
export interface UIResource { readonly kind: 'declarative'; readonly serviceId: string; readonly nodes: readonly UINode[] }
export interface UIHost { readonly connectedServices: readonly string[]; readonly trustedServices: readonly string[]; readonly grantedPermissions: readonly Permission[]; readonly capabilities: readonly NodeType[]; readonly actionPolicies: Readonly<Record<string, Readonly<Record<string, readonly Permission[]>>>> }
export function composeMcpUI(resource: UIResource, host: UIHost): UIResource;
export function authorizeMcpAction(ui: UIResource, nodeId: string, currentHost: UIHost): boolean;
