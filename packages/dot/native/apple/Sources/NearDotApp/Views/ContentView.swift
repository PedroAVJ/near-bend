import SwiftUI
struct ContentView: View {
    @StateObject private var store = ClientStore()
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Open Dot").font(.largeTitle.bold())
                Text("Native client · offline verification adapter").foregroundStyle(.secondary)
                Text("A deployment owns your Dots, tools, storage and access. Installing this app grants no authentication or network access.")
                Picker("Sample deployment", selection: $store.selectedBackend) {
                    Text("Remote private backend").tag("remote")
                    Text("Desktop loopback backend").tag("local")
                }.pickerStyle(.menu)
                Button("Create owner-approved sample pairing") { Task { await store.issueSample() } }
                if let link = store.qrLink {
                    QRCodeView(payload: link).frame(width: 160, height: 160)
                    Text("QR and manual entry carry the same single-use sample link.").font(.caption)
                    if let expiry = store.expiresAt { Text("Expires \(expiry, style: .relative)").font(.caption) }
                }
                SecureField("Paste pairing link (or scanned QR text)", text: $store.input)
                    .textFieldStyle(.roundedBorder)
                    .privacySensitive()
                Toggle("I consent to pairing this client and granting chat + MCP UI", isOn: $store.consent)
                HStack {
                    Button("Pair sample Dot") { Task { await store.redeem() } }.disabled(!store.consent || store.input.isEmpty)
                    Button("Cancel") { Task { await store.cancel() } }
                }
                Text(store.status).font(.callout).accessibilityIdentifier("connection-status")
                if let pairing = store.paired {
                    Divider()
                    Text("Selected Dot: \(pairing.dotID)").font(.headline)
                    Text("Backend: \(pairing.backend.kind.rawValue)").foregroundStyle(.secondary)
                }
                if let ui = store.ui { MCPUIView(resource: ui, action: store.perform) }
                Text("No provider keys, live accounts, camera permission or network requests are used. Camera scanning and live deployment authentication are pending adapters.").font(.caption).foregroundStyle(.secondary)
            }.padding(24)
        }.onOpenURL { store.receive($0) }
    }
}
