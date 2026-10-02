import Base
import ../bend/general/percent.bend as Percent
import ../near-v.bend as V
import ../bend/domain/architecture/system/release/type.bend as R
import ../bend/domain/architecture/system/plan/type.bend as P
import ../bend/domain/architecture/system/plan/ops.bend as PO
import ../bend/domain/architecture/system/deployment/type.bend as D
import ../bend/domain/architecture/system/deployment/ops.bend as DO

# These are pure values. No host effect or process driver is imported.
def missing_snapshot() -> Bool:
  PO.any_blocked(PO.package_steps([R.Package{"near-v", "0.1.0.0", "near-v.bend", []}], []))

def changed_version() -> Bool:
  PO.blocked(PO.package_step(R.Package{"near-v", "0.1.0.0", "near-v.bend", []}, P.Differs{"near-v.bend"}))

def new_release() -> Bool:
  String.eq(PO.show(PO.package_step(R.Package{"near-v", "0.1.0.0", "near-v.bend", []}, P.Unpublished{})), "publish  near-v@0.1.0.0")

def continuity() -> Bool:
  DO.breaks_eq(DO.breaks("before", ["history"], D.Deployment{"after", [], [], []}), [D.AddressChanged{}, D.StoreRemoved{"history"}])

def records() -> Bool:
  +d : D.Deployment = D.Deployment{"http://localhost:9460", ["history"], [], []}
  String.eq(DO.recorded_address(DO.record(d)), "http://localhost:9460") && List.contains(~String, ~String.eq, DO.recorded_stores(DO.record(d)), "history")

def percent_valid() -> Bool:
  String.eq(Maybe.default(&2, String, Percent.decode("/Google%20Chrome/%C3%A9/%F0%9F%98%80/%25"), "invalid"), "/Google Chrome/é/😀/%")

def percent_invalid() -> Bool:
  Bool.not(Maybe.is_some(&2, String, Percent.decode("%GG"))) && Bool.not(Maybe.is_some(&2, String, Percent.decode("%E2%82"))) &&
  Bool.not(Maybe.is_some(&2, String, Percent.decode("%C0%80"))) && Bool.not(Maybe.is_some(&2, String, Percent.decode("%ED%A0%80"))) &&
  Bool.not(Maybe.is_some(&2, String, Percent.decode("%F4%90%80%80")))

def main() -> IO(Unit):
  Bool.pick(IO(Unit), missing_snapshot() && changed_version() && new_release() && continuity() && records() && percent_valid() && percent_invalid(), IO.print("near-v: 7 pure Bend planning checks passed"), IO.die(Unit, 1, "near-v pure planning checks failed"))
