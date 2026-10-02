import CoreImage.CIFilterBuiltins
import Foundation
/// QR representation of the same validated link; no alternate authentication path.
public func pairingQRCode(_ link: PairingLink) -> CGImage? {
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(link.url.absoluteString.utf8)
    guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)) else { return nil }
    return CIContext(options: [.useSoftwareRenderer: true]).createCGImage(output, from: output.extent)
}
