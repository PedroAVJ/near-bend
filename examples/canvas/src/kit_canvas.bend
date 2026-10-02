import Base
import ./primitives.bend as P
import ./symbols.bend as S
import ./nearling.bend as N
import ./metrics.bend as M
import ./kit.bend as K
import ./tokens.bend as T

# The Components page: one flat set of the 17 components in kit.bend. Each
# frame shows:
#   - its case matrix (every combination of its cases, labelled), with
#     extreme content (long Spanish names, empty strings, long messages);
#   - Instant rows for status changes that must not animate;
#   - its transitions: live (play/pause, scrub, loop; the browser drives the
#     clock and asks stage() for the frame at `now`) or, with ?samples=1,
#     static samples at 0/33/66/100%, each with a Reduced motion row;
#   - its sizes: each size case's range and derived threshold, its boxes in
#     the representative viewports (or a typical box), and a live resize
#     stage (the browser asks sized() for the component in the dragged box).
# Frames are laid out in dependency columns, leaves on the left, so every
# dependency edge (used -> user) runs left to right.

# Scaffolding (canvas annotations, not part of any component)
# -----------------------------------------------------------

def note(+text: String, align: P.Align) -> P.Tree:
  K.words("Case", text, K.annotation(), T.TextRole.Muted{}, align)
def section_title(+text: String) -> P.Tree:
  K.words("Section", text, P.TextType{"Section", 12, 600}, T.TextRole.Ink{}, P.Leading{})
def cell(+width: U32, t: P.Tree, align: P.Align) -> P.Tree:
  P.layout("Cell", P.Depth{}, 0, 0, width, 0, P.Middle{}, [K.aligned(t, align)])
def heading(+width: U32, +text: String) -> P.Tree:
  cell(width, note(text, P.Middle{}), P.Middle{})
def row(+label_width: U32, +label: String, cells: List<&2, P.Tree>) -> P.Tree:
  P.layout(label, P.Horizontal{}, 28, 0, 0, 0, P.Leading{}, Con{P.layout("Row label", P.Horizontal{}, 0, 0, label_width, 0, P.Middle{}, [note(label, P.Leading{})]), cells})
def blank(+label_width: U32, cells: List<&2, P.Tree>) -> P.Tree:
  P.layout("Columns", P.Horizontal{}, 28, 0, 0, 0, P.Leading{}, Con{P.layout("Row label", P.Horizontal{}, 0, 0, label_width, 0, P.Middle{}, []), cells})
def matrix(+name: String, rows: List<&2, P.Tree>) -> P.Tree:
  P.layout(name, P.Vertical{}, 18, 0, 0, 0, P.Leading{}, rows)
def labelled(+text: String, t: P.Tree) -> P.Tree:
  P.layout(text, P.Vertical{}, 8, 0, 0, 0, P.Leading{}, [note(text, P.Leading{}), t])
def side_by_side(+name: String, items: List<&2, P.Tree>) -> P.Tree:
  P.layout(name, P.Horizontal{}, 28, 0, 0, 0, P.Leading{}, items)
def one_above_other(+name: String, items: List<&2, P.Tree>) -> P.Tree:
  P.layout(name, P.Vertical{}, 28, 0, 0, 0, P.Leading{}, items)
def section(+name: String, items: List<&2, P.Tree>) -> P.Tree:
  P.layout(name, P.Vertical{}, 14, 0, 0, 0, P.Leading{}, Con{section_title(name), items})
def pairs(xs: List<&2, P.Tree>) -> List<&2, P.Tree>:
  match xs:
    case Nil{}: []
    case Con{a, Nil{}}: [a]
    case Con{a, Con{b, rest}}: Con{side_by_side("Pair", [a, b]), pairs(rest)}
def grid(+name: String, items: List<&2, P.Tree>) -> P.Tree:
  one_above_other(name, pairs(items))
def append(xs: List<&2, P.Tree>, ys: List<&2, P.Tree>) -> List<&2, P.Tree>: K.append_trees(xs, ys)

# Example hole fillings
# ---------------------

def send() -> S.Drawing: S.drawing(S.Send{})
def plus() -> S.Drawing: S.drawing(S.Plus{})
def search() -> S.Drawing: S.drawing(S.Search{})
def telephone() -> S.Drawing: S.drawing(S.Telephone{})
def icon_button(+i: K.Intent) -> K.Button: K.act(K.ButtonKind.Quiet{}, i, K.Form.Icon{})
def primary(+i: K.Intent) -> K.Button: K.act(K.ButtonKind.Primary{}, i, K.Form.Text{})
def quiet(+i: K.Intent) -> K.Button: K.act(K.ButtonKind.Quiet{}, i, K.Form.Text{})
def idle() -> K.NearIdentity: K.near_identity(N.Idle{}, K.Motion.Full{}, K.Clock{0})
def blurred(draft: String) -> K.FieldState: K.FieldState{draft, K.Focus.Blurred{}}
def focused(draft: String) -> K.FieldState: K.FieldState{draft, K.Focus.Focused{}}
def col() -> U32: K.column()
def long_name() -> String: "Sample User Fernández-Castellanos"
def long_label() -> String: "Review the complete component example"
def long_message() -> String: "This long component example exercises wrapping, truncation and resizing without application records."
def moment(+t: U32, r: Bool) -> K.Moment:
  match r:
    case True{}: K.Moment{t, K.Motion.Reduced{}}
    case False{}: K.Moment{t, K.Motion.Full{}}

# Case matrices
# -------------

type Pose is Data:
  Pose.Up{}
  Pose.Down{}
  Pose.Off{}
def fixed_state(pose: Pose) -> K.FixedState:
  match pose:
    case Pose.Up{}: K.FixedState.Enabled{K.Press.Up{}}
    case Pose.Down{}: K.FixedState.Enabled{K.Press.Down{}}
    case Pose.Off{}: K.FixedState.Disabled{}
def served_state(pose: Pose, content: K.Remote<&2, K.Intent>) -> K.ServedState:
  match pose:
    case Pose.Up{}: K.ServedState.Enabled{K.Press.Up{}, content}
    case Pose.Down{}: K.ServedState.Enabled{K.Press.Down{}, content}
    case Pose.Off{}: K.ServedState.Disabled{content}
def fixed_cell(+kind: K.ButtonKind, +pose: Pose, intent: K.Intent, form: K.Form, +w: U32) -> P.Tree:
  cell(w, K.button_tree(K.button(kind, K.Fixed{intent, form}, fixed_state(pose))), P.Middle{})
def served_cell(+kind: K.ButtonKind, +pose: Pose, content: K.Remote<&2, K.Intent>, +w: U32) -> P.Tree:
  cell(w, K.button_tree(K.button(kind, K.Served{K.Form.Text{}}, served_state(pose, content))), P.Middle{})
def button_cells(+kind: K.ButtonKind, +pose: Pose) -> List<&2, P.Tree>:
  [fixed_cell(kind, pose, K.Intent.Send{}, K.Form.Text{}, 96),
   fixed_cell(kind, pose, K.Intent.Send{}, K.Form.Icon{}, 68),
   fixed_cell(kind, pose, K.Intent.Attach{}, K.Form.Both{}, 140),
   served_cell(kind, pose, K.Loading{}, 100),
   served_cell(kind, pose, K.Ready{K.Intent.Send{}}, 96),
   served_cell(kind, pose, K.Pending{K.Intent.Send{}}, 112),
   served_cell(kind, pose, K.Failed{Some{K.Intent.Send{}}}, 96)]
def button_matrix() -> P.Tree:
  matrix("Button cases", [
    blank(140, [heading(96, "Send · Text"), heading(68, "Send · Icon"), heading(140, "Attach · Both"), heading(100, "Served · Loading"), heading(96, "Served · Ready"), heading(112, "Served · Pending"), heading(96, "Served · Failed")]),
    row(140, "Primary · Enabled · up", button_cells(K.ButtonKind.Primary{}, Pose.Up{})),
    row(140, "Primary · Enabled · down", button_cells(K.ButtonKind.Primary{}, Pose.Down{})),
    row(140, "Primary · Disabled", button_cells(K.ButtonKind.Primary{}, Pose.Off{})),
    row(140, "Quiet · Enabled · up", button_cells(K.ButtonKind.Quiet{}, Pose.Up{})),
    row(140, "Quiet · Enabled · down", button_cells(K.ButtonKind.Quiet{}, Pose.Down{})),
    row(140, "Quiet · Disabled", button_cells(K.ButtonKind.Quiet{}, Pose.Off{})),
    row(140, "Danger · Enabled · up", button_cells(K.ButtonKind.Danger{}, Pose.Up{})),
    row(140, "Danger · Enabled · down", button_cells(K.ButtonKind.Danger{}, Pose.Down{})),
    row(140, "Danger · Disabled", button_cells(K.ButtonKind.Danger{}, Pose.Off{})),
    row(140, "Plain · Enabled · up", button_cells(K.ButtonKind.Plain{}, Pose.Up{})),
    row(140, "Plain · Enabled · down", button_cells(K.ButtonKind.Plain{}, Pose.Down{})),
    row(140, "Plain · Disabled", button_cells(K.ButtonKind.Plain{}, Pose.Off{}))])
def button_extreme() -> P.Tree:
  side_by_side("Extreme content", [
    labelled("Within 60: truncated, the spoken name stays whole", K.button_tree(K.act(K.ButtonKind.Primary{}, K.Intent.AllowMic{}, K.Form.Within{60}))),
    labelled("icon-only: speaks its intent (Buscar)", K.button_tree(icon_button(K.Intent.Search{})))])

def single(slice: K.FieldState) -> P.Tree:
  cell(236, K.field_tree(K.field(K.plain(K.Lines.Single{}, "Buscar en Near", [search()], slice), 236)), P.Leading{})
def growing(slice: K.FieldState) -> P.Tree:
  cell(236, K.field_tree(K.field(K.plain(K.Lines.Growing{4}, "Escribe a Near", [], slice), 236)), P.Leading{})
