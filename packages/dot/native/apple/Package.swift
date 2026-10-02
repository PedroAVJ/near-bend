// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "NearDotApple", platforms: [.macOS(.v14), .iOS(.v17)], products: [.library(name: "NearDotCore", targets: ["NearDotCore"]), .executable(name: "NearDot", targets: ["NearDotApp"])], targets: [.target(name: "NearDotCore"), .executableTarget(name: "NearDotApp", dependencies: ["NearDotCore"]), .testTarget(name: "NearDotCoreTests", dependencies: ["NearDotCore"])])
