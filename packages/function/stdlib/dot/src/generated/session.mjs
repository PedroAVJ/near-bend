function word_to_u32(w) {
  let x = 0;
  for (let i = 0; w.$ === "WCon"; i++) {
    x |= Number(w.head) << i;
    w = w.tail;
  }
  return x >>> 0;
}

function u32_to_word(x) {
  let w = {$: "WNil"};
  for (let i = 31; i >= 0; i--) {
    w = {$: "WCon", head: ((x >>> i) & 1) === 1, tail: w};
  }
  return w;
}

function cmp_new(a, b) {
  return {$: a < b ? "LT"
    : a === b ? "EQ" : "GT"};
}

function nat_divmod(a, b) {
  return b === 0 ? {$: "Tuple", fst: 0, snd: a}
    : {$: "Tuple", fst: Math.trunc(a / b), snd: a % b};
}

function nat_chk(n) {
  if (n > 281474976710655) {
    throw "bend: a Nat past the largest immediate 2^48-1";
  }
  return n;
}

function nat_host(n) {
  const int = typeof n === "bigint" || Number.isInteger(n);
  if (int && n >= 0 && n <= 2 ** 53) {
    return Number(n);
  }
  return { [Symbol.toPrimitive]() { throw "bend: a Nat past the largest immediate 2^48-1"; } };
}

function f32_show(x) {
  if (x !== x) {
    return "nan";
  }
  if (!Number.isFinite(x) || Object.is(x, -0)) {
    return x < 0 ? "-inf"
      : x === 0 ? "-0" : "inf";
  }
  let s = "x";
  for (let p = 1; p <= 9 && f32_round(s) !== x; p += 1) {
    s = String(Number(x.toExponential(p - 1)));
  }
  return s;
}

function f32_bits(x) {
  return new Uint32Array(new Float32Array([x]).buffer)[0];
}

function f32_from_bits(u) {
  return new Float32Array(new Uint32Array([u]).buffer)[0];
}

function f32_read(s) {
  const re = /^\s*[+-]?((\d+\.?\d*|\.\d+)(e[+-]?\d+)?|inf(inity)?|nan)$/i;
  const v = f32_round(s.replace(/inf\w*/i, "Infinity"));
  return re.test(s) ? {$: "Some", value: v} : {$: "None"};
}

const f32_round = function f32_round(s) {
  const d = Number(s), a = Math.abs(d), f = Math.fround(a), g = 2 * a - Math.min(f, 340282366920938500000000000000000000000);
  if (g === f || Math.fround(g) !== g || g === 1 / 0)
    return Math.sign(d) * f;
  let k = 0;
  while (a * 2 ** k % 1 !== 0)
    k += 1;
  const [, i, r, e] = /(\d*)\.?(\d*)(?:e([+-]?\d+))?$/i.exec(s), n = Number(e ?? 0) - r.length, x = BigInt(i + r) * 2n ** BigInt(k) * 10n ** BigInt(Math.max(n, 0)), y = BigInt(a * 2 ** k) * 10n ** BigInt(Math.max(-n, 0));
  return Math.sign(d) * (x === y || x > y !== g > f ? f : g);
};

function char_new(code) {
  if (code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
    throw "bend: " + code + " is not a Unicode scalar value";
  }
  return String.fromCodePoint(code);
}

// Array
// =====

function array_new(d, v) {
  if (d > 31) {
    throw "bend: an array past the deepest block class 31";
  }
  return Array(2 ** d).fill(v);
}

function array_node(a, b) {
  if (a.length !== b.length) {
    throw "bend: runtime fail-stop";
  }
  return a.concat(b);
}

function array_rmw(a, i, f) {
  const at = i % a.length;
  const old = a[at];
  a[at] = f(old);
  return {$: "Tuple", fst: a, snd: old};
}

// Run
// ===

function run_tail(f, x) {
  return {$: "$JMP", f: f.j?.f === f ? f.j : f, x: [x]};
}

function run_clo(j) {
  const f = (x) => run_loop(j(x));
  f.j = j;
  j.f = f;
  return f;
}

function run_loop(r) {
  while (r !== null && typeof r === "object" && r.$ === "$JMP") {
    r = r.f(...r.x);
  }
  return r;
}

function run_lib(f, n) {
  return (...a) => a.length < n ? run_lib((...b) => f(...a, ...b), n - a.length)
    : f(...a);
}

