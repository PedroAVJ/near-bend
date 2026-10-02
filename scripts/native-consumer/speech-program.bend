import Base
import ./node_modules/near-v/stdlib/ai/bend/requests.bend as Requests
import ./node_modules/near-v/stdlib/ai/bend/speech.bend as Speech
import ./node_modules/near-v/stdlib/ai/bend/runtime.bend as Runtime

type Receipt is Data:
  Receipt{state: Speech.SpeechState, emitted: List<&2, U32>}

def state(session: Runtime.SpeechSession) -> Speech.SpeechState:
  match session:
    case Runtime.SpeechSession{handle, state}: state

def output(event: Speech.SpeechEvent, emitted: List<&2, U32>) -> List<&2, U32>:
  match event:
    case Speech.SpeechBytes{bytes}: List.append(&2, U32, emitted, bytes)
    case _: emitted

def poll_next(poll: Runtime.SpeechPoll, emitted: List<&2, U32>, next: Runtime.SpeechSession -> List<&2, U32> -> IO(Receipt)) -> IO(Receipt):
  match poll:
    case Runtime.SpeechPoll{session, event}: next(session, output(event, emitted))

def poll_finish(poll: Runtime.SpeechPoll, emitted: List<&2, U32>) -> IO(Receipt):
  poll_next(poll, emitted, session => bytes => IO.pure(Receipt, Receipt{state(session), bytes}))

def read_more(count: Nat, +session: Runtime.SpeechSession, emitted: List<&2, U32>) -> IO(Receipt):
  match count session:
    case _ Runtime.SpeechSession{0, state}: IO.pure(Receipt, Receipt{state, emitted})
    case 0n _: IO.bind(Runtime.SpeechPoll, Receipt, Runtime.speech_cancel(session), poll => poll_finish(poll, emitted))
    case 1n+n _: IO.bind(Runtime.SpeechPoll, Receipt, Runtime.speech_read(session), poll => poll_next(poll, emitted, s => bytes => read_more(n, s, bytes)))

def failed(step: Speech.SpeechTransition) -> Receipt:
  match step:
    case Speech.SpeechTransition{state, event}: Receipt{state, []}

def started(result: Runtime.SpeechStartResult) -> IO(Receipt):
  match result:
    case Runtime.SpeechStarted{session}: read_more(16n, session, [])
    case _: IO.pure(Receipt, failed(Speech.reduce(Speech.SpeechTransportError{0, ""}, Speech.initial())))

def main() -> IO(Receipt):
  IO.bind(Runtime.SpeechStartResult, Receipt, Runtime.speech(9, Requests.SpeechRequest{"voice-fixture", "Offline speech", "fixture-speech"}), started)
