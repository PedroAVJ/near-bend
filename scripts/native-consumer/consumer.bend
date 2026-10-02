import Base
import ./node_modules/near-function/stdlib/ai/bend/requests.bend as Requests
import ./node_modules/near-function/stdlib/ai/native-host/host.bend as Host
import ./node_modules/near-function/stdlib/ai/bend/wire_json.bend as Wire
import ./node_modules/near-function/stdlib/ai/ai-sdk.bend as AI
import ./node_modules/near-function/stdlib/dot/bend/session.bend as Dot

def provider_text() -> Bool:
  AI.supports_text(AI.OpenRouter{})

def lifecycle() -> String:
  Dot.phase(Dot.update(Dot.Finish{}, Dot.update(Dot.Start{}, Dot.initial())))

def microphone_gate() -> Bool:
  Dot.in_call(Dot.update(Dot.BeginCall{}, Dot.initial()))

def stream_fixture() -> Dot.Message:
  Dot.Message{"assistant-1", Dot.AssistantMessage{}, Dot.CallMessage{}, "", Dot.StreamingMessage{}}

def text_completed() -> Dot.Message:
  Dot.reduce_text(Dot.TextDelta{"late"}, Dot.reduce_text(Dot.TextResult{"Final"}, Dot.reduce_text(Dot.TextDelta{"partial"}, stream_fixture())))

def text_cancelled() -> Dot.Message:
  Dot.reduce_text(Dot.TextResult{"late"}, Dot.reduce_text(Dot.TextCancelled{}, Dot.reduce_text(Dot.TextDelta{"partial"}, stream_fixture())))

def task_fixture() -> Dot.Task:
  Dot.Task{"task-1", "Local offline task", Dot.TaskReady{}, Dot.AwaitingApproval{}, "", ""}

def task_denied() -> Dot.Task:
  Dot.reduce_task(Dot.StartTask{}, task_fixture())

def task_approved() -> Dot.Task:
  Dot.reduce_task(Dot.FinishTask{"Done"}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, task_fixture())))

def task_restored() -> Dot.Task:
  Dot.reduce_task(Dot.RestoreTask{}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, task_fixture())))

def history_fixture() -> Dot.Continuity:
  Dot.history_task(task_approved(), Dot.history_message(text_completed(), Dot.history_initial()))


def json_roundtrip_result(result: Result<&1, &1, String, Wire.Json>) -> Result<&1, &1, String, String>:
  match result:
    case Done{value}: Done{Wire.stringify(value)}
    case Fail{error}: Fail{error}

def json_roundtrip(input: String) -> Result<&1, &1, String, String>:
  json_roundtrip_result(Wire.read(input))


def raw_request(credential: U32, request: Requests.HTTPRequest) -> IO(Host.Reply):
  match request:
    case Requests.HTTPRequest{method, url, headers, body}: Host.HTTP.open(credential, method, url, headers, body)

def openrouter_result(credential: U32, result: Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>) -> IO(Host.Reply):
  match result:
    case Done{request}: raw_request(credential, request)
    case Fail{error}: IO.pure(Host.Reply, Host.Reply{4, 0, "request invalid"})

def openrouter_fake(credential: U32) -> IO(Host.Reply):
  openrouter_result(credential, Requests.openrouter(Requests.OpenRouterRequest{"fixture/model", [Requests.Message{Requests.User{}, "Quote \" and newline\n"}], 32, None{}}))


def read_raw(handle: U32) -> IO(Host.Reply):
  Host.Stream.read(handle)

def close_raw(handle: U32) -> IO(Host.Reply):
  Host.Transport.close(handle)

def responses_request() -> Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>:
  Requests.responses(Requests.ResponsesRequest{"fixture-openai", "Hello", "Answer briefly", 24, False{}})

def anthropic_request() -> Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>:
  Requests.anthropic(Requests.AnthropicRequest{"fixture-anthropic", [Requests.Message{Requests.User{}, "Hello"}], "Answer briefly", 24})

def anthropic_bad_role() -> Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>:
  Requests.anthropic(Requests.AnthropicRequest{"fixture-anthropic", [Requests.Message{Requests.System{}, "Hello"}], "", 24})

def speech_request() -> Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>:
  Requests.speech(Requests.SpeechRequest{"voice-fixture", "Hola", "fixture-speech"})

def speech_bad_voice() -> Result<&2, &2, Requests.RequestError, Requests.HTTPRequest>:
  Requests.speech(Requests.SpeechRequest{"voice/escape", "Hola", "fixture-speech"})

def claude_arguments() -> String:
  Requests.claude_arguments(Requests.ClaudeRequest{"literal $(never-run)", Some{"session-fixture"}, Some{"fixture-model"}})
