import Base
import ../host.bend as Host

def byte_text(bytes: List<&2, U32>) -> String:
  match bytes:
    case Nil{}: ""
    case Con{head, tail}: U32.show(head) ++ "," ++ byte_text(tail)

def show_bytes(reply: Host.ByteReply) -> String:
  match reply:
    case Host.ByteReply{status, handle, bytes}:
      U32.show(status) ++ ":" ++ U32.show(handle) ++ ":" ++ byte_text(bytes)

def main() -> IO(Unit):
  do IO<Unit>:
    h : Host.Reply <- Host.HTTP.open(0, "POST", "https://offline.invalid", "", "opaque speech request")
    IO.print("opened")
    b : Host.ByteReply <- Host.Stream.read_bytes(1)
    IO.print(show_bytes(b))
    e : Host.ByteReply <- Host.Stream.read_bytes(1)
    IO.print(show_bytes(e))
    c : Host.Reply <- Host.Transport.close(1)
    IO.print("closed")
