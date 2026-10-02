import Base
import ./canvas.bend as C

def Browser.workspace(workspace: C.Workspace) -> IO(Unit):
  import "../effects/workspace.js"
def paint_workspace() -> IO.OP<Unit>:
  Browser.workspace(C.workspace(), Unit, x => Emit{x})
