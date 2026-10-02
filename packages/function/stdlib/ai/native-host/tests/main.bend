import Base
import ../host.bend as Host

def show(reply: Host.Reply) -> String:
  match reply:
    case Host.Reply{status, handle, data}: U32.show(status) ++ ":" ++ U32.show(handle) ++ ":" ++ data

def main() -> IO(Unit):
  do IO<Unit>:
    h : Host.Reply <- Host.HTTP.open(7, "POST", "https://offline.invalid", "raw-header", "raw-body")
    IO.print(show(h))
    r : Host.Reply <- Host.Stream.read(1)
    IO.print(show(r))
    c : Host.Reply <- Host.Transport.close(1)
    IO.print(show(c))