// Effect
// ======

const $0eff = Object.create(null);

function io_eff(k, run, need) {
  if (k in $0eff) {
    throw new Error("bend: two effects register " + k);
  }
  $0eff[k] = { run, need };
}
// Program
// =======

function $initial$() {
  return {$: "Session", "revision": 0, "phase": {$: "Idle"}, "call": {$: "Closed"}, "microphone": {$: "Denied"}};
}

function $update$(_event_0, _session_0) {
  if (_event_0.$ === "Start") {
    const _r_0 = _session_0["revision"];
    const _c_0 = _session_0["call"];
    const _m_0 = _session_0["microphone"];
    return {$: "Session", "revision": ((_r_0 + 1) >>> 0), "phase": {$: "Running"}, "call": _c_0, "microphone": _m_0};
  } else if (_event_0.$ === "Finish") {
    const _r_1 = _session_0["revision"];
    const _c_1 = _session_0["call"];
    const _m_1 = _session_0["microphone"];
    return {$: "Session", "revision": ((_r_1 + 1) >>> 0), "phase": {$: "Idle"}, "call": _c_1, "microphone": _m_1};
  } else if (_event_0.$ === "Cancel") {
    const _r_2 = _session_0["revision"];
    const _c_2 = _session_0["call"];
    const _m_2 = _session_0["microphone"];
    return {$: "Session", "revision": ((_r_2 + 1) >>> 0), "phase": {$: "Cancelled"}, "call": _c_2, "microphone": _m_2};
  } else if (_event_0.$ === "RunFailed") {
    const _r_3 = _session_0["revision"];
    const _c_3 = _session_0["call"];
    const _m_3 = _session_0["microphone"];
    return {$: "Session", "revision": ((_r_3 + 1) >>> 0), "phase": {$: "Failed"}, "call": _c_3, "microphone": _m_3};
  } else if (_event_0.$ === "GrantMic") {
    const _r_4 = _session_0["revision"];
    const _p_4 = _session_0["phase"];
    const _c_4 = _session_0["call"];
    return {$: "Session", "revision": ((_r_4 + 1) >>> 0), "phase": _p_4, "call": _c_4, "microphone": {$: "Granted"}};
  } else if (_event_0.$ === "DenyMic") {
    const _r_5 = _session_0["revision"];
    const _p_5 = _session_0["phase"];
    return {$: "Session", "revision": ((_r_5 + 1) >>> 0), "phase": _p_5, "call": {$: "Closed"}, "microphone": {$: "Denied"}};
  } else if (_event_0.$ === "BeginCall") {
    const _r_6 = _session_0["revision"];
    const _p_6 = _session_0["phase"];
    const _c_6 = _session_0["call"];
    const _t_0 = _session_0["microphone"];
    if (_t_0.$ === "Granted") {
      return {$: "Session", "revision": ((_r_6 + 1) >>> 0), "phase": _p_6, "call": {$: "Active"}, "microphone": {$: "Granted"}};
    } else {
      return {$: "Session", "revision": _r_6, "phase": _p_6, "call": _c_6, "microphone": {$: "Denied"}};
    }
  } else {
    const _r_7 = _session_0["revision"];
    const _p_7 = _session_0["phase"];
    const _m_6 = _session_0["microphone"];
    return {$: "Session", "revision": ((_r_7 + 1) >>> 0), "phase": _p_7, "call": {$: "Closed"}, "microphone": _m_6};
  }
}

function $phase$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "Idle") {
    return "idle";
  } else if (_t_0.$ === "Running") {
    return "running";
  } else if (_t_0.$ === "Cancelled") {
    return "cancelled";
  } else {
    return "failed";
  }
}

function $in_call$(_s_0) {
  const _t_0 = _s_0["call"];
  if (_t_0.$ === "Active") {
    return true;
  } else {
    return false;
  }
}

function $task_permitted$(_approval_0) {
  if (_approval_0.$ === "NoApprovalNeeded") {
    return true;
  } else if (_approval_0.$ === "ExecutionApproved") {
    return true;
  } else if (_approval_0.$ === "AwaitingApproval") {
    return false;
  } else {
    return false;
  }
}

function $history_initial$() {
  return {$: "Continuity", "messages": {$: "Nil"}, "tasks": {$: "Nil"}};
}