def field_matrix() -> P.Tree:
  matrix("Field cases", [
    blank(104, [heading(236, "Single · accessory Search"), heading(236, "Growing (cap 4)")]),
    row(104, "Empty · Blurred", [single(blurred("")), growing(blurred(""))]),
    row(104, "Filled · Blurred", [single(blurred("Sample text")), growing(blurred("A longer sample message exercises the field height."))]),
    row(104, "Empty · Focused", [single(focused("")), growing(focused(""))]),
    row(104, "Filled · Focused", [single(focused("Pedi")), growing(focused("Faltaron dos kilos"))]),
    row(104, "Growing · Capped", [single(blurred(long_message())), growing(blurred(long_message()))])])
def field_extreme() -> P.Tree:
  side_by_side("Extreme content", [
    labelled("long placeholder (Truncate)", K.field_tree(K.field(K.plain(K.Lines.Single{}, "Write a long sample label for this component", [], blurred("")), 236))),
    labelled("long name (Truncate)", K.field_tree(K.field(K.plain(K.Lines.Single{}, "Nombre", [], blurred(long_name())), 236)))])

def sample_picture() -> K.Picture: K.Picture{"sample-image.svg", 480, 360, "Neutral geometric sample"}
def text() -> String: "Can you see the component preview?"
def mine_cell(delivery: K.Delivery, presence: K.Presence) -> P.Tree:
  cell(280, K.bubble_tree(K.bubble(K.Role.Mine{}, delivery, K.Said.Words{text()}, presence, col())), P.Trailing{})
def photo_cell(delivery: K.Delivery, presence: K.Presence) -> P.Tree:
  cell(280, K.bubble_tree(K.bubble(K.Role.Mine{}, delivery, K.Said.Photo{sample_picture()}, presence, col())), P.Trailing{})
def bubble_matrix() -> P.Tree:
  matrix("Bubble cases", [
    blank(124, [heading(280, "Shown"), heading(280, "Reserved (draws nothing)")]),
    row(124, "Near · no slice", [cell(280, K.bubble_tree(K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{text()}, K.Presence.Shown{}, col())), P.Leading{}), cell(280, K.bubble_tree(K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{text()}, K.Presence.Reserved{}, col())), P.Leading{})]),
    row(124, "Mine · Sending", [mine_cell(K.Delivery.Sending{}, K.Presence.Shown{}), mine_cell(K.Delivery.Sending{}, K.Presence.Reserved{})]),
    row(124, "Mine · Sent", [mine_cell(K.Delivery.Sent{}, K.Presence.Shown{}), mine_cell(K.Delivery.Sent{}, K.Presence.Reserved{})]),
    row(124, "Mine · Failed", [mine_cell(K.Delivery.Failed{}, K.Presence.Shown{}), mine_cell(K.Delivery.Failed{}, K.Presence.Reserved{})]),
    row(124, "Mine · photo · Sending", [photo_cell(K.Delivery.Sending{}, K.Presence.Shown{}), photo_cell(K.Delivery.Sending{}, K.Presence.Reserved{})]),
    row(124, "Mine · photo · Sent", [photo_cell(K.Delivery.Sent{}, K.Presence.Shown{}), photo_cell(K.Delivery.Sent{}, K.Presence.Reserved{})]),
    row(124, "Mine · photo · Failed", [photo_cell(K.Delivery.Failed{}, K.Presence.Shown{}), photo_cell(K.Delivery.Failed{}, K.Presence.Reserved{})])])
def bubble_extreme() -> P.Tree:
  side_by_side("Extreme content", [
    labelled("long message (Wrap)", K.bubble_tree(K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{long_message()}, K.Presence.Shown{}, col()))),
    labelled("empty", K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Words{""}, K.Presence.Shown{}, col())))])

def badge_matrix() -> P.Tree:
  side_by_side("Badge instances", [
    labelled("text \"Near\"", K.badge_tree(K.badge("Near"))),
    labelled("text \"Sample User\"", K.badge_tree(K.badge("Sample User")))])
def badge_extreme() -> P.Tree:
  side_by_side("Extreme content", [labelled("long name (Truncate)", K.badge_tree(K.badge(long_name()))), labelled("empty", K.badge_tree(K.badge("")))])

def full(animation: N.Animation) -> P.Tree:
  cell(92, K.identity_tree(K.near_identity(animation, K.Motion.Full{}, K.Clock{0})), P.Middle{})
def reduced(animation: N.Animation) -> P.Tree:
  cell(92, K.identity_tree(K.near_identity(animation, K.Motion.Reduced{}, Unit{})), P.Middle{})
def identity_matrix() -> P.Tree:
  matrix("NearIdentity cases", [
    blank(108, [heading(92, "Idle"), heading(92, "RunningRight"), heading(92, "RunningLeft"), heading(92, "Waving"), heading(92, "Jumping")]),
    row(108, "Full · clock", [full(N.Idle{}), full(N.RunningRight{}), full(N.RunningLeft{}), full(N.Waving{}), full(N.Jumping{})]),
    row(108, "Reduced · no clock", [reduced(N.Idle{}), reduced(N.RunningRight{}), reduced(N.RunningLeft{}), reduced(N.Waving{}), reduced(N.Jumping{})]),
    blank(108, [heading(92, "Failed"), heading(92, "Waiting"), heading(92, "Running"), heading(92, "Review"), heading(92, "LookDirection 4")]),
    row(108, "Full · clock", [full(N.Failed{}), full(N.Waiting{}), full(N.Running{}), full(N.Review{}), full(N.LookDirection{4})]),
    row(108, "Reduced · no clock", [reduced(N.Failed{}), reduced(N.Waiting{}), reduced(N.Running{}), reduced(N.Review{}), reduced(N.LookDirection{4})])])
def typing_matrix() -> P.Tree:
  labelled("The value (settled)", K.indicator_tree(K.still_indicator()))

def header_left() -> K.Button: K.act(K.ButtonKind.Quiet{}, K.Intent.Search{}, K.Form.Both{})
def header_matrix() -> P.Tree:
  one_above_other("Header instances", [
    labelled("left Menu · center NearIdentity · right Call (round Glass buttons, as in the reference)", K.header_tree(K.header(K.glass_button(K.Intent.Menu{}), idle(), K.glass_button(K.Intent.Call{}), col()))),
    labelled("A wider left side: the center stays centered", K.header_tree(K.header(header_left(), idle(), icon_button(K.Intent.Call{}), col())))])

def composer_markup(draft: String) -> K.FieldMarkup: K.plain(K.Lines.Growing{4}, "Mensaje", [], blurred(draft))
def composer_case(+label: String, draft: String, focus: K.Focus, size: K.ComposerSize) -> P.Tree:
  labelled(label, K.composer_tree(K.composer(K.plain(K.Lines.Growing{4}, "Mensaje", [], K.FieldState{draft, focus}), size, col())))
def composer_matrix() -> P.Tree:
  one_above_other("Composer cases", [
    composer_case("Compact · Empty: [ + | placeholder | mic ], no Send (Glass over Base)", "", K.Focus.Blurred{}, K.ComposerSize.Compact{}),
    composer_case("Compact · Filled, focused: mic + Send", "Please show the next component state.", K.Focus.Focused{}, K.ComposerSize.Compact{}),
    composer_case("Regular · Empty: mic + Send under the Disabled rule (Field, Edge)", "", K.Focus.Blurred{}, K.ComposerSize.Regular{}),
    composer_case("Regular · Filled: mic + Send", "Please show the next component state.", K.Focus.Blurred{}, K.ComposerSize.Regular{}),
    composer_case("Long draft → Capped (the pill gains the shadow)", long_message(), K.Focus.Blurred{}, K.ComposerSize.Compact{}),
    labelled("attach panel (tap +), Spanish: Cámara · Fotos · Archivos", K.attach_panel(K.Lang.Es{})),
    labelled("attach panel, English: the same message keys", K.attach_panel(K.Lang.En{}))])

def near(+t: String, +box: U32) -> K.Item: K.Said{K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{t}, K.Presence.Shown{}, box)}
def mine(+t: String, delivery: K.Delivery, +box: U32) -> K.Item: K.Said{K.bubble(K.Role.Mine{}, delivery, K.Said.Words{t}, K.Presence.Shown{}, box)}
def items(delivery: K.Delivery) -> List<&2, K.Item>:
  [K.Stamp{"Today", "12:50"}, near("This is a component preview.", col()), mine("Show the loading and ready states.", delivery, col()), K.Receipt{"Read", "12:52"}]
def chat(+messages: K.Remote<&2, List<&2, K.Item>>) -> List<&2, P.Tree>:
  [cell(320, K.thread_tree(K.thread(K.calm(messages, K.Typing.Shown{}), col())), P.Leading{}),
   cell(320, K.thread_tree(K.thread(K.calm(messages, K.Typing.Hidden{}), col())), P.Leading{})]
def thread_matrix() -> P.Tree:
  matrix("Thread cases", [
    blank(136, [heading(320, "typing · Shown"), heading(320, "typing · Hidden")]),
    row(136, "messages · Loading", chat(K.Loading{})),
    row(136, "Ready · no items", chat(K.Ready{[]})),
    row(136, "Ready · items", chat(K.Ready{items(K.Delivery.Sent{})})),
    row(136, "Pending · items", chat(K.Pending{items(K.Delivery.Sending{})})),
    row(136, "messages · Failed", chat(K.Failed{Some{items(K.Delivery.Sent{})}})),
    row(136, "Extreme: long message", [cell(320, K.thread_tree(K.thread(K.calm(K.Ready{[near(long_message(), col()), mine("Gracias.", K.Delivery.Sent{}, col())]}, K.Typing.Hidden{}), col())), P.Leading{})])])

# Conversation: the settled case, Compact. The send is a transition below.
def conversation_messages(+box: U32) -> List<&2, K.Item>:
  [near("Hola, soy Near.", box), mine("The component is ready.", K.Delivery.Sent{}, box), near("¿Cuánto faltó?", box)]
