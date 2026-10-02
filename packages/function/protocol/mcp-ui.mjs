const capabilities = new Set(['text', 'button', 'form']);
const permissions = new Set(['chat', 'tasks', 'microphone', 'camera', 'mcp-ui']);
// Generic declarative composition only. Arbitrary HTML/JS and remote frames
// require a separate sandboxed native/web adapter and are rejected here.
export function composeMcpUI(resource, host) {
  if (!resource || resource.kind !== 'declarative' || typeof resource.serviceId !== 'string') throw new TypeError('Declarative service resource required');
  if (!host.connectedServices.includes(resource.serviceId)) throw new Error('Service not connected');
  if (!host.trustedServices.includes(resource.serviceId)) throw new Error('Explicit service trust required');
  if (!host.grantedPermissions.includes('mcp-ui')) throw new Error('UI consent required');
  if (!Array.isArray(resource.nodes) || resource.nodes.length > 100) throw new TypeError('Invalid node budget');
  const seen = new Set();
  const nodes = resource.nodes.map(node => {
    if (!node || !capabilities.has(node.type) || !host.capabilities.includes(node.type)) throw new Error('Unsupported host capability');
    if (typeof node.id !== 'string' || !/^[A-Za-z0-9_-]{1,96}$/.test(node.id) || seen.has(node.id)) throw new TypeError('Unique node IDs required');
    seen.add(node.id);
    if (typeof node.text !== 'string' || node.text.length > 4096) throw new TypeError('Bounded text required');
    // Treat text as text in adapters. No source HTML is emitted.
    if (Object.keys(node).some(k => !['id', 'type', 'text', 'action', 'permissions'].includes(k))) throw new TypeError('Unknown UI fields');
    const required = node.permissions ?? [];
    if (!Array.isArray(required) || required.some(p => !permissions.has(p) || !host.grantedPermissions.includes(p))) throw new Error('Action permission missing');
    if (node.type === 'text' && node.action !== undefined) throw new Error('Text cannot invoke actions');
    const policy = host.actionPolicies[resource.serviceId]?.[node.action];
    if (node.type !== 'text' && (typeof node.action !== 'string' || !Array.isArray(policy) || policy.some(p => !permissions.has(p) || !host.grantedPermissions.includes(p)))) throw new Error('Service action policy denied');
    return Object.freeze({ id: node.id, type: node.type, text: node.text, ...(node.action === undefined ? {} : { action: node.action }), permissions: Object.freeze([...required]) });
  });
  return Object.freeze({ kind: 'declarative', serviceId: resource.serviceId, nodes: Object.freeze(nodes) });
}
export function authorizeMcpAction(ui, nodeId, currentHost) {
  const node = ui.nodes.find(n => n.id === nodeId);
  if (!node?.action) return false;
  // Recheck permissions/connectivity after composition to handle revocation.
  return currentHost.connectedServices.includes(ui.serviceId) && currentHost.trustedServices.includes(ui.serviceId) && currentHost.grantedPermissions.includes('mcp-ui') && currentHost.capabilities.includes(node.type) && Array.isArray(currentHost.actionPolicies[ui.serviceId]?.[node.action]) && currentHost.actionPolicies[ui.serviceId][node.action].every(p => permissions.has(p) && currentHost.grantedPermissions.includes(p)) && node.permissions.every(p => currentHost.grantedPermissions.includes(p));
}
