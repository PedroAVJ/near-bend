import Base
import ./primitives.bend as P
import ./kit_canvas.bend as KC
import ./cases.bend as Cases

# Reusable framework specimen workspace; application screens live in their own repositories.
type Page is Data:
  Page{id: String, label: String}
type Section is Data:
  Section{id: String, page: String, label: String, kind: String, parent: String}
type Preview is Data:
  Preview{id: String, parent: String, label: String, kind: String, x: String, y: String}
type Workspace is Data:
  Workspace{pages: List<&2, Page>, sections: List<&2, Section>, previews: List<&2, Preview>, specimens: List<&2, P.Specimen>, edges: List<&2, KC.Edge>, samples: List<&2, P.Specimen>, sample_edges: List<&2, KC.Edge>}
def pages() -> List<&2, Page>:
  [Page{"primitives", "Primitives"}, Page{"components", "Components"}]
def sections() -> List<&2, Section>:
  [Section{"shape", "primitives", "Shape", "shape", ""},
   Section{"geometry", "primitives", "Geometry cases", "geometry", "shape"},
   Section{"fill", "primitives", "Fill cases", "fill", "shape"},
   Section{"effect", "primitives", "Effect cases", "effect", "shape"},
   Section{"layout", "primitives", "Layout", "layout", ""},
   Section{"cases", "primitives", "Cases", "cases", ""},
   Section{"kit", "components", "", "kit", ""}]
def append(xs: List<&2, P.Specimen>, ys: List<&2, P.Specimen>) -> List<&2, P.Specimen>:
  match xs:
    case []: ys
    case x <> rest: x <> append(rest, ys)
def workspace() -> Workspace:
  +all = append(P.specimens(), KC.frames())
  +used = P.unique(P.append_names(P.specimens_cases(all), KC.stage_used()), [])
  Workspace{pages(), sections(), [], append(all, [Cases.frame(used)]), KC.edges(), KC.sample_frames(), KC.sample_edges()}