def sent_text() -> String: "Next state."
def conversation_settled(+box: U32, +box_h: U32, draft: String) -> P.Tree:
  K.conversation_tree(K.conversation("Mensaje", box, box_h, K.Settled{}, K.SettledState{K.Ready{conversation_messages(K.inner_of(box))}, draft, K.Focus.Focused{}, K.AttachMenu.Closed{}}))
def conversation_matrix() -> P.Tree:
  side_by_side("Conversation cases", [
    labelled("Settled · draft typed", conversation_settled(col(), 420, sent_text())),
    labelled("Settled · after the send (bubble Shown)", K.conversation_tree(K.conversation("Mensaje", col(), 420, K.Settled{}, K.SettledState{K.Ready{K.append_items(conversation_messages(col()), [K.mine_new(sent_text(), K.Presence.Shown{}, col())])}, "", K.Focus.Blurred{}, K.AttachMenu.Closed{}})))])

# WelcomeHero: the hero in a phone-column box.
def hero_title() -> String: "Hola. Soy Near."
def hero_text() -> String: "Explore the framework components and their state transitions."
def hero_box() -> U32: 480
def enter() -> K.Intent: K.Intent.Enter{}
def hero_case(+label: String, arrival: K.Arrival, slice: K.HeroSlice(arrival)) -> P.Tree:
  labelled(label, K.hero_tree(K.welcome_hero(hero_title(), hero_text(), enter(), arrival, slice, K.Settled{}, K.still(), col(), hero_box())))
def hero_matrix() -> P.Tree:
  grid("WelcomeHero cases", [
    hero_case("Link · redeem None (never redeemed on load)", K.Arrival.Link{"a1b2c3"}, K.HeroState{None{}}),
    hero_case("Link · Loading (pessimistic: the tap waits)", K.Arrival.Link{"a1b2c3"}, K.HeroState{Some{K.Loading{}}}),
    hero_case("Link · Pending", K.Arrival.Link{"a1b2c3"}, K.HeroState{Some{K.Pending{"Sample User"}}}),
    hero_case("Link · Ready (the App moves on)", K.Arrival.Link{"a1b2c3"}, K.HeroState{Some{K.Ready{"Sample User"}}}),
    hero_case("Link · Failed (retry)", K.Arrival.Link{"a1b2c3"}, K.HeroState{Some{K.Failed{None{}}}}),
    hero_case("NoLink", K.Arrival.NoLink{}, Unit{}),
    hero_case("Expired (the SessionExpired reason)", K.Arrival.Expired{}, Unit{})])
def hero_extreme() -> P.Tree:
  side_by_side("Extreme content", [
    labelled("long title (Wrap)", K.hero_tree(K.welcome_hero("Welcome to the reusable component preview.", hero_text(), enter(), K.Arrival.Link{"a1b2c3"}, K.HeroState{None{}}, K.Settled{}, K.still(), col(), hero_box()))),
    labelled("empty title and text", K.hero_tree(K.welcome_hero("", "", enter(), K.Arrival.Link{"a1b2c3"}, K.HeroState{None{}}, K.Settled{}, K.still(), col(), hero_box())))])

# Sheet: over an outlined box (the screen it covers).
def sheet_box() -> U32: 480
def boxed(+w: U32, +h: U32, t: P.Tree) -> P.Tree:
  P.layout("Box", P.Depth{}, 0, 0, w, h, P.Leading{}, [P.rounded("Box outline", P.Fill.None{}, w, h, P.Corner{4}, P.Stroke{T.LineRole.Line{}, T.State.Disabled{}, "1"}, P.Leading{}), t])
def editor(draft: String) -> K.SheetBody: K.SheetBody.Editor{K.FieldMarkup{K.Lines.Growing{8}, "Escribe a Near", [], focused(draft), K.Settled{}, K.still()}}
def sheet_case(+label: String, +title: String, body: K.SheetBody) -> P.Tree:
  labelled(label, boxed(col(), sheet_box(), K.sheet_tree(K.sheet(title, body, K.Settled{}, K.still(), col(), sheet_box()))))
def sheet_matrix() -> P.Tree:
  grid("Sheet cases", [
    sheet_case("Editor · empty draft (Send disabled)", "Escribir a Near", editor("")),
    sheet_case("Editor · long draft", "Escribir a Near", editor(long_message())),
    sheet_case("Detail · my words, Sent", "Mensaje", K.SheetBody.Detail{K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Words{"The component is ready."}, K.Presence.Shown{}, 280), "Enviado · leído 12:52", [quiet(K.Intent.CopyText{})]}),
    sheet_case("Detail · my photo, Failed (retry)", "Mensaje", K.SheetBody.Detail{K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Photo{sample_picture()}, K.Presence.Shown{}, 280), "No se envió", [primary(K.Intent.Retry{})]}),
    sheet_case("Menu · the header's menu (Buscar)", "Menú", K.SheetBody.Menu{[K.Intent.Search{}]}),
    sheet_case("Extreme: long title (Truncate) · long message", long_label(), K.SheetBody.Detail{K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{long_message()}, K.Presence.Shown{}, 280), "De Near · 12:51", []})])

# Search
def found(+id: U32, +label: String, +before: String, +hit: String, +after: String) -> K.Found: K.Found{id, label, before, hit, after}
def search_case(+label: String, +query: String, results: K.Results) -> P.Tree:
  labelled(label, K.search_tree(K.search("Buscar en la conversación", focused(query), results, col())))
def search_matrix() -> P.Tree:
  grid("Search cases", [
    search_case("query empty → Recent (newest first)", "", K.Results.Recent{[found(3, "Tú · foto", "", "", "Sample attachment"), found(2, "Near", "", "", "Open the sample attachment."), found(1, "Tú", "", "", "Sí, acaba de llegar.")]}),
    search_case("query «example» → Matches (the match highlighted)", "example", K.Results.Matches{[found(4, "Sample", "", "Example", " · ready"), found(1, "Tú", "Faltó ", "example", " in the example.")]}),
    search_case("query «zanahoria» → Nothing", "zanahoria", K.Results.Nothing{"zanahoria"}),
    search_case("Extreme: a long message (context before, Truncate after)", "sample", K.Results.Matches{[found(0, "Near", "A longer example contains enough text to show the highlighted ", "sample", ". This is neutral sample content.")]})])

# CallControls
def live(phase: K.Phase, mic: K.Mic, speaker: K.Speaker, +now: U32) -> K.LiveCall: K.LiveCall{phase, mic, speaker, K.Moment{now, K.Motion.Full{}}}
def call_case(+label: String, permission: K.Permission, slice: K.CallSlice(permission)) -> P.Tree:
  labelled(label, K.call_controls_tree(K.call_controls(permission, slice)))
def call_matrix() -> P.Tree:
  grid("CallControls cases", [
    call_case("Unknown · Idle", K.Permission.Unknown{}, K.Asking.Idle{}),
    call_case("Unknown · Prompting (pessimistic)", K.Permission.Unknown{}, K.Asking.Prompting{}),
    call_case("Granted · Ringing", K.Permission.Granted{}, live(K.Phase.Ringing{0}, K.Mic.Live{}, K.Speaker.Off{}, 0)),
    call_case("Granted · Connected · muted · speaker on", K.Permission.Granted{}, live(K.Phase.Connected{1000}, K.Mic.Muted{}, K.Speaker.On{}, 43000)),
    call_case("Granted · Ended", K.Permission.Granted{}, live(K.Phase.Ended{50000}, K.Mic.Live{}, K.Speaker.Off{}, 50000)),
    call_case("Denied", K.Permission.Denied{}, Unit{})])

# Stages: one frame of a transition at time t (motion), one component in a
# box (resize). Each stage is a fixed-size box so scrubbing never jumps.
# ---------------------------------------------------------------------

def press_stage(+t: U32, +r: Bool) -> P.Tree:
  P.layout("Press", P.Horizontal{}, 16, 0, 0, 0, P.Middle{}, [
    K.button_tree(K.pressing(K.ButtonKind.Primary{}, K.Intent.Send{}, K.Form.Text{}, K.Press.Up{}, K.Transitioning{K.Press.Up{}, K.Press.Down{}, 0}, moment(t, r))),
    K.button_tree(K.pressing(K.ButtonKind.Quiet{}, K.Intent.Attach{}, K.Form.Icon{}, K.Press.Up{}, K.Transitioning{K.Press.Up{}, K.Press.Down{}, 0}, moment(t, r)))])
def three_lines() -> String: "A long sample exercises wrapping across three lines."
def grow_stage(+t: U32, +r: Bool) -> P.Tree:
  K.field_tree(K.field(K.FieldMarkup{K.Lines.Growing{4}, "Escribe a Near", [], focused(three_lines()), K.Transitioning{2, 3, 0}, moment(t, r)}, 236))
def cap_stage(+t: U32, +r: Bool) -> P.Tree:
  K.field_tree(K.field(K.FieldMarkup{K.Lines.Growing{4}, "Escribe a Near", [], focused(long_message()), K.Transitioning{4, 5, 0}, moment(t, r)}, 236))
def appear_stage(+t: U32, +r: Bool) -> P.Tree:
  P.layout("Appear", P.Depth{}, 0, 0, 64, 36, P.Leading{}, [K.indicator_tree(K.typing_indicator(K.Transitioning{K.Visibility.Hidden{}, K.Visibility.Visible{}, 0}, moment(t, r)))])
def dots_stage(+t: U32, +r: Bool) -> P.Tree:
  K.indicator_tree(K.typing_indicator(K.Settled{}, moment(t, r)))
# The pet is content motion: it keeps its clock under reduced motion.
def pet_stage(+t: U32, +r: Bool) -> P.Tree:
  K.identity_tree(K.near_identity(N.Waving{}, K.Motion.Full{}, K.Clock{t}))
def thread_box(+h: U32, t: P.Tree) -> P.Tree:
  P.layout("Viewport", P.Depth{}, 0, 0, col(), h, P.Leading{}, [K.aligned(t, P.Trailing{})])
