import Base
import ./node_modules/near-function/stdlib/ai/bend/transcription.bend as T
import ./node_modules/near-function/stdlib/ai/bend/transcription-runtime.bend as R

def session(p: R.TranscriptionPoll) -> R.TranscriptionSession:
  match p:
    case R.TranscriptionPoll{s, e}: s

# A terminal IO poll is a receipt: never overwrite it by reading the closed handle.
def read_more(count: Nat, +poll: R.TranscriptionPoll) -> IO(R.TranscriptionPoll):
  match count poll:
    case _ R.TranscriptionPoll{R.TranscriptionSession{0, buffer, chars, phase}, event}: IO.pure(R.TranscriptionPoll, poll)
    case 0n R.TranscriptionPoll{s, event}: R.cancel(s)
    case 1n+n R.TranscriptionPoll{s, event}: IO.bind(R.TranscriptionPoll, R.TranscriptionPoll, R.read(s), next => read_more(n, next))

def consume(start: R.TranscriptionStart) -> IO(R.TranscriptionPoll):
  match start:
    case R.StartFailed{error}: IO.pure(R.TranscriptionPoll, R.TranscriptionPoll{R.TranscriptionSession{0, "", 0, R.Failed{}}, R.FailedEvent{error}})
    case R.Started{s}: IO.bind(R.TranscriptionPoll, R.TranscriptionPoll, R.read(s), first => read_more(64n, first))

def main() -> IO(R.TranscriptionPoll):
  do IO<R.TranscriptionPoll>:
    started : R.TranscriptionStart <- R.open(7, T.TranscriptionRequest{T.AudioFile{"voice.webm", T.WebM{}, [1, 0, 255]}, None{}, False{}, None{}, T.WordTimestamps{}, True{}, T.EncodedAudio{}})
    consume(started)