function $append_message$(_xs_0, _message_0) {
  if (_xs_0.$ === "Nil") {
    return {$: "Con", "head": _message_0, "tail": {$: "Nil"}};
  } else {
    const _head_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    return {$: "Con", "head": _head_0, "tail": ($append_message$(_tail_0, _message_0))};
  }
}

function $append_task$(_xs_0, _task_0) {
  if (_xs_0.$ === "Nil") {
    return {$: "Con", "head": _task_0, "tail": {$: "Nil"}};
  } else {
    const _head_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    return {$: "Con", "head": _head_0, "tail": ($append_task$(_tail_0, _task_0))};
  }
}

function $history_message$(_message_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "Continuity", "messages": ($append_message$(_messages_0, _message_0)), "tasks": _tasks_0};
}

function $history_task$(_task_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "Continuity", "messages": _messages_0, "tasks": ($append_task$(_tasks_0, _task_0))};
}

function $reduce_text$(_event_0, _message_0) {
  if (_event_0.$ === "TextDelta") {
    const _delta_0 = _event_0["text"];
    const _id_0 = _message_0["id"];
    const _role_0 = _message_0["role"];
    const _source_0 = _message_0["source"];
    const _text_0 = _message_0["text"];
    const _t_0 = _message_0["status"];
    if (_t_0.$ === "StreamingMessage") {
      return {$: "Message", "id": _id_0, "role": _role_0, "source": _source_0, "text": (_text_0 + _delta_0), "status": {$: "StreamingMessage"}};
    } else {
      return {$: "Message", "id": _id_0, "role": _role_0, "source": _source_0, "text": _text_0, "status": _t_0};
    }
  } else if (_event_0.$ === "TextResult") {
    const _result_0 = _event_0["text"];
    const _id_1 = _message_0["id"];
    const _role_1 = _message_0["role"];
    const _source_1 = _message_0["source"];
    const _text_1 = _message_0["text"];
    const _t_1 = _message_0["status"];
    if (_t_1.$ === "StreamingMessage") {
      return {$: "Message", "id": _id_1, "role": _role_1, "source": _source_1, "text": _result_0, "status": {$: "CompleteMessage"}};
    } else {
      return {$: "Message", "id": _id_1, "role": _role_1, "source": _source_1, "text": _text_1, "status": _t_1};
    }
  } else if (_event_0.$ === "TextError") {
    const _id_2 = _message_0["id"];
    const _role_2 = _message_0["role"];
    const _source_2 = _message_0["source"];
    const _text_2 = _message_0["text"];
    const _t_2 = _message_0["status"];
    if (_t_2.$ === "StreamingMessage") {
      return {$: "Message", "id": _id_2, "role": _role_2, "source": _source_2, "text": _text_2, "status": {$: "FailedMessage"}};
    } else {
      return {$: "Message", "id": _id_2, "role": _role_2, "source": _source_2, "text": _text_2, "status": _t_2};
    }
  } else {
    const _id_3 = _message_0["id"];
    const _role_3 = _message_0["role"];
    const _source_3 = _message_0["source"];
    const _text_3 = _message_0["text"];
    const _t_3 = _message_0["status"];
    if (_t_3.$ === "StreamingMessage") {
      return {$: "Message", "id": _id_3, "role": _role_3, "source": _source_3, "text": _text_3, "status": {$: "CancelledMessage"}};
    } else {
      return {$: "Message", "id": _id_3, "role": _role_3, "source": _source_3, "text": _text_3, "status": _t_3};
    }
  }
}