def stage_items() -> List<&2, K.Item>:
  [near("Hola, soy Near.", col()), mine("A sample state.", K.Delivery.Sent{}, col()), near("¿Cuánto faltó?", col())]
def item_stage(+t: U32, +r: Bool) -> P.Tree:
  thread_box(280, K.thread_tree(K.thread(K.ThreadState{K.Ready{K.append_items(stage_items(), [mine("The sample is ready.", K.Delivery.Sent{}, col())])}, 0, K.Typing.Hidden{}, 0, K.Transitioning{K.Pose{3, 0, K.Typing.Hidden{}}, K.Pose{4, 0, K.Typing.Hidden{}}, 0}, moment(t, r)}, col())))
# The keyboard silhouette is a canvas annotation sized by the same progress.
def keyboard_stage(+t: U32, +r: Bool) -> P.Tree:
  +inset = K.lerp(0, 140, K.ease_of(0, moment(t, r), K.item_t()))
  P.layout("Keyboard", P.Depth{}, 0, 0, col(), 330, P.Leading{}, [
    K.aligned(K.thread_tree(K.thread(K.ThreadState{K.Ready{stage_items()}, 0, K.Typing.Hidden{}, 0, K.Transitioning{K.Pose{3, 0, K.Typing.Hidden{}}, K.Pose{3, 140, K.Typing.Hidden{}}, 0}, moment(t, r)}, col())), P.Trailing{}),
    K.aligned(K.filled("Keyboard silhouette", T.SurfaceRole.Raised{}, col(), U32.max(1, inset), P.Corner{0}, P.NoStroke{}), P.Trailing{})])
def reply_stage(+t: U32, +r: Bool) -> P.Tree:
  thread_box(280, K.thread_tree(K.thread(K.ThreadState{K.Ready{K.append_items(stage_items(), [near("Dos kilos, lo anoto.", col())])}, 0, K.Typing.Hidden{}, 0, K.Transitioning{K.Pose{3, 0, K.Typing.Shown{}}, K.Pose{4, 0, K.Typing.Hidden{}}, 0}, moment(t, r)}, col())))
def composer_cap_stage(+t: U32, +r: Bool) -> P.Tree:
  K.composer_tree(K.composer(K.FieldMarkup{K.Lines.Growing{4}, "Mensaje", [], focused(long_message()), K.Transitioning{4, 5, 0}, moment(t, r)}, K.ComposerSize.Compact{}, col()))
def send_stage(+t: U32, +r: Bool) -> P.Tree:
  K.conversation_tree(K.conversation("Mensaje", col(), 420, K.start_send("Mensaje", col(), 420, conversation_messages(col()), sent_text(), 0), K.SendingState{conversation_messages(col()), sent_text(), moment(t, r)}))

def hero_leave_stage(+t: U32, +r: Bool) -> P.Tree:
  K.hero_tree(K.welcome_hero(hero_title(), hero_text(), enter(), K.Arrival.Link{"a1b2c3"}, K.HeroState{Some{K.Ready{"Sample User"}}}, K.Transitioning{K.Sky.Resting{}, K.Sky.Leaving{}, 0}, moment(t, r), col(), hero_box()))
# The highlight of an opened search result: the ring thins away (Slow, feedback).
def highlight_stage(+t: U32, +r: Bool) -> P.Tree:
  thread_box(280, K.thread_tree(K.thread(K.calm(K.Ready{K.append_items(stage_items(), [K.marked(mine("The sample is ready.", K.Delivery.Sent{}, col()), K.ease_of(0, moment(t, r), K.highlight_t()))])}, K.Typing.Hidden{}), col())))
def sheet_open_stage(+t: U32, +r: Bool) -> P.Tree:
  boxed(col(), sheet_box(), K.sheet_tree(K.sheet("Escribir a Near", editor("Next state."), K.Transitioning{K.Openness.Closed{}, K.Openness.Open{}, 0}, moment(t, r), col(), sheet_box())))

