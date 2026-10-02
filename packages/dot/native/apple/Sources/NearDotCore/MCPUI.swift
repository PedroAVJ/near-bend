import Foundation
public enum UINodeKind: String, Sendable { case text, button, form }
public struct UINode: Identifiable, Sendable {
    public let id: String
    public let kind: UINodeKind
    public let text: String
    public let action: String?
    public let permissions: Set<Permission>
    public init(id: String, kind: UINodeKind, text: String, action: String? = nil, permissions: Set<Permission> = []) {
        self.id = id; self.kind = kind; self.text = text; self.action = action; self.permissions = permissions
    }
}
public struct UIResource: Sendable {
    public let serviceID: String
    public let nodes: [UINode]
    public init(serviceID: String, nodes: [UINode]) { self.serviceID = serviceID; self.nodes = nodes }
}
public struct UIHost: Sendable {
    public var connected: Set<String>
    public var trusted: Set<String>
    public var permissions: Set<Permission>
    public var capabilities: Set<UINodeKind>
    public var actionPolicies: [String: [String: Set<Permission>]]
    public init(connected: Set<String>, trusted: Set<String>, permissions: Set<Permission>, capabilities: Set<UINodeKind>, actionPolicies: [String: [String: Set<Permission>]]) {
        self.connected = connected; self.trusted = trusted; self.permissions = permissions; self.capabilities = capabilities; self.actionPolicies = actionPolicies
    }
}
public func composeMCPUI(_ resource: UIResource, host: UIHost) throws -> UIResource {
    guard host.connected.contains(resource.serviceID), host.trusted.contains(resource.serviceID), host.permissions.contains(.mcpUI) else { throw ClientFailure.untrustedService }
    guard resource.nodes.count <= 256, Set(resource.nodes.map(\.id)).count == resource.nodes.count else { throw ClientFailure.unsupportedUI }
    for node in resource.nodes {
        guard !node.id.isEmpty, node.text.count <= 4096, host.capabilities.contains(node.kind), node.permissions.isSubset(of: host.permissions) else { throw ClientFailure.unsupportedUI }
        if node.kind != .text {
            guard let action = node.action, let policy = host.actionPolicies[resource.serviceID]?[action], policy.isSubset(of: host.permissions) else { throw ClientFailure.permissionDenied }
        } else if node.action != nil { throw ClientFailure.unsupportedUI }
    }
    return resource
}
public func authorizeMCPAction(_ resource: UIResource, nodeID: String, host: UIHost) -> Bool {
    guard (try? composeMCPUI(resource, host: host)) != nil,
          let node = resource.nodes.first(where: { $0.id == nodeID }), node.kind != .text else { return false }
    return true
}