function $reduce_task$(_event_0, _task_0) {
  if (_event_0.$ === "ApproveTask") {
    const _id_0 = _task_0["id"];
    const _title_0 = _task_0["title"];
    const _status_0 = _task_0["status"];
    const _t_0 = _task_0["approval"];
    if (_t_0.$ === "AwaitingApproval") {
      const _result_0 = _task_0["result"];
      const _error_0 = _task_0["error"];
      return {$: "Task", "id": _id_0, "title": _title_0, "status": _status_0, "approval": {$: "ExecutionApproved"}, "result": _result_0, "error": _error_0};
    } else {
      const _result_1 = _task_0["result"];
      const _error_1 = _task_0["error"];
      return {$: "Task", "id": _id_0, "title": _title_0, "status": _status_0, "approval": _t_0, "result": _result_1, "error": _error_1};
    }
  } else if (_event_0.$ === "RejectTask") {
    const _id_1 = _task_0["id"];
    const _title_1 = _task_0["title"];
    const _status_1 = _task_0["status"];
    const _t_1 = _task_0["approval"];
    if (_t_1.$ === "AwaitingApproval") {
      const _result_2 = _task_0["result"];
      const _error_2 = _task_0["error"];
      return {$: "Task", "id": _id_1, "title": _title_1, "status": {$: "TaskCancelled"}, "approval": {$: "ExecutionRejected"}, "result": _result_2, "error": _error_2};
    } else {
      const _result_3 = _task_0["result"];
      const _error_3 = _task_0["error"];
      return {$: "Task", "id": _id_1, "title": _title_1, "status": _status_1, "approval": _t_1, "result": _result_3, "error": _error_3};
    }
  } else if (_event_0.$ === "StartTask") {
    const _id_2 = _task_0["id"];
    const _title_2 = _task_0["title"];
    const _t_2 = _task_0["status"];
    if (_t_2.$ === "TaskReady") {
      const _approval_0 = _task_0["approval"];
      const _result_4 = _task_0["result"];
      const _error_4 = _task_0["error"];
      return $Bool$pick$(($task_permitted$(_approval_0)), {$: "Task", "id": _id_2, "title": _title_2, "status": {$: "TaskRunning"}, "approval": _approval_0, "result": _result_4, "error": _error_4}, {$: "Task", "id": _id_2, "title": _title_2, "status": {$: "TaskReady"}, "approval": _approval_0, "result": _result_4, "error": _error_4});
    } else {
      const _approval_1 = _task_0["approval"];
      const _result_5 = _task_0["result"];
      const _error_5 = _task_0["error"];
      return {$: "Task", "id": _id_2, "title": _title_2, "status": _t_2, "approval": _approval_1, "result": _result_5, "error": _error_5};
    }
  } else if (_event_0.$ === "FinishTask") {
    const _result_6 = _event_0["result"];
    const _id_3 = _task_0["id"];
    const _title_3 = _task_0["title"];
    const _t_3 = _task_0["status"];
    if (_t_3.$ === "TaskRunning") {
      const _approval_2 = _task_0["approval"];
      return {$: "Task", "id": _id_3, "title": _title_3, "status": {$: "TaskDone"}, "approval": _approval_2, "result": _result_6, "error": ""};
    } else if (_t_3.$ === "TaskReady") {
      const _approval_3 = _task_0["approval"];
      const _old_1 = _task_0["result"];
      const _error_7 = _task_0["error"];
      return $Bool$pick$(($task_permitted$(_approval_3)), {$: "Task", "id": _id_3, "title": _title_3, "status": {$: "TaskDone"}, "approval": _approval_3, "result": _result_6, "error": ""}, {$: "Task", "id": _id_3, "title": _title_3, "status": {$: "TaskReady"}, "approval": _approval_3, "result": _old_1, "error": _error_7});
    } else {
      const _approval_4 = _task_0["approval"];
      const _old_2 = _task_0["result"];
      const _error_8 = _task_0["error"];
      return {$: "Task", "id": _id_3, "title": _title_3, "status": _t_3, "approval": _approval_4, "result": _old_2, "error": _error_8};
    }
  } else if (_event_0.$ === "FailTask") {
    const _error_9 = _event_0["message"];
    const _id_4 = _task_0["id"];
    const _title_4 = _task_0["title"];
    const _t_4 = _task_0["status"];
    if (_t_4.$ === "TaskRunning") {
      const _approval_5 = _task_0["approval"];
      const _result_7 = _task_0["result"];
      return {$: "Task", "id": _id_4, "title": _title_4, "status": {$: "TaskFailed"}, "approval": _approval_5, "result": _result_7, "error": _error_9};
    } else {
      const _approval_6 = _task_0["approval"];
      const _result_8 = _task_0["result"];
      const _old_4 = _task_0["error"];
      return {$: "Task", "id": _id_4, "title": _title_4, "status": _t_4, "approval": _approval_6, "result": _result_8, "error": _old_4};
    }
  } else if (_event_0.$ === "CancelTask") {
    const _id_5 = _task_0["id"];
    const _title_5 = _task_0["title"];
    const _t_5 = _task_0["status"];
    if (_t_5.$ === "TaskDone") {
      const _approval_7 = _task_0["approval"];
      const _result_9 = _task_0["result"];
      const _error_10 = _task_0["error"];
      return {$: "Task", "id": _id_5, "title": _title_5, "status": {$: "TaskDone"}, "approval": _approval_7, "result": _result_9, "error": _error_10};
    } else {
      const _approval_8 = _task_0["approval"];
      const _result_10 = _task_0["result"];
      const _error_11 = _task_0["error"];
      return {$: "Task", "id": _id_5, "title": _title_5, "status": {$: "TaskCancelled"}, "approval": _approval_8, "result": _result_10, "error": _error_11};
    }
  } else {
    const _id_6 = _task_0["id"];
    const _title_6 = _task_0["title"];
    const _t_6 = _task_0["status"];
    if (_t_6.$ === "TaskRunning") {
      const _t_7 = _task_0["approval"];
      if (_t_7.$ === "ExecutionApproved") {
        const _result_11 = _task_0["result"];
        const _error_12 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": {$: "TaskReady"}, "approval": {$: "AwaitingApproval"}, "result": _result_11, "error": _error_12};
      } else {
        const _result_12 = _task_0["result"];
        const _error_13 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": {$: "TaskReady"}, "approval": _t_7, "result": _result_12, "error": _error_13};
      }
    } else if (_t_6.$ === "TaskDone") {
      const _t_8 = _task_0["approval"];
      if (_t_8.$ === "ExecutionApproved") {
        const _result_13 = _task_0["result"];
        const _error_14 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": {$: "TaskDone"}, "approval": {$: "ExecutionApproved"}, "result": _result_13, "error": _error_14};
      } else {
        const _result_14 = _task_0["result"];
        const _error_15 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": {$: "TaskDone"}, "approval": _t_8, "result": _result_14, "error": _error_15};
      }
    } else {
      const _t_9 = _task_0["approval"];
      if (_t_9.$ === "ExecutionApproved") {
        const _result_15 = _task_0["result"];
        const _error_16 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": _t_6, "approval": {$: "AwaitingApproval"}, "result": _result_15, "error": _error_16};
      } else {
        const _result_16 = _task_0["result"];
        const _error_17 = _task_0["error"];
        return {$: "Task", "id": _id_6, "title": _title_6, "status": _t_6, "approval": _t_9, "result": _result_16, "error": _error_17};
      }
    }
  }
}

