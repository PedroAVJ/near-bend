import SwiftUI
#if SWIFT_PACKAGE
import NearDotCore
#endif
struct QRCodeView: View {
    let payload: String
    private var image: CGImage? {
        guard let link = try? PairingLink(payload) else { return nil }
        return pairingQRCode(link)
    }
    var body: some View {
        if let image {
            Image(decorative: image, scale: 1).interpolation(.none).resizable().scaledToFit()
                .background(.white).accessibilityLabel("Synthetic pairing QR code")
        } else { Text("QR unavailable; use manual link input") }
    }
}
