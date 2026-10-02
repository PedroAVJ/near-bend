import Base
import ./node_modules/near-v/stdlib/ai/bend/requests.bend as Requests
import ./node_modules/near-v/stdlib/ai/bend/protocol.bend as Protocol
import ./node_modules/near-v/stdlib/ai/bend/runtime.bend as Runtime
import ./node_modules/near-v/stdlib/dot/bend/session.bend as Dot
import ./node_modules/near-v/stdlib/dot/bend/agent.bend as Native

def message() -> Dot.Message:
  Dot.Message{"native-assistant", Dot.AssistantMessage{}, Dot.ChatMessage{}, "", Dot.StreamingMessage{}}

def outcome(out: Native.TextOutcome) -> Dot.Message:
  match out:
    case Native.TextOutcome{message, error}: message

def events(xs: List<&2, Protocol.TextEvent>, +stream: Protocol.StreamState, message: Dot.Message) -> Dot.Message:
  match xs:
    case Nil{}: message
    case Con{event, tail}: events(tail, stream, outcome(Native.consume_text(event, stream, message)))

def stream(session: Runtime.TextSession) -> Protocol.StreamState:
  match session:
    case Runtime.TextSession{handle, state}: Protocol.raw_stream(state)

def poll_next(poll: Runtime.Poll, message: Dot.Message, next: Runtime.TextSession -> Dot.Message -> IO(Dot.Message)) -> IO(Dot.Message):
  match poll:
    case Runtime.Poll{+session, xs}: next(session, events(xs, stream(session), message))

def poll_finish(poll: Runtime.Poll, message: Dot.Message) -> IO(Dot.Message):
  poll_next(poll, message, session => m => IO.pure(Dot.Message, m))

def read_more(count: Nat, +session: Runtime.TextSession, message: Dot.Message) -> IO(Dot.Message):
  match count session:
    case _ Runtime.TextSession{0, state}: IO.pure(Dot.Message, message)
    case 0n _: IO.bind(Runtime.Poll, Dot.Message, Runtime.cancel(session), poll => poll_finish(poll, message))
    case 1n+n _: IO.bind(Runtime.Poll, Dot.Message, Runtime.read(session), poll => poll_next(poll, message, s => m => read_more(n, s, m)))

def started(result: Runtime.StartResult) -> IO(Dot.Message):
  match result:
    case Runtime.Started{session}: read_more(16n, session, message())
    case _: IO.pure(Dot.Message, Dot.reduce_text(Dot.TextError{"start failed"}, message()))

def main() -> IO(Dot.Message):
  IO.bind(Runtime.StartResult, Dot.Message,
    Runtime.openrouter(7, Requests.OpenRouterRequest{"fixture/model", [Requests.Message{Requests.User{}, "Offline native request"}], 32, None{}}), started)
