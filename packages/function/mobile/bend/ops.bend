import Base
import ./type.bend as T

# Foreign evidence is caller supplied. Equality does not establish authenticity.
def reviewed(target: T.Target, digest: String, approval: T.Approval) -> Bool:
  match target approval:
    case T.Target{platform, id, version, ui, backend, T.Development{}, capabilities} _:
      True{}
    case T.Target{platform, id, version, ui, backend, T.Store{}, capabilities} T.ExternalApproval{actual_id, actual_version, actual_digest, reference}:
      String.eq(id, actual_id) && String.eq(version, actual_version) && String.eq(digest, actual_digest) && Bool.not(String.eq(reference, ""))
    case _ _: False{}

# A bounded native witness: JS planner additionally checks policy gates/origins/privacy.
# This is necessary evidence, not sufficient store acceptance.
def basic_evidence(target: T.Target, +observation: T.Observation) -> Bool:
  match observation:
    case T.Observation{digest, signed, runtime, tested, authenticated, connected, consent, isolated, implemented, review}:
      Bool.not(String.eq(digest, "")) && signed && runtime && tested && authenticated && connected && consent && isolated && implemented && reviewed(target, digest, review)