function $permissions_initial$() {
  return {$: "Permissions", "microphone": {$: "Denied"}, "persistence": {$: "Denied"}};
}

function $reduce_permissions$(_event_0, _permissions_0) {
  if (_event_0.$ === "PermitMicrophone") {
    const _persistence_0 = _permissions_0["persistence"];
    return {$: "Permissions", "microphone": {$: "Granted"}, "persistence": _persistence_0};
  } else if (_event_0.$ === "RevokeMicrophone") {
    const _persistence_1 = _permissions_0["persistence"];
    return {$: "Permissions", "microphone": {$: "Denied"}, "persistence": _persistence_1};
  } else if (_event_0.$ === "PermitPersistence") {
    const _mic_2 = _permissions_0["microphone"];
    return {$: "Permissions", "microphone": _mic_2, "persistence": {$: "Granted"}};
  } else {
    const _mic_3 = _permissions_0["microphone"];
    return {$: "Permissions", "microphone": _mic_3, "persistence": {$: "Denied"}};
  }
}

function $permission_granted$(_permission_0) {
  if (_permission_0.$ === "Granted") {
    return true;
  } else {
    return false;
  }
}

function $call_record_permitted$(_session_0) {
  const _t_0 = _session_0["phase"];
  if (_t_0.$ === "Cancelled") {
    const _t_1 = _session_0["call"];
    if (_t_1.$ === "Active") {
      const _t_2 = _session_0["microphone"];
      if (_t_2.$ === "Granted") {
        return false;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    const _t_3 = _session_0["call"];
    if (_t_3.$ === "Active") {
      const _t_4 = _session_0["microphone"];
      if (_t_4.$ === "Granted") {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

function $history_record$(_session_0, _message_0, _history_0) {
  const _id_0 = _message_0["id"];
  const _role_0 = _message_0["role"];
  const _t_0 = _message_0["source"];
  if (_t_0.$ === "ChatMessage") {
    const _text_0 = _message_0["text"];
    const _status_0 = _message_0["status"];
    return $history_message$({$: "Message", "id": _id_0, "role": _role_0, "source": {$: "ChatMessage"}, "text": _text_0, "status": _status_0}, _history_0);
  } else {
    const _text_1 = _message_0["text"];
    const _status_1 = _message_0["status"];
    return $Bool$pick$(($call_record_permitted$(_session_0)), ($history_message$({$: "Message", "id": _id_0, "role": _role_0, "source": {$: "CallMessage"}, "text": _text_1, "status": _status_1}, _history_0)), _history_0);
  }
}

function $new_task$(_id_0, _title_0, _requires_approval_0) {
  return {$: "Task", "id": _id_0, "title": _title_0, "status": {$: "TaskReady"}, "approval": ($Bool$pick$(_requires_approval_0, {$: "AwaitingApproval"}, {$: "NoApprovalNeeded"})), "result": "", "error": ""};
}

function $message_id$(_message_0) {
  const _id_0 = _message_0["id"];
  return _id_0;
}

function $task_id$(_task_0) {
  const _id_0 = _task_0["id"];
  return _id_0;
}

function $reduce_messages$(_event_0, _id_0, _messages_0) {
  if (_messages_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _head_0 = _messages_0["head"];
    const _tail_0 = _messages_0["tail"];
    return {$: "Con", "head": ($Bool$pick$(($String$eq$(($message_id$(_head_0)), _id_0)), ($reduce_text$(_event_0, _head_0)), _head_0)), "tail": ($reduce_messages$(_event_0, _id_0, _tail_0))};
  }
}

function $reduce_tasks$(_event_0, _id_0, _tasks_0) {
  if (_tasks_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _head_0 = _tasks_0["head"];
    const _tail_0 = _tasks_0["tail"];
    return {$: "Con", "head": ($Bool$pick$(($String$eq$(($task_id$(_head_0)), _id_0)), ($reduce_task$(_event_0, _head_0)), _head_0)), "tail": ($reduce_tasks$(_event_0, _id_0, _tail_0))};
  }
}

function $history_text$(_event_0, _id_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "Continuity", "messages": ($reduce_messages$(_event_0, _id_0, _messages_0)), "tasks": _tasks_0};
}

function $history_task_event$(_event_0, _id_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "Continuity", "messages": _messages_0, "tasks": ($reduce_tasks$(_event_0, _id_0, _tasks_0))};
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $String$eq$(_a_0, _b_0) {
  return $Cmp$is_eq$(($String$order$(_a_0, _b_0)));
}

function $Cmp$is_eq$(_c_0) {
  if (_c_0.$ === "EQ") {
    return true;
  } else {
    return false;
  }
}

function $String$order$(_a_0, _b_0) {
  return $Pair$snd$(($String$cmp$(_a_0, _b_0)));
}

function $Pair$snd$(_p_0) {
  const _b_0 = _p_0["snd"];
  return _b_0;
}

function $String$cmp$(_a_0, _b_0) {
  if (_a_0 === "") {
    if (_b_0 === "") {
      return {$: "Tuple", "fst": {$: "Tuple", "fst": "", "snd": ""}, "snd": {$: "EQ"}};
    } else {
      const _h_0 = (_b_0.codePointAt(0) > 0xFFFF ? _b_0.slice(0, 2) : _b_0[0]);
      const _t_0 = (_b_0.codePointAt(0) > 0xFFFF ? _b_0.slice(2) : _b_0.slice(1));
      return {$: "Tuple", "fst": {$: "Tuple", "fst": "", "snd": (_h_0 + _t_0)}, "snd": {$: "LT"}};
    }
  } else {
    const _h_1 = (_a_0.codePointAt(0) > 0xFFFF ? _a_0.slice(0, 2) : _a_0[0]);
    const _t_1 = (_a_0.codePointAt(0) > 0xFFFF ? _a_0.slice(2) : _a_0.slice(1));
    if (_b_0 === "") {
      return {$: "Tuple", "fst": {$: "Tuple", "fst": (_h_1 + _t_1), "snd": ""}, "snd": {$: "GT"}};
    } else {
      const _h2_0 = (_b_0.codePointAt(0) > 0xFFFF ? _b_0.slice(0, 2) : _b_0[0]);
      const _t2_0 = (_b_0.codePointAt(0) > 0xFFFF ? _b_0.slice(2) : _b_0.slice(1));
      return $String$cmp$fin$(_t_1, _t2_0, ($Char$cmp$(_h_1, _h2_0)));
    }
  }
}

function $String$cmp$fin$(_t1_0, _t2_0, _hc_0) {
  const _t_0 = _hc_0["fst"];
  const _h1b_0 = _t_0["fst"];
  const _h2b_0 = _t_0["snd"];
  const _t_1 = _hc_0["snd"];
  if (_t_1.$ === "LT") {
    return {$: "Tuple", "fst": {$: "Tuple", "fst": (_h1b_0 + _t1_0), "snd": (_h2b_0 + _t2_0)}, "snd": {$: "LT"}};
  } else if (_t_1.$ === "EQ") {
    return $String$cmp$rec$(_h1b_0, _h2b_0, ($String$cmp$(_t1_0, _t2_0)));
  } else {
    return {$: "Tuple", "fst": {$: "Tuple", "fst": (_h1b_0 + _t1_0), "snd": (_h2b_0 + _t2_0)}, "snd": {$: "GT"}};
  }
}

function $Char$cmp$(_a_0, _b_0) {
  const _x_0 = _a_0.codePointAt(0);
  const _x_1 = _b_0.codePointAt(0);
  return {$: "Tuple", "fst": {$: "Tuple", "fst": _a_0, "snd": _b_0}, "snd": cmp_new(_x_0, _x_1)};
}

function $String$cmp$rec$(_h1b_0, _h2b_0, _rr_0) {
  const _t_0 = _rr_0["fst"];
  const _t1b_0 = _t_0["fst"];
  const _t2b_0 = _t_0["snd"];
  const _r_0 = _rr_0["snd"];
  return {$: "Tuple", "fst": {$: "Tuple", "fst": (_h1b_0 + _t1b_0), "snd": (_h2b_0 + _t2b_0)}, "snd": _r_0};
}
export default {
  "initial": run_lib(() => { const r = (run_loop($initial$()));  return r; }, 0),
  "update": run_lib((a0, a1) => { const r = (run_loop($update$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "phase": run_lib((a0) => { const r = (run_loop($phase$((a0)))); (a0); return r; }, 1),
  "in_call": run_lib((a0) => { const r = (run_loop($in_call$((a0)))); (a0); return r; }, 1),
  "task_permitted": run_lib((a0) => { const r = (run_loop($task_permitted$((a0)))); (a0); return r; }, 1),
  "history_initial": run_lib(() => { const r = (run_loop($history_initial$()));  return r; }, 0),
  "append_message": run_lib((a0, a1) => { const r = (run_loop($append_message$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "append_task": run_lib((a0, a1) => { const r = (run_loop($append_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "history_message": run_lib((a0, a1) => { const r = (run_loop($history_message$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "history_task": run_lib((a0, a1) => { const r = (run_loop($history_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "reduce_text": run_lib((a0, a1) => { const r = (run_loop($reduce_text$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "reduce_task": run_lib((a0, a1) => { const r = (run_loop($reduce_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "permissions_initial": run_lib(() => { const r = (run_loop($permissions_initial$()));  return r; }, 0),
  "reduce_permissions": run_lib((a0, a1) => { const r = (run_loop($reduce_permissions$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "permission_granted": run_lib((a0) => { const r = (run_loop($permission_granted$((a0)))); (a0); return r; }, 1),
  "call_record_permitted": run_lib((a0) => { const r = (run_loop($call_record_permitted$((a0)))); (a0); return r; }, 1),
  "history_record": run_lib((a0, a1, a2) => { const r = (run_loop($history_record$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "new_task": run_lib((a0, a1, a2) => { const r = (run_loop($new_task$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "message_id": run_lib((a0) => { const r = (run_loop($message_id$((a0)))); (a0); return r; }, 1),
  "task_id": run_lib((a0) => { const r = (run_loop($task_id$((a0)))); (a0); return r; }, 1),
  "reduce_messages": run_lib((a0, a1, a2) => { const r = (run_loop($reduce_messages$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "reduce_tasks": run_lib((a0, a1, a2) => { const r = (run_loop($reduce_tasks$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "history_text": run_lib((a0, a1, a2) => { const r = (run_loop($history_text$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "history_task_event": run_lib((a0, a1, a2) => { const r = (run_loop($history_task_event$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
};
