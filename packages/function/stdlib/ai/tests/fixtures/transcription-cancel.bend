import Base
import ../../bend/transcription.bend as T
import ../../bend/transcription-runtime.bend as R

def session(p: R.TranscriptionPoll) -> R.TranscriptionSession:
  match p:
    case R.TranscriptionPoll{s, e}: s

def consume(start: R.TranscriptionStart) -> IO(R.TranscriptionPoll):
  match start:
    case R.StartFailed{error}: IO.pure(R.TranscriptionPoll, R.TranscriptionPoll{R.TranscriptionSession{0, "", 0, R.Failed{}}, R.FailedEvent{error}})
    case R.Started{s}:
      do IO<R.TranscriptionPoll>:
        first : R.TranscriptionPoll <- R.read(s)
        R.cancel(session(first))

def main() -> IO(R.TranscriptionPoll):
  do IO<R.TranscriptionPoll>:
    started : R.TranscriptionStart <- R.open(7, T.TranscriptionRequest{T.AudioFile{"voice.webm", T.WebM{}, [1, 0, 255]}, None{}, False{}, None{}, T.WordTimestamps{}, True{}, T.EncodedAudio{}})
    consume(started)
