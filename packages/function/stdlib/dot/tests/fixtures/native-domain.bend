import Base
import ../../bend/session.bend as Dot

def streaming() -> Dot.Message:
  Dot.Message{"assistant-1", Dot.AssistantMessage{}, Dot.ChatMessage{}, "", Dot.StreamingMessage{}}

def conversation() -> Dot.Continuity:
  Dot.history_message(Dot.reduce_text(Dot.TextResult{"complete"}, Dot.reduce_text(Dot.TextDelta{"partial "}, streaming())), Dot.history_message(Dot.Message{"user-1", Dot.UserMessage{}, Dot.ChatMessage{}, "request", Dot.UserRecorded{}}, Dot.history_initial()))

def cancelled_text() -> Dot.Message:
  Dot.reduce_text(Dot.TextResult{"late"}, Dot.reduce_text(Dot.TextCancelled{}, Dot.reduce_text(Dot.TextDelta{"partial"}, streaming())))

def failed_text() -> Dot.Message:
  Dot.reduce_text(Dot.TextError{"provider failure"}, streaming())

def pending() -> Dot.Task:
  Dot.Task{"task-1", "approved work", Dot.TaskReady{}, Dot.AwaitingApproval{}, "", ""}

def blocked_task() -> Dot.Task:
  Dot.reduce_task(Dot.StartTask{}, pending())

def completed_task() -> Dot.Task:
  Dot.reduce_task(Dot.FinishTask{"confirmed result"}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, pending())))

def cancelled_task() -> Dot.Task:
  Dot.reduce_task(Dot.FinishTask{"late"}, Dot.reduce_task(Dot.CancelTask{}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, pending()))))

def rejected_task() -> Dot.Task:
  Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.RejectTask{}, pending()))

def restored_task() -> Dot.Task:
  Dot.reduce_task(Dot.RestoreTask{}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, pending())))

def denied_call_history() -> Dot.Continuity:
  Dot.history_record(Dot.initial(), Dot.Message{"call-1", Dot.UserMessage{}, Dot.CallMessage{}, "blocked", Dot.UserRecorded{}}, Dot.history_initial())

def permitted_call_history() -> Dot.Continuity:
  Dot.history_record(Dot.update(Dot.BeginCall{}, Dot.update(Dot.GrantMic{}, Dot.initial())), Dot.Message{"call-1", Dot.UserMessage{}, Dot.CallMessage{}, "speech", Dot.FragmentMessage{}}, Dot.history_initial())

def revoked_permissions() -> Dot.Permissions:
  Dot.reduce_permissions(Dot.RevokeMicrophone{}, Dot.reduce_permissions(Dot.PermitPersistence{}, Dot.reduce_permissions(Dot.PermitMicrophone{}, Dot.permissions_initial())))

def failed_task() -> Dot.Task:
  Dot.reduce_task(Dot.FailTask{"offline failure"}, Dot.reduce_task(Dot.StartTask{}, Dot.reduce_task(Dot.ApproveTask{}, pending())))

def cancelled_call_history() -> Dot.Continuity:
  Dot.history_record(Dot.update(Dot.Cancel{}, Dot.update(Dot.BeginCall{}, Dot.update(Dot.GrantMic{}, Dot.initial()))), Dot.Message{"call-late", Dot.UserMessage{}, Dot.CallMessage{}, "late speech", Dot.FragmentMessage{}}, Dot.history_initial())

def task_history() -> Dot.Continuity:
  Dot.history_task_event(Dot.ApproveTask{}, "task-1", Dot.history_task(Dot.new_task("task-2", "other pending work", True{}), Dot.history_task(pending(), Dot.history_initial())))

def text_history() -> Dot.Continuity:
  Dot.history_text(Dot.TextResult{"history result"}, "assistant-1", Dot.history_message(streaming(), Dot.history_initial()))
