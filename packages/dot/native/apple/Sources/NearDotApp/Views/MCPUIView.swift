import SwiftUI
#if SWIFT_PACKAGE
import NearDotCore
#endif
struct MCPUIView: View {
    let resource: UIResource
    let action: (String) -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Connected service: \(resource.serviceID)").font(.headline)
            ForEach(resource.nodes) { node in
                switch node.kind {
                case .text: Text(node.text)
                case .button: Button(node.text) { action(node.id) }
                case .form: Text("Form renderer unavailable").foregroundStyle(.secondary)
                }
            }
        }
    }
}
