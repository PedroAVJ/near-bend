import Base
import ./primitives.bend as P
import ./metrics.bend as M
import ./tokens.bend as T

# The sign-off frame: every case of the two primitives, grouped by family,
# marked by status. Used and approved: plain. Approved but used nowhere:
# dead, dimmed (the Disabled rule). Used but not approved: the sign-off
# queue, highlighted. Neither: outlined, "not used".

type Status is Data:
  Status.Live{}
  Status.Dead{}
  Status.Queue{}
  Status.Idle{}
def status(+name: String, +used: List<&2, String>, +approved: List<&2, String>) -> Status:
  +u = P.has_name(used, name)
  +a = P.has_name(approved, name)
  Bool.pick(Status, Bool.and(u, a), Status.Live{}, Bool.pick(Status, a, Status.Dead{}, Bool.pick(Status, u, Status.Queue{}, Status.Idle{})))
def chip_type() -> P.TextType: P.TextType{"Chip", 12, 500}
def label_type() -> P.TextType: P.TextType{"Label", 11, 500}
def words(name: String, +string: String, +text_type: P.TextType, color: T.TextRole, state: T.State) -> P.Tree:
  P.leaf(name, P.Shape{P.Text{string, text_type}, P.TextFill.Solid{color, state}, P.NoStroke{}, []}, M.width(string, text_type), 16, P.Middle{})
def sized_chip(+label: String, +w: U32, st: Status) -> P.Tree:
  match st:
    case Status.Live{}: P.layout(label, P.Depth{}, 0, 0, w, 26, P.Middle{}, [P.rounded("Chip", P.Solid{T.SurfaceRole.Raised{}, T.State.Rest{}}, w, 26, P.Full{}, P.NoStroke{}, P.Middle{}), words("Case", label, chip_type(), T.TextRole.Ink{}, T.State.Rest{})])
    case Status.Dead{}: P.layout(label, P.Depth{}, 0, 0, w, 26, P.Middle{}, [P.rounded("Chip", P.Fill.None{}, w, 26, P.Full{}, P.Stroke{T.LineRole.Line{}, T.State.Disabled{}, "1"}, P.Middle{}), words("Case", label, chip_type(), T.TextRole.Ink{}, T.State.Disabled{})])
    case Status.Queue{}: P.layout(label, P.Depth{}, 0, 0, w, 26, P.Middle{}, [P.rounded("Chip", P.Solid{T.SurfaceRole.Danger{}, T.State.Rest{}}, w, 26, P.Full{}, P.Stroke{T.LineRole.Ink{}, T.State.Rest{}, "1"}, P.Middle{}), words("Case", label, chip_type(), T.TextRole.Ink{}, T.State.Rest{})])
    case Status.Idle{}: P.layout(label, P.Depth{}, 0, 0, w, 26, P.Middle{}, [P.rounded("Chip", P.Fill.None{}, w, 26, P.Full{}, P.Stroke{T.LineRole.Line{}, T.State.Rest{}, "1"}, P.Middle{}), words("Case", label, chip_type(), T.TextRole.Muted{}, T.State.Rest{})])
def chip(+label: String, st: Status) -> P.Tree:
  sized_chip(label, U32.add(M.width(label, chip_type()), 22), st)
def second(xs: List<&2, String>) -> String:
  match xs:
    case Con{a, Con{b, rest}}: b
    case _: ""
def family_chips(names: List<&2, String>, +family: String, +used: List<&2, String>, +approved: List<&2, String>) -> List<&2, P.Tree>:
  match names:
    case Nil{}: []
    case Con{+n, rest}:
      +own = Bool.pick(List<&2, P.Tree>, String.starts_with(n, family ++ ":"), [chip(second(String.split(n, Chr{58})), status(n, used, approved))], [])
      P.append_trees(own, family_chips(rest, family, used, approved))
def family_row(+family: String, +used: List<&2, String>, +approved: List<&2, String>) -> P.Tree:
  P.layout(family, P.Horizontal{}, 8, 0, 0, 0, P.Leading{}, Con{
    P.layout("Family", P.Horizontal{}, 0, 0, 96, 26, P.Middle{}, [words("Family", family, label_type(), T.TextRole.Muted{}, T.State.Rest{})]),
    family_chips(P.universe(), family, used, approved)})
def families() -> List<&2, String>:
  ["geometry", "radius", "fill", "bitmap", "text role", "surface role", "line role", "stop", "state", "stroke", "effect", "axis"]
def rows(fs: List<&2, String>, +used: List<&2, String>, +approved: List<&2, String>) -> List<&2, P.Tree>:
  match fs:
    case Nil{}: []
    case Con{f, rest}: Con{family_row(f, used, approved), rows(rest, used, approved)}
def legend() -> P.Tree:
  P.layout("Legend", P.Horizontal{}, 10, 0, 0, 0, P.Leading{}, [chip("used, approved", Status.Live{}), chip("approved, dead", Status.Dead{}), chip("used, needs sign-off", Status.Queue{}), chip("defined, unused", Status.Idle{})])
def root(+used: List<&2, String>, +approved: List<&2, String>) -> P.Tree:
  P.layout("Cases", P.Vertical{}, 10, 24, 0, 0, P.Middle{}, Con{legend(), Con{P.layout("Gap", P.Vertical{}, 0, 0, 0, 4, P.Leading{}, []), rows(families(), used, approved)}})
def frame(+used: List<&2, String>) -> P.Specimen:
  P.specimen("approved", "cases", "Approved cases", "Sign-off", "Primitive cases · used vs approved", "Every case of Shape and Layout. Used ⊆ Approved is a law; approved cases nobody uses are dead; used but unapproved cases wait for sign-off.", 1952, 1696, 900, 680, 900, root(used, P.approved()), P.Flat{})
