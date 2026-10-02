import Base
import ./node_modules/near-function/stdlib/ai/bend/voice.bend as Voice

# Only dynamic arguments: raw JSON/state fixtures are injected by JavaScript.
def rt_initial() -> Voice.RealtimeState:
  Voice.realtime_initial()
def rt_decode(raw: String) -> Result<&2, &2, String, Voice.RealtimeEvent>:
  Voice.realtime_decode(raw)
def rt_reduce(event: Voice.RealtimeEvent, state: Voice.RealtimeState) -> Voice.RealtimeState:
  Voice.realtime_reduce(event, state)
def rt_prepare(command: Voice.RealtimeCommand, state: Voice.RealtimeState) -> Result<&2, &2, String, Voice.RealtimeState>:
  Voice.realtime_prepare(command, state)
def live_initial() -> Voice.LiveState:
  Voice.live_initial()
def live_decode(raw: String) -> Result<&2, &2, String, Voice.LiveEvent>:
  Voice.live_decode(raw)
def live_reduce(event: Voice.LiveEvent, state: Voice.LiveState) -> Voice.LiveState:
  Voice.live_reduce(event, state)
def live_prepare(command: Voice.LiveCommand, state: Voice.LiveState) -> Result<&2, &2, String, Voice.LiveState>:
  Voice.live_prepare(command, state)
def live_encode(command: Voice.LiveCommand) -> String:
  Voice.live_encode(command)
def live_abort(state: Voice.LiveState) -> Voice.LiveState:
  Voice.live_abort(state)
