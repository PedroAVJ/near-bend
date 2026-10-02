import Base

# Typed F target declarations; these constructors are not mobile runtimes.
type Platform is Data:
  IOS{}
  Android{}
type Capability is Data:
  UI{}
  Network{}
  Microphone{}
  Camera{}
  Notifications{}
  FilePicker{}
  SecureStorage{}
  DeepLink{}
type SandboxUI is Data:
  HTMLJavaScript{}
  StructuredUI{}
type Backend is Data:
  LocalDesktop{id: String, endpoint: String}
  RemotePrivate{id: String, endpoint: String}
type Distribution is Data:
  Development{}
  Store{}
type Target is Data:
  Target{platform: Platform, application_id: String, version: String, ui: SandboxUI, backend: Backend, distribution: Distribution, capabilities: List<&2, Capability>}
type Approval is Data:
  ExternalApproval{application_id: String, version: String, artifact_sha256: String, reference: String}
  MissingApproval{}
type Observation is Data:
  Observation{artifact_sha256: String, signed: Bool, native_runtime: Bool, device_tested: Bool, authenticated: Bool, connected: Bool, service_consent: Bool, sandbox_isolated: Bool, capabilities_implemented: Bool, store_review: Approval}
