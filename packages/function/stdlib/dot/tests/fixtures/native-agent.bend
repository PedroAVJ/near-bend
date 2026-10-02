import Base
import ../../bend/session.bend as Dot
import ../../bend/agent.bend as Native
import ../../../ai/bend/protocol.bend as AI
import ../../../ai/bend/codecs.bend as Codecs

def message() -> Dot.Message:
  Dot.Message{"message-1", Dot.AssistantMessage{}, Dot.ChatMessage{}, "", Dot.StreamingMessage{}}

def start() -> Native.NativeTransition:
  Native.reduce_frame(AI.DataFrame{"{\"choices\":[{\"delta\":{\"content\":\"hello\"},\"finish_reason\":null}]}"}, AI.initial(Codecs.OpenRouter{}), message())

def next(frame: AI.Frame, transition: Native.NativeTransition) -> Native.NativeTransition:
  match transition:
    case Native.NativeTransition{stream, message, error}: Native.reduce_frame(frame, stream, message)

def completed() -> Native.NativeTransition:
  next(AI.DataFrame{"[DONE]"}, next(AI.DataFrame{"{\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}"}, start()))

def cancelled() -> Native.NativeTransition:
  next(AI.DataFrame{"{\"choices\":[{\"delta\":{\"content\":\"late\"},\"finish_reason\":null}]}"}, next(AI.CancelFrame{}, start()))

def truncated() -> Native.NativeTransition:
  next(AI.EndFrame{}, start())

def malformed() -> Native.NativeTransition:
  next(AI.DataFrame{"invalid-json"}, start())

def transport_failed() -> Native.NativeTransition:
  next(AI.TransportFailed{503, "fixture-id"}, start())
