import SwiftUI
#if os(macOS)
import AppKit
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}
#endif
@main
struct NearDotApp: App {
    #if os(macOS)
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    #endif
    var body: some Scene {
        WindowGroup("Open Dot") { ContentView().frame(minWidth: 320, minHeight: 500) }
        #if os(macOS)
        .defaultSize(width: 720, height: 760)
        #endif
    }
}
