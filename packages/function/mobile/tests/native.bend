import Base
import ../bend/type.bend as T
import ../bend/ops.bend as O

def target() -> T.Target:
  T.Target{T.IOS{}, "fixture.dot", "0.1.0", T.StructuredUI{}, T.RemotePrivate{"fixture", "https://example.invalid"}, T.Store{}, [T.UI{}, T.Network{}]}
def observation(auth: Bool, review: T.Approval) -> T.Observation:
  T.Observation{"fixture-digest", True{}, True{}, True{}, auth, True{}, True{}, True{}, True{}, review}
def tests() -> Bool:
  O.basic_evidence(target(), observation(True{}, T.ExternalApproval{"fixture.dot", "0.1.0", "fixture-digest", "external-fixture"})) &&
  Bool.not(O.basic_evidence(target(), observation(False{}, T.ExternalApproval{"fixture.dot", "0.1.0", "fixture-digest", "external-fixture"}))) &&
  Bool.not(O.basic_evidence(target(), observation(True{}, T.MissingApproval{}))) &&
  Bool.not(O.basic_evidence(target(), observation(True{}, T.ExternalApproval{"fixture.dot", "0.0.0", "fixture-digest", "external-fixture"})))
def main() -> IO(Unit):
  Bool.pick(IO(Unit), tests(), IO.print("F mobile: 4 native evidence cases passed"), IO.die(Unit, 1, "F mobile evidence failed"))