def t_press_stage(+u: Bool) -> K.Transition: K.press_t()
def t_grow_stage(+u: Bool) -> K.Transition: K.grow_t()
def t_cap_stage(+u: Bool) -> K.Transition: K.cap_t()
def t_appear_stage(+u: Bool) -> K.Transition: K.appear_t()
def t_dots_stage(+u: Bool) -> K.Transition: K.dots_t()
def t_pet_stage(+u: Bool) -> K.Transition: K.pet_t()
def t_item_stage(+u: Bool) -> K.Transition: K.item_t()
def t_keyboard_stage(+u: Bool) -> K.Transition: K.keyboard_t()
def t_reply_stage(+u: Bool) -> K.Transition: K.reply_t()
def t_composer_cap_stage(+u: Bool) -> K.Transition: K.composer_cap_t()
def t_send_stage(+u: Bool) -> K.Transition: K.send_t()
def t_hero_leave_stage(+u: Bool) -> K.Transition: K.hero_leave_t()
def t_sheet_open_stage(+u: Bool) -> K.Transition: K.sheet_t()
def t_highlight_stage(+u: Bool) -> K.Transition: K.highlight_t()
def motion_content_13(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: highlight_stage(t, r)
    case False{}: K.spacer("Empty", 1, 1, P.Leading{})
def motion_content_12(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: sheet_open_stage(t, r)
    case False{}: motion_content_13(String.eq(key, "thread-highlight"), key, t, r)
def motion_content_11(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: hero_leave_stage(t, r)
    case False{}: motion_content_12(String.eq(key, "sheet-open"), key, t, r)
def motion_content_10(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: send_stage(t, r)
    case False{}: motion_content_11(String.eq(key, "hero-leave"), key, t, r)
def motion_content_9(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: composer_cap_stage(t, r)
    case False{}: motion_content_10(String.eq(key, "conversation-send"), key, t, r)
def motion_content_8(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: reply_stage(t, r)
    case False{}: motion_content_9(String.eq(key, "composer-cap"), key, t, r)
def motion_content_7(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: keyboard_stage(t, r)
    case False{}: motion_content_8(String.eq(key, "thread-reply"), key, t, r)
def motion_content_6(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: item_stage(t, r)
    case False{}: motion_content_7(String.eq(key, "thread-keyboard"), key, t, r)
def motion_content_5(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: pet_stage(t, r)
    case False{}: motion_content_6(String.eq(key, "thread-item"), key, t, r)
def motion_content_4(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: dots_stage(t, r)
    case False{}: motion_content_5(String.eq(key, "near-pet"), key, t, r)
def motion_content_3(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: appear_stage(t, r)
    case False{}: motion_content_4(String.eq(key, "typing-dots"), key, t, r)
def motion_content_2(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: cap_stage(t, r)
    case False{}: motion_content_3(String.eq(key, "typing-appear"), key, t, r)
def motion_content_1(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: grow_stage(t, r)
    case False{}: motion_content_2(String.eq(key, "field-cap"), key, t, r)
def motion_content_0(hit: Bool, +key: String, +t: U32, +r: Bool) -> P.Tree:
  match hit:
    case True{}: press_stage(t, r)
    case False{}: motion_content_1(String.eq(key, "field-grow"), key, t, r)
def motion_content(+key: String, +t: U32, +r: Bool) -> P.Tree:
  motion_content_0(String.eq(key, "button-press"), key, t, r)
def transition_of_13(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_highlight_stage(u)
    case False{}: K.press_t()
def transition_of_12(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_sheet_open_stage(u)
    case False{}: transition_of_13(String.eq(key, "thread-highlight"), key, u)
def transition_of_11(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_hero_leave_stage(u)
    case False{}: transition_of_12(String.eq(key, "sheet-open"), key, u)
def transition_of_10(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_send_stage(u)
    case False{}: transition_of_11(String.eq(key, "hero-leave"), key, u)
def transition_of_9(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_composer_cap_stage(u)
    case False{}: transition_of_10(String.eq(key, "conversation-send"), key, u)
def transition_of_8(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_reply_stage(u)
    case False{}: transition_of_9(String.eq(key, "composer-cap"), key, u)
def transition_of_7(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_keyboard_stage(u)
    case False{}: transition_of_8(String.eq(key, "thread-reply"), key, u)
def transition_of_6(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_item_stage(u)
    case False{}: transition_of_7(String.eq(key, "thread-keyboard"), key, u)
def transition_of_5(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_pet_stage(u)
    case False{}: transition_of_6(String.eq(key, "thread-item"), key, u)
def transition_of_4(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_dots_stage(u)
    case False{}: transition_of_5(String.eq(key, "near-pet"), key, u)
def transition_of_3(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_appear_stage(u)
    case False{}: transition_of_4(String.eq(key, "typing-dots"), key, u)
def transition_of_2(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_cap_stage(u)
    case False{}: transition_of_3(String.eq(key, "typing-appear"), key, u)
def transition_of_1(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_grow_stage(u)
    case False{}: transition_of_2(String.eq(key, "field-cap"), key, u)
def transition_of_0(hit: Bool, +key: String, +u: Bool) -> K.Transition:
  match hit:
    case True{}: t_press_stage(u)
    case False{}: transition_of_1(String.eq(key, "field-grow"), key, u)
def transition_of(+key: String, +u: Bool) -> K.Transition:
  transition_of_0(String.eq(key, "button-press"), key, u)
def transition(+key: String) -> K.Transition: transition_of(key, True{})
def t_duration(t: K.Transition) -> U32:
  match t:
    case K.Transition{k, c, n, trigger, d, reason}: K.duration_ms(d)
def t_loop(t: K.Transition) -> Bool:
  match t:
    case K.Transition{k, c, n, trigger, d, reason}: String.eq(K.duration_name(d), "Loop")
def duration(+key: String) -> U32: t_duration(transition(key))
def is_loop(+key: String) -> Bool: t_loop(transition(key))
# A stage's box: the larger of its first and last frames, plus room.
type Dims is Data:
  Dims{width: U32, height: U32}
def dims_of(+a: P.Tree, +b: P.Tree) -> Dims:
  Dims{U32.add(24, U32.max(K.width(a), K.width(b))), U32.add(24, U32.max(K.height(a), K.height(b)))}
def stage_dims(+key: String) -> Dims: dims_of(motion_content(key, 0, False{}), motion_content(key, duration(key), False{}))
def dims_w(d: Dims) -> U32:
  match d:
    case Dims{w, h}: w
def dims_h(d: Dims) -> U32:
  match d:
    case Dims{w, h}: h
# One frame of a transition at time t (ms after it starts), in its box.
def stage_at(+key: String, +t: U32, +r: Bool, +w: U32, +h: U32) -> P.Tree:
  P.layout("Stage", P.Depth{}, 0, 0, w, h, P.Leading{}, [K.aligned(motion_content(key, t, r), P.Middle{})])
def stage(+key: String, +t: U32, +r: Bool) -> P.Tree:
  +d = stage_dims(key)
  stage_at(key, t, r, dims_w(d), dims_h(d))
def stage_boxes(+key: String, +t: U32, +r: Bool, +w: U32, +h: U32) -> List<&2, P.Box>:
  P.place(stage_at(key, t, r, w, h), P.Depth{}, 0, 0, 0, w, h, 0, 0, 0)

# Resize stages: the component in a box `w` wide (and `h` tall where height
# matters), with its current size case.
def case_line(+name: String, +cases: List<&2, K.CaseRange>, +w: U32) -> P.Tree:
  note(K.case_of(w, cases) ++ " · box " ++ U32.show(w), P.Leading{})
# The component in a box `w` wide; the box is outlined (a canvas annotation).
def in_box(+w: U32, cases: List<&2, K.CaseRange>, +t: P.Tree) -> P.Tree:
  P.layout("Sized", P.Vertical{}, 8, 0, 0, 0, P.Leading{}, [note(K.case_of(w, cases) ++ " · box " ++ U32.show(w), P.Leading{}),
    P.layout("Box", P.Depth{}, 0, 0, w, 0, P.Leading{}, [P.rounded("Box outline", P.Fill.None{}, w, K.height(t), P.Corner{4}, P.Stroke{T.LineRole.Line{}, T.State.Disabled{}, "1"}, P.Leading{}), t])])
def button_label() -> String: K.intent_label(K.Intent.AllowMic{})
def button_cases() -> List<&2, K.CaseRange>: K.button_sizes(button_label())
def button_sized(+w: U32, +h: U32) -> P.Tree: in_box(w, button_cases(), K.button_tree(K.button_in(K.ButtonKind.Primary{}, K.Intent.AllowMic{}, w)))
def badge_cases() -> List<&2, K.CaseRange>: K.badge_sizes("Sample User")
def badge_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, badge_cases(), K.badge_tree(K.badge(M.truncate("Sample User", U32.sub(U32.max(w, 32), 30), K.name_type()))))
def bubble_cases() -> List<&2, K.CaseRange>: K.bubble_sizes(text())
def bubble_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, bubble_cases(), P.layout("Lane", P.Vertical{}, 0, 0, w, 0, P.Leading{}, [K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Words{text()}, K.Presence.Shown{}, w))]))
def field_draft() -> String: "A longer sample message exercises the field height."
def field_cases() -> List<&2, K.CaseRange>: K.fill_sizes(K.field_min(K.Lines.Growing{4}, [], field_draft()))
def field_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, field_cases(), K.field_tree(K.field(K.plain(K.Lines.Growing{4}, "Escribe a Near", [], blurred(field_draft())), w)))
def side() -> U32: K.width(K.button_tree(header_left()))
def header_cases() -> List<&2, K.CaseRange>: K.header_sizes(side(), idle())
def header_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, header_cases(), K.header_tree(K.header(header_left(), idle(), icon_button(K.Intent.Call{}), w)))
def composer_draft() -> String: "Please show the next component state."
def composer_cases() -> List<&2, K.CaseRange>: K.fill_sizes(K.case_min(K.CaseRange{"Fill", K.composer_range(K.Lines.Growing{4}, composer_draft())}))
def composer_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, composer_cases(), K.composer_tree(K.composer(composer_markup(composer_draft()), K.composer_size(w), w)))
def thread_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, K.thread_sizes(), K.thread_tree(K.thread(K.calm(K.Ready{[near("Hola, soy Near.", K.content_width(w)), mine("The component is ready.", K.Delivery.Sent{}, K.content_width(w))]}, K.Typing.Hidden{}), w)))
def conversation_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, K.conversation_sizes(), conversation_settled(w, Bool.pick(U32, U32.is_zero(h), 420, U32.min(h, 520)), ""))
def hero_sized(+w: U32, +h: U32) -> P.Tree:
  in_box(w, K.hero_sizes(), K.hero_tree(K.welcome_hero(hero_title(), hero_text(), enter(), K.Arrival.Link{"a1b2c3"}, K.HeroState{None{}}, K.Settled{}, K.still(), w, Bool.pick(U32, U32.is_zero(h), 420, U32.min(h, 520)))))
def sheet_inner(+w: U32) -> U32: Bool.pick(U32, U32.is_ge(w, K.side_min()), U32.sub(K.sheet_w(), 40), U32.sub(w, 40))
def sheet_sized(+w: U32, +h: U32) -> P.Tree:
  +bh = Bool.pick(U32, U32.is_zero(h), 420, U32.min(h, 520))
  in_box(w, K.sheet_sizes(), boxed(w, bh, K.sheet_tree(K.sheet("Mensaje", K.SheetBody.Detail{K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Words{"The component is ready."}, K.Presence.Shown{}, sheet_inner(w)), "Enviado · leído 12:52", [quiet(K.Intent.CopyText{})]}, K.Settled{}, K.still(), w, bh))))
def sized_content_9(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: sheet_sized(w, h)
    case False{}: K.spacer("Empty", 1, 1, P.Leading{})
def sized_content_8(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: hero_sized(w, h)
    case False{}: sized_content_9(String.eq(key, "sheet-resize"), key, w, h)
def sized_content_7(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: conversation_sized(w, h)
    case False{}: sized_content_8(String.eq(key, "hero-resize"), key, w, h)
def sized_content_6(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: thread_sized(w, h)
    case False{}: sized_content_7(String.eq(key, "conversation-resize"), key, w, h)
def sized_content_5(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: composer_sized(w, h)
    case False{}: sized_content_6(String.eq(key, "thread-resize"), key, w, h)
def sized_content_4(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: header_sized(w, h)
    case False{}: sized_content_5(String.eq(key, "composer-resize"), key, w, h)
def sized_content_3(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: field_sized(w, h)
    case False{}: sized_content_4(String.eq(key, "header-resize"), key, w, h)
def sized_content_2(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: bubble_sized(w, h)
    case False{}: sized_content_3(String.eq(key, "field-resize"), key, w, h)
def sized_content_1(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: badge_sized(w, h)
    case False{}: sized_content_2(String.eq(key, "bubble-resize"), key, w, h)
def sized_content_0(hit: Bool, +key: String, +w: U32, +h: U32) -> P.Tree:
  match hit:
    case True{}: button_sized(w, h)
    case False{}: sized_content_1(String.eq(key, "badge-resize"), key, w, h)
def sized_content(+key: String, +w: U32, +h: U32) -> P.Tree:
  sized_content_0(String.eq(key, "button-resize"), key, w, h)
def sized(+key: String, +w: U32, +h: U32) -> P.Tree: sized_content(key, w, h)
def placed_tree(+t: P.Tree) -> List<&2, P.Box>:
  P.place(t, P.Depth{}, 0, 0, 0, K.width(t), K.height(t), 0, 0, 0)
def sized_boxes(+key: String, +w: U32, +h: U32) -> List<&2, P.Box>: placed_tree(sized(key, w, h))

# The primitive cases every stage draws (start, middle, end; full and
# reduced motion), so the sign-off law covers the live stages too.
def stage_keys() -> List<&2, String>:
  ["button-press", "field-grow", "field-cap", "typing-appear", "typing-dots", "near-pet", "thread-item", "thread-keyboard", "thread-reply", "composer-cap", "conversation-send", "hero-leave", "sheet-open", "thread-highlight"]
def stage_cases_of(+key: String) -> List<&2, String>:
  P.append_names(P.box_cases(placed_tree(motion_content(key, 0, False{}))), P.append_names(P.box_cases(placed_tree(motion_content(key, U32.div(duration(key), 2), False{}))), P.append_names(P.box_cases(placed_tree(motion_content(key, duration(key), False{}))), P.box_cases(placed_tree(motion_content(key, 0, True{}))))))
def stages_cases(keys: List<&2, String>) -> List<&2, String>:
  match keys:
    case Nil{}: []
    case Con{k, rest}: P.append_names(stage_cases_of(k), stages_cases(rest))
def stage_used() -> List<&2, String>: P.unique(stages_cases(stage_keys()), [])

# Frame sections
# --------------

type View is Data:
  View.Live{}
  View.Samples{}
def transition_text(t: K.Transition) -> String:
  match t:
    case K.Transition{key, component, name, trigger, +d, reason}:
      name ++ " · trigger: " ++ trigger ++ " · " ++ K.duration_name(d) ++ " " ++ U32.show(K.duration_ms(d)) ++ " ms · " ++ K.reason_name(reason)
def stage_slot(+key: String, +mode: String, +d: Dims) -> P.Tree:
  K.spacer("Stage:" ++ key ++ ":" ++ mode, dims_w(d), dims_h(d), P.Leading{})
def percent(+key: String, +p: U32) -> String: U32.show(p) ++ "% · " ++ U32.show(U32.div(U32.mul(duration(key), p), 100)) ++ " ms"
def samples_row(+key: String, +reduced: Bool, +d: Dims) -> P.Tree:
  +r = Bool.pick(String, reduced, "r", "")
  +lead = Bool.pick(String, reduced, "Reduced · ", "")
  side_by_side("Samples", [labelled(lead ++ percent(key, 0), stage_slot(key, r ++ "0", d)), labelled(lead ++ percent(key, 33), stage_slot(key, r ++ "33", d)), labelled(lead ++ percent(key, 66), stage_slot(key, r ++ "66", d)), labelled(lead ++ percent(key, 100), stage_slot(key, r ++ "100", d))])
def live_block(+key: String, +d: Dims) -> P.Tree:
  P.layout("Transition " ++ key, P.Vertical{}, 10, 0, 0, 0, P.Leading{}, [note(transition_text(transition(key)), P.Leading{}),
    side_by_side("Players", [labelled("Motion", stage_slot(key, "live", d)), labelled("Reduced motion", stage_slot(key, "reduced", d))]),
    K.spacer("Controls:" ++ key, U32.max(380, U32.add(U32.mul(2, dims_w(d)), 28)), 36, P.Leading{})])
def samples_block(+key: String, +d: Dims) -> P.Tree:
  P.layout("Transition " ++ key, P.Vertical{}, 10, 0, 0, 0, P.Leading{}, [note(transition_text(transition(key)), P.Leading{}), samples_row(key, False{}, d), samples_row(key, True{}, d)])
def motion_block(view: View, +key: String) -> P.Tree:
  match view:
    case View.Live{}: live_block(key, stage_dims(key))
    case View.Samples{}: samples_block(key, stage_dims(key))
def motion_blocks(+view: View, keys: List<&2, String>) -> List<&2, P.Tree>:
  match keys:
    case Nil{}: []
    case Con{k, rest}: Con{motion_block(view, k), motion_blocks(view, rest)}
def motion_section(+view: View, keys: List<&2, String>) -> List<&2, P.Tree>:
  match keys:
    case Nil{}: []
    case _: [section("Motion", motion_blocks(view, keys))]
def motion_player(+k: String, +d: Dims) -> P.Player:
  P.Player{k, transition_text(transition(k)), "motion", duration(k), is_loop(k), 0, 0, 0, dims_w(d), dims_h(d)}
def players_of(keys: List<&2, String>) -> List<&2, P.Player>:
  match keys:
    case Nil{}: []
    case Con{+k, rest}: Con{motion_player(k, stage_dims(k)), players_of(rest)}
# Instant: a status change shown before and after, with no motion.
def instant_row(+label: String, before: P.Tree, after: P.Tree) -> P.Tree:
  P.layout("Instant " ++ label, P.Horizontal{}, 18, 0, 0, 0, P.Middle{}, [note(label ++ " · Instant (status change)", P.Leading{}), before, note("→", P.Middle{}), after])
def instant_section(rows: List<&2, P.Tree>) -> List<&2, P.Tree>:
  match rows:
    case Nil{}: []
    case _: [section("Instant", rows)]
# Sizes: the representative boxes, then (live) the resize stage. A box wider
# than the frame's budget is laid out at its real size, then the whole tree
# is scaled down to fit (a canvas view, labelled with the real size and the
# scale); the component itself never sees the scale.
def preset_budget() -> U32: 760
def per_mille(+n: U32, +k: U32) -> U32: U32.div(U32.mul(n, k), 1000)
def scaled_radius(r: P.Radius, +k: U32) -> P.Radius:
  match r:
    case P.Corner{+l}: P.Corner{per_mille(l, k)}
    case P.Full{}: P.Full{}
def scaled_effects(es: List<&2, P.Effect>, +k: U32) -> List<&2, P.Effect>:
  match es:
    case Nil{}: []
    case Con{P.Blur{+r}, rest}: Con{P.Blur{per_mille(r, k)}, scaled_effects(rest, k)}
    case Con{P.Shadow{+y, +b}, rest}: Con{P.Shadow{per_mille(y, k), per_mille(b, k)}, scaled_effects(rest, k)}
    case Con{P.Glass{+bl, sat, +refr, spec, tint, edge, over}, rest}: Con{P.Glass{per_mille(bl, k), sat, per_mille(refr, k), spec, tint, edge, over}, scaled_effects(rest, k)}
def scaled_shape(s: P.Shape, +k: U32) -> P.Shape:
  match s:
    case P.Shape{P.Text{str, P.TextType{n, +size, w}}, fill, stroke, effects}: P.Shape{P.Text{str, P.TextType{n, U32.max(1, per_mille(size, k)), w}}, fill, stroke, scaled_effects(effects, k)}
    case P.Shape{P.Path{d}, fill, stroke, effects}: P.Shape{P.Path{d}, fill, stroke, scaled_effects(effects, k)}
    case P.Shape{P.Rounded{+w, +h, r}, fill, stroke, effects}: P.Shape{P.Rounded{per_mille(w, k), per_mille(h, k), scaled_radius(r, k)}, fill, stroke, scaled_effects(effects, k)}
def scaled(t: P.Tree, +k: U32) -> P.Tree:
  match t:
    case P.Last{}: P.Last{}
    case P.Leaf{name, shape, +w, +h, a, next}: P.Leaf{name, scaled_shape(shape, k), per_mille(w, k), per_mille(h, k), a, scaled(next, k)}
    case P.Node{name, P.Layout{axis, +gap, +pad}, +w, +h, a, first, next}: P.Node{name, P.Layout{axis, per_mille(gap, k), per_mille(pad, k)}, per_mille(w, k), per_mille(h, k), a, scaled(first, k), scaled(next, k)}
def scale_for(+w: U32) -> U32: Bool.pick(U32, U32.is_gt(w, preset_budget()), U32.div(U32.mul(preset_budget(), 1000), w), 1000)
def scale_note(+k: U32) -> String: Bool.pick(String, U32.is_lt(k, 1000), " · shown at " ++ U32.show(U32.div(k, 10)) ++ "%", "")
# A scaled view sits in a node named "Scaled NN%" (press-region and similar
# real-size laws skip it; the overflow law still applies).
def view_at(+k: U32, +t: P.Tree) -> P.Tree:
  Bool.pick(P.Tree, U32.is_lt(k, 1000), P.layout("Scaled " ++ U32.show(U32.div(k, 10)) ++ "%", P.Vertical{}, 0, 0, 0, 0, P.Leading{}, [scaled(t, k)]), t)
def preset_view(+key: String, p: K.Preset) -> P.Tree:
  match p:
    case K.Preset{label, +w, +h, size}: labelled(label ++ " · " ++ size ++ scale_note(scale_for(w)), view_at(scale_for(w), sized(key, w, h)))
def preset_views(+key: String, ps: List<&2, K.Preset>) -> List<&2, P.Tree>:
  match ps:
    case Nil{}: []
    case Con{p, rest}: Con{preset_view(key, p), preset_views(key, rest)}
def resize_max(+key: String, +cases: List<&2, K.CaseRange>) -> U32:
  U32.max(U32.add(K.sizes_min(cases), 120), Bool.pick(U32, String.eq(key, "conversation-resize"), 760, Bool.pick(U32, String.eq(key, "thread-resize"), 640, Bool.pick(U32, String.eq(key, "hero-resize"), 640, Bool.pick(U32, String.eq(key, "sheet-resize"), 1100, 420)))))
def resize_h(+key: String, +cases: List<&2, K.CaseRange>) -> U32:
  U32.add(24, U32.max(K.height(sized(key, K.sizes_min(cases), 0)), K.height(sized(key, resize_max(key, cases), 0))))
def resize_slot(+key: String, +cases: List<&2, K.CaseRange>) -> P.Tree:
  P.layout("Resize", P.Vertical{}, 10, 0, 0, 0, P.Leading{}, [note("Drag the handle: the box narrows and widens; the case switches at the derived threshold.", P.Leading{}),
    K.spacer("Resize:" ++ key, U32.add(resize_max(key, cases), 24), resize_h(key, cases), P.Leading{})])
def sizes_section(view: View, +key: String, +cases: List<&2, K.CaseRange>, +presets: List<&2, K.Preset>) -> P.Tree:
  match view:
    case View.Live{}: section("Sizes", [P.layout("Boxes", P.Vertical{}, 18, 0, 0, 0, P.Leading{}, preset_views(key, presets)), resize_slot(key, cases)])
    case View.Samples{}: section("Sizes", [P.layout("Boxes", P.Vertical{}, 18, 0, 0, 0, P.Leading{}, preset_views(key, presets))])
def fixed_sizes_section(+w: U32, +h: U32) -> P.Tree:
  section("Sizes", [note("Fixed " ++ U32.show(w) ++ "×" ++ U32.show(h) ++ ": the same box in every viewport (the instances above).", P.Leading{})])
def resize_player(+key: String, +cases: List<&2, K.CaseRange>) -> List<&2, P.Player>:
  [P.Player{key, "resize", "resize", 0, False{}, K.sizes_min(cases), resize_max(key, cases), U32.max(K.sizes_min(cases), col()), U32.add(resize_max(key, cases), 24), resize_h(key, cases)}]

# Frames
# ------

type Draft is Data:
  Draft{id: String, label: String, kicker: String, caption: String, slice: String, sizes: String, root: P.Tree, players: List<&2, P.Player>, width: U32, height: U32, panel_y: U32}
def count(xs: List<&2, String>) -> U32:
  match xs:
    case Nil{}: 0
    case Con{x, rest}: U32.add(1, count(rest))
def note_lines(+text: String, +w: U32, +size: U32) -> U32:
  Bool.pick(U32, String.is_empty(text), 0, count(M.lines(text, U32.sub(w, 48), P.TextType{"Note", size, 500})))
# Caption lines are 17px (12px text); slice and sizes lines 16px (11px), each
# block 6px apart.
def draft(id: String, +label: String, kicker: String, +caption: String, +slice: String, +sizes: String, sections: List<&2, P.Tree>, players: List<&2, P.Player>) -> Draft:
  +root = P.layout(label, P.Vertical{}, 30, 28, 0, 0, P.Leading{}, sections)
  +w = U32.max(400, U32.add(K.width(root), 40))
  +notes = U32.add(U32.mul(17, count(M.lines(caption, U32.sub(w, 48), P.TextType{"Caption", 12, 400}))), U32.add(U32.add(6, U32.mul(16, note_lines(slice, w, 11))), U32.add(6, U32.mul(16, note_lines(sizes, w, 11)))))
  +panel_y = U32.add(74, notes)
  Draft{id, label, kicker, caption, slice, sizes, root, players, w, U32.add(panel_y, U32.add(K.height(root), 20)), panel_y}
def draft_width(d: Draft) -> U32:
  match d:
    case Draft{id, label, kicker, caption, slice, sizes, root, players, w, h, py}: w
def draft_height(d: Draft) -> U32:
  match d:
    case Draft{id, label, kicker, caption, slice, sizes, root, players, w, h, py}: h
def frame(d: Draft, +x: U32, +y: U32) -> P.Specimen:
  match d:
    case Draft{id, +label, kicker, caption, slice, sizes, +root, players, +w, +h, +py}:
      P.Specimen{id, "kit", label, kicker, label, caption, slice, sizes, x, y, w, h, w, 20, py, U32.sub(w, 40), U32.sub(h, U32.add(py, 20)), [],
        P.place(root, P.Depth{}, 0, 20, py, U32.sub(w, 40), U32.sub(h, U32.add(py, 20)), 0, 0, 0), [], P.focus_order(root), players}

def function() -> String: "Component · function of markup"
def value() -> String: "Component · value"
def sizes_note(+cases: List<&2, K.CaseRange>, extra: String) -> String: K.sizes_text(cases) ++ extra
def threshold_note(t: K.Threshold) -> String: " Threshold: " ++ K.threshold_text(t) ++ "."
def keys_button() -> List<&2, String>: ["button-press"]
def draft_button(+view: View) -> Draft:
  draft("button", "Button", function(), "Hole: the intent (the action: Send, Search, Call, ...); its label and icon derive from it, so a control's label and its message cannot disagree. Form (M): Icon | Text | Both | Within{max}. Fixed or Served (a Remote intent). Case: Kind Primary | Quiet | Danger | Plain (M); Plain draws no container (the composer's +). Role: button. Label rule: Truncate. Press region ≥ 44pt.", K.slice_text(K.button_slice()), sizes_note(button_cases(), " Threshold: Truncated below the whole label's width."),
    append([section("Cases", [button_matrix(), button_extreme()]), section("Instant", [instant_row("served Ready → Failed", K.button_tree(K.button(K.ButtonKind.Primary{}, K.Served{K.Form.Text{}}, K.ServedState.Enabled{K.Press.Up{}, K.Ready{K.Intent.Send{}}})), K.button_tree(K.button(K.ButtonKind.Primary{}, K.Served{K.Form.Text{}}, K.ServedState.Enabled{K.Press.Up{}, K.Failed{Some{K.Intent.Send{}}}})))])],
      append(motion_section(view, keys_button()), [sizes_section(view, "button-resize", button_cases(), K.presets(button_cases(), False{}, False{}))])),
    K.append_players(players_of(keys_button()), resize_player("button-resize", button_cases())))
def draft_field(+view: View) -> Draft:
  draft("field", "Field", function(), "Holes: placeholder, accessories (icons). Case: Lines Single | Growing{cap} (M); Growing is Fits or Capped (derived: the cap is reached, it scrolls to the end and gains a Shadow). Role: textbox. Rule: Single truncates, Growing wraps.", K.slice_text(K.field_slice()), sizes_note(field_cases(), " Height: 44 to the cap (the Fits → Capped bound)."),
    append([section("Cases", [field_matrix(), field_extreme()])], append(motion_section(view, ["field-grow", "field-cap"]), [sizes_section(view, "field-resize", field_cases(), K.presets(field_cases(), False{}, False{}))])),
    K.append_players(players_of(["field-grow", "field-cap"]), resize_player("field-resize", field_cases())))
def draft_bubble(+view: View) -> Draft:
  draft("bubble", "Bubble", function(), "Hole: content Words{text} (Wrap, at most 75% of its box) | Photo{picture} (a Rounded shape with an Image fill). Case: Role Mine | Near (S); Presence Shown | Reserved (S: Reserved takes its space, draws nothing). Role: listitem; a failed bubble is the retry button.", K.slice_text(K.bubble_slice()), sizes_note(bubble_cases(), ""),
    [section("Cases", [bubble_matrix(), bubble_extreme()]), section("Instant", [instant_row("delivery Sending → Sent", K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Sending{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, col())), K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, col()))), instant_row("delivery Sending → Failed", K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Sending{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, col())), K.bubble_tree(K.bubble(K.Role.Mine{}, K.Delivery.Failed{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, col())))]), sizes_section(view, "bubble-resize", bubble_cases(), K.presets(bubble_cases(), False{}, False{}))],
    resize_player("bubble-resize", bubble_cases()))
def draft_badge(+view: View) -> Draft:
  draft("badge", "Badge", function(), "Hole: text (Truncate rule, at most 5/8 of the column). No cases. Role: text. The Near label under the pet is Badge(\"Near\"). A Liquid Glass pill over Content: its text is Ink.", K.slice_text([]), sizes_note(badge_cases(), ""),
    [section("Cases", [badge_matrix(), badge_extreme()]), sizes_section(view, "badge-resize", badge_cases(), K.presets(badge_cases(), False{}, False{}))], resize_player("badge-resize", badge_cases()))
def draft_identity(+view: View) -> Draft:
  draft("near-identity", "NearIdentity", value(), "No holes: the pet and Badge(\"Near\"); a compact form (the pet) for narrow headers. Cases: Animation (S, 10 cases) × Motion Full | Reduced (S). Role: img.", K.slice_text(K.identity_slice()), sizes_note(K.fixed_sizes(72), ""),
    append([section("Cases", [identity_matrix()])], append(motion_section(view, ["near-pet"]), [fixed_sizes_section(72, 93)])), players_of(["near-pet"]))
def draft_typing(+view: View) -> Draft:
  draft("typing-indicator", "TypingIndicator", value(), "No holes, no cases. Motion: appear (continuity) and the dots loop (content: they keep moving under reduced motion). Role: status. Whether it shows is the Thread's typing slice.", K.slice_text([]), sizes_note(K.fixed_sizes(64), ""),
    append([section("Cases", [typing_matrix()])], append(motion_section(view, ["typing-appear", "typing-dots"]), [fixed_sizes_section(64, 36)])), players_of(["typing-appear", "typing-dots"]))
def draft_header(+view: View) -> Draft:
  draft("header", "Header", function(), "Holes: left (Button), center (NearIdentity), right (Button). Size case from its box: Full | Collapsed (the pet alone). The center stays centered. In the Conversation: Menu (left) and Call (right), round Liquid Glass buttons over Content. Role: banner; focus reads left, center, right (declared override).", K.slice_text([]), sizes_note(header_cases(), threshold_note(K.header_threshold(side(), idle()))),
    [section("Cases", [header_matrix()]), sizes_section(view, "header-resize", header_cases(), K.presets(header_cases(), False{}, False{}))], resize_player("header-resize", header_cases()))
def draft_composer(+view: View) -> Draft:
  draft("composer", "Composer", function(), "One pill: [ + | text | mic | Send ]. Hole: the Field markup (the pill draws the field's container; the text takes the width between the buttons). The + and the mic (dictation) are Plain buttons. Size case (S, from the Conversation): Compact | Regular; content case (derived): Empty | Filled. Compact Empty is [ + | placeholder | mic ] with no Send; Regular Empty shows Send under the Disabled rule; Filled shows mic and Send. Compact's pill is Liquid Glass over Base (Muted may sit on it); Regular's is Field with a faint decorative Edge (Accent when focused). Send is a filled Action circle with a thin arrow in Ink. The + opens the attach panel: a Glass panel over Content with Cámara · Fotos · Archivos (each icon in a round Surface badge; labels from the intents' message keys, Spanish or English). Growing: Fits | Capped (the pill gains the Shadow). Role: group; the text is the textbox. The mic, camera, photo and files drawings are provisional.", K.slice_text(K.composer_slice()), sizes_note(composer_cases(), ""),
    append([section("Cases", [composer_matrix()]), section("Instant", [instant_row("send Disabled ↔ Enabled", K.button_tree(K.send_button(True{})), K.button_tree(K.send_button(False{})))])], append(motion_section(view, ["composer-cap"]), [sizes_section(view, "composer-resize", composer_cases(), K.presets(composer_cases(), False{}, False{}))])),
    K.append_players(players_of(["composer-cap"]), resize_player("composer-resize", composer_cases())))
def draft_thread(+view: View) -> Draft:
  draft("thread", "Thread", function(), "No holes. Items: Bubble | Stamp (\"Hoy 4:39 p.m.\", centred, the day bold) | Receipt (\"Leído 6:35 p.m.\", trailing, under my last bubble) | TypingIndicator | card. Messages are Remote. Motion: a new item's slot grows, the keyboard inset grows, Near's reply replaces the typing indicator, an opened search result is highlighted (a ring that thins away). Role: list. Content is at most the readable width.", K.slice_text(K.thread_slice()), sizes_note(K.thread_sizes(), " Threshold: margins from the readable width."),
    append([section("Cases", [thread_matrix()]), section("Instant", [instant_row("messages Ready → Failed", K.spacer("Ready", 1, 1, P.Leading{}), K.thread_tree(K.thread(K.calm(K.Failed{None{}}, K.Typing.Hidden{}), 240)))])], append(motion_section(view, ["thread-item", "thread-keyboard", "thread-reply", "thread-highlight"]), [sizes_section(view, "thread-resize", K.thread_sizes(), K.presets(K.thread_sizes(), False{}, True{}))])),
    K.append_players(players_of(["thread-item", "thread-keyboard", "thread-reply", "thread-highlight"]), resize_player("thread-resize", K.thread_sizes())))
def draft_conversation(+view: View) -> Draft:
  draft("conversation", "Conversation", function(), "Thread + Composer. Hole: placeholder. Size case from its box: Compact | Regular. Motion: Settled | Sending{from: composer text box, to: new bubble box, started_at}; the new bubble is Reserved and its slot grows on the same clock, so the flying copy lands on it. Role: group.", K.slice_text(K.conversation_slice()), sizes_note(K.conversation_sizes(), threshold_note(K.conversation_threshold())),
    append([section("Cases", [conversation_matrix()]), section("Instant", [note("the composer clears on send · Instant (the flight carries the text)", P.Leading{})])], append(motion_section(view, ["conversation-send"]), [sizes_section(view, "conversation-resize", K.conversation_sizes(), K.presets(K.conversation_sizes(), True{}, True{}))])),
    K.append_players(players_of(["conversation-send"]), resize_player("conversation-resize", K.conversation_sizes())))
def draft_hero(+view: View) -> Draft:
  draft("welcome-hero", "WelcomeHero", function(), "The magic-link landing. Holes: title, text (Wrap), button content. Case (S): Arrival Link{token} | NoLink | Expired. The link is never redeemed on load: only the tap sends Redeem (pessimistic). Gradient clouds (Rounded shapes, Gradient fill) sit at the top. Motion: leave (the App's Welcome → Conversation). Role: group.", K.slice_text(K.hero_slice()), sizes_note(K.hero_sizes(), threshold_note(K.hero_threshold())),
    append([section("Cases", [hero_matrix(), hero_extreme()]), section("Instant", [note("redeem Loading → Failed · Instant (status change)", P.Leading{})])], append(motion_section(view, ["hero-leave"]), [sizes_section(view, "hero-resize", K.hero_sizes(), K.presets(K.hero_sizes(), True{}, False{}))])),
    K.append_players(players_of(["hero-leave"]), resize_player("hero-resize", K.hero_sizes())))
def draft_sheet(+view: View) -> Draft:
  draft("sheet", "Sheet", function(), "A drawer: a Depth layer over the screen, not a screen. Holes: title (Truncate), body Editor{field markup} | Detail{bubble, status, Buttons} | Find{search} | Menu{intents} (the header menu: Buscar). Which sheet is open (Closed | Editor | Message{id} | Search | Menu) is the screen's navigation state: back closes it. Size case from its box: Bottom (over a scrim: Background under the Disabled rule) | Side (no scrim). Role: dialog; its layer is read first.", K.slice_text(K.sheet_slice()), sizes_note(K.sheet_sizes(), threshold_note(K.sheet_threshold())),
    append([section("Cases", [sheet_matrix()])], append(motion_section(view, ["sheet-open"]), [sizes_section(view, "sheet-resize", K.sheet_sizes(), K.presets(K.sheet_sizes(), True{}, False{}))])),
    K.append_players(players_of(["sheet-open"]), resize_player("sheet-resize", K.sheet_sizes())))
def draft_search(+view: View) -> Draft:
  draft("search", "Search", function(), "Searching the conversation. Hole: placeholder. The results are a pure function of the messages (their text, the photo's label and the Extraction's items): Recent when the query is empty, Matches with the match highlighted (Ink on Accent), Nothing as an empty state. Each result is a button (intent Open): it closes the search, scrolls the thread to the message and highlights it. Role: group; the field is the textbox.", K.slice_text(K.search_slice()), sizes_note(K.fixed_sizes(K.column()), ""),
    [section("Cases", [search_matrix()]), fixed_sizes_section(K.column(), 0)], [])
def draft_call(+view: View) -> Draft:
  draft("call-controls", "CallControls", value(), "No holes. Case (S): Permission Unknown | Granted | Denied; the slice depends on it (Unknown: the request Idle | Prompting, pessimistic; Granted: the call; Denied: nothing). Hang up is a Danger Button. Phase changes are Instant. Sound (ring, connect, hang up) is the Call screen's output. The mute and speaker drawings are provisional. Role: group.", K.slice_text(K.call_slice()), sizes_note(K.fixed_sizes(K.column()), ""),
    [section("Cases", [call_matrix()]), section("Instant", [instant_row("phase Ringing → Connected", K.call_controls_tree(K.call_controls(K.Permission.Granted{}, live(K.Phase.Ringing{0}, K.Mic.Live{}, K.Speaker.Off{}, 0))), K.call_controls_tree(K.call_controls(K.Permission.Granted{}, live(K.Phase.Connected{0}, K.Mic.Live{}, K.Speaker.Off{}, 0))))]), fixed_sizes_section(K.column(), 0)], [])

# Dependency columns, leaves first. A column is a list of rows stacked top to
# bottom; a row holds one or more frames side by side.
def layout_columns(+view: View) -> List<&2, List<&2, List<&2, Draft>>>:
  [[[draft_badge(view)], [draft_button(view)], [draft_field(view)], [draft_typing(view)], [draft_bubble(view)]],
   [[draft_identity(view)], [draft_call(view)], [draft_search(view)]],
   [[draft_hero(view)], [draft_sheet(view)]],
   [[draft_thread(view)], [draft_header(view)], [draft_composer(view)]],
   [[draft_conversation(view)]]]
def row_width(ds: List<&2, Draft>) -> U32:
  match ds:
    case Nil{}: 0
    case Con{d, Nil{}}: draft_width(d)
    case Con{d, rest}: U32.add(draft_width(d), U32.add(48, row_width(rest)))
def row_height(ds: List<&2, Draft>) -> U32:
  match ds:
    case Nil{}: 0
    case Con{d, rest}: U32.max(draft_height(d), row_height(rest))
def column_width(rows: List<&2, List<&2, Draft>>) -> U32:
  match rows:
    case Nil{}: 0
    case Con{r, rest}: U32.max(row_width(r), column_width(rest))
def place_row(ds: List<&2, Draft>, +x: U32, +y: U32) -> List<&2, P.Specimen>:
  match ds:
    case Nil{}: []
    case Con{+d, rest}: Con{frame(d, x, y), place_row(rest, U32.add(x, U32.add(draft_width(d), 48)), y)}
def append_specimens(xs: List<&2, P.Specimen>, ys: List<&2, P.Specimen>) -> List<&2, P.Specimen>:
  match xs:
    case Nil{}: ys
    case Con{x, rest}: Con{x, append_specimens(rest, ys)}
def stack(rows: List<&2, List<&2, Draft>>, +x: U32, +y: U32) -> List<&2, P.Specimen>:
  match rows:
    case Nil{}: []
    case Con{+r, rest}: append_specimens(place_row(r, x, y), stack(rest, x, U32.add(y, U32.add(row_height(r), 88))))
def place_columns(cs: List<&2, List<&2, List<&2, Draft>>>, +x: U32) -> List<&2, P.Specimen>:
  match cs:
    case Nil{}: []
    case Con{+c, rest}: append_specimens(stack(c, x, 0), place_columns(rest, U32.add(x, U32.add(column_width(c), 120))))
def frames_in(+view: View) -> List<&2, P.Specimen>:
  place_columns(layout_columns(view), 0)
def frames() -> List<&2, P.Specimen>: frames_in(View.Live{})
def sample_frames() -> List<&2, P.Specimen>: frames_in(View.Samples{})

# Dependency edges
# ----------------

type Use is Data:
  Use{from: String, to: String}
def uses() -> List<&2, Use>:
  [Use{"badge", "near-identity"},
   Use{"button", "header"}, Use{"button", "composer"},
   Use{"field", "composer"},
   Use{"typing-indicator", "thread"}, Use{"bubble", "thread"}, Use{"bubble", "conversation"},
   Use{"near-identity", "header"}, Use{"thread", "conversation"}, Use{"composer", "conversation"},
   Use{"button", "call-controls"}, Use{"button", "sheet"}, Use{"field", "sheet"}, Use{"bubble", "sheet"},
   Use{"button", "welcome-hero"}, Use{"near-identity", "welcome-hero"},
   Use{"field", "search"}, Use{"search", "sheet"}]
type Edge is Data:
  Edge{from: String, to: String, x1: U32, y1: U32, x2: U32, y2: U32}
type Spot is Data:
  Spot{x: U32, y: U32, width: U32, height: U32}
def spot(ss: List<&2, P.Specimen>, +id: String) -> Spot:
  match ss:
    case Nil{}: Spot{0, 0, 0, 0}
    case Con{P.Specimen{sid, section, label, kicker, title, caption, slice, sizes, x, y, width, height, wide, px, py, pw, ph, panels, boxes, layers, focus, players}, rest}:
      Bool.pick(Spot, String.eq(sid, id), Spot{x, y, width, height}, spot(rest, id))
def outgoing(us: List<&2, Use>, +id: String) -> U32:
  match us:
    case Nil{}: 0
    case Con{Use{from, to}, rest}: U32.add(Bool.to_u32(String.eq(from, id)), outgoing(rest, id))
def incoming(us: List<&2, Use>, +id: String) -> U32:
  match us:
    case Nil{}: 0
    case Con{Use{from, to}, rest}: U32.add(Bool.to_u32(String.eq(to, id)), incoming(rest, id))
def end_y(s: Spot, +i: U32, +n: U32) -> U32:
  match s:
    case Spot{x, y, width, height}:
      U32.add(U32.sub(U32.add(y, U32.div(height, 2)), U32.mul(14, U32.sub(n, 1))), U32.mul(28, i))
def right(s: Spot) -> U32:
  match s:
    case Spot{x, y, width, height}: U32.add(x, width)
def left(s: Spot) -> U32:
  match s:
    case Spot{x, y, width, height}: x
def edges_go(us: List<&2, Use>, seen: List<&2, Use>, +all: List<&2, Use>, +ss: List<&2, P.Specimen>) -> List<&2, Edge>:
  match us:
    case Nil{}: []
    case Con{Use{+from, +to}, rest}:
      +a = spot(ss, from)
      +b = spot(ss, to)
      +before = seen
      Con{Edge{from, to, right(a), end_y(a, outgoing(before, from), outgoing(all, from)), left(b), end_y(b, incoming(before, to), incoming(all, to))},
        edges_go(rest, Con{Use{from, to}, before}, all, ss)}
def edges_of(+ss: List<&2, P.Specimen>) -> List<&2, Edge>: edges_go(uses(), [], uses(), ss)
def edges() -> List<&2, Edge>: edges_of(frames())
def sample_edges() -> List<&2, Edge>: edges_of(sample_frames())
