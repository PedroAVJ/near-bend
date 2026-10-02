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

function $session$initial$() {
  return {$: "session.Session", "revision": 0, "phase": {$: "session.Idle"}, "call": {$: "session.Closed"}, "microphone": {$: "session.Denied"}};
}

function $session$update$(_event_0, _session_0) {
  if (_event_0.$ === "session.Start") {
    const _r_0 = _session_0["revision"];
    const _c_0 = _session_0["call"];
    const _m_0 = _session_0["microphone"];
    return {$: "session.Session", "revision": ((_r_0 + 1) >>> 0), "phase": {$: "session.Running"}, "call": _c_0, "microphone": _m_0};
  } else if (_event_0.$ === "session.Finish") {
    const _r_1 = _session_0["revision"];
    const _c_1 = _session_0["call"];
    const _m_1 = _session_0["microphone"];
    return {$: "session.Session", "revision": ((_r_1 + 1) >>> 0), "phase": {$: "session.Idle"}, "call": _c_1, "microphone": _m_1};
  } else if (_event_0.$ === "session.Cancel") {
    const _r_2 = _session_0["revision"];
    const _c_2 = _session_0["call"];
    const _m_2 = _session_0["microphone"];
    return {$: "session.Session", "revision": ((_r_2 + 1) >>> 0), "phase": {$: "session.Cancelled"}, "call": _c_2, "microphone": _m_2};
  } else if (_event_0.$ === "session.RunFailed") {
    const _r_3 = _session_0["revision"];
    const _c_3 = _session_0["call"];
    const _m_3 = _session_0["microphone"];
    return {$: "session.Session", "revision": ((_r_3 + 1) >>> 0), "phase": {$: "session.Failed"}, "call": _c_3, "microphone": _m_3};
  } else if (_event_0.$ === "session.GrantMic") {
    const _r_4 = _session_0["revision"];
    const _p_4 = _session_0["phase"];
    const _c_4 = _session_0["call"];
    return {$: "session.Session", "revision": ((_r_4 + 1) >>> 0), "phase": _p_4, "call": _c_4, "microphone": {$: "session.Granted"}};
  } else if (_event_0.$ === "session.DenyMic") {
    const _r_5 = _session_0["revision"];
    const _p_5 = _session_0["phase"];
    return {$: "session.Session", "revision": ((_r_5 + 1) >>> 0), "phase": _p_5, "call": {$: "session.Closed"}, "microphone": {$: "session.Denied"}};
  } else if (_event_0.$ === "session.BeginCall") {
    const _r_6 = _session_0["revision"];
    const _p_6 = _session_0["phase"];
    const _c_6 = _session_0["call"];
    const _t_0 = _session_0["microphone"];
    if (_t_0.$ === "session.Granted") {
      return {$: "session.Session", "revision": ((_r_6 + 1) >>> 0), "phase": _p_6, "call": {$: "session.Active"}, "microphone": {$: "session.Granted"}};
    } else {
      return {$: "session.Session", "revision": _r_6, "phase": _p_6, "call": _c_6, "microphone": {$: "session.Denied"}};
    }
  } else {
    const _r_7 = _session_0["revision"];
    const _p_7 = _session_0["phase"];
    const _m_6 = _session_0["microphone"];
    return {$: "session.Session", "revision": ((_r_7 + 1) >>> 0), "phase": _p_7, "call": {$: "session.Closed"}, "microphone": _m_6};
  }
}

function $session$phase$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "session.Idle") {
    return "idle";
  } else if (_t_0.$ === "session.Running") {
    return "running";
  } else if (_t_0.$ === "session.Cancelled") {
    return "cancelled";
  } else {
    return "failed";
  }
}

function $session$in_call$(_s_0) {
  const _t_0 = _s_0["call"];
  if (_t_0.$ === "session.Active") {
    return true;
  } else {
    return false;
  }
}

function $session$task_permitted$(_approval_0) {
  if (_approval_0.$ === "session.NoApprovalNeeded") {
    return true;
  } else if (_approval_0.$ === "session.ExecutionApproved") {
    return true;
  } else if (_approval_0.$ === "session.AwaitingApproval") {
    return false;
  } else {
    return false;
  }
}

function $session$history_initial$() {
  return {$: "session.Continuity", "messages": {$: "Nil"}, "tasks": {$: "Nil"}};
}

function $session$append_message$(_xs_0, _message_0) {
  if (_xs_0.$ === "Nil") {
    return {$: "Con", "head": _message_0, "tail": {$: "Nil"}};
  } else {
    const _head_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    return {$: "Con", "head": _head_0, "tail": ($session$append_message$(_tail_0, _message_0))};
  }
}

function $session$append_task$(_xs_0, _task_0) {
  if (_xs_0.$ === "Nil") {
    return {$: "Con", "head": _task_0, "tail": {$: "Nil"}};
  } else {
    const _head_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    return {$: "Con", "head": _head_0, "tail": ($session$append_task$(_tail_0, _task_0))};
  }
}

function $session$history_message$(_message_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "session.Continuity", "messages": ($session$append_message$(_messages_0, _message_0)), "tasks": _tasks_0};
}

function $session$history_task$(_task_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "session.Continuity", "messages": _messages_0, "tasks": ($session$append_task$(_tasks_0, _task_0))};
}

function $session$reduce_text$(_event_0, _message_0) {
  if (_event_0.$ === "session.TextDelta") {
    const _delta_0 = _event_0["text"];
    const _id_0 = _message_0["id"];
    const _role_0 = _message_0["role"];
    const _source_0 = _message_0["source"];
    const _text_0 = _message_0["text"];
    const _t_0 = _message_0["status"];
    if (_t_0.$ === "session.StreamingMessage") {
      return {$: "session.Message", "id": _id_0, "role": _role_0, "source": _source_0, "text": (_text_0 + _delta_0), "status": {$: "session.StreamingMessage"}};
    } else {
      return {$: "session.Message", "id": _id_0, "role": _role_0, "source": _source_0, "text": _text_0, "status": _t_0};
    }
  } else if (_event_0.$ === "session.TextResult") {
    const _result_0 = _event_0["text"];
    const _id_1 = _message_0["id"];
    const _role_1 = _message_0["role"];
    const _source_1 = _message_0["source"];
    const _text_1 = _message_0["text"];
    const _t_1 = _message_0["status"];
    if (_t_1.$ === "session.StreamingMessage") {
      return {$: "session.Message", "id": _id_1, "role": _role_1, "source": _source_1, "text": _result_0, "status": {$: "session.CompleteMessage"}};
    } else {
      return {$: "session.Message", "id": _id_1, "role": _role_1, "source": _source_1, "text": _text_1, "status": _t_1};
    }
  } else if (_event_0.$ === "session.TextError") {
    const _id_2 = _message_0["id"];
    const _role_2 = _message_0["role"];
    const _source_2 = _message_0["source"];
    const _text_2 = _message_0["text"];
    const _t_2 = _message_0["status"];
    if (_t_2.$ === "session.StreamingMessage") {
      return {$: "session.Message", "id": _id_2, "role": _role_2, "source": _source_2, "text": _text_2, "status": {$: "session.FailedMessage"}};
    } else {
      return {$: "session.Message", "id": _id_2, "role": _role_2, "source": _source_2, "text": _text_2, "status": _t_2};
    }
  } else {
    const _id_3 = _message_0["id"];
    const _role_3 = _message_0["role"];
    const _source_3 = _message_0["source"];
    const _text_3 = _message_0["text"];
    const _t_3 = _message_0["status"];
    if (_t_3.$ === "session.StreamingMessage") {
      return {$: "session.Message", "id": _id_3, "role": _role_3, "source": _source_3, "text": _text_3, "status": {$: "session.CancelledMessage"}};
    } else {
      return {$: "session.Message", "id": _id_3, "role": _role_3, "source": _source_3, "text": _text_3, "status": _t_3};
    }
  }
}

function $session$reduce_task$(_event_0, _task_0) {
  if (_event_0.$ === "session.ApproveTask") {
    const _id_0 = _task_0["id"];
    const _title_0 = _task_0["title"];
    const _status_0 = _task_0["status"];
    const _t_0 = _task_0["approval"];
    if (_t_0.$ === "session.AwaitingApproval") {
      const _result_0 = _task_0["result"];
      const _error_0 = _task_0["error"];
      return {$: "session.Task", "id": _id_0, "title": _title_0, "status": _status_0, "approval": {$: "session.ExecutionApproved"}, "result": _result_0, "error": _error_0};
    } else {
      const _result_1 = _task_0["result"];
      const _error_1 = _task_0["error"];
      return {$: "session.Task", "id": _id_0, "title": _title_0, "status": _status_0, "approval": _t_0, "result": _result_1, "error": _error_1};
    }
  } else if (_event_0.$ === "session.RejectTask") {
    const _id_1 = _task_0["id"];
    const _title_1 = _task_0["title"];
    const _status_1 = _task_0["status"];
    const _t_1 = _task_0["approval"];
    if (_t_1.$ === "session.AwaitingApproval") {
      const _result_2 = _task_0["result"];
      const _error_2 = _task_0["error"];
      return {$: "session.Task", "id": _id_1, "title": _title_1, "status": {$: "session.TaskCancelled"}, "approval": {$: "session.ExecutionRejected"}, "result": _result_2, "error": _error_2};
    } else {
      const _result_3 = _task_0["result"];
      const _error_3 = _task_0["error"];
      return {$: "session.Task", "id": _id_1, "title": _title_1, "status": _status_1, "approval": _t_1, "result": _result_3, "error": _error_3};
    }
  } else if (_event_0.$ === "session.StartTask") {
    const _id_2 = _task_0["id"];
    const _title_2 = _task_0["title"];
    const _t_2 = _task_0["status"];
    if (_t_2.$ === "session.TaskReady") {
      const _approval_0 = _task_0["approval"];
      const _result_4 = _task_0["result"];
      const _error_4 = _task_0["error"];
      return $Bool$pick$(($session$task_permitted$(_approval_0)), {$: "session.Task", "id": _id_2, "title": _title_2, "status": {$: "session.TaskRunning"}, "approval": _approval_0, "result": _result_4, "error": _error_4}, {$: "session.Task", "id": _id_2, "title": _title_2, "status": {$: "session.TaskReady"}, "approval": _approval_0, "result": _result_4, "error": _error_4});
    } else {
      const _approval_1 = _task_0["approval"];
      const _result_5 = _task_0["result"];
      const _error_5 = _task_0["error"];
      return {$: "session.Task", "id": _id_2, "title": _title_2, "status": _t_2, "approval": _approval_1, "result": _result_5, "error": _error_5};
    }
  } else if (_event_0.$ === "session.FinishTask") {
    const _result_6 = _event_0["result"];
    const _id_3 = _task_0["id"];
    const _title_3 = _task_0["title"];
    const _t_3 = _task_0["status"];
    if (_t_3.$ === "session.TaskRunning") {
      const _approval_2 = _task_0["approval"];
      return {$: "session.Task", "id": _id_3, "title": _title_3, "status": {$: "session.TaskDone"}, "approval": _approval_2, "result": _result_6, "error": ""};
    } else if (_t_3.$ === "session.TaskReady") {
      const _approval_3 = _task_0["approval"];
      const _old_1 = _task_0["result"];
      const _error_7 = _task_0["error"];
      return $Bool$pick$(($session$task_permitted$(_approval_3)), {$: "session.Task", "id": _id_3, "title": _title_3, "status": {$: "session.TaskDone"}, "approval": _approval_3, "result": _result_6, "error": ""}, {$: "session.Task", "id": _id_3, "title": _title_3, "status": {$: "session.TaskReady"}, "approval": _approval_3, "result": _old_1, "error": _error_7});
    } else {
      const _approval_4 = _task_0["approval"];
      const _old_2 = _task_0["result"];
      const _error_8 = _task_0["error"];
      return {$: "session.Task", "id": _id_3, "title": _title_3, "status": _t_3, "approval": _approval_4, "result": _old_2, "error": _error_8};
    }
  } else if (_event_0.$ === "session.FailTask") {
    const _error_9 = _event_0["message"];
    const _id_4 = _task_0["id"];
    const _title_4 = _task_0["title"];
    const _t_4 = _task_0["status"];
    if (_t_4.$ === "session.TaskRunning") {
      const _approval_5 = _task_0["approval"];
      const _result_7 = _task_0["result"];
      return {$: "session.Task", "id": _id_4, "title": _title_4, "status": {$: "session.TaskFailed"}, "approval": _approval_5, "result": _result_7, "error": _error_9};
    } else {
      const _approval_6 = _task_0["approval"];
      const _result_8 = _task_0["result"];
      const _old_4 = _task_0["error"];
      return {$: "session.Task", "id": _id_4, "title": _title_4, "status": _t_4, "approval": _approval_6, "result": _result_8, "error": _old_4};
    }
  } else if (_event_0.$ === "session.CancelTask") {
    const _id_5 = _task_0["id"];
    const _title_5 = _task_0["title"];
    const _t_5 = _task_0["status"];
    if (_t_5.$ === "session.TaskDone") {
      const _approval_7 = _task_0["approval"];
      const _result_9 = _task_0["result"];
      const _error_10 = _task_0["error"];
      return {$: "session.Task", "id": _id_5, "title": _title_5, "status": {$: "session.TaskDone"}, "approval": _approval_7, "result": _result_9, "error": _error_10};
    } else {
      const _approval_8 = _task_0["approval"];
      const _result_10 = _task_0["result"];
      const _error_11 = _task_0["error"];
      return {$: "session.Task", "id": _id_5, "title": _title_5, "status": {$: "session.TaskCancelled"}, "approval": _approval_8, "result": _result_10, "error": _error_11};
    }
  } else {
    const _id_6 = _task_0["id"];
    const _title_6 = _task_0["title"];
    const _t_6 = _task_0["status"];
    if (_t_6.$ === "session.TaskRunning") {
      const _t_7 = _task_0["approval"];
      if (_t_7.$ === "session.ExecutionApproved") {
        const _result_11 = _task_0["result"];
        const _error_12 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": {$: "session.TaskReady"}, "approval": {$: "session.AwaitingApproval"}, "result": _result_11, "error": _error_12};
      } else {
        const _result_12 = _task_0["result"];
        const _error_13 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": {$: "session.TaskReady"}, "approval": _t_7, "result": _result_12, "error": _error_13};
      }
    } else if (_t_6.$ === "session.TaskDone") {
      const _t_8 = _task_0["approval"];
      if (_t_8.$ === "session.ExecutionApproved") {
        const _result_13 = _task_0["result"];
        const _error_14 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": {$: "session.TaskDone"}, "approval": {$: "session.ExecutionApproved"}, "result": _result_13, "error": _error_14};
      } else {
        const _result_14 = _task_0["result"];
        const _error_15 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": {$: "session.TaskDone"}, "approval": _t_8, "result": _result_14, "error": _error_15};
      }
    } else {
      const _t_9 = _task_0["approval"];
      if (_t_9.$ === "session.ExecutionApproved") {
        const _result_15 = _task_0["result"];
        const _error_16 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": _t_6, "approval": {$: "session.AwaitingApproval"}, "result": _result_15, "error": _error_16};
      } else {
        const _result_16 = _task_0["result"];
        const _error_17 = _task_0["error"];
        return {$: "session.Task", "id": _id_6, "title": _title_6, "status": _t_6, "approval": _t_9, "result": _result_16, "error": _error_17};
      }
    }
  }
}

function $session$permissions_initial$() {
  return {$: "session.Permissions", "microphone": {$: "session.Denied"}, "persistence": {$: "session.Denied"}};
}

function $session$reduce_permissions$(_event_0, _permissions_0) {
  if (_event_0.$ === "session.PermitMicrophone") {
    const _persistence_0 = _permissions_0["persistence"];
    return {$: "session.Permissions", "microphone": {$: "session.Granted"}, "persistence": _persistence_0};
  } else if (_event_0.$ === "session.RevokeMicrophone") {
    const _persistence_1 = _permissions_0["persistence"];
    return {$: "session.Permissions", "microphone": {$: "session.Denied"}, "persistence": _persistence_1};
  } else if (_event_0.$ === "session.PermitPersistence") {
    const _mic_2 = _permissions_0["microphone"];
    return {$: "session.Permissions", "microphone": _mic_2, "persistence": {$: "session.Granted"}};
  } else {
    const _mic_3 = _permissions_0["microphone"];
    return {$: "session.Permissions", "microphone": _mic_3, "persistence": {$: "session.Denied"}};
  }
}

function $session$permission_granted$(_permission_0) {
  if (_permission_0.$ === "session.Granted") {
    return true;
  } else {
    return false;
  }
}

function $session$call_record_permitted$(_session_0) {
  const _t_0 = _session_0["phase"];
  if (_t_0.$ === "session.Cancelled") {
    const _t_1 = _session_0["call"];
    if (_t_1.$ === "session.Active") {
      const _t_2 = _session_0["microphone"];
      if (_t_2.$ === "session.Granted") {
        return false;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    const _t_3 = _session_0["call"];
    if (_t_3.$ === "session.Active") {
      const _t_4 = _session_0["microphone"];
      if (_t_4.$ === "session.Granted") {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

function $session$history_record$(_session_0, _message_0, _history_0) {
  const _id_0 = _message_0["id"];
  const _role_0 = _message_0["role"];
  const _t_0 = _message_0["source"];
  if (_t_0.$ === "session.ChatMessage") {
    const _text_0 = _message_0["text"];
    const _status_0 = _message_0["status"];
    return $session$history_message$({$: "session.Message", "id": _id_0, "role": _role_0, "source": {$: "session.ChatMessage"}, "text": _text_0, "status": _status_0}, _history_0);
  } else {
    const _text_1 = _message_0["text"];
    const _status_1 = _message_0["status"];
    return $Bool$pick$(($session$call_record_permitted$(_session_0)), ($session$history_message$({$: "session.Message", "id": _id_0, "role": _role_0, "source": {$: "session.CallMessage"}, "text": _text_1, "status": _status_1}, _history_0)), _history_0);
  }
}

function $session$new_task$(_id_0, _title_0, _requires_approval_0) {
  return {$: "session.Task", "id": _id_0, "title": _title_0, "status": {$: "session.TaskReady"}, "approval": ($Bool$pick$(_requires_approval_0, {$: "session.AwaitingApproval"}, {$: "session.NoApprovalNeeded"})), "result": "", "error": ""};
}

function $session$message_id$(_message_0) {
  const _id_0 = _message_0["id"];
  return _id_0;
}

function $session$task_id$(_task_0) {
  const _id_0 = _task_0["id"];
  return _id_0;
}

function $session$reduce_messages$(_event_0, _id_0, _messages_0) {
  if (_messages_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _head_0 = _messages_0["head"];
    const _tail_0 = _messages_0["tail"];
    return {$: "Con", "head": ($Bool$pick$(($String$eq$(($session$message_id$(_head_0)), _id_0)), ($session$reduce_text$(_event_0, _head_0)), _head_0)), "tail": ($session$reduce_messages$(_event_0, _id_0, _tail_0))};
  }
}

function $session$reduce_tasks$(_event_0, _id_0, _tasks_0) {
  if (_tasks_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _head_0 = _tasks_0["head"];
    const _tail_0 = _tasks_0["tail"];
    return {$: "Con", "head": ($Bool$pick$(($String$eq$(($session$task_id$(_head_0)), _id_0)), ($session$reduce_task$(_event_0, _head_0)), _head_0)), "tail": ($session$reduce_tasks$(_event_0, _id_0, _tail_0))};
  }
}

function $session$history_text$(_event_0, _id_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "session.Continuity", "messages": ($session$reduce_messages$(_event_0, _id_0, _messages_0)), "tasks": _tasks_0};
}

function $session$history_task_event$(_event_0, _id_0, _history_0) {
  const _messages_0 = _history_0["messages"];
  const _tasks_0 = _history_0["tasks"];
  return {$: "session.Continuity", "messages": _messages_0, "tasks": ($session$reduce_tasks$(_event_0, _id_0, _tasks_0))};
}

function $$$$047$$$047ai$047bend$047wire_json$hex$(_n_0) {
  return $String$take$(($String$drop$("0123456789abcdef", _n_0)), 1);
}

function $$$$047$$$047ai$047bend$047wire_json$escape_code$(_control_0, _c_0) {
  if (_control_0) {
    const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$hex$((16 === 0 ? 0 : (_c_0 / 16) >>> 0)));
    const _x_1 = ($$$$047$$$047ai$047bend$047wire_json$hex$((16 === 0 ? _c_0 : _c_0 % 16)));
    const _x_2 = (_x_0 + _x_1);
    return ("\\u00" + _x_2);
  } else {
    return (char_new(_c_0) + "");
  }
}

function $$$$047$$$047ai$047bend$047wire_json$escape_char$(_c_0) {
  return $$$$047$$$047ai$047bend$047wire_json$escape_code$((_c_0 < 32), _c_0);
}

function $$$$047$$$047ai$047bend$047wire_json$escape_go$($0, $1) {
  for (;;) {
    {
      const _s_0 = $0;
      const _acc_0 = $1;
      if (_s_0 === "") {
        return $String$reverse$(_acc_0);
      } else {
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = _t_0.codePointAt(0);
        if (_t_1 == 34) {
          const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
          $0 = _rest_0;
          $1 = ("\"\\" + _acc_0);
          continue;
        } else if (_t_1 == 92) {
          const _rest_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
          $0 = _rest_1;
          $1 = ("\\\\" + _acc_0);
          continue;
        } else {
          const _20_0 = u32_to_word(_t_1)["head"];
          const _21_0 = u32_to_word(_t_1)["tail"];
          const _rest_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
          const _x_0 = ($String$reverse$(($$$$047$$$047ai$047bend$047wire_json$escape_char$(word_to_u32({$: "WCon", "head": _20_0, "tail": _21_0})))));
          $0 = _rest_2;
          $1 = (_x_0 + _acc_0);
          continue;
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$escape$(_s_0) {
  return $$$$047$$$047ai$047bend$047wire_json$escape_go$(_s_0, "");
}

function $$$$047$$$047ai$047bend$047wire_json$quote$(_s_0) {
  const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$escape$(_s_0));
  const _x_1 = (_x_0 + "\"");
  return ("\"" + _x_1);
}

function $$$$047$$$047ai$047bend$047wire_json$comma$(_empty_0) {
  if (_empty_0) {
    return "";
  } else {
    return ",";
  }
}

function $$$$047$$$047ai$047bend$047wire_json$stringify$(_value_0) {
  if (_value_0.$ === "../../ai/bend/wire_json.Null") {
    return "null";
  } else if (_value_0.$ === "../../ai/bend/wire_json.Boolean") {
    const _t_0 = _value_0["value"];
    if (_t_0) {
      return "true";
    } else {
      return "false";
    }
  } else if (_value_0.$ === "../../ai/bend/wire_json.Number") {
    const _text_0 = _value_0["text"];
    return _text_0;
  } else if (_value_0.$ === "../../ai/bend/wire_json.Text") {
    const _value_1 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047wire_json$quote$(_value_1);
  } else if (_value_0.$ === "../../ai/bend/wire_json.Array") {
    const _t_1 = _value_0["items"];
    if (_t_1.$ === "Nil") {
      return "[]";
    } else {
      const _head_0 = _t_1["head"];
      const _tail_0 = _t_1["tail"];
      const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$comma$(($List$is_empty$(_tail_0))));
      const _x_1 = ($String$drop$(($$$$047$$$047ai$047bend$047wire_json$stringify$({$: "../../ai/bend/wire_json.Array", "items": _tail_0})), 1));
      const _x_2 = ($$$$047$$$047ai$047bend$047wire_json$stringify$(_head_0));
      const _x_3 = (_x_0 + _x_1);
      const _x_4 = (_x_2 + _x_3);
      return ("[" + _x_4);
    }
  } else {
    const _t_2 = _value_0["fields"];
    if (_t_2.$ === "Nil") {
      return "{}";
    } else {
      const _t_3 = _t_2["head"];
      const _key_0 = _t_3["key"];
      const _value_2 = _t_3["value"];
      const _tail_1 = _t_2["tail"];
      const _x_5 = ($$$$047$$$047ai$047bend$047wire_json$comma$(($List$is_empty$(_tail_1))));
      const _x_6 = ($String$drop$(($$$$047$$$047ai$047bend$047wire_json$stringify$({$: "../../ai/bend/wire_json.Object", "fields": _tail_1})), 1));
      const _x_7 = ($$$$047$$$047ai$047bend$047wire_json$stringify$(_value_2));
      const _x_8 = (_x_5 + _x_6);
      const _x_9 = (_x_7 + _x_8);
      const _x_10 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_key_0));
      const _x_11 = (":" + _x_9);
      const _x_12 = (_x_10 + _x_11);
      return ("{" + _x_12);
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$choose$(_found_0, _value_0, _other_0) {
  if (_found_0) {
    return {$: "Some", "value": _value_0};
  } else {
    return _other_0;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$get_fields$(_fields_0, _key_0) {
  if (_fields_0.$ === "Nil") {
    return {$: "None"};
  } else {
    const _t_0 = _fields_0["head"];
    const _name_0 = _t_0["key"];
    const _value_0 = _t_0["value"];
    const _tail_0 = _fields_0["tail"];
    return $$$$047$$$047ai$047bend$047wire_json$choose$(($String$eq$(_name_0, _key_0)), _value_0, ($$$$047$$$047ai$047bend$047wire_json$get_fields$(_tail_0, _key_0)));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$get$(_value_0, _key_0) {
  if (_value_0.$ === "../../ai/bend/wire_json.Object") {
    const _fields_0 = _value_0["fields"];
    return $$$$047$$$047ai$047bend$047wire_json$get_fields$(_fields_0, _key_0);
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$text$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _s_0 = _t_0["value"];
      return _s_0;
    } else {
      return "";
    }
  } else {
    return "";
  }
}

function $$$$047$$$047ai$047bend$047wire_json$select_u32$(_ok_0, _yes_0, _no_0) {
  if (_ok_0) {
    return _yes_0;
  } else {
    return _no_0;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$hex_digit$(_ch_0) {
  const _c_0 = ($Char$to_u32$(_ch_0));
  return $$$$047$$$047ai$047bend$047wire_json$select_u32$(($Bool$and$((_c_0 >= 48), (_c_0 <= 57))), ((_c_0 - 48) >>> 0), ($$$$047$$$047ai$047bend$047wire_json$select_u32$(($Bool$and$((_c_0 >= 97), (_c_0 <= 102))), ((_c_0 - 87) >>> 0), ($$$$047$$$047ai$047bend$047wire_json$select_u32$(($Bool$and$((_c_0 >= 65), (_c_0 <= 70))), ((_c_0 - 55) >>> 0), 256)))));
}

function $$$$047$$$047ai$047bend$047wire_json$checked_char$(_ok_0, _code_0) {
  if (_ok_0) {
    return {$: "Done", "value": char_new(_code_0)};
  } else {
    return {$: "Fail", "error": "invalid JSON Unicode escape"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$hex_checked$(_ok_0, _code_0) {
  if (_ok_0) {
    return {$: "Done", "value": _code_0};
  } else {
    return {$: "Fail", "error": "invalid JSON Unicode escape"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$hex4$(_a_0, _b_0, _c_0, _d_0) {
  const _x_0 = (Math.imul(_a_0, 4096) >>> 0);
  const _x_1 = (Math.imul(_b_0, 256) >>> 0);
  const _x_2 = ((_x_0 + _x_1) >>> 0);
  const _x_3 = (Math.imul(_c_0, 16) >>> 0);
  const _x_4 = ((_x_2 + _x_3) >>> 0);
  return $$$$047$$$047ai$047bend$047wire_json$hex_checked$(($Bool$and$(($Bool$and$(($Bool$and$((_a_0 < 16), (_b_0 < 16))), (_c_0 < 16))), (_d_0 < 16))), ((_x_4 + _d_0) >>> 0));
}

function $$$$047$$$047ai$047bend$047wire_json$unicode_escape$(_high_0, _code_0, _rest_0) {
  if (_high_0) {
    if (_rest_0 !== "") {
      const _t_0 = (_rest_0.codePointAt(0) > 0xFFFF ? _rest_0.slice(0, 2) : _rest_0[0]);
      const _t_1 = _t_0.codePointAt(0);
      if (_t_1 == 92) {
        const _t_2 = (_rest_0.codePointAt(0) > 0xFFFF ? _rest_0.slice(2) : _rest_0.slice(1));
        if (_t_2 !== "") {
          const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
          const _t_4 = _t_3.codePointAt(0);
          if (_t_4 == 117) {
            const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
            if (_t_5 !== "") {
              const _a_0 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
              const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_6 !== "") {
                const _b_0 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(0, 2) : _t_6[0]);
                const _t_7 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(2) : _t_6.slice(1));
                if (_t_7 !== "") {
                  const _c_0 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(0, 2) : _t_7[0]);
                  const _t_8 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(2) : _t_7.slice(1));
                  if (_t_8 !== "") {
                    const _d_0 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                    const _tail_0 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                    return $Result$bind$(($$$$047$$$047ai$047bend$047wire_json$hex4$(($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_a_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_b_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_c_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_d_0)))), run_clo((_x_0) => {
  const _x_1 = ((_code_0 - 55296) >>> 0);
  const _x_2 = (Math.imul(_x_1, 1024) >>> 0);
  const _x_3 = ((65536 + _x_2) >>> 0);
  const _x_4 = ((_x_3 + _x_0) >>> 0);
  return $Result$bind$(($$$$047$$$047ai$047bend$047wire_json$checked_char$(($Bool$and$((_x_0 >= 56320), (_x_0 <= 57343))), ((_x_4 - 56320) >>> 0))), run_clo((_x_5) => {
  return $Result$pure$({$: "Tuple", "fst": _x_5, "snd": _tail_0});
}));
}));
                  } else {
                    return {$: "Fail", "error": "unpaired JSON surrogate"};
                  }
                } else {
                  return {$: "Fail", "error": "unpaired JSON surrogate"};
                }
              } else {
                return {$: "Fail", "error": "unpaired JSON surrogate"};
              }
            } else {
              return {$: "Fail", "error": "unpaired JSON surrogate"};
            }
          } else {
            return {$: "Fail", "error": "unpaired JSON surrogate"};
          }
        } else {
          return {$: "Fail", "error": "unpaired JSON surrogate"};
        }
      } else {
        return {$: "Fail", "error": "unpaired JSON surrogate"};
      }
    } else {
      return {$: "Fail", "error": "unpaired JSON surrogate"};
    }
  } else {
    const _x_6 = (_code_0 < 55296);
    const _x_7 = (_code_0 > 57343);
    return $Result$bind$(($$$$047$$$047ai$047bend$047wire_json$checked_char$((_x_6 || _x_7), _code_0)), run_clo((_x_8) => {
  return $Result$pure$({$: "Tuple", "fst": _x_8, "snd": _rest_0});
}));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$unicode_escape_code$(_result_0, _rest_0) {
  if (_result_0.$ === "Fail") {
    const _e_0 = _result_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _code_0 = _result_0["value"];
    return $$$$047$$$047ai$047bend$047wire_json$unicode_escape$(($Bool$and$((_code_0 >= 55296), (_code_0 <= 56319))), _code_0, _rest_0);
  }
}

function $$$$047$$$047ai$047bend$047wire_json$unescape$(_s_0) {
  if (_s_0 !== "") {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 34) {
      const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\"", "snd": _rest_0}};
    } else if (_t_1 == 98) {
      const _rest_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\b", "snd": _rest_1}};
    } else if (_t_1 == 114) {
      const _rest_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\r", "snd": _rest_2}};
    } else if ((_t_1 & 7) == 2) {
      return {$: "Fail", "error": "invalid JSON escape"};
    } else if (_t_1 == 102) {
      const _rest_4 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\f", "snd": _rest_4}};
    } else if ((_t_1 & 15) == 6) {
      return {$: "Fail", "error": "invalid JSON escape"};
    } else if (_t_1 == 110) {
      const _rest_6 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\n", "snd": _rest_6}};
    } else if ((_t_1 & 15) == 14) {
      return {$: "Fail", "error": "invalid JSON escape"};
    } else if (_t_1 == 92) {
      const _rest_8 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\\", "snd": _rest_8}};
    } else if (_t_1 == 116) {
      const _rest_9 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "\t", "snd": _rest_9}};
    } else if ((_t_1 & 3) == 0) {
      return {$: "Fail", "error": "invalid JSON escape"};
    } else if (_t_1 == 47) {
      const _rest_11 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return {$: "Done", "value": {$: "Tuple", "fst": "/", "snd": _rest_11}};
    } else if ((_t_1 & 3) == 3) {
      return {$: "Fail", "error": "invalid JSON escape"};
    } else if (_t_1 == 117) {
      const _t_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_2 !== "") {
        const _a_0 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
        if (_t_3 !== "") {
          const _b_0 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(0, 2) : _t_3[0]);
          const _t_4 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(2) : _t_3.slice(1));
          if (_t_4 !== "") {
            const _c_0 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(0, 2) : _t_4[0]);
            const _t_5 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(2) : _t_4.slice(1));
            if (_t_5 !== "") {
              const _d_0 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
              const _rest_13 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              return $$$$047$$$047ai$047bend$047wire_json$unicode_escape_code$(($$$$047$$$047ai$047bend$047wire_json$hex4$(($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_a_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_b_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_c_0)), ($$$$047$$$047ai$047bend$047wire_json$hex_digit$(_d_0)))), _rest_13);
            } else {
              return {$: "Fail", "error": "invalid JSON escape"};
            }
          } else {
            return {$: "Fail", "error": "invalid JSON escape"};
          }
        } else {
          return {$: "Fail", "error": "invalid JSON escape"};
        }
      } else {
        return {$: "Fail", "error": "invalid JSON escape"};
      }
    } else {
      return {$: "Fail", "error": "invalid JSON escape"};
    }
  } else {
    return {$: "Fail", "error": "invalid JSON escape"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$string_char$(_ok_0, _ch_0, _rest_0, _acc_0, _next_0) {
  if (_ok_0) {
    return run_tail(_next_0(_rest_0), (_ch_0 + _acc_0));
  } else {
    return {$: "Fail", "error": "unescaped control character"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$string_escape$(_result_0, _acc_0, _next_0) {
  if (_result_0.$ === "Fail") {
    const _e_0 = _result_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _t_0 = _result_0["value"];
    const _ch_0 = _t_0["fst"];
    const _rest_0 = _t_0["snd"];
    return run_tail(_next_0(_rest_0), (_ch_0 + _acc_0));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$string_read$(_fuel_0, _s_0, _acc_0) {
  if (_fuel_0 === 0) {
    return {$: "Fail", "error": "JSON string limit"};
  } else {
    const _n_0 = (_fuel_0 - 1);
    if (_s_0 === "") {
      return {$: "Fail", "error": "unterminated JSON string"};
    } else {
      const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
      const _t_1 = _t_0.codePointAt(0);
      if (_t_1 == 34) {
        const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        return {$: "Done", "value": {$: "Tuple", "fst": ($String$reverse$(_acc_0)), "snd": _rest_0}};
      } else if (_t_1 == 92) {
        const _rest_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        return $$$$047$$$047ai$047bend$047wire_json$string_escape$(run_loop($$$$047$$$047ai$047bend$047wire_json$unescape$(_rest_1)), _acc_0, run_clo((_x_0) => {
  return run_clo((_x_1) => {
  return $$$$047$$$047ai$047bend$047wire_json$string_read$(_n_0, _x_0, _x_1);
});
}));
      } else {
        const _38_0 = u32_to_word(_t_1)["head"];
        const _39_0 = u32_to_word(_t_1)["tail"];
        const _rest_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        const _x_2 = word_to_u32({$: "WCon", "head": _38_0, "tail": _39_0});
        return $$$$047$$$047ai$047bend$047wire_json$string_char$((_x_2 >= 32), char_new(word_to_u32({$: "WCon", "head": _38_0, "tail": _39_0})), _rest_2, _acc_0, run_clo((_x_3) => {
  return run_clo((_x_4) => {
  return $$$$047$$$047ai$047bend$047wire_json$string_read$(_n_0, _x_3, _x_4);
});
}));
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$select_state$(_ok_0, _yes_0, _no_0) {
  if (_ok_0) {
    return _yes_0;
  } else {
    return _no_0;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$number_state$(_state_0, _ch_0) {
  if (_state_0.$ === "../../ai/bend/wire_json.Start") {
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_eq$(_ch_0, "-")), {$: "../../ai/bend/wire_json.Minus"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_eq$(_ch_0, "0")), {$: "../../ai/bend/wire_json.NumZero"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Integer"}, {$: "../../ai/bend/wire_json.Bad"})))));
  } else if (_state_0.$ === "../../ai/bend/wire_json.Minus") {
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_eq$(_ch_0, "0")), {$: "../../ai/bend/wire_json.NumZero"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Integer"}, {$: "../../ai/bend/wire_json.Bad"})));
  } else if (_state_0.$ === "../../ai/bend/wire_json.NumZero") {
    const _x_0 = ($Char$is_eq$(_ch_0, "e"));
    const _x_1 = ($Char$is_eq$(_ch_0, "E"));
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_eq$(_ch_0, ".")), {$: "../../ai/bend/wire_json.Dot"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$((_x_0 || _x_1), {$: "../../ai/bend/wire_json.Exponent"}, {$: "../../ai/bend/wire_json.Bad"})));
  } else if (_state_0.$ === "../../ai/bend/wire_json.Integer") {
    const _x_2 = ($Char$is_eq$(_ch_0, "e"));
    const _x_3 = ($Char$is_eq$(_ch_0, "E"));
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Integer"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_eq$(_ch_0, ".")), {$: "../../ai/bend/wire_json.Dot"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$((_x_2 || _x_3), {$: "../../ai/bend/wire_json.Exponent"}, {$: "../../ai/bend/wire_json.Bad"})))));
  } else if (_state_0.$ === "../../ai/bend/wire_json.Dot") {
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Fraction"}, {$: "../../ai/bend/wire_json.Bad"});
  } else if (_state_0.$ === "../../ai/bend/wire_json.Fraction") {
    const _x_4 = ($Char$is_eq$(_ch_0, "e"));
    const _x_5 = ($Char$is_eq$(_ch_0, "E"));
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Fraction"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$((_x_4 || _x_5), {$: "../../ai/bend/wire_json.Exponent"}, {$: "../../ai/bend/wire_json.Bad"})));
  } else if (_state_0.$ === "../../ai/bend/wire_json.Exponent") {
    const _x_6 = ($Char$is_eq$(_ch_0, "+"));
    const _x_7 = ($Char$is_eq$(_ch_0, "-"));
    return $$$$047$$$047ai$047bend$047wire_json$select_state$((_x_6 || _x_7), {$: "../../ai/bend/wire_json.Sign"}, ($$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Digits"}, {$: "../../ai/bend/wire_json.Bad"})));
  } else if (_state_0.$ === "../../ai/bend/wire_json.Sign") {
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Digits"}, {$: "../../ai/bend/wire_json.Bad"});
  } else if (_state_0.$ === "../../ai/bend/wire_json.Digits") {
    return $$$$047$$$047ai$047bend$047wire_json$select_state$(($Char$is_digit$(_ch_0)), {$: "../../ai/bend/wire_json.Digits"}, {$: "../../ai/bend/wire_json.Bad"});
  } else {
    return {$: "../../ai/bend/wire_json.Bad"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$number_end$(_state_0) {
  if (_state_0.$ === "../../ai/bend/wire_json.NumZero") {
    return true;
  } else if (_state_0.$ === "../../ai/bend/wire_json.Integer") {
    return true;
  } else if (_state_0.$ === "../../ai/bend/wire_json.Fraction") {
    return true;
  } else if (_state_0.$ === "../../ai/bend/wire_json.Digits") {
    return true;
  } else {
    return false;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$number_valid$($0, $1) {
  for (;;) {
    {
      const _s_0 = $0;
      const _state_0 = $1;
      if (_s_0 === "") {
        return $$$$047$$$047ai$047bend$047wire_json$number_end$(_state_0);
      } else {
        const _ch_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        $0 = _rest_0;
        $1 = ($$$$047$$$047ai$047bend$047wire_json$number_state$(_state_0, _ch_0));
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$primitive$(_ok_0, _raw_0) {
  if (_ok_0) {
    return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Number", "text": _raw_0}}};
  } else {
    return {$: "Fail", "error": "invalid JSON literal"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$literal_known$(_is_null_0, _is_true_0, _is_false_0, _raw_0) {
  if (_is_null_0) {
    if (_is_true_0) {
      if (_is_false_0) {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Null"}}};
      } else {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Null"}}};
      }
    } else {
      if (_is_false_0) {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Null"}}};
      } else {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Null"}}};
      }
    }
  } else {
    if (_is_true_0) {
      if (_is_false_0) {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Boolean", "value": true}}};
      } else {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Boolean", "value": true}}};
      }
    } else {
      if (_is_false_0) {
        return {$: "Done", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Boolean", "value": false}}};
      } else {
        return $$$$047$$$047ai$047bend$047wire_json$primitive$(($$$$047$$$047ai$047bend$047wire_json$number_valid$(_raw_0, {$: "../../ai/bend/wire_json.Start"})), _raw_0);
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$literal$(_raw_0) {
  return $$$$047$$$047ai$047bend$047wire_json$literal_known$(($String$eq$(_raw_0, "null")), ($String$eq$(_raw_0, "true")), ($String$eq$(_raw_0, "false")), _raw_0);
}

function $$$$047$$$047ai$047bend$047wire_json$delimiter$(_c_0) {
  const _x_0 = ($Char$is_eq$(_c_0, " "));
  const _x_1 = ($Char$is_eq$(_c_0, "\n"));
  const _x_2 = (_x_0 || _x_1);
  const _x_3 = ($Char$is_eq$(_c_0, "\r"));
  const _x_4 = (_x_2 || _x_3);
  const _x_5 = ($Char$is_eq$(_c_0, "\t"));
  const _x_6 = (_x_4 || _x_5);
  const _x_7 = ($Char$is_eq$(_c_0, ","));
  const _x_8 = (_x_6 || _x_7);
  const _x_9 = ($Char$is_eq$(_c_0, "]"));
  const _x_10 = (_x_8 || _x_9);
  const _x_11 = ($Char$is_eq$(_c_0, "}"));
  return (_x_10 || _x_11);
}

function $$$$047$$$047ai$047bend$047wire_json$word_step$(_stop_0, _c_0, _rest_0, _acc_0, _next_0) {
  if (_stop_0) {
    return {$: "Tuple", "fst": ($String$reverse$(_acc_0)), "snd": (_c_0 + _rest_0)};
  } else {
    return run_tail(_next_0(_rest_0), (_c_0 + _acc_0));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$word$(_s_0, _acc_0) {
  if (_s_0 === "") {
    return {$: "Tuple", "fst": ($String$reverse$(_acc_0)), "snd": ""};
  } else {
    const _c_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
    return $$$$047$$$047ai$047bend$047wire_json$word_step$(($$$$047$$$047ai$047bend$047wire_json$delimiter$(_c_0)), _c_0, _rest_0, _acc_0, run_clo((_x_0) => {
  return run_clo((_x_1) => {
  return $$$$047$$$047ai$047bend$047wire_json$word$(_rest_0, _x_1);
});
}));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$lex_string$(_result_0, _next_0) {
  if (_result_0.$ === "Fail") {
    const _e_0 = _result_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _t_0 = _result_0["value"];
    const _s_0 = _t_0["fst"];
    const _rest_0 = _t_0["snd"];
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.Atom", "value": {$: "../../ai/bend/wire_json.Text", "value": _s_0}}});
  }
}

function $$$$047$$$047ai$047bend$047wire_json$lex_word$(_pair_0, _next_0) {
  const _raw_0 = _pair_0["fst"];
  const _rest_0 = _pair_0["snd"];
  return $Result$bind$(($$$$047$$$047ai$047bend$047wire_json$literal$(_raw_0)), run_clo((_x_0) => {
  return run_tail(_next_0(_rest_0), {$: "Some", "value": _x_0});
}));
}

function $$$$047$$$047ai$047bend$047wire_json$select_lex$(_ok_0, _yes_0, _no_0) {
  if (_ok_0) {
    return _yes_0;
  } else {
    return _no_0;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$lex_kind$(_c_0) {
  const _x_0 = ($Char$is_eq$(_c_0, " "));
  const _x_1 = ($Char$is_eq$(_c_0, "\n"));
  const _x_2 = (_x_0 || _x_1);
  const _x_3 = ($Char$is_eq$(_c_0, "\r"));
  const _x_4 = (_x_2 || _x_3);
  const _x_5 = ($Char$is_eq$(_c_0, "\t"));
  return $$$$047$$$047ai$047bend$047wire_json$select_lex$((_x_4 || _x_5), {$: "../../ai/bend/wire_json.Space"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, "[")), {$: "../../ai/bend/wire_json.LArray"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, "]")), {$: "../../ai/bend/wire_json.RArray"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, "{")), {$: "../../ai/bend/wire_json.LObject"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, "}")), {$: "../../ai/bend/wire_json.RObject"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, ":")), {$: "../../ai/bend/wire_json.LColon"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, ",")), {$: "../../ai/bend/wire_json.LComma"}, ($$$$047$$$047ai$047bend$047wire_json$select_lex$(($Char$is_eq$(_c_0, "\"")), {$: "../../ai/bend/wire_json.Quote"}, {$: "../../ai/bend/wire_json.Other"})))))))))))))));
}

function $$$$047$$$047ai$047bend$047wire_json$lex_step$(_kind_0, _c_0, _rest_0, _next_0) {
  if (_kind_0.$ === "../../ai/bend/wire_json.Space") {
    return run_tail(_next_0(_rest_0), {$: "None"});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.LArray") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.OpenArray"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.RArray") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.CloseArray"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.LObject") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.OpenObject"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.RObject") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.CloseObject"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.LColon") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.Colon"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.LComma") {
    return run_tail(_next_0(_rest_0), {$: "Some", "value": {$: "../../ai/bend/wire_json.Comma"}});
  } else if (_kind_0.$ === "../../ai/bend/wire_json.Quote") {
    return $$$$047$$$047ai$047bend$047wire_json$lex_string$(run_loop($$$$047$$$047ai$047bend$047wire_json$string_read$(nat_chk([..._rest_0].length + 1), _rest_0, "")), _next_0);
  } else {
    return $$$$047$$$047ai$047bend$047wire_json$lex_word$(run_loop($$$$047$$$047ai$047bend$047wire_json$word$((_c_0 + _rest_0), "")), _next_0);
  }
}

function $$$$047$$$047ai$047bend$047wire_json$lex_acc$(_token_0, _acc_0) {
  if (_token_0.$ === "None") {
    return _acc_0;
  } else {
    const _t_0 = _token_0["value"];
    return {$: "Con", "head": _t_0, "tail": _acc_0};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$lex$(_fuel_0, _s_0, _acc_0) {
  if (_fuel_0 === 0) {
    return {$: "Fail", "error": "JSON token limit"};
  } else {
    const _n_0 = (_fuel_0 - 1);
    if (_s_0 === "") {
      return {$: "Done", "value": ($List$reverse$(_acc_0))};
    } else {
      const _c_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
      const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return $$$$047$$$047ai$047bend$047wire_json$lex_step$(($$$$047$$$047ai$047bend$047wire_json$lex_kind$(_c_0)), _c_0, _rest_0, run_clo((_x_0) => {
  return run_clo((_x_1) => {
  return $$$$047$$$047ai$047bend$047wire_json$lex$(_n_0, _x_0, ($$$$047$$$047ai$047bend$047wire_json$lex_acc$(_x_1, _acc_0)));
});
}));
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$array_end$(_ok_0, _acc_0, _rest_0) {
  if (_ok_0) {
    return {$: "../../ai/bend/wire_json.Parsed", "value": {$: "../../ai/bend/wire_json.Array", "items": ($List$reverse$(_acc_0))}, "rest": _rest_0};
  } else {
    return {$: "../../ai/bend/wire_json.Invalid", "message": "trailing array comma"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$object_end$(_ok_0, _acc_0, _rest_0) {
  if (_ok_0) {
    return {$: "../../ai/bend/wire_json.Parsed", "value": {$: "../../ai/bend/wire_json.Object", "fields": ($List$reverse$(_acc_0))}, "rest": _rest_0};
  } else {
    return {$: "../../ai/bend/wire_json.Invalid", "message": "trailing object comma"};
  }
}

function $$$$047$$$047ai$047bend$047wire_json$array_after$(_result_0, _acc_0, _next_0) {
  if (_result_0.$ === "../../ai/bend/wire_json.Invalid") {
    const _e_0 = _result_0["message"];
    return {$: "../../ai/bend/wire_json.Invalid", "message": _e_0};
  } else {
    const _value_0 = _result_0["value"];
    const _t_0 = _result_0["rest"];
    if (_t_0.$ === "Con") {
      const _t_1 = _t_0["head"];
      if (_t_1.$ === "../../ai/bend/wire_json.Comma") {
        const _rest_0 = _t_0["tail"];
        return run_tail(_next_0({$: "../../ai/bend/wire_json.Elements", "acc": {$: "Con", "head": _value_0, "tail": _acc_0}, "empty": false}), _rest_0);
      } else if (_t_1.$ === "../../ai/bend/wire_json.CloseArray") {
        const _rest_1 = _t_0["tail"];
        return $$$$047$$$047ai$047bend$047wire_json$array_end$(true, {$: "Con", "head": _value_0, "tail": _acc_0}, _rest_1);
      } else {
        return {$: "../../ai/bend/wire_json.Invalid", "message": "expected array comma or closing bracket"};
      }
    } else {
      return {$: "../../ai/bend/wire_json.Invalid", "message": "expected array comma or closing bracket"};
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$object_after$(_result_0, _key_0, _acc_0, _next_0) {
  if (_result_0.$ === "../../ai/bend/wire_json.Invalid") {
    const _e_0 = _result_0["message"];
    return {$: "../../ai/bend/wire_json.Invalid", "message": _e_0};
  } else {
    const _value_0 = _result_0["value"];
    const _t_0 = _result_0["rest"];
    if (_t_0.$ === "Con") {
      const _t_1 = _t_0["head"];
      if (_t_1.$ === "../../ai/bend/wire_json.Comma") {
        const _rest_0 = _t_0["tail"];
        return run_tail(_next_0({$: "../../ai/bend/wire_json.Fields", "acc": {$: "Con", "head": {$: "../../ai/bend/wire_json.Field", "key": _key_0, "value": _value_0}, "tail": _acc_0}, "empty": false}), _rest_0);
      } else if (_t_1.$ === "../../ai/bend/wire_json.CloseObject") {
        const _rest_1 = _t_0["tail"];
        return $$$$047$$$047ai$047bend$047wire_json$object_end$(true, {$: "Con", "head": {$: "../../ai/bend/wire_json.Field", "key": _key_0, "value": _value_0}, "tail": _acc_0}, _rest_1);
      } else {
        return {$: "../../ai/bend/wire_json.Invalid", "message": "expected object comma or closing brace"};
      }
    } else {
      return {$: "../../ai/bend/wire_json.Invalid", "message": "expected object comma or closing brace"};
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$parse$($0, $1, $2) {
  for (;;) {
    {
      const _fuel_0 = $0;
      const _mode_0 = $1;
      const _tokens_0 = $2;
      if (_fuel_0 === 0) {
        return {$: "../../ai/bend/wire_json.Invalid", "message": "JSON nesting or token limit"};
      } else {
        const _n_0 = (_fuel_0 - 1);
        if (_mode_0.$ === "../../ai/bend/wire_json.Value") {
          if (_tokens_0.$ === "Con") {
            const _t_0 = _tokens_0["head"];
            if (_t_0.$ === "../../ai/bend/wire_json.Atom") {
              const _value_0 = _t_0["value"];
              const _rest_0 = _tokens_0["tail"];
              return {$: "../../ai/bend/wire_json.Parsed", "value": _value_0, "rest": _rest_0};
            } else if (_t_0.$ === "../../ai/bend/wire_json.OpenArray") {
              const _rest_1 = _tokens_0["tail"];
              $0 = _n_0;
              $1 = {$: "../../ai/bend/wire_json.Elements", "acc": {$: "Nil"}, "empty": true};
              $2 = _rest_1;
              continue;
            } else if (_t_0.$ === "../../ai/bend/wire_json.OpenObject") {
              const _rest_2 = _tokens_0["tail"];
              $0 = _n_0;
              $1 = {$: "../../ai/bend/wire_json.Fields", "acc": {$: "Nil"}, "empty": true};
              $2 = _rest_2;
              continue;
            } else {
              return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
            }
          } else {
            return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
          }
        } else if (_mode_0.$ === "../../ai/bend/wire_json.Elements") {
          const _acc_0 = _mode_0["acc"];
          const _empty_0 = _mode_0["empty"];
          if (_tokens_0.$ === "Con") {
            const _t_1 = _tokens_0["head"];
            if (_t_1.$ === "../../ai/bend/wire_json.CloseArray") {
              const _rest_4 = _tokens_0["tail"];
              return $$$$047$$$047ai$047bend$047wire_json$array_end$(_empty_0, _acc_0, _rest_4);
            } else {
              const _rest_5 = _tokens_0["tail"];
              return $$$$047$$$047ai$047bend$047wire_json$array_after$(run_loop($$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, {$: "../../ai/bend/wire_json.Value"}, {$: "Con", "head": _t_1, "tail": _rest_5})), _acc_0, run_clo((_x_0) => {
  return run_clo((_x_1) => {
  return $$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, _x_0, _x_1);
});
}));
            }
          } else {
            return $$$$047$$$047ai$047bend$047wire_json$array_after$(run_loop($$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, {$: "../../ai/bend/wire_json.Value"}, _tokens_0)), _acc_0, run_clo((_x_2) => {
  return run_clo((_x_3) => {
  return $$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, _x_2, _x_3);
});
}));
          }
        } else {
          const _acc_1 = _mode_0["acc"];
          const _empty_1 = _mode_0["empty"];
          if (_tokens_0.$ === "Con") {
            const _t_2 = _tokens_0["head"];
            if (_t_2.$ === "../../ai/bend/wire_json.CloseObject") {
              const _rest_6 = _tokens_0["tail"];
              return $$$$047$$$047ai$047bend$047wire_json$object_end$(_empty_1, _acc_1, _rest_6);
            } else if (_t_2.$ === "../../ai/bend/wire_json.Atom") {
              const _t_3 = _t_2["value"];
              if (_t_3.$ === "../../ai/bend/wire_json.Text") {
                const _key_0 = _t_3["value"];
                const _t_4 = _tokens_0["tail"];
                if (_t_4.$ === "Con") {
                  const _t_5 = _t_4["head"];
                  if (_t_5.$ === "../../ai/bend/wire_json.Colon") {
                    const _rest_7 = _t_4["tail"];
                    return $$$$047$$$047ai$047bend$047wire_json$object_after$(run_loop($$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, {$: "../../ai/bend/wire_json.Value"}, _rest_7)), _key_0, _acc_1, run_clo((_x_4) => {
  return run_clo((_x_5) => {
  return $$$$047$$$047ai$047bend$047wire_json$parse$(_n_0, _x_4, _x_5);
});
}));
                  } else {
                    return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
                  }
                } else {
                  return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
                }
              } else {
                return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
              }
            } else {
              return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
            }
          } else {
            return {$: "../../ai/bend/wire_json.Invalid", "message": "expected JSON value or object key"};
          }
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$finish$(_result_0) {
  if (_result_0.$ === "../../ai/bend/wire_json.Invalid") {
    const _e_0 = _result_0["message"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _value_0 = _result_0["value"];
    const _t_0 = _result_0["rest"];
    if (_t_0.$ === "Nil") {
      return {$: "Done", "value": _value_0};
    } else {
      return {$: "Fail", "error": "trailing JSON tokens"};
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$depth_guard$(_ok_0, _depth_0, _next_0) {
  if (_ok_0) {
    return run_tail(_next_0, _depth_0);
  } else {
    return false;
  }
}

function $$$$047$$$047ai$047bend$047wire_json$depth_step$(_token_0, _depth_0, _next_0) {
  if (_token_0.$ === "../../ai/bend/wire_json.OpenArray") {
    return $$$$047$$$047ai$047bend$047wire_json$depth_guard$((_depth_0 < 64), ((_depth_0 + 1) >>> 0), _next_0);
  } else if (_token_0.$ === "../../ai/bend/wire_json.OpenObject") {
    return $$$$047$$$047ai$047bend$047wire_json$depth_guard$((_depth_0 < 64), ((_depth_0 + 1) >>> 0), _next_0);
  } else if (_token_0.$ === "../../ai/bend/wire_json.CloseArray") {
    return $$$$047$$$047ai$047bend$047wire_json$depth_guard$((_depth_0 > 0), ((_depth_0 - 1) >>> 0), _next_0);
  } else if (_token_0.$ === "../../ai/bend/wire_json.CloseObject") {
    return $$$$047$$$047ai$047bend$047wire_json$depth_guard$((_depth_0 > 0), ((_depth_0 - 1) >>> 0), _next_0);
  } else {
    return run_tail(_next_0, _depth_0);
  }
}

function $$$$047$$$047ai$047bend$047wire_json$depth_valid$(_tokens_0, _depth_0) {
  if (_tokens_0.$ === "Nil") {
    return (_depth_0 === 0);
  } else {
    const _token_0 = _tokens_0["head"];
    const _rest_0 = _tokens_0["tail"];
    return $$$$047$$$047ai$047bend$047wire_json$depth_step$(_token_0, _depth_0, run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047wire_json$depth_valid$(_rest_0, _x_0);
}));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$token_count$($0, $1) {
  for (;;) {
    {
      const _tokens_0 = $0;
      const _count_0 = $1;
      if (_tokens_0.$ === "Nil") {
        return _count_0;
      } else {
        const _rest_0 = _tokens_0["tail"];
        $0 = _rest_0;
        $1 = ((_count_0 + 1) >>> 0);
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047wire_json$parse_checked$(_ok_0, _count_0, _tokens_0) {
  if (!_ok_0) {
    return {$: "Fail", "error": "JSON exceeds 64 nesting levels or 65536 tokens, or has unmatched brackets"};
  } else {
    return $$$$047$$$047ai$047bend$047wire_json$finish$(run_loop($$$$047$$$047ai$047bend$047wire_json$parse$(nat_chk(_count_0 + 1), {$: "../../ai/bend/wire_json.Value"}, _tokens_0)));
  }
}

function $$$$047$$$047ai$047bend$047wire_json$parse_tokens$(_tokens_0) {
  const _count_0 = ($$$$047$$$047ai$047bend$047wire_json$token_count$(_tokens_0, 0));
  return $$$$047$$$047ai$047bend$047wire_json$parse_checked$(($Bool$and$(run_loop($$$$047$$$047ai$047bend$047wire_json$depth_valid$(_tokens_0, 0)), (_count_0 <= 65536))), _count_0, _tokens_0);
}

function $$$$047$$$047ai$047bend$047wire_json$read$(_s_0) {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047wire_json$lex$(nat_chk([..._s_0].length + 1), _s_0, {$: "Nil"})), run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047wire_json$parse_tokens$(_x_0);
}));
}

function $$$$047$$$047ai$047bend$047codecs$protocol_error$() {
  return {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""};
}

function $$$$047$$$047ai$047bend$047codecs$string$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _text_0 = _t_0["value"];
      return {$: "Done", "value": _text_0};
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$u32_read$(_value_0) {
  if (_value_0.$ === "Some") {
    const _n_0 = _value_0["value"];
    return {$: "Done", "value": _n_0};
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$u32$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Number") {
      const _text_0 = _t_0["text"];
      return $$$$047$$$047ai$047bend$047codecs$u32_read$(($U32$read$(_text_0)));
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$usage_fields$(_input_0, _output_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$u32$(_input_0)), run_clo((_x_0) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$u32$(_output_0)), run_clo((_x_1) => {
  return {$: "Done", "value": {$: "../../ai/bend/codecs.UsageEvent", "usage": {$: "../../ai/bend/codecs.Usage", "input_tokens": _x_0, "output_tokens": _x_1}}};
}));
}));
}

function $$$$047$$$047ai$047bend$047codecs$finish_reason$(_text_0) {
  if (_text_0 !== "") {
    const _t_0 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(0, 2) : _text_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 115) {
      const _t_2 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(2) : _text_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 116) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 111) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 112) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 === "") {
                    return {$: "../../ai/bend/codecs.Stop"};
                  } else {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 95) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 115) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 101) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 113) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 117) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 101) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 110) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 99) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 101) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 === "") {
                                                        return {$: "../../ai/bend/codecs.Stop"};
                                                      } else {
                                                        return {$: "../../ai/bend/codecs.Other"};
                                                      }
                                                    } else {
                                                      return {$: "../../ai/bend/codecs.Other"};
                                                    }
                                                  } else {
                                                    return {$: "../../ai/bend/codecs.Other"};
                                                  }
                                                } else {
                                                  return {$: "../../ai/bend/codecs.Other"};
                                                }
                                              } else {
                                                return {$: "../../ai/bend/codecs.Other"};
                                              }
                                            } else {
                                              return {$: "../../ai/bend/codecs.Other"};
                                            }
                                          } else {
                                            return {$: "../../ai/bend/codecs.Other"};
                                          }
                                        } else {
                                          return {$: "../../ai/bend/codecs.Other"};
                                        }
                                      } else {
                                        return {$: "../../ai/bend/codecs.Other"};
                                      }
                                    } else {
                                      return {$: "../../ai/bend/codecs.Other"};
                                    }
                                  } else {
                                    return {$: "../../ai/bend/codecs.Other"};
                                  }
                                } else {
                                  return {$: "../../ai/bend/codecs.Other"};
                                }
                              } else {
                                return {$: "../../ai/bend/codecs.Other"};
                              }
                            } else {
                              return {$: "../../ai/bend/codecs.Other"};
                            }
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else {
                          return {$: "../../ai/bend/codecs.Other"};
                        }
                      } else {
                        return {$: "../../ai/bend/codecs.Other"};
                      }
                    } else {
                      return {$: "../../ai/bend/codecs.Other"};
                    }
                  }
                } else {
                  return {$: "../../ai/bend/codecs.Other"};
                }
              } else {
                return {$: "../../ai/bend/codecs.Other"};
              }
            } else {
              return {$: "../../ai/bend/codecs.Other"};
            }
          } else {
            return {$: "../../ai/bend/codecs.Other"};
          }
        } else {
          return {$: "../../ai/bend/codecs.Other"};
        }
      } else {
        return {$: "../../ai/bend/codecs.Other"};
      }
    } else if ((_t_1 & 3) == 3) {
      return {$: "../../ai/bend/codecs.Other"};
    } else if (_t_1 == 101) {
      const _t_39 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(2) : _text_0.slice(1));
      if (_t_39 !== "") {
        const _t_40 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(0, 2) : _t_39[0]);
        const _t_41 = _t_40.codePointAt(0);
        if (_t_41 == 110) {
          const _t_42 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(2) : _t_39.slice(1));
          if (_t_42 !== "") {
            const _t_43 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(0, 2) : _t_42[0]);
            const _t_44 = _t_43.codePointAt(0);
            if (_t_44 == 100) {
              const _t_45 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(2) : _t_42.slice(1));
              if (_t_45 !== "") {
                const _t_46 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(0, 2) : _t_45[0]);
                const _t_47 = _t_46.codePointAt(0);
                if (_t_47 == 95) {
                  const _t_48 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(2) : _t_45.slice(1));
                  if (_t_48 !== "") {
                    const _t_49 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(0, 2) : _t_48[0]);
                    const _t_50 = _t_49.codePointAt(0);
                    if (_t_50 == 116) {
                      const _t_51 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(2) : _t_48.slice(1));
                      if (_t_51 !== "") {
                        const _t_52 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(0, 2) : _t_51[0]);
                        const _t_53 = _t_52.codePointAt(0);
                        if (_t_53 == 117) {
                          const _t_54 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(2) : _t_51.slice(1));
                          if (_t_54 !== "") {
                            const _t_55 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(0, 2) : _t_54[0]);
                            const _t_56 = _t_55.codePointAt(0);
                            if (_t_56 == 114) {
                              const _t_57 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(2) : _t_54.slice(1));
                              if (_t_57 !== "") {
                                const _t_58 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(0, 2) : _t_57[0]);
                                const _t_59 = _t_58.codePointAt(0);
                                if (_t_59 == 110) {
                                  const _t_60 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(2) : _t_57.slice(1));
                                  if (_t_60 === "") {
                                    return {$: "../../ai/bend/codecs.Stop"};
                                  } else {
                                    return {$: "../../ai/bend/codecs.Other"};
                                  }
                                } else {
                                  return {$: "../../ai/bend/codecs.Other"};
                                }
                              } else {
                                return {$: "../../ai/bend/codecs.Other"};
                              }
                            } else {
                              return {$: "../../ai/bend/codecs.Other"};
                            }
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else {
                          return {$: "../../ai/bend/codecs.Other"};
                        }
                      } else {
                        return {$: "../../ai/bend/codecs.Other"};
                      }
                    } else {
                      return {$: "../../ai/bend/codecs.Other"};
                    }
                  } else {
                    return {$: "../../ai/bend/codecs.Other"};
                  }
                } else {
                  return {$: "../../ai/bend/codecs.Other"};
                }
              } else {
                return {$: "../../ai/bend/codecs.Other"};
              }
            } else {
              return {$: "../../ai/bend/codecs.Other"};
            }
          } else {
            return {$: "../../ai/bend/codecs.Other"};
          }
        } else {
          return {$: "../../ai/bend/codecs.Other"};
        }
      } else {
        return {$: "../../ai/bend/codecs.Other"};
      }
    } else if (_t_1 == 109) {
      const _t_61 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(2) : _text_0.slice(1));
      if (_t_61 !== "") {
        const _t_62 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(0, 2) : _t_61[0]);
        const _t_63 = _t_62.codePointAt(0);
        if (_t_63 == 97) {
          const _t_64 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(2) : _t_61.slice(1));
          if (_t_64 !== "") {
            const _t_65 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(0, 2) : _t_64[0]);
            const _t_66 = _t_65.codePointAt(0);
            if (_t_66 == 120) {
              const _t_67 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(2) : _t_64.slice(1));
              if (_t_67 !== "") {
                const _t_68 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(0, 2) : _t_67[0]);
                const _t_69 = _t_68.codePointAt(0);
                if (_t_69 == 95) {
                  const _t_70 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(2) : _t_67.slice(1));
                  if (_t_70 !== "") {
                    const _t_71 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(0, 2) : _t_70[0]);
                    const _t_72 = _t_71.codePointAt(0);
                    if (_t_72 == 116) {
                      const _t_73 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(2) : _t_70.slice(1));
                      if (_t_73 !== "") {
                        const _t_74 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(0, 2) : _t_73[0]);
                        const _t_75 = _t_74.codePointAt(0);
                        if (_t_75 == 111) {
                          const _t_76 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(2) : _t_73.slice(1));
                          if (_t_76 !== "") {
                            const _t_77 = (_t_76.codePointAt(0) > 0xFFFF ? _t_76.slice(0, 2) : _t_76[0]);
                            const _t_78 = _t_77.codePointAt(0);
                            if (_t_78 == 107) {
                              const _t_79 = (_t_76.codePointAt(0) > 0xFFFF ? _t_76.slice(2) : _t_76.slice(1));
                              if (_t_79 !== "") {
                                const _t_80 = (_t_79.codePointAt(0) > 0xFFFF ? _t_79.slice(0, 2) : _t_79[0]);
                                const _t_81 = _t_80.codePointAt(0);
                                if (_t_81 == 101) {
                                  const _t_82 = (_t_79.codePointAt(0) > 0xFFFF ? _t_79.slice(2) : _t_79.slice(1));
                                  if (_t_82 !== "") {
                                    const _t_83 = (_t_82.codePointAt(0) > 0xFFFF ? _t_82.slice(0, 2) : _t_82[0]);
                                    const _t_84 = _t_83.codePointAt(0);
                                    if (_t_84 == 110) {
                                      const _t_85 = (_t_82.codePointAt(0) > 0xFFFF ? _t_82.slice(2) : _t_82.slice(1));
                                      if (_t_85 !== "") {
                                        const _t_86 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(0, 2) : _t_85[0]);
                                        const _t_87 = _t_86.codePointAt(0);
                                        if (_t_87 == 115) {
                                          const _t_88 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(2) : _t_85.slice(1));
                                          if (_t_88 === "") {
                                            return {$: "../../ai/bend/codecs.Length"};
                                          } else {
                                            return {$: "../../ai/bend/codecs.Other"};
                                          }
                                        } else {
                                          return {$: "../../ai/bend/codecs.Other"};
                                        }
                                      } else {
                                        return {$: "../../ai/bend/codecs.Other"};
                                      }
                                    } else {
                                      return {$: "../../ai/bend/codecs.Other"};
                                    }
                                  } else {
                                    return {$: "../../ai/bend/codecs.Other"};
                                  }
                                } else {
                                  return {$: "../../ai/bend/codecs.Other"};
                                }
                              } else {
                                return {$: "../../ai/bend/codecs.Other"};
                              }
                            } else {
                              return {$: "../../ai/bend/codecs.Other"};
                            }
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else {
                          return {$: "../../ai/bend/codecs.Other"};
                        }
                      } else {
                        return {$: "../../ai/bend/codecs.Other"};
                      }
                    } else {
                      return {$: "../../ai/bend/codecs.Other"};
                    }
                  } else {
                    return {$: "../../ai/bend/codecs.Other"};
                  }
                } else {
                  return {$: "../../ai/bend/codecs.Other"};
                }
              } else {
                return {$: "../../ai/bend/codecs.Other"};
              }
            } else {
              return {$: "../../ai/bend/codecs.Other"};
            }
          } else {
            return {$: "../../ai/bend/codecs.Other"};
          }
        } else {
          return {$: "../../ai/bend/codecs.Other"};
        }
      } else {
        return {$: "../../ai/bend/codecs.Other"};
      }
    } else if ((_t_1 & 3) == 1) {
      return {$: "../../ai/bend/codecs.Other"};
    } else if (_t_1 == 108) {
      const _t_89 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(2) : _text_0.slice(1));
      if (_t_89 !== "") {
        const _t_90 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(0, 2) : _t_89[0]);
        const _t_91 = _t_90.codePointAt(0);
        if (_t_91 == 101) {
          const _t_92 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(2) : _t_89.slice(1));
          if (_t_92 !== "") {
            const _t_93 = (_t_92.codePointAt(0) > 0xFFFF ? _t_92.slice(0, 2) : _t_92[0]);
            const _t_94 = _t_93.codePointAt(0);
            if (_t_94 == 110) {
              const _t_95 = (_t_92.codePointAt(0) > 0xFFFF ? _t_92.slice(2) : _t_92.slice(1));
              if (_t_95 !== "") {
                const _t_96 = (_t_95.codePointAt(0) > 0xFFFF ? _t_95.slice(0, 2) : _t_95[0]);
                const _t_97 = _t_96.codePointAt(0);
                if (_t_97 == 103) {
                  const _t_98 = (_t_95.codePointAt(0) > 0xFFFF ? _t_95.slice(2) : _t_95.slice(1));
                  if (_t_98 !== "") {
                    const _t_99 = (_t_98.codePointAt(0) > 0xFFFF ? _t_98.slice(0, 2) : _t_98[0]);
                    const _t_100 = _t_99.codePointAt(0);
                    if (_t_100 == 116) {
                      const _t_101 = (_t_98.codePointAt(0) > 0xFFFF ? _t_98.slice(2) : _t_98.slice(1));
                      if (_t_101 !== "") {
                        const _t_102 = (_t_101.codePointAt(0) > 0xFFFF ? _t_101.slice(0, 2) : _t_101[0]);
                        const _t_103 = _t_102.codePointAt(0);
                        if (_t_103 == 104) {
                          const _t_104 = (_t_101.codePointAt(0) > 0xFFFF ? _t_101.slice(2) : _t_101.slice(1));
                          if (_t_104 === "") {
                            return {$: "../../ai/bend/codecs.Length"};
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else {
                          return {$: "../../ai/bend/codecs.Other"};
                        }
                      } else {
                        return {$: "../../ai/bend/codecs.Other"};
                      }
                    } else {
                      return {$: "../../ai/bend/codecs.Other"};
                    }
                  } else {
                    return {$: "../../ai/bend/codecs.Other"};
                  }
                } else {
                  return {$: "../../ai/bend/codecs.Other"};
                }
              } else {
                return {$: "../../ai/bend/codecs.Other"};
              }
            } else {
              return {$: "../../ai/bend/codecs.Other"};
            }
          } else {
            return {$: "../../ai/bend/codecs.Other"};
          }
        } else {
          return {$: "../../ai/bend/codecs.Other"};
        }
      } else {
        return {$: "../../ai/bend/codecs.Other"};
      }
    } else if (_t_1 == 116) {
      const _t_105 = (_text_0.codePointAt(0) > 0xFFFF ? _text_0.slice(2) : _text_0.slice(1));
      if (_t_105 !== "") {
        const _t_106 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(0, 2) : _t_105[0]);
        const _t_107 = _t_106.codePointAt(0);
        if (_t_107 == 111) {
          const _t_108 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(2) : _t_105.slice(1));
          if (_t_108 !== "") {
            const _t_109 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(0, 2) : _t_108[0]);
            const _t_110 = _t_109.codePointAt(0);
            if (_t_110 == 111) {
              const _t_111 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(2) : _t_108.slice(1));
              if (_t_111 !== "") {
                const _t_112 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(0, 2) : _t_111[0]);
                const _t_113 = _t_112.codePointAt(0);
                if (_t_113 == 108) {
                  const _t_114 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(2) : _t_111.slice(1));
                  if (_t_114 !== "") {
                    const _t_115 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(0, 2) : _t_114[0]);
                    const _t_116 = _t_115.codePointAt(0);
                    if (_t_116 == 95) {
                      const _t_117 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(2) : _t_114.slice(1));
                      if (_t_117 !== "") {
                        const _t_118 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(0, 2) : _t_117[0]);
                        const _t_119 = _t_118.codePointAt(0);
                        if (_t_119 == 99) {
                          const _t_120 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(2) : _t_117.slice(1));
                          if (_t_120 !== "") {
                            const _t_121 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(0, 2) : _t_120[0]);
                            const _t_122 = _t_121.codePointAt(0);
                            if (_t_122 == 97) {
                              const _t_123 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(2) : _t_120.slice(1));
                              if (_t_123 !== "") {
                                const _t_124 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(0, 2) : _t_123[0]);
                                const _t_125 = _t_124.codePointAt(0);
                                if (_t_125 == 108) {
                                  const _t_126 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(2) : _t_123.slice(1));
                                  if (_t_126 !== "") {
                                    const _t_127 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(0, 2) : _t_126[0]);
                                    const _t_128 = _t_127.codePointAt(0);
                                    if (_t_128 == 108) {
                                      const _t_129 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(2) : _t_126.slice(1));
                                      if (_t_129 !== "") {
                                        const _t_130 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(0, 2) : _t_129[0]);
                                        const _t_131 = _t_130.codePointAt(0);
                                        if (_t_131 == 115) {
                                          const _t_132 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(2) : _t_129.slice(1));
                                          if (_t_132 === "") {
                                            return {$: "../../ai/bend/codecs.ToolCalls"};
                                          } else {
                                            return {$: "../../ai/bend/codecs.Other"};
                                          }
                                        } else {
                                          return {$: "../../ai/bend/codecs.Other"};
                                        }
                                      } else {
                                        return {$: "../../ai/bend/codecs.Other"};
                                      }
                                    } else {
                                      return {$: "../../ai/bend/codecs.Other"};
                                    }
                                  } else {
                                    return {$: "../../ai/bend/codecs.Other"};
                                  }
                                } else {
                                  return {$: "../../ai/bend/codecs.Other"};
                                }
                              } else {
                                return {$: "../../ai/bend/codecs.Other"};
                              }
                            } else {
                              return {$: "../../ai/bend/codecs.Other"};
                            }
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else if (_t_119 == 117) {
                          const _t_133 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(2) : _t_117.slice(1));
                          if (_t_133 !== "") {
                            const _t_134 = (_t_133.codePointAt(0) > 0xFFFF ? _t_133.slice(0, 2) : _t_133[0]);
                            const _t_135 = _t_134.codePointAt(0);
                            if (_t_135 == 115) {
                              const _t_136 = (_t_133.codePointAt(0) > 0xFFFF ? _t_133.slice(2) : _t_133.slice(1));
                              if (_t_136 !== "") {
                                const _t_137 = (_t_136.codePointAt(0) > 0xFFFF ? _t_136.slice(0, 2) : _t_136[0]);
                                const _t_138 = _t_137.codePointAt(0);
                                if (_t_138 == 101) {
                                  const _t_139 = (_t_136.codePointAt(0) > 0xFFFF ? _t_136.slice(2) : _t_136.slice(1));
                                  if (_t_139 === "") {
                                    return {$: "../../ai/bend/codecs.ToolCalls"};
                                  } else {
                                    return {$: "../../ai/bend/codecs.Other"};
                                  }
                                } else {
                                  return {$: "../../ai/bend/codecs.Other"};
                                }
                              } else {
                                return {$: "../../ai/bend/codecs.Other"};
                              }
                            } else {
                              return {$: "../../ai/bend/codecs.Other"};
                            }
                          } else {
                            return {$: "../../ai/bend/codecs.Other"};
                          }
                        } else {
                          return {$: "../../ai/bend/codecs.Other"};
                        }
                      } else {
                        return {$: "../../ai/bend/codecs.Other"};
                      }
                    } else {
                      return {$: "../../ai/bend/codecs.Other"};
                    }
                  } else {
                    return {$: "../../ai/bend/codecs.Other"};
                  }
                } else {
                  return {$: "../../ai/bend/codecs.Other"};
                }
              } else {
                return {$: "../../ai/bend/codecs.Other"};
              }
            } else {
              return {$: "../../ai/bend/codecs.Other"};
            }
          } else {
            return {$: "../../ai/bend/codecs.Other"};
          }
        } else {
          return {$: "../../ai/bend/codecs.Other"};
        }
      } else {
        return {$: "../../ai/bend/codecs.Other"};
      }
    } else {
      return {$: "../../ai/bend/codecs.Other"};
    }
  } else {
    return {$: "../../ai/bend/codecs.Other"};
  }
}

function $$$$047$$$047ai$047bend$047codecs$finish$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _text_0 = _t_0["value"];
      return {$: "Done", "value": {$: "../../ai/bend/codecs.Finished", "reason": ($$$$047$$$047ai$047bend$047codecs$finish_reason$(_text_0))}};
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$delta$(_value_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$string$(_value_0)), run_clo((_x_0) => {
  return {$: "Done", "value": {$: "../../ai/bend/codecs.Delta", "text": _x_0}};
}));
}

function $$$$047$$$047ai$047bend$047codecs$router_delta$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _text_0 = _t_0["value"];
      return {$: "Done", "value": {$: "../../ai/bend/codecs.Delta", "text": _text_0}};
    } else if (_t_0.$ === "../../ai/bend/wire_json.Null") {
      return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_tools$(_value_0, _content_0) {
  if (_value_0.$ === "None") {
    return $$$$047$$$047ai$047bend$047codecs$router_delta$(_content_0);
  } else {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Array") {
      const _t_1 = _t_0["items"];
      if (_t_1.$ === "Nil") {
        return $$$$047$$$047ai$047bend$047codecs$router_delta$(_content_0);
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_choice_delta$(_value_0) {
  if (_value_0.$ === "Some") {
    const _d_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$router_tools$(($$$$047$$$047ai$047bend$047wire_json$get$(_d_0, "tool_calls")), ($$$$047$$$047ai$047bend$047wire_json$get$(_d_0, "content")));
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_finish$(_reason_0, _d_0) {
  if (_reason_0.$ === "Some") {
    const _t_0 = _reason_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _reason_1 = _t_0["value"];
      return {$: "Done", "value": {$: "../../ai/bend/codecs.Finished", "reason": ($$$$047$$$047ai$047bend$047codecs$finish_reason$(_reason_1))}};
    } else {
      return $$$$047$$$047ai$047bend$047codecs$router_choice_delta$(_d_0);
    }
  } else {
    return $$$$047$$$047ai$047bend$047codecs$router_choice_delta$(_d_0);
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_choice$(_choice_0) {
  return $$$$047$$$047ai$047bend$047codecs$router_finish$(($$$$047$$$047ai$047bend$047wire_json$get$(_choice_0, "finish_reason")), ($$$$047$$$047ai$047bend$047wire_json$get$(_choice_0, "delta")));
}

function $$$$047$$$047ai$047bend$047codecs$router_choices$(_value_0, _usage_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Array") {
      const _t_1 = _t_0["items"];
      if (_t_1.$ === "Con") {
        const _choice_0 = _t_1["head"];
        const _t_2 = _t_1["tail"];
        if (_t_2.$ === "Nil") {
          return $$$$047$$$047ai$047bend$047codecs$router_choice$(_choice_0);
        } else {
          return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
        }
      } else {
        if (_usage_0.$ === "Some") {
          const _u_0 = _usage_0["value"];
          return $$$$047$$$047ai$047bend$047codecs$usage_fields$(($$$$047$$$047ai$047bend$047wire_json$get$(_u_0, "prompt_tokens")), ($$$$047$$$047ai$047bend$047wire_json$get$(_u_0, "completion_tokens")));
        } else {
          return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
        }
      }
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_fields$(_error_0, _choices_0, _usage_0) {
  if (_error_0.$ === "None") {
    return $$$$047$$$047ai$047bend$047codecs$router_choices$(_choices_0, _usage_0);
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$router_json$(_value_0) {
  return $$$$047$$$047ai$047bend$047codecs$router_fields$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "error")), ($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "choices")), ($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "usage")));
}

function $$$$047$$$047ai$047bend$047codecs$responses_status$(_status_0) {
  if (_status_0.$ === "Some") {
    const _t_0 = _status_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _t_1 = _t_0["value"];
      if (_t_1 !== "") {
        const _t_2 = (_t_1.codePointAt(0) > 0xFFFF ? _t_1.slice(0, 2) : _t_1[0]);
        const _t_3 = _t_2.codePointAt(0);
        if (_t_3 == 99) {
          const _t_4 = (_t_1.codePointAt(0) > 0xFFFF ? _t_1.slice(2) : _t_1.slice(1));
          if (_t_4 !== "") {
            const _t_5 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(0, 2) : _t_4[0]);
            const _t_6 = _t_5.codePointAt(0);
            if (_t_6 == 111) {
              const _t_7 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(2) : _t_4.slice(1));
              if (_t_7 !== "") {
                const _t_8 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(0, 2) : _t_7[0]);
                const _t_9 = _t_8.codePointAt(0);
                if (_t_9 == 109) {
                  const _t_10 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(2) : _t_7.slice(1));
                  if (_t_10 !== "") {
                    const _t_11 = (_t_10.codePointAt(0) > 0xFFFF ? _t_10.slice(0, 2) : _t_10[0]);
                    const _t_12 = _t_11.codePointAt(0);
                    if (_t_12 == 112) {
                      const _t_13 = (_t_10.codePointAt(0) > 0xFFFF ? _t_10.slice(2) : _t_10.slice(1));
                      if (_t_13 !== "") {
                        const _t_14 = (_t_13.codePointAt(0) > 0xFFFF ? _t_13.slice(0, 2) : _t_13[0]);
                        const _t_15 = _t_14.codePointAt(0);
                        if (_t_15 == 108) {
                          const _t_16 = (_t_13.codePointAt(0) > 0xFFFF ? _t_13.slice(2) : _t_13.slice(1));
                          if (_t_16 !== "") {
                            const _t_17 = (_t_16.codePointAt(0) > 0xFFFF ? _t_16.slice(0, 2) : _t_16[0]);
                            const _t_18 = _t_17.codePointAt(0);
                            if (_t_18 == 101) {
                              const _t_19 = (_t_16.codePointAt(0) > 0xFFFF ? _t_16.slice(2) : _t_16.slice(1));
                              if (_t_19 !== "") {
                                const _t_20 = (_t_19.codePointAt(0) > 0xFFFF ? _t_19.slice(0, 2) : _t_19[0]);
                                const _t_21 = _t_20.codePointAt(0);
                                if (_t_21 == 116) {
                                  const _t_22 = (_t_19.codePointAt(0) > 0xFFFF ? _t_19.slice(2) : _t_19.slice(1));
                                  if (_t_22 !== "") {
                                    const _t_23 = (_t_22.codePointAt(0) > 0xFFFF ? _t_22.slice(0, 2) : _t_22[0]);
                                    const _t_24 = _t_23.codePointAt(0);
                                    if (_t_24 == 101) {
                                      const _t_25 = (_t_22.codePointAt(0) > 0xFFFF ? _t_22.slice(2) : _t_22.slice(1));
                                      if (_t_25 !== "") {
                                        const _t_26 = (_t_25.codePointAt(0) > 0xFFFF ? _t_25.slice(0, 2) : _t_25[0]);
                                        const _t_27 = _t_26.codePointAt(0);
                                        if (_t_27 == 100) {
                                          const _t_28 = (_t_25.codePointAt(0) > 0xFFFF ? _t_25.slice(2) : _t_25.slice(1));
                                          if (_t_28 === "") {
                                            return {$: "Done", "value": {$: "../../ai/bend/codecs.DoneEvent"}};
                                          } else {
                                            return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                          }
                                        } else {
                                          return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                        }
                                      } else {
                                        return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                      }
                                    } else {
                                      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                    }
                                  } else {
                                    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                  }
                                } else {
                                  return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                                }
                              } else {
                                return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                              }
                            } else {
                              return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                            }
                          } else {
                            return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                          }
                        } else {
                          return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                        }
                      } else {
                        return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                      }
                    } else {
                      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                    }
                  } else {
                    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                  }
                } else {
                  return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
                }
              } else {
                return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
              }
            } else {
              return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
            }
          } else {
            return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
          }
        } else {
          return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
        }
      } else {
        return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
      }
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$responses_complete$(_value_0) {
  if (_value_0.$ === "Some") {
    const _r_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$responses_status$(($$$$047$$$047ai$047bend$047wire_json$get$(_r_0, "status")));
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$responses_fields$(_kind_0, _value_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 114) {
      const _t_2 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 101) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 115) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 112) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 111) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 110) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 115) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 101) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 46) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 111) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 117) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 116) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 112) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 !== "") {
                                                        const _t_39 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(0, 2) : _t_38[0]);
                                                        const _t_40 = _t_39.codePointAt(0);
                                                        if (_t_40 == 117) {
                                                          const _t_41 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(2) : _t_38.slice(1));
                                                          if (_t_41 !== "") {
                                                            const _t_42 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(0, 2) : _t_41[0]);
                                                            const _t_43 = _t_42.codePointAt(0);
                                                            if (_t_43 == 116) {
                                                              const _t_44 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_44 !== "") {
                                                                const _t_45 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(0, 2) : _t_44[0]);
                                                                const _t_46 = _t_45.codePointAt(0);
                                                                if (_t_46 == 95) {
                                                                  const _t_47 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(2) : _t_44.slice(1));
                                                                  if (_t_47 !== "") {
                                                                    const _t_48 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(0, 2) : _t_47[0]);
                                                                    const _t_49 = _t_48.codePointAt(0);
                                                                    if (_t_49 == 116) {
                                                                      const _t_50 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(2) : _t_47.slice(1));
                                                                      if (_t_50 !== "") {
                                                                        const _t_51 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(0, 2) : _t_50[0]);
                                                                        const _t_52 = _t_51.codePointAt(0);
                                                                        if (_t_52 == 101) {
                                                                          const _t_53 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(2) : _t_50.slice(1));
                                                                          if (_t_53 !== "") {
                                                                            const _t_54 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(0, 2) : _t_53[0]);
                                                                            const _t_55 = _t_54.codePointAt(0);
                                                                            if (_t_55 == 120) {
                                                                              const _t_56 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(2) : _t_53.slice(1));
                                                                              if (_t_56 !== "") {
                                                                                const _t_57 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(0, 2) : _t_56[0]);
                                                                                const _t_58 = _t_57.codePointAt(0);
                                                                                if (_t_58 == 116) {
                                                                                  const _t_59 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(2) : _t_56.slice(1));
                                                                                  if (_t_59 !== "") {
                                                                                    const _t_60 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(0, 2) : _t_59[0]);
                                                                                    const _t_61 = _t_60.codePointAt(0);
                                                                                    if (_t_61 == 46) {
                                                                                      const _t_62 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(2) : _t_59.slice(1));
                                                                                      if (_t_62 !== "") {
                                                                                        const _t_63 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(0, 2) : _t_62[0]);
                                                                                        const _t_64 = _t_63.codePointAt(0);
                                                                                        if (_t_64 == 100) {
                                                                                          const _t_65 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(2) : _t_62.slice(1));
                                                                                          if (_t_65 !== "") {
                                                                                            const _t_66 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(0, 2) : _t_65[0]);
                                                                                            const _t_67 = _t_66.codePointAt(0);
                                                                                            if (_t_67 == 101) {
                                                                                              const _t_68 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(2) : _t_65.slice(1));
                                                                                              if (_t_68 !== "") {
                                                                                                const _t_69 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(0, 2) : _t_68[0]);
                                                                                                const _t_70 = _t_69.codePointAt(0);
                                                                                                if (_t_70 == 108) {
                                                                                                  const _t_71 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(2) : _t_68.slice(1));
                                                                                                  if (_t_71 !== "") {
                                                                                                    const _t_72 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(0, 2) : _t_71[0]);
                                                                                                    const _t_73 = _t_72.codePointAt(0);
                                                                                                    if (_t_73 == 116) {
                                                                                                      const _t_74 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(2) : _t_71.slice(1));
                                                                                                      if (_t_74 !== "") {
                                                                                                        const _t_75 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(0, 2) : _t_74[0]);
                                                                                                        const _t_76 = _t_75.codePointAt(0);
                                                                                                        if (_t_76 == 97) {
                                                                                                          const _t_77 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(2) : _t_74.slice(1));
                                                                                                          if (_t_77 === "") {
                                                                                                            return $$$$047$$$047ai$047bend$047codecs$delta$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "delta")));
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else if (_t_67 == 111) {
                                                                                              const _t_78 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(2) : _t_65.slice(1));
                                                                                              if (_t_78 !== "") {
                                                                                                const _t_79 = (_t_78.codePointAt(0) > 0xFFFF ? _t_78.slice(0, 2) : _t_78[0]);
                                                                                                const _t_80 = _t_79.codePointAt(0);
                                                                                                if (_t_80 == 110) {
                                                                                                  const _t_81 = (_t_78.codePointAt(0) > 0xFFFF ? _t_78.slice(2) : _t_78.slice(1));
                                                                                                  if (_t_81 !== "") {
                                                                                                    const _t_82 = (_t_81.codePointAt(0) > 0xFFFF ? _t_81.slice(0, 2) : _t_81[0]);
                                                                                                    const _t_83 = _t_82.codePointAt(0);
                                                                                                    if (_t_83 == 101) {
                                                                                                      const _t_84 = (_t_81.codePointAt(0) > 0xFFFF ? _t_81.slice(2) : _t_81.slice(1));
                                                                                                      if (_t_84 === "") {
                                                                                                        return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else if ((_t_49 & 1) == 0) {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    } else if (_t_49 == 105) {
                                                                      const _t_85 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(2) : _t_47.slice(1));
                                                                      if (_t_85 !== "") {
                                                                        const _t_86 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(0, 2) : _t_85[0]);
                                                                        const _t_87 = _t_86.codePointAt(0);
                                                                        if (_t_87 == 116) {
                                                                          const _t_88 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(2) : _t_85.slice(1));
                                                                          if (_t_88 !== "") {
                                                                            const _t_89 = (_t_88.codePointAt(0) > 0xFFFF ? _t_88.slice(0, 2) : _t_88[0]);
                                                                            const _t_90 = _t_89.codePointAt(0);
                                                                            if (_t_90 == 101) {
                                                                              const _t_91 = (_t_88.codePointAt(0) > 0xFFFF ? _t_88.slice(2) : _t_88.slice(1));
                                                                              if (_t_91 !== "") {
                                                                                const _t_92 = (_t_91.codePointAt(0) > 0xFFFF ? _t_91.slice(0, 2) : _t_91[0]);
                                                                                const _t_93 = _t_92.codePointAt(0);
                                                                                if (_t_93 == 109) {
                                                                                  const _t_94 = (_t_91.codePointAt(0) > 0xFFFF ? _t_91.slice(2) : _t_91.slice(1));
                                                                                  if (_t_94 !== "") {
                                                                                    const _t_95 = (_t_94.codePointAt(0) > 0xFFFF ? _t_94.slice(0, 2) : _t_94[0]);
                                                                                    const _t_96 = _t_95.codePointAt(0);
                                                                                    if (_t_96 == 46) {
                                                                                      const _t_97 = (_t_94.codePointAt(0) > 0xFFFF ? _t_94.slice(2) : _t_94.slice(1));
                                                                                      if (_t_97 !== "") {
                                                                                        const _t_98 = (_t_97.codePointAt(0) > 0xFFFF ? _t_97.slice(0, 2) : _t_97[0]);
                                                                                        const _t_99 = _t_98.codePointAt(0);
                                                                                        if (_t_99 == 97) {
                                                                                          const _t_100 = (_t_97.codePointAt(0) > 0xFFFF ? _t_97.slice(2) : _t_97.slice(1));
                                                                                          if (_t_100 !== "") {
                                                                                            const _t_101 = (_t_100.codePointAt(0) > 0xFFFF ? _t_100.slice(0, 2) : _t_100[0]);
                                                                                            const _t_102 = _t_101.codePointAt(0);
                                                                                            if (_t_102 == 100) {
                                                                                              const _t_103 = (_t_100.codePointAt(0) > 0xFFFF ? _t_100.slice(2) : _t_100.slice(1));
                                                                                              if (_t_103 !== "") {
                                                                                                const _t_104 = (_t_103.codePointAt(0) > 0xFFFF ? _t_103.slice(0, 2) : _t_103[0]);
                                                                                                const _t_105 = _t_104.codePointAt(0);
                                                                                                if (_t_105 == 100) {
                                                                                                  const _t_106 = (_t_103.codePointAt(0) > 0xFFFF ? _t_103.slice(2) : _t_103.slice(1));
                                                                                                  if (_t_106 !== "") {
                                                                                                    const _t_107 = (_t_106.codePointAt(0) > 0xFFFF ? _t_106.slice(0, 2) : _t_106[0]);
                                                                                                    const _t_108 = _t_107.codePointAt(0);
                                                                                                    if (_t_108 == 101) {
                                                                                                      const _t_109 = (_t_106.codePointAt(0) > 0xFFFF ? _t_106.slice(2) : _t_106.slice(1));
                                                                                                      if (_t_109 !== "") {
                                                                                                        const _t_110 = (_t_109.codePointAt(0) > 0xFFFF ? _t_109.slice(0, 2) : _t_109[0]);
                                                                                                        const _t_111 = _t_110.codePointAt(0);
                                                                                                        if (_t_111 == 100) {
                                                                                                          const _t_112 = (_t_109.codePointAt(0) > 0xFFFF ? _t_109.slice(2) : _t_109.slice(1));
                                                                                                          if (_t_112 === "") {
                                                                                                            return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                          }
                                                                                        } else if ((_t_99 & 1) == 1) {
                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                        } else if (_t_99 == 100) {
                                                                                          const _t_113 = (_t_97.codePointAt(0) > 0xFFFF ? _t_97.slice(2) : _t_97.slice(1));
                                                                                          if (_t_113 !== "") {
                                                                                            const _t_114 = (_t_113.codePointAt(0) > 0xFFFF ? _t_113.slice(0, 2) : _t_113[0]);
                                                                                            const _t_115 = _t_114.codePointAt(0);
                                                                                            if (_t_115 == 111) {
                                                                                              const _t_116 = (_t_113.codePointAt(0) > 0xFFFF ? _t_113.slice(2) : _t_113.slice(1));
                                                                                              if (_t_116 !== "") {
                                                                                                const _t_117 = (_t_116.codePointAt(0) > 0xFFFF ? _t_116.slice(0, 2) : _t_116[0]);
                                                                                                const _t_118 = _t_117.codePointAt(0);
                                                                                                if (_t_118 == 110) {
                                                                                                  const _t_119 = (_t_116.codePointAt(0) > 0xFFFF ? _t_116.slice(2) : _t_116.slice(1));
                                                                                                  if (_t_119 !== "") {
                                                                                                    const _t_120 = (_t_119.codePointAt(0) > 0xFFFF ? _t_119.slice(0, 2) : _t_119[0]);
                                                                                                    const _t_121 = _t_120.codePointAt(0);
                                                                                                    if (_t_121 == 101) {
                                                                                                      const _t_122 = (_t_119.codePointAt(0) > 0xFFFF ? _t_119.slice(2) : _t_119.slice(1));
                                                                                                      if (_t_122 === "") {
                                                                                                        return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else if ((_t_28 & 7) == 7) {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        } else if (_t_28 == 99) {
                                          const _t_123 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_123 !== "") {
                                            const _t_124 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(0, 2) : _t_123[0]);
                                            const _t_125 = _t_124.codePointAt(0);
                                            if (_t_125 == 111) {
                                              const _t_126 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(2) : _t_123.slice(1));
                                              if (_t_126 !== "") {
                                                const _t_127 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(0, 2) : _t_126[0]);
                                                const _t_128 = _t_127.codePointAt(0);
                                                if (_t_128 == 109) {
                                                  const _t_129 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(2) : _t_126.slice(1));
                                                  if (_t_129 !== "") {
                                                    const _t_130 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(0, 2) : _t_129[0]);
                                                    const _t_131 = _t_130.codePointAt(0);
                                                    if (_t_131 == 112) {
                                                      const _t_132 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(2) : _t_129.slice(1));
                                                      if (_t_132 !== "") {
                                                        const _t_133 = (_t_132.codePointAt(0) > 0xFFFF ? _t_132.slice(0, 2) : _t_132[0]);
                                                        const _t_134 = _t_133.codePointAt(0);
                                                        if (_t_134 == 108) {
                                                          const _t_135 = (_t_132.codePointAt(0) > 0xFFFF ? _t_132.slice(2) : _t_132.slice(1));
                                                          if (_t_135 !== "") {
                                                            const _t_136 = (_t_135.codePointAt(0) > 0xFFFF ? _t_135.slice(0, 2) : _t_135[0]);
                                                            const _t_137 = _t_136.codePointAt(0);
                                                            if (_t_137 == 101) {
                                                              const _t_138 = (_t_135.codePointAt(0) > 0xFFFF ? _t_135.slice(2) : _t_135.slice(1));
                                                              if (_t_138 !== "") {
                                                                const _t_139 = (_t_138.codePointAt(0) > 0xFFFF ? _t_138.slice(0, 2) : _t_138[0]);
                                                                const _t_140 = _t_139.codePointAt(0);
                                                                if (_t_140 == 116) {
                                                                  const _t_141 = (_t_138.codePointAt(0) > 0xFFFF ? _t_138.slice(2) : _t_138.slice(1));
                                                                  if (_t_141 !== "") {
                                                                    const _t_142 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(0, 2) : _t_141[0]);
                                                                    const _t_143 = _t_142.codePointAt(0);
                                                                    if (_t_143 == 101) {
                                                                      const _t_144 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(2) : _t_141.slice(1));
                                                                      if (_t_144 !== "") {
                                                                        const _t_145 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(0, 2) : _t_144[0]);
                                                                        const _t_146 = _t_145.codePointAt(0);
                                                                        if (_t_146 == 100) {
                                                                          const _t_147 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(2) : _t_144.slice(1));
                                                                          if (_t_147 === "") {
                                                                            return $$$$047$$$047ai$047bend$047codecs$responses_complete$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "response")));
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else if ((_t_128 & 1) == 1) {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                } else if (_t_128 == 110) {
                                                  const _t_148 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(2) : _t_126.slice(1));
                                                  if (_t_148 !== "") {
                                                    const _t_149 = (_t_148.codePointAt(0) > 0xFFFF ? _t_148.slice(0, 2) : _t_148[0]);
                                                    const _t_150 = _t_149.codePointAt(0);
                                                    if (_t_150 == 116) {
                                                      const _t_151 = (_t_148.codePointAt(0) > 0xFFFF ? _t_148.slice(2) : _t_148.slice(1));
                                                      if (_t_151 !== "") {
                                                        const _t_152 = (_t_151.codePointAt(0) > 0xFFFF ? _t_151.slice(0, 2) : _t_151[0]);
                                                        const _t_153 = _t_152.codePointAt(0);
                                                        if (_t_153 == 101) {
                                                          const _t_154 = (_t_151.codePointAt(0) > 0xFFFF ? _t_151.slice(2) : _t_151.slice(1));
                                                          if (_t_154 !== "") {
                                                            const _t_155 = (_t_154.codePointAt(0) > 0xFFFF ? _t_154.slice(0, 2) : _t_154[0]);
                                                            const _t_156 = _t_155.codePointAt(0);
                                                            if (_t_156 == 110) {
                                                              const _t_157 = (_t_154.codePointAt(0) > 0xFFFF ? _t_154.slice(2) : _t_154.slice(1));
                                                              if (_t_157 !== "") {
                                                                const _t_158 = (_t_157.codePointAt(0) > 0xFFFF ? _t_157.slice(0, 2) : _t_157[0]);
                                                                const _t_159 = _t_158.codePointAt(0);
                                                                if (_t_159 == 116) {
                                                                  const _t_160 = (_t_157.codePointAt(0) > 0xFFFF ? _t_157.slice(2) : _t_157.slice(1));
                                                                  if (_t_160 !== "") {
                                                                    const _t_161 = (_t_160.codePointAt(0) > 0xFFFF ? _t_160.slice(0, 2) : _t_160[0]);
                                                                    const _t_162 = _t_161.codePointAt(0);
                                                                    if (_t_162 == 95) {
                                                                      const _t_163 = (_t_160.codePointAt(0) > 0xFFFF ? _t_160.slice(2) : _t_160.slice(1));
                                                                      if (_t_163 !== "") {
                                                                        const _t_164 = (_t_163.codePointAt(0) > 0xFFFF ? _t_163.slice(0, 2) : _t_163[0]);
                                                                        const _t_165 = _t_164.codePointAt(0);
                                                                        if (_t_165 == 112) {
                                                                          const _t_166 = (_t_163.codePointAt(0) > 0xFFFF ? _t_163.slice(2) : _t_163.slice(1));
                                                                          if (_t_166 !== "") {
                                                                            const _t_167 = (_t_166.codePointAt(0) > 0xFFFF ? _t_166.slice(0, 2) : _t_166[0]);
                                                                            const _t_168 = _t_167.codePointAt(0);
                                                                            if (_t_168 == 97) {
                                                                              const _t_169 = (_t_166.codePointAt(0) > 0xFFFF ? _t_166.slice(2) : _t_166.slice(1));
                                                                              if (_t_169 !== "") {
                                                                                const _t_170 = (_t_169.codePointAt(0) > 0xFFFF ? _t_169.slice(0, 2) : _t_169[0]);
                                                                                const _t_171 = _t_170.codePointAt(0);
                                                                                if (_t_171 == 114) {
                                                                                  const _t_172 = (_t_169.codePointAt(0) > 0xFFFF ? _t_169.slice(2) : _t_169.slice(1));
                                                                                  if (_t_172 !== "") {
                                                                                    const _t_173 = (_t_172.codePointAt(0) > 0xFFFF ? _t_172.slice(0, 2) : _t_172[0]);
                                                                                    const _t_174 = _t_173.codePointAt(0);
                                                                                    if (_t_174 == 116) {
                                                                                      const _t_175 = (_t_172.codePointAt(0) > 0xFFFF ? _t_172.slice(2) : _t_172.slice(1));
                                                                                      if (_t_175 !== "") {
                                                                                        const _t_176 = (_t_175.codePointAt(0) > 0xFFFF ? _t_175.slice(0, 2) : _t_175[0]);
                                                                                        const _t_177 = _t_176.codePointAt(0);
                                                                                        if (_t_177 == 46) {
                                                                                          const _t_178 = (_t_175.codePointAt(0) > 0xFFFF ? _t_175.slice(2) : _t_175.slice(1));
                                                                                          if (_t_178 !== "") {
                                                                                            const _t_179 = (_t_178.codePointAt(0) > 0xFFFF ? _t_178.slice(0, 2) : _t_178[0]);
                                                                                            const _t_180 = _t_179.codePointAt(0);
                                                                                            if (_t_180 == 97) {
                                                                                              const _t_181 = (_t_178.codePointAt(0) > 0xFFFF ? _t_178.slice(2) : _t_178.slice(1));
                                                                                              if (_t_181 !== "") {
                                                                                                const _t_182 = (_t_181.codePointAt(0) > 0xFFFF ? _t_181.slice(0, 2) : _t_181[0]);
                                                                                                const _t_183 = _t_182.codePointAt(0);
                                                                                                if (_t_183 == 100) {
                                                                                                  const _t_184 = (_t_181.codePointAt(0) > 0xFFFF ? _t_181.slice(2) : _t_181.slice(1));
                                                                                                  if (_t_184 !== "") {
                                                                                                    const _t_185 = (_t_184.codePointAt(0) > 0xFFFF ? _t_184.slice(0, 2) : _t_184[0]);
                                                                                                    const _t_186 = _t_185.codePointAt(0);
                                                                                                    if (_t_186 == 100) {
                                                                                                      const _t_187 = (_t_184.codePointAt(0) > 0xFFFF ? _t_184.slice(2) : _t_184.slice(1));
                                                                                                      if (_t_187 !== "") {
                                                                                                        const _t_188 = (_t_187.codePointAt(0) > 0xFFFF ? _t_187.slice(0, 2) : _t_187[0]);
                                                                                                        const _t_189 = _t_188.codePointAt(0);
                                                                                                        if (_t_189 == 101) {
                                                                                                          const _t_190 = (_t_187.codePointAt(0) > 0xFFFF ? _t_187.slice(2) : _t_187.slice(1));
                                                                                                          if (_t_190 !== "") {
                                                                                                            const _t_191 = (_t_190.codePointAt(0) > 0xFFFF ? _t_190.slice(0, 2) : _t_190[0]);
                                                                                                            const _t_192 = _t_191.codePointAt(0);
                                                                                                            if (_t_192 == 100) {
                                                                                                              const _t_193 = (_t_190.codePointAt(0) > 0xFFFF ? _t_190.slice(2) : _t_190.slice(1));
                                                                                                              if (_t_193 === "") {
                                                                                                                return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else if ((_t_180 & 1) == 1) {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            } else if (_t_180 == 100) {
                                                                                              const _t_194 = (_t_178.codePointAt(0) > 0xFFFF ? _t_178.slice(2) : _t_178.slice(1));
                                                                                              if (_t_194 !== "") {
                                                                                                const _t_195 = (_t_194.codePointAt(0) > 0xFFFF ? _t_194.slice(0, 2) : _t_194[0]);
                                                                                                const _t_196 = _t_195.codePointAt(0);
                                                                                                if (_t_196 == 111) {
                                                                                                  const _t_197 = (_t_194.codePointAt(0) > 0xFFFF ? _t_194.slice(2) : _t_194.slice(1));
                                                                                                  if (_t_197 !== "") {
                                                                                                    const _t_198 = (_t_197.codePointAt(0) > 0xFFFF ? _t_197.slice(0, 2) : _t_197[0]);
                                                                                                    const _t_199 = _t_198.codePointAt(0);
                                                                                                    if (_t_199 == 110) {
                                                                                                      const _t_200 = (_t_197.codePointAt(0) > 0xFFFF ? _t_197.slice(2) : _t_197.slice(1));
                                                                                                      if (_t_200 !== "") {
                                                                                                        const _t_201 = (_t_200.codePointAt(0) > 0xFFFF ? _t_200.slice(0, 2) : _t_200[0]);
                                                                                                        const _t_202 = _t_201.codePointAt(0);
                                                                                                        if (_t_202 == 101) {
                                                                                                          const _t_203 = (_t_200.codePointAt(0) > 0xFFFF ? _t_200.slice(2) : _t_200.slice(1));
                                                                                                          if (_t_203 === "") {
                                                                                                            return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else if ((_t_125 & 1) == 1) {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            } else if (_t_125 == 114) {
                                              const _t_204 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(2) : _t_123.slice(1));
                                              if (_t_204 !== "") {
                                                const _t_205 = (_t_204.codePointAt(0) > 0xFFFF ? _t_204.slice(0, 2) : _t_204[0]);
                                                const _t_206 = _t_205.codePointAt(0);
                                                if (_t_206 == 101) {
                                                  const _t_207 = (_t_204.codePointAt(0) > 0xFFFF ? _t_204.slice(2) : _t_204.slice(1));
                                                  if (_t_207 !== "") {
                                                    const _t_208 = (_t_207.codePointAt(0) > 0xFFFF ? _t_207.slice(0, 2) : _t_207[0]);
                                                    const _t_209 = _t_208.codePointAt(0);
                                                    if (_t_209 == 97) {
                                                      const _t_210 = (_t_207.codePointAt(0) > 0xFFFF ? _t_207.slice(2) : _t_207.slice(1));
                                                      if (_t_210 !== "") {
                                                        const _t_211 = (_t_210.codePointAt(0) > 0xFFFF ? _t_210.slice(0, 2) : _t_210[0]);
                                                        const _t_212 = _t_211.codePointAt(0);
                                                        if (_t_212 == 116) {
                                                          const _t_213 = (_t_210.codePointAt(0) > 0xFFFF ? _t_210.slice(2) : _t_210.slice(1));
                                                          if (_t_213 !== "") {
                                                            const _t_214 = (_t_213.codePointAt(0) > 0xFFFF ? _t_213.slice(0, 2) : _t_213[0]);
                                                            const _t_215 = _t_214.codePointAt(0);
                                                            if (_t_215 == 101) {
                                                              const _t_216 = (_t_213.codePointAt(0) > 0xFFFF ? _t_213.slice(2) : _t_213.slice(1));
                                                              if (_t_216 !== "") {
                                                                const _t_217 = (_t_216.codePointAt(0) > 0xFFFF ? _t_216.slice(0, 2) : _t_216[0]);
                                                                const _t_218 = _t_217.codePointAt(0);
                                                                if (_t_218 == 100) {
                                                                  const _t_219 = (_t_216.codePointAt(0) > 0xFFFF ? _t_216.slice(2) : _t_216.slice(1));
                                                                  if (_t_219 === "") {
                                                                    return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else if ((_t_28 & 7) == 3) {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        } else if (_t_28 == 105) {
                                          const _t_220 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_220 !== "") {
                                            const _t_221 = (_t_220.codePointAt(0) > 0xFFFF ? _t_220.slice(0, 2) : _t_220[0]);
                                            const _t_222 = _t_221.codePointAt(0);
                                            if (_t_222 == 110) {
                                              const _t_223 = (_t_220.codePointAt(0) > 0xFFFF ? _t_220.slice(2) : _t_220.slice(1));
                                              if (_t_223 !== "") {
                                                const _t_224 = (_t_223.codePointAt(0) > 0xFFFF ? _t_223.slice(0, 2) : _t_223[0]);
                                                const _t_225 = _t_224.codePointAt(0);
                                                if (_t_225 == 99) {
                                                  const _t_226 = (_t_223.codePointAt(0) > 0xFFFF ? _t_223.slice(2) : _t_223.slice(1));
                                                  if (_t_226 !== "") {
                                                    const _t_227 = (_t_226.codePointAt(0) > 0xFFFF ? _t_226.slice(0, 2) : _t_226[0]);
                                                    const _t_228 = _t_227.codePointAt(0);
                                                    if (_t_228 == 111) {
                                                      const _t_229 = (_t_226.codePointAt(0) > 0xFFFF ? _t_226.slice(2) : _t_226.slice(1));
                                                      if (_t_229 !== "") {
                                                        const _t_230 = (_t_229.codePointAt(0) > 0xFFFF ? _t_229.slice(0, 2) : _t_229[0]);
                                                        const _t_231 = _t_230.codePointAt(0);
                                                        if (_t_231 == 109) {
                                                          const _t_232 = (_t_229.codePointAt(0) > 0xFFFF ? _t_229.slice(2) : _t_229.slice(1));
                                                          if (_t_232 !== "") {
                                                            const _t_233 = (_t_232.codePointAt(0) > 0xFFFF ? _t_232.slice(0, 2) : _t_232[0]);
                                                            const _t_234 = _t_233.codePointAt(0);
                                                            if (_t_234 == 112) {
                                                              const _t_235 = (_t_232.codePointAt(0) > 0xFFFF ? _t_232.slice(2) : _t_232.slice(1));
                                                              if (_t_235 !== "") {
                                                                const _t_236 = (_t_235.codePointAt(0) > 0xFFFF ? _t_235.slice(0, 2) : _t_235[0]);
                                                                const _t_237 = _t_236.codePointAt(0);
                                                                if (_t_237 == 108) {
                                                                  const _t_238 = (_t_235.codePointAt(0) > 0xFFFF ? _t_235.slice(2) : _t_235.slice(1));
                                                                  if (_t_238 !== "") {
                                                                    const _t_239 = (_t_238.codePointAt(0) > 0xFFFF ? _t_238.slice(0, 2) : _t_238[0]);
                                                                    const _t_240 = _t_239.codePointAt(0);
                                                                    if (_t_240 == 101) {
                                                                      const _t_241 = (_t_238.codePointAt(0) > 0xFFFF ? _t_238.slice(2) : _t_238.slice(1));
                                                                      if (_t_241 !== "") {
                                                                        const _t_242 = (_t_241.codePointAt(0) > 0xFFFF ? _t_241.slice(0, 2) : _t_241[0]);
                                                                        const _t_243 = _t_242.codePointAt(0);
                                                                        if (_t_243 == 116) {
                                                                          const _t_244 = (_t_241.codePointAt(0) > 0xFFFF ? _t_241.slice(2) : _t_241.slice(1));
                                                                          if (_t_244 !== "") {
                                                                            const _t_245 = (_t_244.codePointAt(0) > 0xFFFF ? _t_244.slice(0, 2) : _t_244[0]);
                                                                            const _t_246 = _t_245.codePointAt(0);
                                                                            if (_t_246 == 101) {
                                                                              const _t_247 = (_t_244.codePointAt(0) > 0xFFFF ? _t_244.slice(2) : _t_244.slice(1));
                                                                              if (_t_247 === "") {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TruncatedStream"}, "status": 0, "request_id": ""}};
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else if (_t_225 == 95) {
                                                  const _t_248 = (_t_223.codePointAt(0) > 0xFFFF ? _t_223.slice(2) : _t_223.slice(1));
                                                  if (_t_248 !== "") {
                                                    const _t_249 = (_t_248.codePointAt(0) > 0xFFFF ? _t_248.slice(0, 2) : _t_248[0]);
                                                    const _t_250 = _t_249.codePointAt(0);
                                                    if (_t_250 == 112) {
                                                      const _t_251 = (_t_248.codePointAt(0) > 0xFFFF ? _t_248.slice(2) : _t_248.slice(1));
                                                      if (_t_251 !== "") {
                                                        const _t_252 = (_t_251.codePointAt(0) > 0xFFFF ? _t_251.slice(0, 2) : _t_251[0]);
                                                        const _t_253 = _t_252.codePointAt(0);
                                                        if (_t_253 == 114) {
                                                          const _t_254 = (_t_251.codePointAt(0) > 0xFFFF ? _t_251.slice(2) : _t_251.slice(1));
                                                          if (_t_254 !== "") {
                                                            const _t_255 = (_t_254.codePointAt(0) > 0xFFFF ? _t_254.slice(0, 2) : _t_254[0]);
                                                            const _t_256 = _t_255.codePointAt(0);
                                                            if (_t_256 == 111) {
                                                              const _t_257 = (_t_254.codePointAt(0) > 0xFFFF ? _t_254.slice(2) : _t_254.slice(1));
                                                              if (_t_257 !== "") {
                                                                const _t_258 = (_t_257.codePointAt(0) > 0xFFFF ? _t_257.slice(0, 2) : _t_257[0]);
                                                                const _t_259 = _t_258.codePointAt(0);
                                                                if (_t_259 == 103) {
                                                                  const _t_260 = (_t_257.codePointAt(0) > 0xFFFF ? _t_257.slice(2) : _t_257.slice(1));
                                                                  if (_t_260 !== "") {
                                                                    const _t_261 = (_t_260.codePointAt(0) > 0xFFFF ? _t_260.slice(0, 2) : _t_260[0]);
                                                                    const _t_262 = _t_261.codePointAt(0);
                                                                    if (_t_262 == 114) {
                                                                      const _t_263 = (_t_260.codePointAt(0) > 0xFFFF ? _t_260.slice(2) : _t_260.slice(1));
                                                                      if (_t_263 !== "") {
                                                                        const _t_264 = (_t_263.codePointAt(0) > 0xFFFF ? _t_263.slice(0, 2) : _t_263[0]);
                                                                        const _t_265 = _t_264.codePointAt(0);
                                                                        if (_t_265 == 101) {
                                                                          const _t_266 = (_t_263.codePointAt(0) > 0xFFFF ? _t_263.slice(2) : _t_263.slice(1));
                                                                          if (_t_266 !== "") {
                                                                            const _t_267 = (_t_266.codePointAt(0) > 0xFFFF ? _t_266.slice(0, 2) : _t_266[0]);
                                                                            const _t_268 = _t_267.codePointAt(0);
                                                                            if (_t_268 == 115) {
                                                                              const _t_269 = (_t_266.codePointAt(0) > 0xFFFF ? _t_266.slice(2) : _t_266.slice(1));
                                                                              if (_t_269 !== "") {
                                                                                const _t_270 = (_t_269.codePointAt(0) > 0xFFFF ? _t_269.slice(0, 2) : _t_269[0]);
                                                                                const _t_271 = _t_270.codePointAt(0);
                                                                                if (_t_271 == 115) {
                                                                                  const _t_272 = (_t_269.codePointAt(0) > 0xFFFF ? _t_269.slice(2) : _t_269.slice(1));
                                                                                  if (_t_272 === "") {
                                                                                    return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                                  } else {
                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else if ((_t_28 & 3) == 1) {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        } else if (_t_28 == 102) {
                                          const _t_273 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_273 !== "") {
                                            const _t_274 = (_t_273.codePointAt(0) > 0xFFFF ? _t_273.slice(0, 2) : _t_273[0]);
                                            const _t_275 = _t_274.codePointAt(0);
                                            if (_t_275 == 97) {
                                              const _t_276 = (_t_273.codePointAt(0) > 0xFFFF ? _t_273.slice(2) : _t_273.slice(1));
                                              if (_t_276 !== "") {
                                                const _t_277 = (_t_276.codePointAt(0) > 0xFFFF ? _t_276.slice(0, 2) : _t_276[0]);
                                                const _t_278 = _t_277.codePointAt(0);
                                                if (_t_278 == 105) {
                                                  const _t_279 = (_t_276.codePointAt(0) > 0xFFFF ? _t_276.slice(2) : _t_276.slice(1));
                                                  if (_t_279 !== "") {
                                                    const _t_280 = (_t_279.codePointAt(0) > 0xFFFF ? _t_279.slice(0, 2) : _t_279[0]);
                                                    const _t_281 = _t_280.codePointAt(0);
                                                    if (_t_281 == 108) {
                                                      const _t_282 = (_t_279.codePointAt(0) > 0xFFFF ? _t_279.slice(2) : _t_279.slice(1));
                                                      if (_t_282 !== "") {
                                                        const _t_283 = (_t_282.codePointAt(0) > 0xFFFF ? _t_282.slice(0, 2) : _t_282[0]);
                                                        const _t_284 = _t_283.codePointAt(0);
                                                        if (_t_284 == 101) {
                                                          const _t_285 = (_t_282.codePointAt(0) > 0xFFFF ? _t_282.slice(2) : _t_282.slice(1));
                                                          if (_t_285 !== "") {
                                                            const _t_286 = (_t_285.codePointAt(0) > 0xFFFF ? _t_285.slice(0, 2) : _t_285[0]);
                                                            const _t_287 = _t_286.codePointAt(0);
                                                            if (_t_287 == 100) {
                                                              const _t_288 = (_t_285.codePointAt(0) > 0xFFFF ? _t_285.slice(2) : _t_285.slice(1));
                                                              if (_t_288 === "") {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else if (_t_275 == 117) {
                                              const _t_289 = (_t_273.codePointAt(0) > 0xFFFF ? _t_273.slice(2) : _t_273.slice(1));
                                              if (_t_289 !== "") {
                                                const _t_290 = (_t_289.codePointAt(0) > 0xFFFF ? _t_289.slice(0, 2) : _t_289[0]);
                                                const _t_291 = _t_290.codePointAt(0);
                                                if (_t_291 == 110) {
                                                  const _t_292 = (_t_289.codePointAt(0) > 0xFFFF ? _t_289.slice(2) : _t_289.slice(1));
                                                  if (_t_292 !== "") {
                                                    const _t_293 = (_t_292.codePointAt(0) > 0xFFFF ? _t_292.slice(0, 2) : _t_292[0]);
                                                    const _t_294 = _t_293.codePointAt(0);
                                                    if (_t_294 == 99) {
                                                      const _t_295 = (_t_292.codePointAt(0) > 0xFFFF ? _t_292.slice(2) : _t_292.slice(1));
                                                      if (_t_295 !== "") {
                                                        const _t_296 = (_t_295.codePointAt(0) > 0xFFFF ? _t_295.slice(0, 2) : _t_295[0]);
                                                        const _t_297 = _t_296.codePointAt(0);
                                                        if (_t_297 == 116) {
                                                          const _t_298 = (_t_295.codePointAt(0) > 0xFFFF ? _t_295.slice(2) : _t_295.slice(1));
                                                          if (_t_298 !== "") {
                                                            const _t_299 = (_t_298.codePointAt(0) > 0xFFFF ? _t_298.slice(0, 2) : _t_298[0]);
                                                            const _t_300 = _t_299.codePointAt(0);
                                                            if (_t_300 == 105) {
                                                              const _t_301 = (_t_298.codePointAt(0) > 0xFFFF ? _t_298.slice(2) : _t_298.slice(1));
                                                              if (_t_301 !== "") {
                                                                const _t_302 = (_t_301.codePointAt(0) > 0xFFFF ? _t_301.slice(0, 2) : _t_301[0]);
                                                                const _t_303 = _t_302.codePointAt(0);
                                                                if (_t_303 == 111) {
                                                                  const _t_304 = (_t_301.codePointAt(0) > 0xFFFF ? _t_301.slice(2) : _t_301.slice(1));
                                                                  if (_t_304 !== "") {
                                                                    const _t_305 = (_t_304.codePointAt(0) > 0xFFFF ? _t_304.slice(0, 2) : _t_304[0]);
                                                                    const _t_306 = _t_305.codePointAt(0);
                                                                    if (_t_306 == 110) {
                                                                      const _t_307 = (_t_304.codePointAt(0) > 0xFFFF ? _t_304.slice(2) : _t_304.slice(1));
                                                                      if (_t_307 !== "") {
                                                                        const _t_308 = (_t_307.codePointAt(0) > 0xFFFF ? _t_307.slice(0, 2) : _t_307[0]);
                                                                        const _t_309 = _t_308.codePointAt(0);
                                                                        if (_t_309 == 95) {
                                                                          const _t_310 = (_t_307.codePointAt(0) > 0xFFFF ? _t_307.slice(2) : _t_307.slice(1));
                                                                          if (_t_310 !== "") {
                                                                            const _t_311 = (_t_310.codePointAt(0) > 0xFFFF ? _t_310.slice(0, 2) : _t_310[0]);
                                                                            const _t_312 = _t_311.codePointAt(0);
                                                                            if (_t_312 == 99) {
                                                                              const _t_313 = (_t_310.codePointAt(0) > 0xFFFF ? _t_310.slice(2) : _t_310.slice(1));
                                                                              if (_t_313 !== "") {
                                                                                const _t_314 = (_t_313.codePointAt(0) > 0xFFFF ? _t_313.slice(0, 2) : _t_313[0]);
                                                                                const _t_315 = _t_314.codePointAt(0);
                                                                                if (_t_315 == 97) {
                                                                                  const _t_316 = (_t_313.codePointAt(0) > 0xFFFF ? _t_313.slice(2) : _t_313.slice(1));
                                                                                  if (_t_316 !== "") {
                                                                                    const _t_317 = (_t_316.codePointAt(0) > 0xFFFF ? _t_316.slice(0, 2) : _t_316[0]);
                                                                                    const _t_318 = _t_317.codePointAt(0);
                                                                                    if (_t_318 == 108) {
                                                                                      const _t_319 = (_t_316.codePointAt(0) > 0xFFFF ? _t_316.slice(2) : _t_316.slice(1));
                                                                                      if (_t_319 !== "") {
                                                                                        const _t_320 = (_t_319.codePointAt(0) > 0xFFFF ? _t_319.slice(0, 2) : _t_319[0]);
                                                                                        const _t_321 = _t_320.codePointAt(0);
                                                                                        if (_t_321 == 108) {
                                                                                          const _t_322 = (_t_319.codePointAt(0) > 0xFFFF ? _t_319.slice(2) : _t_319.slice(1));
                                                                                          if (_t_322 !== "") {
                                                                                            const _t_323 = (_t_322.codePointAt(0) > 0xFFFF ? _t_322.slice(0, 2) : _t_322[0]);
                                                                                            const _t_324 = _t_323.codePointAt(0);
                                                                                            if (_t_324 == 95) {
                                                                                              const _t_325 = (_t_322.codePointAt(0) > 0xFFFF ? _t_322.slice(2) : _t_322.slice(1));
                                                                                              if (_t_325 !== "") {
                                                                                                const _t_326 = (_t_325.codePointAt(0) > 0xFFFF ? _t_325.slice(0, 2) : _t_325[0]);
                                                                                                const _t_327 = _t_326.codePointAt(0);
                                                                                                if (_t_327 == 97) {
                                                                                                  const _t_328 = (_t_325.codePointAt(0) > 0xFFFF ? _t_325.slice(2) : _t_325.slice(1));
                                                                                                  if (_t_328 !== "") {
                                                                                                    const _t_329 = (_t_328.codePointAt(0) > 0xFFFF ? _t_328.slice(0, 2) : _t_328[0]);
                                                                                                    const _t_330 = _t_329.codePointAt(0);
                                                                                                    if (_t_330 == 114) {
                                                                                                      const _t_331 = (_t_328.codePointAt(0) > 0xFFFF ? _t_328.slice(2) : _t_328.slice(1));
                                                                                                      if (_t_331 !== "") {
                                                                                                        const _t_332 = (_t_331.codePointAt(0) > 0xFFFF ? _t_331.slice(0, 2) : _t_331[0]);
                                                                                                        const _t_333 = _t_332.codePointAt(0);
                                                                                                        if (_t_333 == 103) {
                                                                                                          const _t_334 = (_t_331.codePointAt(0) > 0xFFFF ? _t_331.slice(2) : _t_331.slice(1));
                                                                                                          if (_t_334 !== "") {
                                                                                                            const _t_335 = (_t_334.codePointAt(0) > 0xFFFF ? _t_334.slice(0, 2) : _t_334[0]);
                                                                                                            const _t_336 = _t_335.codePointAt(0);
                                                                                                            if (_t_336 == 117) {
                                                                                                              const _t_337 = (_t_334.codePointAt(0) > 0xFFFF ? _t_334.slice(2) : _t_334.slice(1));
                                                                                                              if (_t_337 !== "") {
                                                                                                                const _t_338 = (_t_337.codePointAt(0) > 0xFFFF ? _t_337.slice(0, 2) : _t_337[0]);
                                                                                                                const _t_339 = _t_338.codePointAt(0);
                                                                                                                if (_t_339 == 109) {
                                                                                                                  const _t_340 = (_t_337.codePointAt(0) > 0xFFFF ? _t_337.slice(2) : _t_337.slice(1));
                                                                                                                  if (_t_340 !== "") {
                                                                                                                    const _t_341 = (_t_340.codePointAt(0) > 0xFFFF ? _t_340.slice(0, 2) : _t_340[0]);
                                                                                                                    const _t_342 = _t_341.codePointAt(0);
                                                                                                                    if (_t_342 == 101) {
                                                                                                                      const _t_343 = (_t_340.codePointAt(0) > 0xFFFF ? _t_340.slice(2) : _t_340.slice(1));
                                                                                                                      if (_t_343 !== "") {
                                                                                                                        const _t_344 = (_t_343.codePointAt(0) > 0xFFFF ? _t_343.slice(0, 2) : _t_343[0]);
                                                                                                                        const _t_345 = _t_344.codePointAt(0);
                                                                                                                        if (_t_345 == 110) {
                                                                                                                          const _t_346 = (_t_343.codePointAt(0) > 0xFFFF ? _t_343.slice(2) : _t_343.slice(1));
                                                                                                                          if (_t_346 !== "") {
                                                                                                                            const _t_347 = (_t_346.codePointAt(0) > 0xFFFF ? _t_346.slice(0, 2) : _t_346[0]);
                                                                                                                            const _t_348 = _t_347.codePointAt(0);
                                                                                                                            if (_t_348 == 116) {
                                                                                                                              const _t_349 = (_t_346.codePointAt(0) > 0xFFFF ? _t_346.slice(2) : _t_346.slice(1));
                                                                                                                              if (_t_349 !== "") {
                                                                                                                                const _t_350 = (_t_349.codePointAt(0) > 0xFFFF ? _t_349.slice(0, 2) : _t_349[0]);
                                                                                                                                const _t_351 = _t_350.codePointAt(0);
                                                                                                                                if (_t_351 == 115) {
                                                                                                                                  const _t_352 = (_t_349.codePointAt(0) > 0xFFFF ? _t_349.slice(2) : _t_349.slice(1));
                                                                                                                                  if (_t_352 !== "") {
                                                                                                                                    const _t_353 = (_t_352.codePointAt(0) > 0xFFFF ? _t_352.slice(0, 2) : _t_352[0]);
                                                                                                                                    const _t_354 = _t_353.codePointAt(0);
                                                                                                                                    if (_t_354 == 46) {
                                                                                                                                      const _t_355 = (_t_352.codePointAt(0) > 0xFFFF ? _t_352.slice(2) : _t_352.slice(1));
                                                                                                                                      if (_t_355 !== "") {
                                                                                                                                        const _t_356 = (_t_355.codePointAt(0) > 0xFFFF ? _t_355.slice(0, 2) : _t_355[0]);
                                                                                                                                        const _t_357 = _t_356.codePointAt(0);
                                                                                                                                        if (_t_357 == 100) {
                                                                                                                                          const _t_358 = (_t_355.codePointAt(0) > 0xFFFF ? _t_355.slice(2) : _t_355.slice(1));
                                                                                                                                          if (_t_358 !== "") {
                                                                                                                                            const _t_359 = (_t_358.codePointAt(0) > 0xFFFF ? _t_358.slice(0, 2) : _t_358[0]);
                                                                                                                                            const _t_360 = _t_359.codePointAt(0);
                                                                                                                                            if (_t_360 == 101) {
                                                                                                                                              const _t_361 = (_t_358.codePointAt(0) > 0xFFFF ? _t_358.slice(2) : _t_358.slice(1));
                                                                                                                                              if (_t_361 !== "") {
                                                                                                                                                const _t_362 = (_t_361.codePointAt(0) > 0xFFFF ? _t_361.slice(0, 2) : _t_361[0]);
                                                                                                                                                const _t_363 = _t_362.codePointAt(0);
                                                                                                                                                if (_t_363 == 108) {
                                                                                                                                                  const _t_364 = (_t_361.codePointAt(0) > 0xFFFF ? _t_361.slice(2) : _t_361.slice(1));
                                                                                                                                                  if (_t_364 !== "") {
                                                                                                                                                    const _t_365 = (_t_364.codePointAt(0) > 0xFFFF ? _t_364.slice(0, 2) : _t_364[0]);
                                                                                                                                                    const _t_366 = _t_365.codePointAt(0);
                                                                                                                                                    if (_t_366 == 116) {
                                                                                                                                                      const _t_367 = (_t_364.codePointAt(0) > 0xFFFF ? _t_364.slice(2) : _t_364.slice(1));
                                                                                                                                                      if (_t_367 !== "") {
                                                                                                                                                        const _t_368 = (_t_367.codePointAt(0) > 0xFFFF ? _t_367.slice(0, 2) : _t_367[0]);
                                                                                                                                                        const _t_369 = _t_368.codePointAt(0);
                                                                                                                                                        if (_t_369 == 97) {
                                                                                                                                                          const _t_370 = (_t_367.codePointAt(0) > 0xFFFF ? _t_367.slice(2) : _t_367.slice(1));
                                                                                                                                                          if (_t_370 === "") {
                                                                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                          } else {
                                                                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                          }
                                                                                                                                                        } else {
                                                                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                        }
                                                                                                                                                      } else {
                                                                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                      }
                                                                                                                                                    } else {
                                                                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                    }
                                                                                                                                                  } else {
                                                                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                  }
                                                                                                                                                } else {
                                                                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                                }
                                                                                                                                              } else {
                                                                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                              }
                                                                                                                                            } else {
                                                                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                            }
                                                                                                                                          } else {
                                                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                          }
                                                                                                                                        } else {
                                                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                        }
                                                                                                                                      } else {
                                                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                      }
                                                                                                                                    } else {
                                                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                    }
                                                                                                                                  } else {
                                                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                  }
                                                                                                                                } else {
                                                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                                }
                                                                                                                              } else {
                                                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                              }
                                                                                                                            } else {
                                                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                            }
                                                                                                                          } else {
                                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                          }
                                                                                                                        } else {
                                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                        }
                                                                                                                      } else {
                                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                      }
                                                                                                                    } else {
                                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                    }
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if ((_t_1 & 1) == 0) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    } else if (_t_1 == 101) {
      const _t_371 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_371 !== "") {
        const _t_372 = (_t_371.codePointAt(0) > 0xFFFF ? _t_371.slice(0, 2) : _t_371[0]);
        const _t_373 = _t_372.codePointAt(0);
        if (_t_373 == 114) {
          const _t_374 = (_t_371.codePointAt(0) > 0xFFFF ? _t_371.slice(2) : _t_371.slice(1));
          if (_t_374 !== "") {
            const _t_375 = (_t_374.codePointAt(0) > 0xFFFF ? _t_374.slice(0, 2) : _t_374[0]);
            const _t_376 = _t_375.codePointAt(0);
            if (_t_376 == 114) {
              const _t_377 = (_t_374.codePointAt(0) > 0xFFFF ? _t_374.slice(2) : _t_374.slice(1));
              if (_t_377 !== "") {
                const _t_378 = (_t_377.codePointAt(0) > 0xFFFF ? _t_377.slice(0, 2) : _t_377[0]);
                const _t_379 = _t_378.codePointAt(0);
                if (_t_379 == 111) {
                  const _t_380 = (_t_377.codePointAt(0) > 0xFFFF ? _t_377.slice(2) : _t_377.slice(1));
                  if (_t_380 !== "") {
                    const _t_381 = (_t_380.codePointAt(0) > 0xFFFF ? _t_380.slice(0, 2) : _t_380[0]);
                    const _t_382 = _t_381.codePointAt(0);
                    if (_t_382 == 114) {
                      const _t_383 = (_t_380.codePointAt(0) > 0xFFFF ? _t_380.slice(2) : _t_380.slice(1));
                      if (_t_383 === "") {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$responses_json$(_value_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "type")))), run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047codecs$responses_fields$(_x_0, _value_0);
}));
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_delta$(_kind_0, _value_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 116) {
      const _t_2 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 101) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 120) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 116) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 95) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 100) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 101) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 108) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 116) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 97) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 === "") {
                                            return $$$$047$$$047ai$047bend$047codecs$delta$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "text")));
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_delta_json$(_value_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "type")))), run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047codecs$anthropic_delta$(_x_0, _value_0);
}));
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_block$(_value_0) {
  if (_value_0.$ === "Some") {
    const _d_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$anthropic_delta_json$(_d_0);
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_stop$(_value_0) {
  if (_value_0.$ === "Some") {
    const _d_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$finish$(($$$$047$$$047ai$047bend$047wire_json$get$(_d_0, "stop_reason")));
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_start_kind$(_kind_0) {
  if (_kind_0.$ === "Some") {
    const _t_0 = _kind_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _t_1 = _t_0["value"];
      if (_t_1 !== "") {
        const _t_2 = (_t_1.codePointAt(0) > 0xFFFF ? _t_1.slice(0, 2) : _t_1[0]);
        const _t_3 = _t_2.codePointAt(0);
        if (_t_3 == 116) {
          const _t_4 = (_t_1.codePointAt(0) > 0xFFFF ? _t_1.slice(2) : _t_1.slice(1));
          if (_t_4 !== "") {
            const _t_5 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(0, 2) : _t_4[0]);
            const _t_6 = _t_5.codePointAt(0);
            if (_t_6 == 101) {
              const _t_7 = (_t_4.codePointAt(0) > 0xFFFF ? _t_4.slice(2) : _t_4.slice(1));
              if (_t_7 !== "") {
                const _t_8 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(0, 2) : _t_7[0]);
                const _t_9 = _t_8.codePointAt(0);
                if (_t_9 == 120) {
                  const _t_10 = (_t_7.codePointAt(0) > 0xFFFF ? _t_7.slice(2) : _t_7.slice(1));
                  if (_t_10 !== "") {
                    const _t_11 = (_t_10.codePointAt(0) > 0xFFFF ? _t_10.slice(0, 2) : _t_10[0]);
                    const _t_12 = _t_11.codePointAt(0);
                    if (_t_12 == 116) {
                      const _t_13 = (_t_10.codePointAt(0) > 0xFFFF ? _t_10.slice(2) : _t_10.slice(1));
                      if (_t_13 === "") {
                        return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_start$(_value_0) {
  if (_value_0.$ === "Some") {
    const _block_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$anthropic_start_kind$(($$$$047$$$047ai$047bend$047wire_json$get$(_block_0, "type")));
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_fields$(_kind_0, _value_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 99) {
      const _t_2 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 111) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 110) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 116) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 101) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 110) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 116) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 95) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 98) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 108) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 111) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 99) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 107) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 !== "") {
                                                        const _t_39 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(0, 2) : _t_38[0]);
                                                        const _t_40 = _t_39.codePointAt(0);
                                                        if (_t_40 == 95) {
                                                          const _t_41 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(2) : _t_38.slice(1));
                                                          if (_t_41 !== "") {
                                                            const _t_42 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(0, 2) : _t_41[0]);
                                                            const _t_43 = _t_42.codePointAt(0);
                                                            if (_t_43 == 100) {
                                                              const _t_44 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_44 !== "") {
                                                                const _t_45 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(0, 2) : _t_44[0]);
                                                                const _t_46 = _t_45.codePointAt(0);
                                                                if (_t_46 == 101) {
                                                                  const _t_47 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(2) : _t_44.slice(1));
                                                                  if (_t_47 !== "") {
                                                                    const _t_48 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(0, 2) : _t_47[0]);
                                                                    const _t_49 = _t_48.codePointAt(0);
                                                                    if (_t_49 == 108) {
                                                                      const _t_50 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(2) : _t_47.slice(1));
                                                                      if (_t_50 !== "") {
                                                                        const _t_51 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(0, 2) : _t_50[0]);
                                                                        const _t_52 = _t_51.codePointAt(0);
                                                                        if (_t_52 == 116) {
                                                                          const _t_53 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(2) : _t_50.slice(1));
                                                                          if (_t_53 !== "") {
                                                                            const _t_54 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(0, 2) : _t_53[0]);
                                                                            const _t_55 = _t_54.codePointAt(0);
                                                                            if (_t_55 == 97) {
                                                                              const _t_56 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(2) : _t_53.slice(1));
                                                                              if (_t_56 === "") {
                                                                                return $$$$047$$$047ai$047bend$047codecs$anthropic_block$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "delta")));
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else if ((_t_43 & 1) == 0) {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            } else if (_t_43 == 115) {
                                                              const _t_57 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_57 !== "") {
                                                                const _t_58 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(0, 2) : _t_57[0]);
                                                                const _t_59 = _t_58.codePointAt(0);
                                                                if (_t_59 == 116) {
                                                                  const _t_60 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(2) : _t_57.slice(1));
                                                                  if (_t_60 !== "") {
                                                                    const _t_61 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(0, 2) : _t_60[0]);
                                                                    const _t_62 = _t_61.codePointAt(0);
                                                                    if (_t_62 == 97) {
                                                                      const _t_63 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(2) : _t_60.slice(1));
                                                                      if (_t_63 !== "") {
                                                                        const _t_64 = (_t_63.codePointAt(0) > 0xFFFF ? _t_63.slice(0, 2) : _t_63[0]);
                                                                        const _t_65 = _t_64.codePointAt(0);
                                                                        if (_t_65 == 114) {
                                                                          const _t_66 = (_t_63.codePointAt(0) > 0xFFFF ? _t_63.slice(2) : _t_63.slice(1));
                                                                          if (_t_66 !== "") {
                                                                            const _t_67 = (_t_66.codePointAt(0) > 0xFFFF ? _t_66.slice(0, 2) : _t_66[0]);
                                                                            const _t_68 = _t_67.codePointAt(0);
                                                                            if (_t_68 == 116) {
                                                                              const _t_69 = (_t_66.codePointAt(0) > 0xFFFF ? _t_66.slice(2) : _t_66.slice(1));
                                                                              if (_t_69 === "") {
                                                                                return $$$$047$$$047ai$047bend$047codecs$anthropic_start$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "content_block")));
                                                                              } else {
                                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else if (_t_62 == 111) {
                                                                      const _t_70 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(2) : _t_60.slice(1));
                                                                      if (_t_70 !== "") {
                                                                        const _t_71 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(0, 2) : _t_70[0]);
                                                                        const _t_72 = _t_71.codePointAt(0);
                                                                        if (_t_72 == 112) {
                                                                          const _t_73 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(2) : _t_70.slice(1));
                                                                          if (_t_73 === "") {
                                                                            return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                                          } else {
                                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if ((_t_1 & 3) == 3) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    } else if (_t_1 == 109) {
      const _t_74 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_74 !== "") {
        const _t_75 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(0, 2) : _t_74[0]);
        const _t_76 = _t_75.codePointAt(0);
        if (_t_76 == 101) {
          const _t_77 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(2) : _t_74.slice(1));
          if (_t_77 !== "") {
            const _t_78 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(0, 2) : _t_77[0]);
            const _t_79 = _t_78.codePointAt(0);
            if (_t_79 == 115) {
              const _t_80 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(2) : _t_77.slice(1));
              if (_t_80 !== "") {
                const _t_81 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(0, 2) : _t_80[0]);
                const _t_82 = _t_81.codePointAt(0);
                if (_t_82 == 115) {
                  const _t_83 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(2) : _t_80.slice(1));
                  if (_t_83 !== "") {
                    const _t_84 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(0, 2) : _t_83[0]);
                    const _t_85 = _t_84.codePointAt(0);
                    if (_t_85 == 97) {
                      const _t_86 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(2) : _t_83.slice(1));
                      if (_t_86 !== "") {
                        const _t_87 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(0, 2) : _t_86[0]);
                        const _t_88 = _t_87.codePointAt(0);
                        if (_t_88 == 103) {
                          const _t_89 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(2) : _t_86.slice(1));
                          if (_t_89 !== "") {
                            const _t_90 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(0, 2) : _t_89[0]);
                            const _t_91 = _t_90.codePointAt(0);
                            if (_t_91 == 101) {
                              const _t_92 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(2) : _t_89.slice(1));
                              if (_t_92 !== "") {
                                const _t_93 = (_t_92.codePointAt(0) > 0xFFFF ? _t_92.slice(0, 2) : _t_92[0]);
                                const _t_94 = _t_93.codePointAt(0);
                                if (_t_94 == 95) {
                                  const _t_95 = (_t_92.codePointAt(0) > 0xFFFF ? _t_92.slice(2) : _t_92.slice(1));
                                  if (_t_95 !== "") {
                                    const _t_96 = (_t_95.codePointAt(0) > 0xFFFF ? _t_95.slice(0, 2) : _t_95[0]);
                                    const _t_97 = _t_96.codePointAt(0);
                                    if (_t_97 == 100) {
                                      const _t_98 = (_t_95.codePointAt(0) > 0xFFFF ? _t_95.slice(2) : _t_95.slice(1));
                                      if (_t_98 !== "") {
                                        const _t_99 = (_t_98.codePointAt(0) > 0xFFFF ? _t_98.slice(0, 2) : _t_98[0]);
                                        const _t_100 = _t_99.codePointAt(0);
                                        if (_t_100 == 101) {
                                          const _t_101 = (_t_98.codePointAt(0) > 0xFFFF ? _t_98.slice(2) : _t_98.slice(1));
                                          if (_t_101 !== "") {
                                            const _t_102 = (_t_101.codePointAt(0) > 0xFFFF ? _t_101.slice(0, 2) : _t_101[0]);
                                            const _t_103 = _t_102.codePointAt(0);
                                            if (_t_103 == 108) {
                                              const _t_104 = (_t_101.codePointAt(0) > 0xFFFF ? _t_101.slice(2) : _t_101.slice(1));
                                              if (_t_104 !== "") {
                                                const _t_105 = (_t_104.codePointAt(0) > 0xFFFF ? _t_104.slice(0, 2) : _t_104[0]);
                                                const _t_106 = _t_105.codePointAt(0);
                                                if (_t_106 == 116) {
                                                  const _t_107 = (_t_104.codePointAt(0) > 0xFFFF ? _t_104.slice(2) : _t_104.slice(1));
                                                  if (_t_107 !== "") {
                                                    const _t_108 = (_t_107.codePointAt(0) > 0xFFFF ? _t_107.slice(0, 2) : _t_107[0]);
                                                    const _t_109 = _t_108.codePointAt(0);
                                                    if (_t_109 == 97) {
                                                      const _t_110 = (_t_107.codePointAt(0) > 0xFFFF ? _t_107.slice(2) : _t_107.slice(1));
                                                      if (_t_110 === "") {
                                                        return $$$$047$$$047ai$047bend$047codecs$anthropic_stop$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "delta")));
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else if ((_t_97 & 1) == 0) {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    } else if (_t_97 == 115) {
                                      const _t_111 = (_t_95.codePointAt(0) > 0xFFFF ? _t_95.slice(2) : _t_95.slice(1));
                                      if (_t_111 !== "") {
                                        const _t_112 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(0, 2) : _t_111[0]);
                                        const _t_113 = _t_112.codePointAt(0);
                                        if (_t_113 == 116) {
                                          const _t_114 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(2) : _t_111.slice(1));
                                          if (_t_114 !== "") {
                                            const _t_115 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(0, 2) : _t_114[0]);
                                            const _t_116 = _t_115.codePointAt(0);
                                            if (_t_116 == 111) {
                                              const _t_117 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(2) : _t_114.slice(1));
                                              if (_t_117 !== "") {
                                                const _t_118 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(0, 2) : _t_117[0]);
                                                const _t_119 = _t_118.codePointAt(0);
                                                if (_t_119 == 112) {
                                                  const _t_120 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(2) : _t_117.slice(1));
                                                  if (_t_120 === "") {
                                                    return {$: "Done", "value": {$: "../../ai/bend/codecs.DoneEvent"}};
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else if (_t_116 == 97) {
                                              const _t_121 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(2) : _t_114.slice(1));
                                              if (_t_121 !== "") {
                                                const _t_122 = (_t_121.codePointAt(0) > 0xFFFF ? _t_121.slice(0, 2) : _t_121[0]);
                                                const _t_123 = _t_122.codePointAt(0);
                                                if (_t_123 == 114) {
                                                  const _t_124 = (_t_121.codePointAt(0) > 0xFFFF ? _t_121.slice(2) : _t_121.slice(1));
                                                  if (_t_124 !== "") {
                                                    const _t_125 = (_t_124.codePointAt(0) > 0xFFFF ? _t_124.slice(0, 2) : _t_124[0]);
                                                    const _t_126 = _t_125.codePointAt(0);
                                                    if (_t_126 == 116) {
                                                      const _t_127 = (_t_124.codePointAt(0) > 0xFFFF ? _t_124.slice(2) : _t_124.slice(1));
                                                      if (_t_127 === "") {
                                                        return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                                      } else {
                                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if (_t_1 == 101) {
      const _t_128 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_128 !== "") {
        const _t_129 = (_t_128.codePointAt(0) > 0xFFFF ? _t_128.slice(0, 2) : _t_128[0]);
        const _t_130 = _t_129.codePointAt(0);
        if (_t_130 == 114) {
          const _t_131 = (_t_128.codePointAt(0) > 0xFFFF ? _t_128.slice(2) : _t_128.slice(1));
          if (_t_131 !== "") {
            const _t_132 = (_t_131.codePointAt(0) > 0xFFFF ? _t_131.slice(0, 2) : _t_131[0]);
            const _t_133 = _t_132.codePointAt(0);
            if (_t_133 == 114) {
              const _t_134 = (_t_131.codePointAt(0) > 0xFFFF ? _t_131.slice(2) : _t_131.slice(1));
              if (_t_134 !== "") {
                const _t_135 = (_t_134.codePointAt(0) > 0xFFFF ? _t_134.slice(0, 2) : _t_134[0]);
                const _t_136 = _t_135.codePointAt(0);
                if (_t_136 == 111) {
                  const _t_137 = (_t_134.codePointAt(0) > 0xFFFF ? _t_134.slice(2) : _t_134.slice(1));
                  if (_t_137 !== "") {
                    const _t_138 = (_t_137.codePointAt(0) > 0xFFFF ? _t_137.slice(0, 2) : _t_137[0]);
                    const _t_139 = _t_138.codePointAt(0);
                    if (_t_139 == 114) {
                      const _t_140 = (_t_137.codePointAt(0) > 0xFFFF ? _t_137.slice(2) : _t_137.slice(1));
                      if (_t_140 === "") {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if ((_t_1 & 3) == 1) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    } else if (_t_1 == 112) {
      const _t_141 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_141 !== "") {
        const _t_142 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(0, 2) : _t_141[0]);
        const _t_143 = _t_142.codePointAt(0);
        if (_t_143 == 105) {
          const _t_144 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(2) : _t_141.slice(1));
          if (_t_144 !== "") {
            const _t_145 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(0, 2) : _t_144[0]);
            const _t_146 = _t_145.codePointAt(0);
            if (_t_146 == 110) {
              const _t_147 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(2) : _t_144.slice(1));
              if (_t_147 !== "") {
                const _t_148 = (_t_147.codePointAt(0) > 0xFFFF ? _t_147.slice(0, 2) : _t_147[0]);
                const _t_149 = _t_148.codePointAt(0);
                if (_t_149 == 103) {
                  const _t_150 = (_t_147.codePointAt(0) > 0xFFFF ? _t_147.slice(2) : _t_147.slice(1));
                  if (_t_150 === "") {
                    return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$anthropic_json$(_value_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "type")))), run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047codecs$anthropic_fields$(_x_0, _value_0);
}));
}

function $$$$047$$$047ai$047bend$047codecs$claude_result$(_failed_0, _subtype_0) {
  if (_failed_0.$ === "Some") {
    const _t_0 = _failed_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Boolean") {
      const _t_1 = _t_0["value"];
      if (!_t_1) {
        if (_subtype_0.$ === "Some") {
          const _t_2 = _subtype_0["value"];
          if (_t_2.$ === "../../ai/bend/wire_json.Text") {
            const _t_3 = _t_2["value"];
            if (_t_3 !== "") {
              const _t_4 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(0, 2) : _t_3[0]);
              const _t_5 = _t_4.codePointAt(0);
              if (_t_5 == 115) {
                const _t_6 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(2) : _t_3.slice(1));
                if (_t_6 !== "") {
                  const _t_7 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(0, 2) : _t_6[0]);
                  const _t_8 = _t_7.codePointAt(0);
                  if (_t_8 == 117) {
                    const _t_9 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(2) : _t_6.slice(1));
                    if (_t_9 !== "") {
                      const _t_10 = (_t_9.codePointAt(0) > 0xFFFF ? _t_9.slice(0, 2) : _t_9[0]);
                      const _t_11 = _t_10.codePointAt(0);
                      if (_t_11 == 99) {
                        const _t_12 = (_t_9.codePointAt(0) > 0xFFFF ? _t_9.slice(2) : _t_9.slice(1));
                        if (_t_12 !== "") {
                          const _t_13 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(0, 2) : _t_12[0]);
                          const _t_14 = _t_13.codePointAt(0);
                          if (_t_14 == 99) {
                            const _t_15 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(2) : _t_12.slice(1));
                            if (_t_15 !== "") {
                              const _t_16 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(0, 2) : _t_15[0]);
                              const _t_17 = _t_16.codePointAt(0);
                              if (_t_17 == 101) {
                                const _t_18 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(2) : _t_15.slice(1));
                                if (_t_18 !== "") {
                                  const _t_19 = (_t_18.codePointAt(0) > 0xFFFF ? _t_18.slice(0, 2) : _t_18[0]);
                                  const _t_20 = _t_19.codePointAt(0);
                                  if (_t_20 == 115) {
                                    const _t_21 = (_t_18.codePointAt(0) > 0xFFFF ? _t_18.slice(2) : _t_18.slice(1));
                                    if (_t_21 !== "") {
                                      const _t_22 = (_t_21.codePointAt(0) > 0xFFFF ? _t_21.slice(0, 2) : _t_21[0]);
                                      const _t_23 = _t_22.codePointAt(0);
                                      if (_t_23 == 115) {
                                        const _t_24 = (_t_21.codePointAt(0) > 0xFFFF ? _t_21.slice(2) : _t_21.slice(1));
                                        if (_t_24 === "") {
                                          return {$: "Done", "value": {$: "../../ai/bend/codecs.DoneEvent"}};
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProviderError"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$claude_stream_result$(_result_0) {
  if (_result_0.$ === "Done") {
    const _t_0 = _result_0["value"];
    if (_t_0.$ === "../../ai/bend/codecs.DoneEvent") {
      return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
    } else {
      return {$: "Done", "value": _t_0};
    }
  } else {
    return _result_0;
  }
}

function $$$$047$$$047ai$047bend$047codecs$claude_stream$(_value_0) {
  if (_value_0.$ === "Some") {
    const _d_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047codecs$claude_stream_result$(run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_json$(_d_0)));
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
  }
}

function $$$$047$$$047ai$047bend$047codecs$claude_fields$(_kind_0, _value_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 115) {
      const _t_2 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 116) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 114) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 101) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 97) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 109) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 95) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 101) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 118) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 101) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 110) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 116) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 === "") {
                                                    return $$$$047$$$047ai$047bend$047codecs$claude_stream$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "event")));
                                                  } else {
                                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                                }
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else if ((_t_4 & 1) == 0) {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        } else if (_t_4 == 121) {
          const _t_36 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_36 !== "") {
            const _t_37 = (_t_36.codePointAt(0) > 0xFFFF ? _t_36.slice(0, 2) : _t_36[0]);
            const _t_38 = _t_37.codePointAt(0);
            if (_t_38 == 115) {
              const _t_39 = (_t_36.codePointAt(0) > 0xFFFF ? _t_36.slice(2) : _t_36.slice(1));
              if (_t_39 !== "") {
                const _t_40 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(0, 2) : _t_39[0]);
                const _t_41 = _t_40.codePointAt(0);
                if (_t_41 == 116) {
                  const _t_42 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(2) : _t_39.slice(1));
                  if (_t_42 !== "") {
                    const _t_43 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(0, 2) : _t_42[0]);
                    const _t_44 = _t_43.codePointAt(0);
                    if (_t_44 == 101) {
                      const _t_45 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(2) : _t_42.slice(1));
                      if (_t_45 !== "") {
                        const _t_46 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(0, 2) : _t_45[0]);
                        const _t_47 = _t_46.codePointAt(0);
                        if (_t_47 == 109) {
                          const _t_48 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(2) : _t_45.slice(1));
                          if (_t_48 === "") {
                            return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if ((_t_1 & 3) == 3) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    } else if (_t_1 == 97) {
      const _t_49 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_49 !== "") {
        const _t_50 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(0, 2) : _t_49[0]);
        const _t_51 = _t_50.codePointAt(0);
        if (_t_51 == 115) {
          const _t_52 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(2) : _t_49.slice(1));
          if (_t_52 !== "") {
            const _t_53 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(0, 2) : _t_52[0]);
            const _t_54 = _t_53.codePointAt(0);
            if (_t_54 == 115) {
              const _t_55 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(2) : _t_52.slice(1));
              if (_t_55 !== "") {
                const _t_56 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(0, 2) : _t_55[0]);
                const _t_57 = _t_56.codePointAt(0);
                if (_t_57 == 105) {
                  const _t_58 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(2) : _t_55.slice(1));
                  if (_t_58 !== "") {
                    const _t_59 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(0, 2) : _t_58[0]);
                    const _t_60 = _t_59.codePointAt(0);
                    if (_t_60 == 115) {
                      const _t_61 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(2) : _t_58.slice(1));
                      if (_t_61 !== "") {
                        const _t_62 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(0, 2) : _t_61[0]);
                        const _t_63 = _t_62.codePointAt(0);
                        if (_t_63 == 116) {
                          const _t_64 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(2) : _t_61.slice(1));
                          if (_t_64 !== "") {
                            const _t_65 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(0, 2) : _t_64[0]);
                            const _t_66 = _t_65.codePointAt(0);
                            if (_t_66 == 97) {
                              const _t_67 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(2) : _t_64.slice(1));
                              if (_t_67 !== "") {
                                const _t_68 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(0, 2) : _t_67[0]);
                                const _t_69 = _t_68.codePointAt(0);
                                if (_t_69 == 110) {
                                  const _t_70 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(2) : _t_67.slice(1));
                                  if (_t_70 !== "") {
                                    const _t_71 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(0, 2) : _t_70[0]);
                                    const _t_72 = _t_71.codePointAt(0);
                                    if (_t_72 == 116) {
                                      const _t_73 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(2) : _t_70.slice(1));
                                      if (_t_73 === "") {
                                        return {$: "Done", "value": {$: "../../ai/bend/codecs.Ignored"}};
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if ((_t_1 & 3) == 1) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    } else if (_t_1 == 114) {
      const _t_74 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_74 !== "") {
        const _t_75 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(0, 2) : _t_74[0]);
        const _t_76 = _t_75.codePointAt(0);
        if (_t_76 == 101) {
          const _t_77 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(2) : _t_74.slice(1));
          if (_t_77 !== "") {
            const _t_78 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(0, 2) : _t_77[0]);
            const _t_79 = _t_78.codePointAt(0);
            if (_t_79 == 115) {
              const _t_80 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(2) : _t_77.slice(1));
              if (_t_80 !== "") {
                const _t_81 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(0, 2) : _t_80[0]);
                const _t_82 = _t_81.codePointAt(0);
                if (_t_82 == 117) {
                  const _t_83 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(2) : _t_80.slice(1));
                  if (_t_83 !== "") {
                    const _t_84 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(0, 2) : _t_83[0]);
                    const _t_85 = _t_84.codePointAt(0);
                    if (_t_85 == 108) {
                      const _t_86 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(2) : _t_83.slice(1));
                      if (_t_86 !== "") {
                        const _t_87 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(0, 2) : _t_86[0]);
                        const _t_88 = _t_87.codePointAt(0);
                        if (_t_88 == 116) {
                          const _t_89 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(2) : _t_86.slice(1));
                          if (_t_89 === "") {
                            return $$$$047$$$047ai$047bend$047codecs$claude_result$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "is_error")), ($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "subtype")));
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
    }
  } else {
    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
  }
}

function $$$$047$$$047ai$047bend$047codecs$claude_json$(_value_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047codecs$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, "type")))), run_clo((_x_0) => {
  return $$$$047$$$047ai$047bend$047codecs$claude_fields$(_x_0, _value_0);
}));
}

function $$$$047$$$047ai$047bend$047codecs$parsed$(_provider_0, _result_0) {
  if (_provider_0.$ === "../../ai/bend/codecs.OpenRouter") {
    if (_result_0.$ === "Fail") {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    } else {
      const _value_0 = _result_0["value"];
      return $$$$047$$$047ai$047bend$047codecs$router_json$(_value_0);
    }
  } else if (_provider_0.$ === "../../ai/bend/codecs.Responses") {
    if (_result_0.$ === "Fail") {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    } else {
      const _value_1 = _result_0["value"];
      return $$$$047$$$047ai$047bend$047codecs$responses_json$(_value_1);
    }
  } else if (_provider_0.$ === "../../ai/bend/codecs.Anthropic") {
    if (_result_0.$ === "Fail") {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    } else {
      const _value_2 = _result_0["value"];
      return $$$$047$$$047ai$047bend$047codecs$anthropic_json$(_value_2);
    }
  } else {
    if (_result_0.$ === "Fail") {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047codecs$protocol_error$())};
    } else {
      const _value_3 = _result_0["value"];
      return $$$$047$$$047ai$047bend$047codecs$claude_json$(_value_3);
    }
  }
}

function $$$$047$$$047ai$047bend$047codecs$decode$(_provider_0, _data_0) {
  if (_provider_0.$ === "../../ai/bend/codecs.OpenRouter") {
    if (_data_0 !== "") {
      const _t_0 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(0, 2) : _data_0[0]);
      const _t_1 = _t_0.codePointAt(0);
      if (_t_1 == 91) {
        const _t_2 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
        if (_t_2 !== "") {
          const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
          const _t_4 = _t_3.codePointAt(0);
          if (_t_4 == 68) {
            const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
            if (_t_5 !== "") {
              const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
              const _t_7 = _t_6.codePointAt(0);
              if (_t_7 == 79) {
                const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
                if (_t_8 !== "") {
                  const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                  const _t_10 = _t_9.codePointAt(0);
                  if (_t_10 == 78) {
                    const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                    if (_t_11 !== "") {
                      const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                      const _t_13 = _t_12.codePointAt(0);
                      if (_t_13 == 69) {
                        const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                        if (_t_14 !== "") {
                          const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                          const _t_16 = _t_15.codePointAt(0);
                          if (_t_16 == 93) {
                            const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                            if (_t_17 === "") {
                              return {$: "Done", "value": {$: "../../ai/bend/codecs.DoneEvent"}};
                            } else {
                              return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + ("N" + ("E" + ("]" + _t_17)))))))));
                            }
                          } else {
                            const _356_0 = u32_to_word(_t_16)["head"];
                            const _357_0 = u32_to_word(_t_16)["tail"];
                            const _353_0 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                            return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + ("N" + ("E" + (char_new(word_to_u32({$: "WCon", "head": _356_0, "tail": _357_0})) + _353_0)))))))));
                          }
                        } else {
                          return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + ("N" + ("E" + _t_14))))))));
                        }
                      } else {
                        const _288_0 = u32_to_word(_t_13)["head"];
                        const _289_0 = u32_to_word(_t_13)["tail"];
                        const _285_0 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                        return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + ("N" + (char_new(word_to_u32({$: "WCon", "head": _288_0, "tail": _289_0})) + _285_0))))))));
                      }
                    } else {
                      return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + ("N" + _t_11)))))));
                    }
                  } else {
                    const _220_0 = u32_to_word(_t_10)["head"];
                    const _221_0 = u32_to_word(_t_10)["tail"];
                    const _217_0 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                    return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + (char_new(word_to_u32({$: "WCon", "head": _220_0, "tail": _221_0})) + _217_0)))))));
                  }
                } else {
                  return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + ("O" + _t_8))))));
                }
              } else {
                const _152_0 = u32_to_word(_t_7)["head"];
                const _153_0 = u32_to_word(_t_7)["tail"];
                const _149_0 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
                return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + (char_new(word_to_u32({$: "WCon", "head": _152_0, "tail": _153_0})) + _149_0))))));
              }
            } else {
              return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + ("D" + _t_5)))));
            }
          } else {
            const _84_0 = u32_to_word(_t_4)["head"];
            const _85_0 = u32_to_word(_t_4)["tail"];
            const _81_0 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
            return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + (char_new(word_to_u32({$: "WCon", "head": _84_0, "tail": _85_0})) + _81_0)))));
          }
        } else {
          return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(("[" + _t_2))));
        }
      } else {
        const _16_0 = u32_to_word(_t_1)["head"];
        const _17_0 = u32_to_word(_t_1)["tail"];
        const _13_0 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
        return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$((char_new(word_to_u32({$: "WCon", "head": _16_0, "tail": _17_0})) + _13_0))));
      }
    } else {
      return $$$$047$$$047ai$047bend$047codecs$parsed$({$: "../../ai/bend/codecs.OpenRouter"}, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(_data_0)));
    }
  } else {
    return $$$$047$$$047ai$047bend$047codecs$parsed$(_provider_0, run_loop($$$$047$$$047ai$047bend$047wire_json$read$(_data_0)));
  }
}

function $$$$047$$$047ai$047bend$047protocol$initial$(_provider_0) {
  return {$: "../../ai/bend/protocol.StreamState", "provider": _provider_0, "phase": {$: "../../ai/bend/protocol.Streaming"}, "text": "", "frames": 0, "finished": false, "usage": {$: "../../ai/bend/codecs.Usage", "input_tokens": 0, "output_tokens": 0}};
}

function $$$$047$$$047ai$047bend$047protocol$text$(_s_0) {
  const _text_0 = _s_0["text"];
  return _text_0;
}

function $$$$047$$$047ai$047bend$047protocol$terminal$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "../../ai/bend/protocol.Streaming") {
    return false;
  } else {
    return true;
  }
}

function $$$$047$$$047ai$047bend$047protocol$error_summary$(_error_0) {
  const _t_0 = _error_0["code"];
  if (_t_0.$ === "../../ai/bend/codecs.TransportError") {
    return "transport_error";
  } else if (_t_0.$ === "../../ai/bend/codecs.ProtocolError") {
    return "protocol_error";
  } else if (_t_0.$ === "../../ai/bend/codecs.TruncatedStream") {
    return "truncated_stream";
  } else if (_t_0.$ === "../../ai/bend/codecs.ProviderError") {
    return "provider_error";
  } else if (_t_0.$ === "../../ai/bend/codecs.FrameLimit") {
    return "frame_limit";
  } else {
    return "unsupported_event";
  }
}

function $$$$047$$$047ai$047bend$047protocol$fail$(_error_0, _s_0) {
  const _p_0 = _s_0["provider"];
  const _text_0 = _s_0["text"];
  const _n_0 = _s_0["frames"];
  const _finish_0 = _s_0["finished"];
  const _usage_0 = _s_0["usage"];
  return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _text_0, "frames": _n_0, "finished": _finish_0, "usage": _usage_0}, "event": {$: "../../ai/bend/protocol.TextFailed", "error": _error_0}};
}

function $$$$047$$$047ai$047bend$047protocol$complete$(_ok_0, _s_0) {
  if (_ok_0) {
    const _p_0 = _s_0["provider"];
    const _text_0 = _s_0["text"];
    const _n_0 = _s_0["frames"];
    const _finish_0 = _s_0["finished"];
    const _usage_0 = _s_0["usage"];
    return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _text_0, "frames": _n_0, "finished": _finish_0, "usage": _usage_0}, "event": {$: "../../ai/bend/protocol.TextComplete"}};
  } else {
    return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TruncatedStream"}, "status": 0, "request_id": ""}, _s_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$complete_ready$(_p_0, _finished_0) {
  if (_p_0.$ === "../../ai/bend/codecs.OpenRouter") {
    return _finished_0;
  } else if (_p_0.$ === "../../ai/bend/codecs.Anthropic") {
    return _finished_0;
  } else {
    return true;
  }
}

function $$$$047$$$047ai$047bend$047protocol$apply_delta$(_ok_0, _delta_0, _s_0) {
  if (_ok_0) {
    const _p_0 = _s_0["provider"];
    const _phase_0 = _s_0["phase"];
    const _text_0 = _s_0["text"];
    const _n_0 = _s_0["frames"];
    const _finish_0 = _s_0["finished"];
    const _usage_0 = _s_0["usage"];
    return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": _phase_0, "text": (_text_0 + _delta_0), "frames": _n_0, "finished": _finish_0, "usage": _usage_0}, "event": {$: "../../ai/bend/protocol.TextDelta", "text": _delta_0}};
  } else {
    return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}, _s_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$apply_result$(_result_0, _s_0) {
  if (_result_0.$ === "Fail") {
    const _error_0 = _result_0["error"];
    return $$$$047$$$047ai$047bend$047protocol$fail$(_error_0, _s_0);
  } else {
    const _t_0 = _result_0["value"];
    if (_t_0.$ === "../../ai/bend/codecs.Delta") {
      const _delta_0 = _t_0["text"];
      const _p_0 = _s_0["provider"];
      const _phase_0 = _s_0["phase"];
      const _txt_0 = _s_0["text"];
      const _n_0 = _s_0["frames"];
      const _t_1 = _s_0["finished"];
      if (!_t_1) {
        const _usage_0 = _s_0["usage"];
        const _x_0 = [..._txt_0].length;
        const _x_1 = [..._delta_0].length;
        return $$$$047$$$047ai$047bend$047protocol$apply_delta$(($Nat$is_le$(nat_chk(_x_0 + _x_1), 1048576)), _delta_0, {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": _phase_0, "text": _txt_0, "frames": _n_0, "finished": false, "usage": _usage_0});
      } else {
        const _usage_1 = _s_0["usage"];
        return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""}, {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": _phase_0, "text": _txt_0, "frames": _n_0, "finished": true, "usage": _usage_1});
      }
    } else if (_t_0.$ === "../../ai/bend/codecs.Finished") {
      const _t_2 = _t_0["reason"];
      if (_t_2.$ === "../../ai/bend/codecs.Stop") {
        const _p_1 = _s_0["provider"];
        const _phase_1 = _s_0["phase"];
        const _txt_1 = _s_0["text"];
        const _n_1 = _s_0["frames"];
        const _t_3 = _s_0["finished"];
        if (!_t_3) {
          const _usage_2 = _s_0["usage"];
          return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": _phase_1, "text": _txt_1, "frames": _n_1, "finished": true, "usage": _usage_2}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
        } else {
          const _usage_3 = _s_0["usage"];
          return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TruncatedStream"}, "status": 0, "request_id": ""}, {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": _phase_1, "text": _txt_1, "frames": _n_1, "finished": _t_3, "usage": _usage_3});
        }
      } else if (_t_2.$ === "../../ai/bend/codecs.ToolCalls") {
        return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}, _s_0);
      } else {
        return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TruncatedStream"}, "status": 0, "request_id": ""}, _s_0);
      }
    } else if (_t_0.$ === "../../ai/bend/codecs.DoneEvent") {
      const _p_2 = _s_0["provider"];
      const _phase_2 = _s_0["phase"];
      const _txt_2 = _s_0["text"];
      const _n_2 = _s_0["frames"];
      const _finished_0 = _s_0["finished"];
      const _usage_4 = _s_0["usage"];
      return $$$$047$$$047ai$047bend$047protocol$complete$(($$$$047$$$047ai$047bend$047protocol$complete_ready$(_p_2, _finished_0)), {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": _phase_2, "text": _txt_2, "frames": _n_2, "finished": _finished_0, "usage": _usage_4});
    } else if (_t_0.$ === "../../ai/bend/codecs.UsageEvent") {
      const _new_0 = _t_0["usage"];
      const _p_3 = _s_0["provider"];
      const _phase_3 = _s_0["phase"];
      const _txt_3 = _s_0["text"];
      const _n_3 = _s_0["frames"];
      const _finished_1 = _s_0["finished"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": _phase_3, "text": _txt_3, "frames": _n_3, "finished": _finished_1, "usage": _new_0}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_0.$ === "../../ai/bend/codecs.Identity") {
      return {$: "../../ai/bend/protocol.Transition", "state": _s_0, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else {
      return {$: "../../ai/bend/protocol.Transition", "state": _s_0, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    }
  }
}

function $$$$047$$$047ai$047bend$047protocol$data_checked$(_ok_0, _data_0, _s_0) {
  if (!_ok_0) {
    return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}, _s_0);
  } else {
    const _p_0 = _s_0["provider"];
    const _phase_0 = _s_0["phase"];
    const _txt_0 = _s_0["text"];
    const _n_0 = _s_0["frames"];
    const _finished_0 = _s_0["finished"];
    const _usage_0 = _s_0["usage"];
    return $$$$047$$$047ai$047bend$047protocol$apply_result$(run_loop($$$$047$$$047ai$047bend$047codecs$decode$(_p_0, _data_0)), {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": _phase_0, "text": _txt_0, "frames": ((_n_0 + 1) >>> 0), "finished": _finished_0, "usage": _usage_0});
  }
}

function $$$$047$$$047ai$047bend$047protocol$reduce$(_frame_0, _s_0) {
  if (_frame_0.$ === "../../ai/bend/protocol.CancelFrame") {
    const _p_0 = _s_0["provider"];
    const _t_0 = _s_0["phase"];
    if (_t_0.$ === "../../ai/bend/protocol.Completed") {
      const _txt_0 = _s_0["text"];
      const _n_0 = _s_0["frames"];
      const _finished_0 = _s_0["finished"];
      const _usage_0 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_0, "frames": _n_0, "finished": _finished_0, "usage": _usage_0}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_0.$ === "../../ai/bend/protocol.Cancelled") {
      const _txt_1 = _s_0["text"];
      const _n_1 = _s_0["frames"];
      const _finished_1 = _s_0["finished"];
      const _usage_1 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_1, "frames": _n_1, "finished": _finished_1, "usage": _usage_1}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_0.$ === "../../ai/bend/protocol.Failed") {
      const _txt_2 = _s_0["text"];
      const _n_2 = _s_0["frames"];
      const _finished_2 = _s_0["finished"];
      const _usage_2 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_2, "frames": _n_2, "finished": _finished_2, "usage": _usage_2}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else {
      const _txt_3 = _s_0["text"];
      const _n_3 = _s_0["frames"];
      const _finished_3 = _s_0["finished"];
      const _usage_3 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_3, "frames": _n_3, "finished": _finished_3, "usage": _usage_3}, "event": {$: "../../ai/bend/protocol.TextCancelled"}};
    }
  } else if (_frame_0.$ === "../../ai/bend/protocol.TransportFailed") {
    const _status_0 = _frame_0["status"];
    const _id_0 = _frame_0["request_id"];
    const _p_1 = _s_0["provider"];
    const _t_1 = _s_0["phase"];
    if (_t_1.$ === "../../ai/bend/protocol.Completed") {
      const _txt_4 = _s_0["text"];
      const _n_4 = _s_0["frames"];
      const _finished_4 = _s_0["finished"];
      const _usage_4 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_4, "frames": _n_4, "finished": _finished_4, "usage": _usage_4}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_1.$ === "../../ai/bend/protocol.Cancelled") {
      const _txt_5 = _s_0["text"];
      const _n_5 = _s_0["frames"];
      const _finished_5 = _s_0["finished"];
      const _usage_5 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_5, "frames": _n_5, "finished": _finished_5, "usage": _usage_5}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_1.$ === "../../ai/bend/protocol.Failed") {
      const _txt_6 = _s_0["text"];
      const _n_6 = _s_0["frames"];
      const _finished_6 = _s_0["finished"];
      const _usage_6 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_6, "frames": _n_6, "finished": _finished_6, "usage": _usage_6}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else {
      const _txt_7 = _s_0["text"];
      const _n_7 = _s_0["frames"];
      const _finished_7 = _s_0["finished"];
      const _usage_7 = _s_0["usage"];
      return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TransportError"}, "status": _status_0, "request_id": _id_0}, {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": _t_1, "text": _txt_7, "frames": _n_7, "finished": _finished_7, "usage": _usage_7});
    }
  } else if (_frame_0.$ === "../../ai/bend/protocol.EndFrame") {
    const _p_2 = _s_0["provider"];
    const _t_2 = _s_0["phase"];
    if (_t_2.$ === "../../ai/bend/protocol.Completed") {
      const _txt_8 = _s_0["text"];
      const _n_8 = _s_0["frames"];
      const _finished_8 = _s_0["finished"];
      const _usage_8 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_8, "frames": _n_8, "finished": _finished_8, "usage": _usage_8}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_2.$ === "../../ai/bend/protocol.Cancelled") {
      const _txt_9 = _s_0["text"];
      const _n_9 = _s_0["frames"];
      const _finished_9 = _s_0["finished"];
      const _usage_9 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_9, "frames": _n_9, "finished": _finished_9, "usage": _usage_9}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_2.$ === "../../ai/bend/protocol.Failed") {
      const _txt_10 = _s_0["text"];
      const _n_10 = _s_0["frames"];
      const _finished_10 = _s_0["finished"];
      const _usage_10 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_10, "frames": _n_10, "finished": _finished_10, "usage": _usage_10}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else {
      const _txt_11 = _s_0["text"];
      const _n_11 = _s_0["frames"];
      const _finished_11 = _s_0["finished"];
      const _usage_11 = _s_0["usage"];
      return $$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.TruncatedStream"}, "status": 0, "request_id": ""}, {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": _t_2, "text": _txt_11, "frames": _n_11, "finished": _finished_11, "usage": _usage_11});
    }
  } else {
    const _data_0 = _frame_0["data"];
    const _p_3 = _s_0["provider"];
    const _t_3 = _s_0["phase"];
    if (_t_3.$ === "../../ai/bend/protocol.Completed") {
      const _txt_12 = _s_0["text"];
      const _n_12 = _s_0["frames"];
      const _finished_12 = _s_0["finished"];
      const _usage_12 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_12, "frames": _n_12, "finished": _finished_12, "usage": _usage_12}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_3.$ === "../../ai/bend/protocol.Cancelled") {
      const _txt_13 = _s_0["text"];
      const _n_13 = _s_0["frames"];
      const _finished_13 = _s_0["finished"];
      const _usage_13 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_13, "frames": _n_13, "finished": _finished_13, "usage": _usage_13}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else if (_t_3.$ === "../../ai/bend/protocol.Failed") {
      const _txt_14 = _s_0["text"];
      const _n_14 = _s_0["frames"];
      const _finished_14 = _s_0["finished"];
      const _usage_14 = _s_0["usage"];
      return {$: "../../ai/bend/protocol.Transition", "state": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_14, "frames": _n_14, "finished": _finished_14, "usage": _usage_14}, "event": {$: "../../ai/bend/protocol.TextIgnored"}};
    } else {
      const _txt_15 = _s_0["text"];
      const _n_15 = _s_0["frames"];
      const _finished_15 = _s_0["finished"];
      const _usage_15 = _s_0["usage"];
      return $$$$047$$$047ai$047bend$047protocol$data_checked$(($Bool$and$((_n_15 < 100000), ($Nat$is_le$([..._data_0].length, 1048576)))), _data_0, {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": _t_3, "text": _txt_15, "frames": _n_15, "finished": _finished_15, "usage": _usage_15});
    }
  }
}

function $$$$047$$$047ai$047bend$047protocol$raw_initial$(_provider_0, _framing_0) {
  return {$: "../../ai/bend/protocol.RawState", "framing": _framing_0, "stream": ($$$$047$$$047ai$047bend$047protocol$initial$(_provider_0)), "line": "", "payload": "", "line_chars": 0, "payload_chars": 0};
}

function $$$$047$$$047ai$047bend$047protocol$raw_stream$(_s_0) {
  const _stream_0 = _s_0["stream"];
  return _stream_0;
}

function $$$$047$$$047ai$047bend$047protocol$append_event$(_events_0, _event_0) {
  if (_events_0.$ === "Nil") {
    return {$: "Con", "head": _event_0, "tail": {$: "Nil"}};
  } else {
    const _head_0 = _events_0["head"];
    const _tail_0 = _events_0["tail"];
    return {$: "Con", "head": _head_0, "tail": ($$$$047$$$047ai$047bend$047protocol$append_event$(_tail_0, _event_0))};
  }
}

function $$$$047$$$047ai$047bend$047protocol$strip_cr_reverse$(_s_0) {
  if (_s_0 !== "") {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 13) {
      const _tail_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return $String$reverse$(_tail_0);
    } else {
      const _10_0 = u32_to_word(_t_1)["head"];
      const _11_0 = u32_to_word(_t_1)["tail"];
      const _tail_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return $String$reverse$((char_new(word_to_u32({$: "WCon", "head": _10_0, "tail": _11_0})) + _tail_1));
    }
  } else {
    return $String$reverse$(_s_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$strip_cr$(_s_0) {
  return $$$$047$$$047ai$047bend$047protocol$strip_cr_reverse$(($String$reverse$(_s_0)));
}

function $$$$047$$$047ai$047bend$047protocol$strip_space$(_s_0) {
  if (_s_0 !== "") {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 32) {
      const _tail_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return _tail_0;
    } else {
      const _10_0 = u32_to_word(_t_1)["head"];
      const _11_0 = u32_to_word(_t_1)["tail"];
      const _tail_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      return (char_new(word_to_u32({$: "WCon", "head": _10_0, "tail": _11_0})) + _tail_1);
    }
  } else {
    return _s_0;
  }
}

function $$$$047$$$047ai$047bend$047protocol$raw_event$(_t_0, _framing_0) {
  const _stream_0 = _t_0["state"];
  const _event_0 = _t_0["event"];
  return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _framing_0, "stream": _stream_0, "line": "", "payload": "", "line_chars": 0, "payload_chars": 0}, "events": {$: "Con", "head": _event_0, "tail": {$: "Nil"}}};
}

function $$$$047$$$047ai$047bend$047protocol$sse_empty$(_empty_0, _stream_0, _payload_0) {
  if (_empty_0) {
    return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": {$: "../../ai/bend/protocol.SSE"}, "stream": _stream_0, "line": "", "payload": "", "line_chars": 0, "payload_chars": 0}, "events": {$: "Nil"}};
  } else {
    return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$reduce$({$: "../../ai/bend/protocol.DataFrame", "data": _payload_0}, _stream_0)), {$: "../../ai/bend/protocol.SSE"});
  }
}

function $$$$047$$$047ai$047bend$047protocol$sse_data$(_ok_0, _stream_0, _payload_0, _data_0, _chars_0) {
  if (!_ok_0) {
    return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}, _stream_0)), {$: "../../ai/bend/protocol.SSE"});
  } else {
    return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": {$: "../../ai/bend/protocol.SSE"}, "stream": _stream_0, "line": "", "payload": (_payload_0 + _data_0), "line_chars": 0, "payload_chars": _chars_0}, "events": {$: "Nil"}};
  }
}

function $$$$047$$$047ai$047bend$047protocol$sse_join$(_empty_0, _payload_0, _data_0) {
  if (_empty_0) {
    return (_payload_0 + _data_0);
  } else {
    const _x_0 = ("\n" + _data_0);
    return (_payload_0 + _x_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$sse_line_append$(_stream_0, _payload_0, _data_0, _chars_0) {
  const _x_0 = [..._payload_0].length;
  const _x_1 = [..._data_0].length;
  const _x_2 = nat_chk(_x_0 + _x_1);
  return $$$$047$$$047ai$047bend$047protocol$sse_data$(($Nat$is_le$(nat_chk(_x_2 + 1), 1048576)), _stream_0, "", ($$$$047$$$047ai$047bend$047protocol$sse_join$(($String$is_empty$(_payload_0)), _payload_0, _data_0)), _chars_0);
}

function $$$$047$$$047ai$047bend$047protocol$sse_line_data$(_is_data_0, _line_0, _stream_0, _payload_0, _chars_0) {
  if (!_is_data_0) {
    return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": {$: "../../ai/bend/protocol.SSE"}, "stream": _stream_0, "line": "", "payload": _payload_0, "line_chars": 0, "payload_chars": _chars_0}, "events": {$: "Nil"}};
  } else {
    return $$$$047$$$047ai$047bend$047protocol$sse_line_append$(_stream_0, _payload_0, ($$$$047$$$047ai$047bend$047protocol$strip_space$(($String$drop$(_line_0, 5)))), _chars_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$sse_line$(_empty_0, _line_0, _stream_0, _payload_0, _chars_0) {
  if (_empty_0) {
    return $$$$047$$$047ai$047bend$047protocol$sse_empty$(($String$is_empty$(_payload_0)), _stream_0, _payload_0);
  } else {
    return $$$$047$$$047ai$047bend$047protocol$sse_line_data$(($String$eq$(($String$take$(_line_0, 5)), "data:")), _line_0, _stream_0, _payload_0, _chars_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$ndjson_line$(_empty_0, _line_0, _stream_0) {
  if (_empty_0) {
    return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": {$: "../../ai/bend/protocol.NDJSON"}, "stream": _stream_0, "line": "", "payload": "", "line_chars": 0, "payload_chars": 0}, "events": {$: "Nil"}};
  } else {
    return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$reduce$({$: "../../ai/bend/protocol.DataFrame", "data": _line_0}, _stream_0)), {$: "../../ai/bend/protocol.NDJSON"});
  }
}

function $$$$047$$$047ai$047bend$047protocol$process_line$(_f_0, _line_0, _stream_0, _payload_0, _chars_0) {
  if (_f_0.$ === "../../ai/bend/protocol.SSE") {
    return $$$$047$$$047ai$047bend$047protocol$sse_line$(($String$is_empty$(_line_0)), _line_0, _stream_0, _payload_0, _chars_0);
  } else {
    return $$$$047$$$047ai$047bend$047protocol$ndjson_line$(($String$is_empty$(_line_0)), _line_0, _stream_0);
  }
}

function $$$$047$$$047ai$047bend$047protocol$line_done$(_s_0) {
  const _f_0 = _s_0["framing"];
  const _stream_0 = _s_0["stream"];
  const _line_0 = _s_0["line"];
  const _payload_0 = _s_0["payload"];
  const _m_0 = _s_0["payload_chars"];
  return $$$$047$$$047ai$047bend$047protocol$process_line$(_f_0, ($$$$047$$$047ai$047bend$047protocol$strip_cr$(_line_0)), _stream_0, _payload_0, _m_0);
}

function $$$$047$$$047ai$047bend$047protocol$reverse_events$($0, $1) {
  for (;;) {
    {
      const _xs_0 = $0;
      const _acc_0 = $1;
      if (_xs_0.$ === "Nil") {
        return _acc_0;
      } else {
        const _head_0 = _xs_0["head"];
        const _tail_0 = _xs_0["tail"];
        $0 = _tail_0;
        $1 = {$: "Con", "head": _head_0, "tail": _acc_0};
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047protocol$feed_state$(_step_0) {
  const _state_0 = _step_0["state"];
  return _state_0;
}

function $$$$047$$$047ai$047bend$047protocol$feed_events$(_step_0) {
  const _events_0 = _step_0["events"];
  return _events_0;
}

function $$$$047$$$047ai$047bend$047protocol$feed_char$(_ok_0, _c_0, _s_0) {
  if (!_ok_0) {
    const _f_0 = _s_0["framing"];
    const _stream_0 = _s_0["stream"];
    return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$fail$({$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}, _stream_0)), _f_0);
  } else {
    const _f_1 = _s_0["framing"];
    const _stream_1 = _s_0["stream"];
    const _line_1 = _s_0["line"];
    const _payload_1 = _s_0["payload"];
    const _n_1 = _s_0["line_chars"];
    const _m_1 = _s_0["payload_chars"];
    const _x_0 = (_c_0 + "");
    return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_1, "stream": _stream_1, "line": (_line_1 + _x_0), "payload": _payload_1, "line_chars": ((_n_1 + 1) >>> 0), "payload_chars": _m_1}, "events": {$: "Nil"}};
  }
}

function $$$$047$$$047ai$047bend$047protocol$feed_run$($0, $1, $2) {
  for (;;) {
    {
      const _data_0 = $0;
      const _s_0 = $1;
      const _acc_0 = $2;
      if (_data_0 === "") {
        const _f_0 = _s_0["framing"];
        const _t_0 = _s_0["stream"];
        const _p_0 = _t_0["provider"];
        const _t_1 = _t_0["phase"];
        if (_t_1.$ === "../../ai/bend/protocol.Completed") {
          const _txt_0 = _t_0["text"];
          const _n_0 = _t_0["frames"];
          const _done_0 = _t_0["finished"];
          const _usage_0 = _t_0["usage"];
          const _line_0 = _s_0["line"];
          const _payload_0 = _s_0["payload"];
          const _a_0 = _s_0["line_chars"];
          const _b_0 = _s_0["payload_chars"];
          return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_0, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_0, "frames": _n_0, "finished": _done_0, "usage": _usage_0}, "line": _line_0, "payload": _payload_0, "line_chars": _a_0, "payload_chars": _b_0}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
        } else if (_t_1.$ === "../../ai/bend/protocol.Failed") {
          const _txt_1 = _t_0["text"];
          const _n_1 = _t_0["frames"];
          const _done_1 = _t_0["finished"];
          const _usage_1 = _t_0["usage"];
          const _line_1 = _s_0["line"];
          const _payload_1 = _s_0["payload"];
          const _a_1 = _s_0["line_chars"];
          const _b_1 = _s_0["payload_chars"];
          return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_0, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_1, "frames": _n_1, "finished": _done_1, "usage": _usage_1}, "line": _line_1, "payload": _payload_1, "line_chars": _a_1, "payload_chars": _b_1}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
        } else if (_t_1.$ === "../../ai/bend/protocol.Cancelled") {
          const _txt_2 = _t_0["text"];
          const _n_2 = _t_0["frames"];
          const _done_2 = _t_0["finished"];
          const _usage_2 = _t_0["usage"];
          const _line_2 = _s_0["line"];
          const _payload_2 = _s_0["payload"];
          const _a_2 = _s_0["line_chars"];
          const _b_2 = _s_0["payload_chars"];
          return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_0, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_2, "frames": _n_2, "finished": _done_2, "usage": _usage_2}, "line": _line_2, "payload": _payload_2, "line_chars": _a_2, "payload_chars": _b_2}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
        } else {
          const _txt_3 = _t_0["text"];
          const _n_3 = _t_0["frames"];
          const _done_3 = _t_0["finished"];
          const _usage_3 = _t_0["usage"];
          const _line_3 = _s_0["line"];
          const _payload_3 = _s_0["payload"];
          const _a_3 = _s_0["line_chars"];
          const _b_3 = _s_0["payload_chars"];
          return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_0, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_0, "phase": _t_1, "text": _txt_3, "frames": _n_3, "finished": _done_3, "usage": _usage_3}, "line": _line_3, "payload": _payload_3, "line_chars": _a_3, "payload_chars": _b_3}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
        }
      } else {
        const _t_2 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(0, 2) : _data_0[0]);
        const _t_3 = _t_2.codePointAt(0);
        if (_t_3 == 10) {
          const _rest_0 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_1 = _s_0["framing"];
          const _t_4 = _s_0["stream"];
          const _p_1 = _t_4["provider"];
          const _t_5 = _t_4["phase"];
          if (_t_5.$ === "../../ai/bend/protocol.Completed") {
            const _txt_4 = _t_4["text"];
            const _n_4 = _t_4["frames"];
            const _done_4 = _t_4["finished"];
            const _usage_4 = _t_4["usage"];
            const _line_4 = _s_0["line"];
            const _payload_4 = _s_0["payload"];
            const _a_4 = _s_0["line_chars"];
            const _b_4 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_1, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_4, "frames": _n_4, "finished": _done_4, "usage": _usage_4}, "line": _line_4, "payload": _payload_4, "line_chars": _a_4, "payload_chars": _b_4}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_5.$ === "../../ai/bend/protocol.Failed") {
            const _txt_5 = _t_4["text"];
            const _n_5 = _t_4["frames"];
            const _done_5 = _t_4["finished"];
            const _usage_5 = _t_4["usage"];
            const _line_5 = _s_0["line"];
            const _payload_5 = _s_0["payload"];
            const _a_5 = _s_0["line_chars"];
            const _b_5 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_1, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_5, "frames": _n_5, "finished": _done_5, "usage": _usage_5}, "line": _line_5, "payload": _payload_5, "line_chars": _a_5, "payload_chars": _b_5}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_5.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_6 = _t_4["text"];
            const _n_6 = _t_4["frames"];
            const _done_6 = _t_4["finished"];
            const _usage_6 = _t_4["usage"];
            const _line_6 = _s_0["line"];
            const _payload_6 = _s_0["payload"];
            const _a_6 = _s_0["line_chars"];
            const _b_6 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_1, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_6, "frames": _n_6, "finished": _done_6, "usage": _usage_6}, "line": _line_6, "payload": _payload_6, "line_chars": _a_6, "payload_chars": _b_6}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_7 = _t_4["text"];
            const _n_7 = _t_4["frames"];
            const _done_7 = _t_4["finished"];
            const _usage_7 = _t_4["usage"];
            const _line_7 = _s_0["line"];
            const _payload_7 = _s_0["payload"];
            const _a_7 = _s_0["line_chars"];
            const _b_7 = _s_0["payload_chars"];
            const _step_0 = ($$$$047$$$047ai$047bend$047protocol$line_done$({$: "../../ai/bend/protocol.RawState", "framing": _f_1, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_1, "phase": _t_5, "text": _txt_7, "frames": _n_7, "finished": _done_7, "usage": _usage_7}, "line": _line_7, "payload": _payload_7, "line_chars": _a_7, "payload_chars": _b_7}));
            $0 = _rest_0;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_0));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_0)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 2147483647) == 10) {
          const _183_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _184_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_1 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_2 = _s_0["framing"];
          const _t_6 = _s_0["stream"];
          const _p_2 = _t_6["provider"];
          const _t_7 = _t_6["phase"];
          if (_t_7.$ === "../../ai/bend/protocol.Completed") {
            const _txt_8 = _t_6["text"];
            const _n_8 = _t_6["frames"];
            const _done_8 = _t_6["finished"];
            const _usage_8 = _t_6["usage"];
            const _line_8 = _s_0["line"];
            const _payload_8 = _s_0["payload"];
            const _a_8 = _s_0["line_chars"];
            const _b_8 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_2, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_8, "frames": _n_8, "finished": _done_8, "usage": _usage_8}, "line": _line_8, "payload": _payload_8, "line_chars": _a_8, "payload_chars": _b_8}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_7.$ === "../../ai/bend/protocol.Failed") {
            const _txt_9 = _t_6["text"];
            const _n_9 = _t_6["frames"];
            const _done_9 = _t_6["finished"];
            const _usage_9 = _t_6["usage"];
            const _line_9 = _s_0["line"];
            const _payload_9 = _s_0["payload"];
            const _a_9 = _s_0["line_chars"];
            const _b_9 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_2, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_9, "frames": _n_9, "finished": _done_9, "usage": _usage_9}, "line": _line_9, "payload": _payload_9, "line_chars": _a_9, "payload_chars": _b_9}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_7.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_10 = _t_6["text"];
            const _n_10 = _t_6["frames"];
            const _done_10 = _t_6["finished"];
            const _usage_10 = _t_6["usage"];
            const _line_10 = _s_0["line"];
            const _payload_10 = _s_0["payload"];
            const _a_10 = _s_0["line_chars"];
            const _b_10 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_2, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_10, "frames": _n_10, "finished": _done_10, "usage": _usage_10}, "line": _line_10, "payload": _payload_10, "line_chars": _a_10, "payload_chars": _b_10}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_11 = _t_6["text"];
            const _n_11 = _t_6["frames"];
            const _done_11 = _t_6["finished"];
            const _usage_11 = _t_6["usage"];
            const _line_11 = _s_0["line"];
            const _payload_11 = _s_0["payload"];
            const _a_11 = _s_0["line_chars"];
            const _b_11 = _s_0["payload_chars"];
            const _step_1 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_11 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _183_0, "tail": _184_0}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_2, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_2, "phase": _t_7, "text": _txt_11, "frames": _n_11, "finished": _done_11, "usage": _usage_11}, "line": _line_11, "payload": _payload_11, "line_chars": _a_11, "payload_chars": _b_11}));
            $0 = _rest_1;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_1));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_1)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 1073741823) == 10) {
          const _181_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _182_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_2 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_3 = _s_0["framing"];
          const _t_8 = _s_0["stream"];
          const _p_3 = _t_8["provider"];
          const _t_9 = _t_8["phase"];
          if (_t_9.$ === "../../ai/bend/protocol.Completed") {
            const _txt_12 = _t_8["text"];
            const _n_12 = _t_8["frames"];
            const _done_12 = _t_8["finished"];
            const _usage_12 = _t_8["usage"];
            const _line_12 = _s_0["line"];
            const _payload_12 = _s_0["payload"];
            const _a_12 = _s_0["line_chars"];
            const _b_12 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_3, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_12, "frames": _n_12, "finished": _done_12, "usage": _usage_12}, "line": _line_12, "payload": _payload_12, "line_chars": _a_12, "payload_chars": _b_12}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_9.$ === "../../ai/bend/protocol.Failed") {
            const _txt_13 = _t_8["text"];
            const _n_13 = _t_8["frames"];
            const _done_13 = _t_8["finished"];
            const _usage_13 = _t_8["usage"];
            const _line_13 = _s_0["line"];
            const _payload_13 = _s_0["payload"];
            const _a_13 = _s_0["line_chars"];
            const _b_13 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_3, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_13, "frames": _n_13, "finished": _done_13, "usage": _usage_13}, "line": _line_13, "payload": _payload_13, "line_chars": _a_13, "payload_chars": _b_13}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_9.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_14 = _t_8["text"];
            const _n_14 = _t_8["frames"];
            const _done_14 = _t_8["finished"];
            const _usage_14 = _t_8["usage"];
            const _line_14 = _s_0["line"];
            const _payload_14 = _s_0["payload"];
            const _a_14 = _s_0["line_chars"];
            const _b_14 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_3, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_14, "frames": _n_14, "finished": _done_14, "usage": _usage_14}, "line": _line_14, "payload": _payload_14, "line_chars": _a_14, "payload_chars": _b_14}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_15 = _t_8["text"];
            const _n_15 = _t_8["frames"];
            const _done_15 = _t_8["finished"];
            const _usage_15 = _t_8["usage"];
            const _line_15 = _s_0["line"];
            const _payload_15 = _s_0["payload"];
            const _a_15 = _s_0["line_chars"];
            const _b_15 = _s_0["payload_chars"];
            const _step_2 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_15 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _181_0, "tail": _182_0}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_3, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_3, "phase": _t_9, "text": _txt_15, "frames": _n_15, "finished": _done_15, "usage": _usage_15}, "line": _line_15, "payload": _payload_15, "line_chars": _a_15, "payload_chars": _b_15}));
            $0 = _rest_2;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_2));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_2)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 536870911) == 10) {
          const _179_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _180_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_3 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_4 = _s_0["framing"];
          const _t_10 = _s_0["stream"];
          const _p_4 = _t_10["provider"];
          const _t_11 = _t_10["phase"];
          if (_t_11.$ === "../../ai/bend/protocol.Completed") {
            const _txt_16 = _t_10["text"];
            const _n_16 = _t_10["frames"];
            const _done_16 = _t_10["finished"];
            const _usage_16 = _t_10["usage"];
            const _line_16 = _s_0["line"];
            const _payload_16 = _s_0["payload"];
            const _a_16 = _s_0["line_chars"];
            const _b_16 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_4, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_4, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_16, "frames": _n_16, "finished": _done_16, "usage": _usage_16}, "line": _line_16, "payload": _payload_16, "line_chars": _a_16, "payload_chars": _b_16}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_11.$ === "../../ai/bend/protocol.Failed") {
            const _txt_17 = _t_10["text"];
            const _n_17 = _t_10["frames"];
            const _done_17 = _t_10["finished"];
            const _usage_17 = _t_10["usage"];
            const _line_17 = _s_0["line"];
            const _payload_17 = _s_0["payload"];
            const _a_17 = _s_0["line_chars"];
            const _b_17 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_4, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_4, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_17, "frames": _n_17, "finished": _done_17, "usage": _usage_17}, "line": _line_17, "payload": _payload_17, "line_chars": _a_17, "payload_chars": _b_17}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_11.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_18 = _t_10["text"];
            const _n_18 = _t_10["frames"];
            const _done_18 = _t_10["finished"];
            const _usage_18 = _t_10["usage"];
            const _line_18 = _s_0["line"];
            const _payload_18 = _s_0["payload"];
            const _a_18 = _s_0["line_chars"];
            const _b_18 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_4, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_4, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_18, "frames": _n_18, "finished": _done_18, "usage": _usage_18}, "line": _line_18, "payload": _payload_18, "line_chars": _a_18, "payload_chars": _b_18}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_19 = _t_10["text"];
            const _n_19 = _t_10["frames"];
            const _done_19 = _t_10["finished"];
            const _usage_19 = _t_10["usage"];
            const _line_19 = _s_0["line"];
            const _payload_19 = _s_0["payload"];
            const _a_19 = _s_0["line_chars"];
            const _b_19 = _s_0["payload_chars"];
            const _step_3 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_19 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _179_0, "tail": _180_0}}}}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_4, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_4, "phase": _t_11, "text": _txt_19, "frames": _n_19, "finished": _done_19, "usage": _usage_19}, "line": _line_19, "payload": _payload_19, "line_chars": _a_19, "payload_chars": _b_19}));
            $0 = _rest_3;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_3));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_3)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 268435455) == 10) {
          const _177_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _178_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_4 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_5 = _s_0["framing"];
          const _t_12 = _s_0["stream"];
          const _p_5 = _t_12["provider"];
          const _t_13 = _t_12["phase"];
          if (_t_13.$ === "../../ai/bend/protocol.Completed") {
            const _txt_20 = _t_12["text"];
            const _n_20 = _t_12["frames"];
            const _done_20 = _t_12["finished"];
            const _usage_20 = _t_12["usage"];
            const _line_20 = _s_0["line"];
            const _payload_20 = _s_0["payload"];
            const _a_20 = _s_0["line_chars"];
            const _b_20 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_5, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_5, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_20, "frames": _n_20, "finished": _done_20, "usage": _usage_20}, "line": _line_20, "payload": _payload_20, "line_chars": _a_20, "payload_chars": _b_20}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_13.$ === "../../ai/bend/protocol.Failed") {
            const _txt_21 = _t_12["text"];
            const _n_21 = _t_12["frames"];
            const _done_21 = _t_12["finished"];
            const _usage_21 = _t_12["usage"];
            const _line_21 = _s_0["line"];
            const _payload_21 = _s_0["payload"];
            const _a_21 = _s_0["line_chars"];
            const _b_21 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_5, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_5, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_21, "frames": _n_21, "finished": _done_21, "usage": _usage_21}, "line": _line_21, "payload": _payload_21, "line_chars": _a_21, "payload_chars": _b_21}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_13.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_22 = _t_12["text"];
            const _n_22 = _t_12["frames"];
            const _done_22 = _t_12["finished"];
            const _usage_22 = _t_12["usage"];
            const _line_22 = _s_0["line"];
            const _payload_22 = _s_0["payload"];
            const _a_22 = _s_0["line_chars"];
            const _b_22 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_5, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_5, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_22, "frames": _n_22, "finished": _done_22, "usage": _usage_22}, "line": _line_22, "payload": _payload_22, "line_chars": _a_22, "payload_chars": _b_22}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_23 = _t_12["text"];
            const _n_23 = _t_12["frames"];
            const _done_23 = _t_12["finished"];
            const _usage_23 = _t_12["usage"];
            const _line_23 = _s_0["line"];
            const _payload_23 = _s_0["payload"];
            const _a_23 = _s_0["line_chars"];
            const _b_23 = _s_0["payload_chars"];
            const _step_4 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_23 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _177_0, "tail": _178_0}}}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_5, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_5, "phase": _t_13, "text": _txt_23, "frames": _n_23, "finished": _done_23, "usage": _usage_23}, "line": _line_23, "payload": _payload_23, "line_chars": _a_23, "payload_chars": _b_23}));
            $0 = _rest_4;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_4));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_4)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 134217727) == 10) {
          const _175_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _176_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_5 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_6 = _s_0["framing"];
          const _t_14 = _s_0["stream"];
          const _p_6 = _t_14["provider"];
          const _t_15 = _t_14["phase"];
          if (_t_15.$ === "../../ai/bend/protocol.Completed") {
            const _txt_24 = _t_14["text"];
            const _n_24 = _t_14["frames"];
            const _done_24 = _t_14["finished"];
            const _usage_24 = _t_14["usage"];
            const _line_24 = _s_0["line"];
            const _payload_24 = _s_0["payload"];
            const _a_24 = _s_0["line_chars"];
            const _b_24 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_6, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_6, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_24, "frames": _n_24, "finished": _done_24, "usage": _usage_24}, "line": _line_24, "payload": _payload_24, "line_chars": _a_24, "payload_chars": _b_24}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_15.$ === "../../ai/bend/protocol.Failed") {
            const _txt_25 = _t_14["text"];
            const _n_25 = _t_14["frames"];
            const _done_25 = _t_14["finished"];
            const _usage_25 = _t_14["usage"];
            const _line_25 = _s_0["line"];
            const _payload_25 = _s_0["payload"];
            const _a_25 = _s_0["line_chars"];
            const _b_25 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_6, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_6, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_25, "frames": _n_25, "finished": _done_25, "usage": _usage_25}, "line": _line_25, "payload": _payload_25, "line_chars": _a_25, "payload_chars": _b_25}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_15.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_26 = _t_14["text"];
            const _n_26 = _t_14["frames"];
            const _done_26 = _t_14["finished"];
            const _usage_26 = _t_14["usage"];
            const _line_26 = _s_0["line"];
            const _payload_26 = _s_0["payload"];
            const _a_26 = _s_0["line_chars"];
            const _b_26 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_6, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_6, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_26, "frames": _n_26, "finished": _done_26, "usage": _usage_26}, "line": _line_26, "payload": _payload_26, "line_chars": _a_26, "payload_chars": _b_26}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_27 = _t_14["text"];
            const _n_27 = _t_14["frames"];
            const _done_27 = _t_14["finished"];
            const _usage_27 = _t_14["usage"];
            const _line_27 = _s_0["line"];
            const _payload_27 = _s_0["payload"];
            const _a_27 = _s_0["line_chars"];
            const _b_27 = _s_0["payload_chars"];
            const _step_5 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_27 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _175_0, "tail": _176_0}}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_6, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_6, "phase": _t_15, "text": _txt_27, "frames": _n_27, "finished": _done_27, "usage": _usage_27}, "line": _line_27, "payload": _payload_27, "line_chars": _a_27, "payload_chars": _b_27}));
            $0 = _rest_5;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_5));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_5)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 67108863) == 10) {
          const _173_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _174_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_6 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_7 = _s_0["framing"];
          const _t_16 = _s_0["stream"];
          const _p_7 = _t_16["provider"];
          const _t_17 = _t_16["phase"];
          if (_t_17.$ === "../../ai/bend/protocol.Completed") {
            const _txt_28 = _t_16["text"];
            const _n_28 = _t_16["frames"];
            const _done_28 = _t_16["finished"];
            const _usage_28 = _t_16["usage"];
            const _line_28 = _s_0["line"];
            const _payload_28 = _s_0["payload"];
            const _a_28 = _s_0["line_chars"];
            const _b_28 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_7, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_7, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_28, "frames": _n_28, "finished": _done_28, "usage": _usage_28}, "line": _line_28, "payload": _payload_28, "line_chars": _a_28, "payload_chars": _b_28}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_17.$ === "../../ai/bend/protocol.Failed") {
            const _txt_29 = _t_16["text"];
            const _n_29 = _t_16["frames"];
            const _done_29 = _t_16["finished"];
            const _usage_29 = _t_16["usage"];
            const _line_29 = _s_0["line"];
            const _payload_29 = _s_0["payload"];
            const _a_29 = _s_0["line_chars"];
            const _b_29 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_7, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_7, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_29, "frames": _n_29, "finished": _done_29, "usage": _usage_29}, "line": _line_29, "payload": _payload_29, "line_chars": _a_29, "payload_chars": _b_29}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_17.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_30 = _t_16["text"];
            const _n_30 = _t_16["frames"];
            const _done_30 = _t_16["finished"];
            const _usage_30 = _t_16["usage"];
            const _line_30 = _s_0["line"];
            const _payload_30 = _s_0["payload"];
            const _a_30 = _s_0["line_chars"];
            const _b_30 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_7, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_7, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_30, "frames": _n_30, "finished": _done_30, "usage": _usage_30}, "line": _line_30, "payload": _payload_30, "line_chars": _a_30, "payload_chars": _b_30}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_31 = _t_16["text"];
            const _n_31 = _t_16["frames"];
            const _done_31 = _t_16["finished"];
            const _usage_31 = _t_16["usage"];
            const _line_31 = _s_0["line"];
            const _payload_31 = _s_0["payload"];
            const _a_31 = _s_0["line_chars"];
            const _b_31 = _s_0["payload_chars"];
            const _step_6 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_31 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _173_0, "tail": _174_0}}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_7, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_7, "phase": _t_17, "text": _txt_31, "frames": _n_31, "finished": _done_31, "usage": _usage_31}, "line": _line_31, "payload": _payload_31, "line_chars": _a_31, "payload_chars": _b_31}));
            $0 = _rest_6;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_6));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_6)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 33554431) == 10) {
          const _171_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _172_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_7 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_8 = _s_0["framing"];
          const _t_18 = _s_0["stream"];
          const _p_8 = _t_18["provider"];
          const _t_19 = _t_18["phase"];
          if (_t_19.$ === "../../ai/bend/protocol.Completed") {
            const _txt_32 = _t_18["text"];
            const _n_32 = _t_18["frames"];
            const _done_32 = _t_18["finished"];
            const _usage_32 = _t_18["usage"];
            const _line_32 = _s_0["line"];
            const _payload_32 = _s_0["payload"];
            const _a_32 = _s_0["line_chars"];
            const _b_32 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_8, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_8, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_32, "frames": _n_32, "finished": _done_32, "usage": _usage_32}, "line": _line_32, "payload": _payload_32, "line_chars": _a_32, "payload_chars": _b_32}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_19.$ === "../../ai/bend/protocol.Failed") {
            const _txt_33 = _t_18["text"];
            const _n_33 = _t_18["frames"];
            const _done_33 = _t_18["finished"];
            const _usage_33 = _t_18["usage"];
            const _line_33 = _s_0["line"];
            const _payload_33 = _s_0["payload"];
            const _a_33 = _s_0["line_chars"];
            const _b_33 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_8, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_8, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_33, "frames": _n_33, "finished": _done_33, "usage": _usage_33}, "line": _line_33, "payload": _payload_33, "line_chars": _a_33, "payload_chars": _b_33}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_19.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_34 = _t_18["text"];
            const _n_34 = _t_18["frames"];
            const _done_34 = _t_18["finished"];
            const _usage_34 = _t_18["usage"];
            const _line_34 = _s_0["line"];
            const _payload_34 = _s_0["payload"];
            const _a_34 = _s_0["line_chars"];
            const _b_34 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_8, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_8, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_34, "frames": _n_34, "finished": _done_34, "usage": _usage_34}, "line": _line_34, "payload": _payload_34, "line_chars": _a_34, "payload_chars": _b_34}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_35 = _t_18["text"];
            const _n_35 = _t_18["frames"];
            const _done_35 = _t_18["finished"];
            const _usage_35 = _t_18["usage"];
            const _line_35 = _s_0["line"];
            const _payload_35 = _s_0["payload"];
            const _a_35 = _s_0["line_chars"];
            const _b_35 = _s_0["payload_chars"];
            const _step_7 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_35 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _171_0, "tail": _172_0}}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_8, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_8, "phase": _t_19, "text": _txt_35, "frames": _n_35, "finished": _done_35, "usage": _usage_35}, "line": _line_35, "payload": _payload_35, "line_chars": _a_35, "payload_chars": _b_35}));
            $0 = _rest_7;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_7));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_7)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 16777215) == 10) {
          const _169_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _170_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_8 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_9 = _s_0["framing"];
          const _t_20 = _s_0["stream"];
          const _p_9 = _t_20["provider"];
          const _t_21 = _t_20["phase"];
          if (_t_21.$ === "../../ai/bend/protocol.Completed") {
            const _txt_36 = _t_20["text"];
            const _n_36 = _t_20["frames"];
            const _done_36 = _t_20["finished"];
            const _usage_36 = _t_20["usage"];
            const _line_36 = _s_0["line"];
            const _payload_36 = _s_0["payload"];
            const _a_36 = _s_0["line_chars"];
            const _b_36 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_9, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_9, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_36, "frames": _n_36, "finished": _done_36, "usage": _usage_36}, "line": _line_36, "payload": _payload_36, "line_chars": _a_36, "payload_chars": _b_36}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_21.$ === "../../ai/bend/protocol.Failed") {
            const _txt_37 = _t_20["text"];
            const _n_37 = _t_20["frames"];
            const _done_37 = _t_20["finished"];
            const _usage_37 = _t_20["usage"];
            const _line_37 = _s_0["line"];
            const _payload_37 = _s_0["payload"];
            const _a_37 = _s_0["line_chars"];
            const _b_37 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_9, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_9, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_37, "frames": _n_37, "finished": _done_37, "usage": _usage_37}, "line": _line_37, "payload": _payload_37, "line_chars": _a_37, "payload_chars": _b_37}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_21.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_38 = _t_20["text"];
            const _n_38 = _t_20["frames"];
            const _done_38 = _t_20["finished"];
            const _usage_38 = _t_20["usage"];
            const _line_38 = _s_0["line"];
            const _payload_38 = _s_0["payload"];
            const _a_38 = _s_0["line_chars"];
            const _b_38 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_9, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_9, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_38, "frames": _n_38, "finished": _done_38, "usage": _usage_38}, "line": _line_38, "payload": _payload_38, "line_chars": _a_38, "payload_chars": _b_38}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_39 = _t_20["text"];
            const _n_39 = _t_20["frames"];
            const _done_39 = _t_20["finished"];
            const _usage_39 = _t_20["usage"];
            const _line_39 = _s_0["line"];
            const _payload_39 = _s_0["payload"];
            const _a_39 = _s_0["line_chars"];
            const _b_39 = _s_0["payload_chars"];
            const _step_8 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_39 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _169_0, "tail": _170_0}}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_9, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_9, "phase": _t_21, "text": _txt_39, "frames": _n_39, "finished": _done_39, "usage": _usage_39}, "line": _line_39, "payload": _payload_39, "line_chars": _a_39, "payload_chars": _b_39}));
            $0 = _rest_8;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_8));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_8)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 8388607) == 10) {
          const _167_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _168_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_9 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_10 = _s_0["framing"];
          const _t_22 = _s_0["stream"];
          const _p_10 = _t_22["provider"];
          const _t_23 = _t_22["phase"];
          if (_t_23.$ === "../../ai/bend/protocol.Completed") {
            const _txt_40 = _t_22["text"];
            const _n_40 = _t_22["frames"];
            const _done_40 = _t_22["finished"];
            const _usage_40 = _t_22["usage"];
            const _line_40 = _s_0["line"];
            const _payload_40 = _s_0["payload"];
            const _a_40 = _s_0["line_chars"];
            const _b_40 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_10, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_10, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_40, "frames": _n_40, "finished": _done_40, "usage": _usage_40}, "line": _line_40, "payload": _payload_40, "line_chars": _a_40, "payload_chars": _b_40}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_23.$ === "../../ai/bend/protocol.Failed") {
            const _txt_41 = _t_22["text"];
            const _n_41 = _t_22["frames"];
            const _done_41 = _t_22["finished"];
            const _usage_41 = _t_22["usage"];
            const _line_41 = _s_0["line"];
            const _payload_41 = _s_0["payload"];
            const _a_41 = _s_0["line_chars"];
            const _b_41 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_10, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_10, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_41, "frames": _n_41, "finished": _done_41, "usage": _usage_41}, "line": _line_41, "payload": _payload_41, "line_chars": _a_41, "payload_chars": _b_41}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_23.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_42 = _t_22["text"];
            const _n_42 = _t_22["frames"];
            const _done_42 = _t_22["finished"];
            const _usage_42 = _t_22["usage"];
            const _line_42 = _s_0["line"];
            const _payload_42 = _s_0["payload"];
            const _a_42 = _s_0["line_chars"];
            const _b_42 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_10, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_10, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_42, "frames": _n_42, "finished": _done_42, "usage": _usage_42}, "line": _line_42, "payload": _payload_42, "line_chars": _a_42, "payload_chars": _b_42}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_43 = _t_22["text"];
            const _n_43 = _t_22["frames"];
            const _done_43 = _t_22["finished"];
            const _usage_43 = _t_22["usage"];
            const _line_43 = _s_0["line"];
            const _payload_43 = _s_0["payload"];
            const _a_43 = _s_0["line_chars"];
            const _b_43 = _s_0["payload_chars"];
            const _step_9 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_43 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _167_0, "tail": _168_0}}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_10, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_10, "phase": _t_23, "text": _txt_43, "frames": _n_43, "finished": _done_43, "usage": _usage_43}, "line": _line_43, "payload": _payload_43, "line_chars": _a_43, "payload_chars": _b_43}));
            $0 = _rest_9;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_9));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_9)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 4194303) == 10) {
          const _165_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _166_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_10 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_11 = _s_0["framing"];
          const _t_24 = _s_0["stream"];
          const _p_11 = _t_24["provider"];
          const _t_25 = _t_24["phase"];
          if (_t_25.$ === "../../ai/bend/protocol.Completed") {
            const _txt_44 = _t_24["text"];
            const _n_44 = _t_24["frames"];
            const _done_44 = _t_24["finished"];
            const _usage_44 = _t_24["usage"];
            const _line_44 = _s_0["line"];
            const _payload_44 = _s_0["payload"];
            const _a_44 = _s_0["line_chars"];
            const _b_44 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_11, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_11, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_44, "frames": _n_44, "finished": _done_44, "usage": _usage_44}, "line": _line_44, "payload": _payload_44, "line_chars": _a_44, "payload_chars": _b_44}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_25.$ === "../../ai/bend/protocol.Failed") {
            const _txt_45 = _t_24["text"];
            const _n_45 = _t_24["frames"];
            const _done_45 = _t_24["finished"];
            const _usage_45 = _t_24["usage"];
            const _line_45 = _s_0["line"];
            const _payload_45 = _s_0["payload"];
            const _a_45 = _s_0["line_chars"];
            const _b_45 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_11, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_11, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_45, "frames": _n_45, "finished": _done_45, "usage": _usage_45}, "line": _line_45, "payload": _payload_45, "line_chars": _a_45, "payload_chars": _b_45}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_25.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_46 = _t_24["text"];
            const _n_46 = _t_24["frames"];
            const _done_46 = _t_24["finished"];
            const _usage_46 = _t_24["usage"];
            const _line_46 = _s_0["line"];
            const _payload_46 = _s_0["payload"];
            const _a_46 = _s_0["line_chars"];
            const _b_46 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_11, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_11, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_46, "frames": _n_46, "finished": _done_46, "usage": _usage_46}, "line": _line_46, "payload": _payload_46, "line_chars": _a_46, "payload_chars": _b_46}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_47 = _t_24["text"];
            const _n_47 = _t_24["frames"];
            const _done_47 = _t_24["finished"];
            const _usage_47 = _t_24["usage"];
            const _line_47 = _s_0["line"];
            const _payload_47 = _s_0["payload"];
            const _a_47 = _s_0["line_chars"];
            const _b_47 = _s_0["payload_chars"];
            const _step_10 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_47 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _165_0, "tail": _166_0}}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_11, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_11, "phase": _t_25, "text": _txt_47, "frames": _n_47, "finished": _done_47, "usage": _usage_47}, "line": _line_47, "payload": _payload_47, "line_chars": _a_47, "payload_chars": _b_47}));
            $0 = _rest_10;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_10));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_10)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 2097151) == 10) {
          const _163_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _164_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_11 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_12 = _s_0["framing"];
          const _t_26 = _s_0["stream"];
          const _p_12 = _t_26["provider"];
          const _t_27 = _t_26["phase"];
          if (_t_27.$ === "../../ai/bend/protocol.Completed") {
            const _txt_48 = _t_26["text"];
            const _n_48 = _t_26["frames"];
            const _done_48 = _t_26["finished"];
            const _usage_48 = _t_26["usage"];
            const _line_48 = _s_0["line"];
            const _payload_48 = _s_0["payload"];
            const _a_48 = _s_0["line_chars"];
            const _b_48 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_12, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_12, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_48, "frames": _n_48, "finished": _done_48, "usage": _usage_48}, "line": _line_48, "payload": _payload_48, "line_chars": _a_48, "payload_chars": _b_48}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_27.$ === "../../ai/bend/protocol.Failed") {
            const _txt_49 = _t_26["text"];
            const _n_49 = _t_26["frames"];
            const _done_49 = _t_26["finished"];
            const _usage_49 = _t_26["usage"];
            const _line_49 = _s_0["line"];
            const _payload_49 = _s_0["payload"];
            const _a_49 = _s_0["line_chars"];
            const _b_49 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_12, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_12, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_49, "frames": _n_49, "finished": _done_49, "usage": _usage_49}, "line": _line_49, "payload": _payload_49, "line_chars": _a_49, "payload_chars": _b_49}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_27.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_50 = _t_26["text"];
            const _n_50 = _t_26["frames"];
            const _done_50 = _t_26["finished"];
            const _usage_50 = _t_26["usage"];
            const _line_50 = _s_0["line"];
            const _payload_50 = _s_0["payload"];
            const _a_50 = _s_0["line_chars"];
            const _b_50 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_12, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_12, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_50, "frames": _n_50, "finished": _done_50, "usage": _usage_50}, "line": _line_50, "payload": _payload_50, "line_chars": _a_50, "payload_chars": _b_50}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_51 = _t_26["text"];
            const _n_51 = _t_26["frames"];
            const _done_51 = _t_26["finished"];
            const _usage_51 = _t_26["usage"];
            const _line_51 = _s_0["line"];
            const _payload_51 = _s_0["payload"];
            const _a_51 = _s_0["line_chars"];
            const _b_51 = _s_0["payload_chars"];
            const _step_11 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_51 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _163_0, "tail": _164_0}}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_12, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_12, "phase": _t_27, "text": _txt_51, "frames": _n_51, "finished": _done_51, "usage": _usage_51}, "line": _line_51, "payload": _payload_51, "line_chars": _a_51, "payload_chars": _b_51}));
            $0 = _rest_11;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_11));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_11)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 1048575) == 10) {
          const _161_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _162_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_12 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_13 = _s_0["framing"];
          const _t_28 = _s_0["stream"];
          const _p_13 = _t_28["provider"];
          const _t_29 = _t_28["phase"];
          if (_t_29.$ === "../../ai/bend/protocol.Completed") {
            const _txt_52 = _t_28["text"];
            const _n_52 = _t_28["frames"];
            const _done_52 = _t_28["finished"];
            const _usage_52 = _t_28["usage"];
            const _line_52 = _s_0["line"];
            const _payload_52 = _s_0["payload"];
            const _a_52 = _s_0["line_chars"];
            const _b_52 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_13, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_13, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_52, "frames": _n_52, "finished": _done_52, "usage": _usage_52}, "line": _line_52, "payload": _payload_52, "line_chars": _a_52, "payload_chars": _b_52}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_29.$ === "../../ai/bend/protocol.Failed") {
            const _txt_53 = _t_28["text"];
            const _n_53 = _t_28["frames"];
            const _done_53 = _t_28["finished"];
            const _usage_53 = _t_28["usage"];
            const _line_53 = _s_0["line"];
            const _payload_53 = _s_0["payload"];
            const _a_53 = _s_0["line_chars"];
            const _b_53 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_13, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_13, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_53, "frames": _n_53, "finished": _done_53, "usage": _usage_53}, "line": _line_53, "payload": _payload_53, "line_chars": _a_53, "payload_chars": _b_53}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_29.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_54 = _t_28["text"];
            const _n_54 = _t_28["frames"];
            const _done_54 = _t_28["finished"];
            const _usage_54 = _t_28["usage"];
            const _line_54 = _s_0["line"];
            const _payload_54 = _s_0["payload"];
            const _a_54 = _s_0["line_chars"];
            const _b_54 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_13, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_13, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_54, "frames": _n_54, "finished": _done_54, "usage": _usage_54}, "line": _line_54, "payload": _payload_54, "line_chars": _a_54, "payload_chars": _b_54}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_55 = _t_28["text"];
            const _n_55 = _t_28["frames"];
            const _done_55 = _t_28["finished"];
            const _usage_55 = _t_28["usage"];
            const _line_55 = _s_0["line"];
            const _payload_55 = _s_0["payload"];
            const _a_55 = _s_0["line_chars"];
            const _b_55 = _s_0["payload_chars"];
            const _step_12 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_55 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _161_0, "tail": _162_0}}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_13, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_13, "phase": _t_29, "text": _txt_55, "frames": _n_55, "finished": _done_55, "usage": _usage_55}, "line": _line_55, "payload": _payload_55, "line_chars": _a_55, "payload_chars": _b_55}));
            $0 = _rest_12;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_12));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_12)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 524287) == 10) {
          const _159_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _160_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_13 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_14 = _s_0["framing"];
          const _t_30 = _s_0["stream"];
          const _p_14 = _t_30["provider"];
          const _t_31 = _t_30["phase"];
          if (_t_31.$ === "../../ai/bend/protocol.Completed") {
            const _txt_56 = _t_30["text"];
            const _n_56 = _t_30["frames"];
            const _done_56 = _t_30["finished"];
            const _usage_56 = _t_30["usage"];
            const _line_56 = _s_0["line"];
            const _payload_56 = _s_0["payload"];
            const _a_56 = _s_0["line_chars"];
            const _b_56 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_14, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_14, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_56, "frames": _n_56, "finished": _done_56, "usage": _usage_56}, "line": _line_56, "payload": _payload_56, "line_chars": _a_56, "payload_chars": _b_56}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_31.$ === "../../ai/bend/protocol.Failed") {
            const _txt_57 = _t_30["text"];
            const _n_57 = _t_30["frames"];
            const _done_57 = _t_30["finished"];
            const _usage_57 = _t_30["usage"];
            const _line_57 = _s_0["line"];
            const _payload_57 = _s_0["payload"];
            const _a_57 = _s_0["line_chars"];
            const _b_57 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_14, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_14, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_57, "frames": _n_57, "finished": _done_57, "usage": _usage_57}, "line": _line_57, "payload": _payload_57, "line_chars": _a_57, "payload_chars": _b_57}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_31.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_58 = _t_30["text"];
            const _n_58 = _t_30["frames"];
            const _done_58 = _t_30["finished"];
            const _usage_58 = _t_30["usage"];
            const _line_58 = _s_0["line"];
            const _payload_58 = _s_0["payload"];
            const _a_58 = _s_0["line_chars"];
            const _b_58 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_14, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_14, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_58, "frames": _n_58, "finished": _done_58, "usage": _usage_58}, "line": _line_58, "payload": _payload_58, "line_chars": _a_58, "payload_chars": _b_58}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_59 = _t_30["text"];
            const _n_59 = _t_30["frames"];
            const _done_59 = _t_30["finished"];
            const _usage_59 = _t_30["usage"];
            const _line_59 = _s_0["line"];
            const _payload_59 = _s_0["payload"];
            const _a_59 = _s_0["line_chars"];
            const _b_59 = _s_0["payload_chars"];
            const _step_13 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_59 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _159_0, "tail": _160_0}}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_14, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_14, "phase": _t_31, "text": _txt_59, "frames": _n_59, "finished": _done_59, "usage": _usage_59}, "line": _line_59, "payload": _payload_59, "line_chars": _a_59, "payload_chars": _b_59}));
            $0 = _rest_13;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_13));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_13)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 262143) == 10) {
          const _157_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _158_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_14 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_15 = _s_0["framing"];
          const _t_32 = _s_0["stream"];
          const _p_15 = _t_32["provider"];
          const _t_33 = _t_32["phase"];
          if (_t_33.$ === "../../ai/bend/protocol.Completed") {
            const _txt_60 = _t_32["text"];
            const _n_60 = _t_32["frames"];
            const _done_60 = _t_32["finished"];
            const _usage_60 = _t_32["usage"];
            const _line_60 = _s_0["line"];
            const _payload_60 = _s_0["payload"];
            const _a_60 = _s_0["line_chars"];
            const _b_60 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_15, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_15, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_60, "frames": _n_60, "finished": _done_60, "usage": _usage_60}, "line": _line_60, "payload": _payload_60, "line_chars": _a_60, "payload_chars": _b_60}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_33.$ === "../../ai/bend/protocol.Failed") {
            const _txt_61 = _t_32["text"];
            const _n_61 = _t_32["frames"];
            const _done_61 = _t_32["finished"];
            const _usage_61 = _t_32["usage"];
            const _line_61 = _s_0["line"];
            const _payload_61 = _s_0["payload"];
            const _a_61 = _s_0["line_chars"];
            const _b_61 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_15, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_15, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_61, "frames": _n_61, "finished": _done_61, "usage": _usage_61}, "line": _line_61, "payload": _payload_61, "line_chars": _a_61, "payload_chars": _b_61}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_33.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_62 = _t_32["text"];
            const _n_62 = _t_32["frames"];
            const _done_62 = _t_32["finished"];
            const _usage_62 = _t_32["usage"];
            const _line_62 = _s_0["line"];
            const _payload_62 = _s_0["payload"];
            const _a_62 = _s_0["line_chars"];
            const _b_62 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_15, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_15, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_62, "frames": _n_62, "finished": _done_62, "usage": _usage_62}, "line": _line_62, "payload": _payload_62, "line_chars": _a_62, "payload_chars": _b_62}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_63 = _t_32["text"];
            const _n_63 = _t_32["frames"];
            const _done_63 = _t_32["finished"];
            const _usage_63 = _t_32["usage"];
            const _line_63 = _s_0["line"];
            const _payload_63 = _s_0["payload"];
            const _a_63 = _s_0["line_chars"];
            const _b_63 = _s_0["payload_chars"];
            const _step_14 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_63 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _157_0, "tail": _158_0}}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_15, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_15, "phase": _t_33, "text": _txt_63, "frames": _n_63, "finished": _done_63, "usage": _usage_63}, "line": _line_63, "payload": _payload_63, "line_chars": _a_63, "payload_chars": _b_63}));
            $0 = _rest_14;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_14));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_14)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 131071) == 10) {
          const _155_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _156_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_15 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_16 = _s_0["framing"];
          const _t_34 = _s_0["stream"];
          const _p_16 = _t_34["provider"];
          const _t_35 = _t_34["phase"];
          if (_t_35.$ === "../../ai/bend/protocol.Completed") {
            const _txt_64 = _t_34["text"];
            const _n_64 = _t_34["frames"];
            const _done_64 = _t_34["finished"];
            const _usage_64 = _t_34["usage"];
            const _line_64 = _s_0["line"];
            const _payload_64 = _s_0["payload"];
            const _a_64 = _s_0["line_chars"];
            const _b_64 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_16, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_16, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_64, "frames": _n_64, "finished": _done_64, "usage": _usage_64}, "line": _line_64, "payload": _payload_64, "line_chars": _a_64, "payload_chars": _b_64}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_35.$ === "../../ai/bend/protocol.Failed") {
            const _txt_65 = _t_34["text"];
            const _n_65 = _t_34["frames"];
            const _done_65 = _t_34["finished"];
            const _usage_65 = _t_34["usage"];
            const _line_65 = _s_0["line"];
            const _payload_65 = _s_0["payload"];
            const _a_65 = _s_0["line_chars"];
            const _b_65 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_16, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_16, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_65, "frames": _n_65, "finished": _done_65, "usage": _usage_65}, "line": _line_65, "payload": _payload_65, "line_chars": _a_65, "payload_chars": _b_65}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_35.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_66 = _t_34["text"];
            const _n_66 = _t_34["frames"];
            const _done_66 = _t_34["finished"];
            const _usage_66 = _t_34["usage"];
            const _line_66 = _s_0["line"];
            const _payload_66 = _s_0["payload"];
            const _a_66 = _s_0["line_chars"];
            const _b_66 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_16, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_16, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_66, "frames": _n_66, "finished": _done_66, "usage": _usage_66}, "line": _line_66, "payload": _payload_66, "line_chars": _a_66, "payload_chars": _b_66}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_67 = _t_34["text"];
            const _n_67 = _t_34["frames"];
            const _done_67 = _t_34["finished"];
            const _usage_67 = _t_34["usage"];
            const _line_67 = _s_0["line"];
            const _payload_67 = _s_0["payload"];
            const _a_67 = _s_0["line_chars"];
            const _b_67 = _s_0["payload_chars"];
            const _step_15 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_67 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _155_0, "tail": _156_0}}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_16, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_16, "phase": _t_35, "text": _txt_67, "frames": _n_67, "finished": _done_67, "usage": _usage_67}, "line": _line_67, "payload": _payload_67, "line_chars": _a_67, "payload_chars": _b_67}));
            $0 = _rest_15;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_15));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_15)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 65535) == 10) {
          const _153_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _154_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_16 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_17 = _s_0["framing"];
          const _t_36 = _s_0["stream"];
          const _p_17 = _t_36["provider"];
          const _t_37 = _t_36["phase"];
          if (_t_37.$ === "../../ai/bend/protocol.Completed") {
            const _txt_68 = _t_36["text"];
            const _n_68 = _t_36["frames"];
            const _done_68 = _t_36["finished"];
            const _usage_68 = _t_36["usage"];
            const _line_68 = _s_0["line"];
            const _payload_68 = _s_0["payload"];
            const _a_68 = _s_0["line_chars"];
            const _b_68 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_17, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_17, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_68, "frames": _n_68, "finished": _done_68, "usage": _usage_68}, "line": _line_68, "payload": _payload_68, "line_chars": _a_68, "payload_chars": _b_68}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_37.$ === "../../ai/bend/protocol.Failed") {
            const _txt_69 = _t_36["text"];
            const _n_69 = _t_36["frames"];
            const _done_69 = _t_36["finished"];
            const _usage_69 = _t_36["usage"];
            const _line_69 = _s_0["line"];
            const _payload_69 = _s_0["payload"];
            const _a_69 = _s_0["line_chars"];
            const _b_69 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_17, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_17, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_69, "frames": _n_69, "finished": _done_69, "usage": _usage_69}, "line": _line_69, "payload": _payload_69, "line_chars": _a_69, "payload_chars": _b_69}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_37.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_70 = _t_36["text"];
            const _n_70 = _t_36["frames"];
            const _done_70 = _t_36["finished"];
            const _usage_70 = _t_36["usage"];
            const _line_70 = _s_0["line"];
            const _payload_70 = _s_0["payload"];
            const _a_70 = _s_0["line_chars"];
            const _b_70 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_17, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_17, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_70, "frames": _n_70, "finished": _done_70, "usage": _usage_70}, "line": _line_70, "payload": _payload_70, "line_chars": _a_70, "payload_chars": _b_70}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_71 = _t_36["text"];
            const _n_71 = _t_36["frames"];
            const _done_71 = _t_36["finished"];
            const _usage_71 = _t_36["usage"];
            const _line_71 = _s_0["line"];
            const _payload_71 = _s_0["payload"];
            const _a_71 = _s_0["line_chars"];
            const _b_71 = _s_0["payload_chars"];
            const _step_16 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_71 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _153_0, "tail": _154_0}}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_17, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_17, "phase": _t_37, "text": _txt_71, "frames": _n_71, "finished": _done_71, "usage": _usage_71}, "line": _line_71, "payload": _payload_71, "line_chars": _a_71, "payload_chars": _b_71}));
            $0 = _rest_16;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_16));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_16)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 32767) == 10) {
          const _151_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _152_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_17 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_18 = _s_0["framing"];
          const _t_38 = _s_0["stream"];
          const _p_18 = _t_38["provider"];
          const _t_39 = _t_38["phase"];
          if (_t_39.$ === "../../ai/bend/protocol.Completed") {
            const _txt_72 = _t_38["text"];
            const _n_72 = _t_38["frames"];
            const _done_72 = _t_38["finished"];
            const _usage_72 = _t_38["usage"];
            const _line_72 = _s_0["line"];
            const _payload_72 = _s_0["payload"];
            const _a_72 = _s_0["line_chars"];
            const _b_72 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_18, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_18, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_72, "frames": _n_72, "finished": _done_72, "usage": _usage_72}, "line": _line_72, "payload": _payload_72, "line_chars": _a_72, "payload_chars": _b_72}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_39.$ === "../../ai/bend/protocol.Failed") {
            const _txt_73 = _t_38["text"];
            const _n_73 = _t_38["frames"];
            const _done_73 = _t_38["finished"];
            const _usage_73 = _t_38["usage"];
            const _line_73 = _s_0["line"];
            const _payload_73 = _s_0["payload"];
            const _a_73 = _s_0["line_chars"];
            const _b_73 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_18, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_18, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_73, "frames": _n_73, "finished": _done_73, "usage": _usage_73}, "line": _line_73, "payload": _payload_73, "line_chars": _a_73, "payload_chars": _b_73}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_39.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_74 = _t_38["text"];
            const _n_74 = _t_38["frames"];
            const _done_74 = _t_38["finished"];
            const _usage_74 = _t_38["usage"];
            const _line_74 = _s_0["line"];
            const _payload_74 = _s_0["payload"];
            const _a_74 = _s_0["line_chars"];
            const _b_74 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_18, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_18, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_74, "frames": _n_74, "finished": _done_74, "usage": _usage_74}, "line": _line_74, "payload": _payload_74, "line_chars": _a_74, "payload_chars": _b_74}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_75 = _t_38["text"];
            const _n_75 = _t_38["frames"];
            const _done_75 = _t_38["finished"];
            const _usage_75 = _t_38["usage"];
            const _line_75 = _s_0["line"];
            const _payload_75 = _s_0["payload"];
            const _a_75 = _s_0["line_chars"];
            const _b_75 = _s_0["payload_chars"];
            const _step_17 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_75 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _151_0, "tail": _152_0}}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_18, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_18, "phase": _t_39, "text": _txt_75, "frames": _n_75, "finished": _done_75, "usage": _usage_75}, "line": _line_75, "payload": _payload_75, "line_chars": _a_75, "payload_chars": _b_75}));
            $0 = _rest_17;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_17));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_17)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 16383) == 10) {
          const _149_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _150_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_18 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_19 = _s_0["framing"];
          const _t_40 = _s_0["stream"];
          const _p_19 = _t_40["provider"];
          const _t_41 = _t_40["phase"];
          if (_t_41.$ === "../../ai/bend/protocol.Completed") {
            const _txt_76 = _t_40["text"];
            const _n_76 = _t_40["frames"];
            const _done_76 = _t_40["finished"];
            const _usage_76 = _t_40["usage"];
            const _line_76 = _s_0["line"];
            const _payload_76 = _s_0["payload"];
            const _a_76 = _s_0["line_chars"];
            const _b_76 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_19, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_19, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_76, "frames": _n_76, "finished": _done_76, "usage": _usage_76}, "line": _line_76, "payload": _payload_76, "line_chars": _a_76, "payload_chars": _b_76}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_41.$ === "../../ai/bend/protocol.Failed") {
            const _txt_77 = _t_40["text"];
            const _n_77 = _t_40["frames"];
            const _done_77 = _t_40["finished"];
            const _usage_77 = _t_40["usage"];
            const _line_77 = _s_0["line"];
            const _payload_77 = _s_0["payload"];
            const _a_77 = _s_0["line_chars"];
            const _b_77 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_19, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_19, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_77, "frames": _n_77, "finished": _done_77, "usage": _usage_77}, "line": _line_77, "payload": _payload_77, "line_chars": _a_77, "payload_chars": _b_77}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_41.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_78 = _t_40["text"];
            const _n_78 = _t_40["frames"];
            const _done_78 = _t_40["finished"];
            const _usage_78 = _t_40["usage"];
            const _line_78 = _s_0["line"];
            const _payload_78 = _s_0["payload"];
            const _a_78 = _s_0["line_chars"];
            const _b_78 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_19, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_19, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_78, "frames": _n_78, "finished": _done_78, "usage": _usage_78}, "line": _line_78, "payload": _payload_78, "line_chars": _a_78, "payload_chars": _b_78}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_79 = _t_40["text"];
            const _n_79 = _t_40["frames"];
            const _done_79 = _t_40["finished"];
            const _usage_79 = _t_40["usage"];
            const _line_79 = _s_0["line"];
            const _payload_79 = _s_0["payload"];
            const _a_79 = _s_0["line_chars"];
            const _b_79 = _s_0["payload_chars"];
            const _step_18 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_79 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _149_0, "tail": _150_0}}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_19, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_19, "phase": _t_41, "text": _txt_79, "frames": _n_79, "finished": _done_79, "usage": _usage_79}, "line": _line_79, "payload": _payload_79, "line_chars": _a_79, "payload_chars": _b_79}));
            $0 = _rest_18;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_18));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_18)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 8191) == 10) {
          const _147_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _148_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_19 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_20 = _s_0["framing"];
          const _t_42 = _s_0["stream"];
          const _p_20 = _t_42["provider"];
          const _t_43 = _t_42["phase"];
          if (_t_43.$ === "../../ai/bend/protocol.Completed") {
            const _txt_80 = _t_42["text"];
            const _n_80 = _t_42["frames"];
            const _done_80 = _t_42["finished"];
            const _usage_80 = _t_42["usage"];
            const _line_80 = _s_0["line"];
            const _payload_80 = _s_0["payload"];
            const _a_80 = _s_0["line_chars"];
            const _b_80 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_20, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_20, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_80, "frames": _n_80, "finished": _done_80, "usage": _usage_80}, "line": _line_80, "payload": _payload_80, "line_chars": _a_80, "payload_chars": _b_80}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_43.$ === "../../ai/bend/protocol.Failed") {
            const _txt_81 = _t_42["text"];
            const _n_81 = _t_42["frames"];
            const _done_81 = _t_42["finished"];
            const _usage_81 = _t_42["usage"];
            const _line_81 = _s_0["line"];
            const _payload_81 = _s_0["payload"];
            const _a_81 = _s_0["line_chars"];
            const _b_81 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_20, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_20, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_81, "frames": _n_81, "finished": _done_81, "usage": _usage_81}, "line": _line_81, "payload": _payload_81, "line_chars": _a_81, "payload_chars": _b_81}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_43.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_82 = _t_42["text"];
            const _n_82 = _t_42["frames"];
            const _done_82 = _t_42["finished"];
            const _usage_82 = _t_42["usage"];
            const _line_82 = _s_0["line"];
            const _payload_82 = _s_0["payload"];
            const _a_82 = _s_0["line_chars"];
            const _b_82 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_20, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_20, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_82, "frames": _n_82, "finished": _done_82, "usage": _usage_82}, "line": _line_82, "payload": _payload_82, "line_chars": _a_82, "payload_chars": _b_82}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_83 = _t_42["text"];
            const _n_83 = _t_42["frames"];
            const _done_83 = _t_42["finished"];
            const _usage_83 = _t_42["usage"];
            const _line_83 = _s_0["line"];
            const _payload_83 = _s_0["payload"];
            const _a_83 = _s_0["line_chars"];
            const _b_83 = _s_0["payload_chars"];
            const _step_19 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_83 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _147_0, "tail": _148_0}}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_20, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_20, "phase": _t_43, "text": _txt_83, "frames": _n_83, "finished": _done_83, "usage": _usage_83}, "line": _line_83, "payload": _payload_83, "line_chars": _a_83, "payload_chars": _b_83}));
            $0 = _rest_19;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_19));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_19)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 4095) == 10) {
          const _145_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _146_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_20 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_21 = _s_0["framing"];
          const _t_44 = _s_0["stream"];
          const _p_21 = _t_44["provider"];
          const _t_45 = _t_44["phase"];
          if (_t_45.$ === "../../ai/bend/protocol.Completed") {
            const _txt_84 = _t_44["text"];
            const _n_84 = _t_44["frames"];
            const _done_84 = _t_44["finished"];
            const _usage_84 = _t_44["usage"];
            const _line_84 = _s_0["line"];
            const _payload_84 = _s_0["payload"];
            const _a_84 = _s_0["line_chars"];
            const _b_84 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_21, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_21, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_84, "frames": _n_84, "finished": _done_84, "usage": _usage_84}, "line": _line_84, "payload": _payload_84, "line_chars": _a_84, "payload_chars": _b_84}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_45.$ === "../../ai/bend/protocol.Failed") {
            const _txt_85 = _t_44["text"];
            const _n_85 = _t_44["frames"];
            const _done_85 = _t_44["finished"];
            const _usage_85 = _t_44["usage"];
            const _line_85 = _s_0["line"];
            const _payload_85 = _s_0["payload"];
            const _a_85 = _s_0["line_chars"];
            const _b_85 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_21, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_21, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_85, "frames": _n_85, "finished": _done_85, "usage": _usage_85}, "line": _line_85, "payload": _payload_85, "line_chars": _a_85, "payload_chars": _b_85}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_45.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_86 = _t_44["text"];
            const _n_86 = _t_44["frames"];
            const _done_86 = _t_44["finished"];
            const _usage_86 = _t_44["usage"];
            const _line_86 = _s_0["line"];
            const _payload_86 = _s_0["payload"];
            const _a_86 = _s_0["line_chars"];
            const _b_86 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_21, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_21, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_86, "frames": _n_86, "finished": _done_86, "usage": _usage_86}, "line": _line_86, "payload": _payload_86, "line_chars": _a_86, "payload_chars": _b_86}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_87 = _t_44["text"];
            const _n_87 = _t_44["frames"];
            const _done_87 = _t_44["finished"];
            const _usage_87 = _t_44["usage"];
            const _line_87 = _s_0["line"];
            const _payload_87 = _s_0["payload"];
            const _a_87 = _s_0["line_chars"];
            const _b_87 = _s_0["payload_chars"];
            const _step_20 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_87 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _145_0, "tail": _146_0}}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_21, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_21, "phase": _t_45, "text": _txt_87, "frames": _n_87, "finished": _done_87, "usage": _usage_87}, "line": _line_87, "payload": _payload_87, "line_chars": _a_87, "payload_chars": _b_87}));
            $0 = _rest_20;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_20));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_20)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 2047) == 10) {
          const _143_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _144_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_21 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_22 = _s_0["framing"];
          const _t_46 = _s_0["stream"];
          const _p_22 = _t_46["provider"];
          const _t_47 = _t_46["phase"];
          if (_t_47.$ === "../../ai/bend/protocol.Completed") {
            const _txt_88 = _t_46["text"];
            const _n_88 = _t_46["frames"];
            const _done_88 = _t_46["finished"];
            const _usage_88 = _t_46["usage"];
            const _line_88 = _s_0["line"];
            const _payload_88 = _s_0["payload"];
            const _a_88 = _s_0["line_chars"];
            const _b_88 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_22, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_22, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_88, "frames": _n_88, "finished": _done_88, "usage": _usage_88}, "line": _line_88, "payload": _payload_88, "line_chars": _a_88, "payload_chars": _b_88}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_47.$ === "../../ai/bend/protocol.Failed") {
            const _txt_89 = _t_46["text"];
            const _n_89 = _t_46["frames"];
            const _done_89 = _t_46["finished"];
            const _usage_89 = _t_46["usage"];
            const _line_89 = _s_0["line"];
            const _payload_89 = _s_0["payload"];
            const _a_89 = _s_0["line_chars"];
            const _b_89 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_22, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_22, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_89, "frames": _n_89, "finished": _done_89, "usage": _usage_89}, "line": _line_89, "payload": _payload_89, "line_chars": _a_89, "payload_chars": _b_89}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_47.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_90 = _t_46["text"];
            const _n_90 = _t_46["frames"];
            const _done_90 = _t_46["finished"];
            const _usage_90 = _t_46["usage"];
            const _line_90 = _s_0["line"];
            const _payload_90 = _s_0["payload"];
            const _a_90 = _s_0["line_chars"];
            const _b_90 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_22, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_22, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_90, "frames": _n_90, "finished": _done_90, "usage": _usage_90}, "line": _line_90, "payload": _payload_90, "line_chars": _a_90, "payload_chars": _b_90}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_91 = _t_46["text"];
            const _n_91 = _t_46["frames"];
            const _done_91 = _t_46["finished"];
            const _usage_91 = _t_46["usage"];
            const _line_91 = _s_0["line"];
            const _payload_91 = _s_0["payload"];
            const _a_91 = _s_0["line_chars"];
            const _b_91 = _s_0["payload_chars"];
            const _step_21 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_91 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _143_0, "tail": _144_0}}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_22, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_22, "phase": _t_47, "text": _txt_91, "frames": _n_91, "finished": _done_91, "usage": _usage_91}, "line": _line_91, "payload": _payload_91, "line_chars": _a_91, "payload_chars": _b_91}));
            $0 = _rest_21;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_21));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_21)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 1023) == 10) {
          const _141_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _142_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_22 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_23 = _s_0["framing"];
          const _t_48 = _s_0["stream"];
          const _p_23 = _t_48["provider"];
          const _t_49 = _t_48["phase"];
          if (_t_49.$ === "../../ai/bend/protocol.Completed") {
            const _txt_92 = _t_48["text"];
            const _n_92 = _t_48["frames"];
            const _done_92 = _t_48["finished"];
            const _usage_92 = _t_48["usage"];
            const _line_92 = _s_0["line"];
            const _payload_92 = _s_0["payload"];
            const _a_92 = _s_0["line_chars"];
            const _b_92 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_23, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_23, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_92, "frames": _n_92, "finished": _done_92, "usage": _usage_92}, "line": _line_92, "payload": _payload_92, "line_chars": _a_92, "payload_chars": _b_92}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_49.$ === "../../ai/bend/protocol.Failed") {
            const _txt_93 = _t_48["text"];
            const _n_93 = _t_48["frames"];
            const _done_93 = _t_48["finished"];
            const _usage_93 = _t_48["usage"];
            const _line_93 = _s_0["line"];
            const _payload_93 = _s_0["payload"];
            const _a_93 = _s_0["line_chars"];
            const _b_93 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_23, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_23, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_93, "frames": _n_93, "finished": _done_93, "usage": _usage_93}, "line": _line_93, "payload": _payload_93, "line_chars": _a_93, "payload_chars": _b_93}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_49.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_94 = _t_48["text"];
            const _n_94 = _t_48["frames"];
            const _done_94 = _t_48["finished"];
            const _usage_94 = _t_48["usage"];
            const _line_94 = _s_0["line"];
            const _payload_94 = _s_0["payload"];
            const _a_94 = _s_0["line_chars"];
            const _b_94 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_23, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_23, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_94, "frames": _n_94, "finished": _done_94, "usage": _usage_94}, "line": _line_94, "payload": _payload_94, "line_chars": _a_94, "payload_chars": _b_94}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_95 = _t_48["text"];
            const _n_95 = _t_48["frames"];
            const _done_95 = _t_48["finished"];
            const _usage_95 = _t_48["usage"];
            const _line_95 = _s_0["line"];
            const _payload_95 = _s_0["payload"];
            const _a_95 = _s_0["line_chars"];
            const _b_95 = _s_0["payload_chars"];
            const _step_22 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_95 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _141_0, "tail": _142_0}}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_23, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_23, "phase": _t_49, "text": _txt_95, "frames": _n_95, "finished": _done_95, "usage": _usage_95}, "line": _line_95, "payload": _payload_95, "line_chars": _a_95, "payload_chars": _b_95}));
            $0 = _rest_22;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_22));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_22)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 511) == 10) {
          const _139_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _140_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_23 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_24 = _s_0["framing"];
          const _t_50 = _s_0["stream"];
          const _p_24 = _t_50["provider"];
          const _t_51 = _t_50["phase"];
          if (_t_51.$ === "../../ai/bend/protocol.Completed") {
            const _txt_96 = _t_50["text"];
            const _n_96 = _t_50["frames"];
            const _done_96 = _t_50["finished"];
            const _usage_96 = _t_50["usage"];
            const _line_96 = _s_0["line"];
            const _payload_96 = _s_0["payload"];
            const _a_96 = _s_0["line_chars"];
            const _b_96 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_24, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_24, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_96, "frames": _n_96, "finished": _done_96, "usage": _usage_96}, "line": _line_96, "payload": _payload_96, "line_chars": _a_96, "payload_chars": _b_96}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_51.$ === "../../ai/bend/protocol.Failed") {
            const _txt_97 = _t_50["text"];
            const _n_97 = _t_50["frames"];
            const _done_97 = _t_50["finished"];
            const _usage_97 = _t_50["usage"];
            const _line_97 = _s_0["line"];
            const _payload_97 = _s_0["payload"];
            const _a_97 = _s_0["line_chars"];
            const _b_97 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_24, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_24, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_97, "frames": _n_97, "finished": _done_97, "usage": _usage_97}, "line": _line_97, "payload": _payload_97, "line_chars": _a_97, "payload_chars": _b_97}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_51.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_98 = _t_50["text"];
            const _n_98 = _t_50["frames"];
            const _done_98 = _t_50["finished"];
            const _usage_98 = _t_50["usage"];
            const _line_98 = _s_0["line"];
            const _payload_98 = _s_0["payload"];
            const _a_98 = _s_0["line_chars"];
            const _b_98 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_24, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_24, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_98, "frames": _n_98, "finished": _done_98, "usage": _usage_98}, "line": _line_98, "payload": _payload_98, "line_chars": _a_98, "payload_chars": _b_98}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_99 = _t_50["text"];
            const _n_99 = _t_50["frames"];
            const _done_99 = _t_50["finished"];
            const _usage_99 = _t_50["usage"];
            const _line_99 = _s_0["line"];
            const _payload_99 = _s_0["payload"];
            const _a_99 = _s_0["line_chars"];
            const _b_99 = _s_0["payload_chars"];
            const _step_23 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_99 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _139_0, "tail": _140_0}}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_24, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_24, "phase": _t_51, "text": _txt_99, "frames": _n_99, "finished": _done_99, "usage": _usage_99}, "line": _line_99, "payload": _payload_99, "line_chars": _a_99, "payload_chars": _b_99}));
            $0 = _rest_23;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_23));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_23)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 255) == 10) {
          const _137_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _138_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_24 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_25 = _s_0["framing"];
          const _t_52 = _s_0["stream"];
          const _p_25 = _t_52["provider"];
          const _t_53 = _t_52["phase"];
          if (_t_53.$ === "../../ai/bend/protocol.Completed") {
            const _txt_100 = _t_52["text"];
            const _n_100 = _t_52["frames"];
            const _done_100 = _t_52["finished"];
            const _usage_100 = _t_52["usage"];
            const _line_100 = _s_0["line"];
            const _payload_100 = _s_0["payload"];
            const _a_100 = _s_0["line_chars"];
            const _b_100 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_25, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_25, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_100, "frames": _n_100, "finished": _done_100, "usage": _usage_100}, "line": _line_100, "payload": _payload_100, "line_chars": _a_100, "payload_chars": _b_100}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_53.$ === "../../ai/bend/protocol.Failed") {
            const _txt_101 = _t_52["text"];
            const _n_101 = _t_52["frames"];
            const _done_101 = _t_52["finished"];
            const _usage_101 = _t_52["usage"];
            const _line_101 = _s_0["line"];
            const _payload_101 = _s_0["payload"];
            const _a_101 = _s_0["line_chars"];
            const _b_101 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_25, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_25, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_101, "frames": _n_101, "finished": _done_101, "usage": _usage_101}, "line": _line_101, "payload": _payload_101, "line_chars": _a_101, "payload_chars": _b_101}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_53.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_102 = _t_52["text"];
            const _n_102 = _t_52["frames"];
            const _done_102 = _t_52["finished"];
            const _usage_102 = _t_52["usage"];
            const _line_102 = _s_0["line"];
            const _payload_102 = _s_0["payload"];
            const _a_102 = _s_0["line_chars"];
            const _b_102 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_25, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_25, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_102, "frames": _n_102, "finished": _done_102, "usage": _usage_102}, "line": _line_102, "payload": _payload_102, "line_chars": _a_102, "payload_chars": _b_102}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_103 = _t_52["text"];
            const _n_103 = _t_52["frames"];
            const _done_103 = _t_52["finished"];
            const _usage_103 = _t_52["usage"];
            const _line_103 = _s_0["line"];
            const _payload_103 = _s_0["payload"];
            const _a_103 = _s_0["line_chars"];
            const _b_103 = _s_0["payload_chars"];
            const _step_24 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_103 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _137_0, "tail": _138_0}}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_25, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_25, "phase": _t_53, "text": _txt_103, "frames": _n_103, "finished": _done_103, "usage": _usage_103}, "line": _line_103, "payload": _payload_103, "line_chars": _a_103, "payload_chars": _b_103}));
            $0 = _rest_24;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_24));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_24)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 127) == 10) {
          const _135_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _136_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_25 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_26 = _s_0["framing"];
          const _t_54 = _s_0["stream"];
          const _p_26 = _t_54["provider"];
          const _t_55 = _t_54["phase"];
          if (_t_55.$ === "../../ai/bend/protocol.Completed") {
            const _txt_104 = _t_54["text"];
            const _n_104 = _t_54["frames"];
            const _done_104 = _t_54["finished"];
            const _usage_104 = _t_54["usage"];
            const _line_104 = _s_0["line"];
            const _payload_104 = _s_0["payload"];
            const _a_104 = _s_0["line_chars"];
            const _b_104 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_26, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_26, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_104, "frames": _n_104, "finished": _done_104, "usage": _usage_104}, "line": _line_104, "payload": _payload_104, "line_chars": _a_104, "payload_chars": _b_104}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_55.$ === "../../ai/bend/protocol.Failed") {
            const _txt_105 = _t_54["text"];
            const _n_105 = _t_54["frames"];
            const _done_105 = _t_54["finished"];
            const _usage_105 = _t_54["usage"];
            const _line_105 = _s_0["line"];
            const _payload_105 = _s_0["payload"];
            const _a_105 = _s_0["line_chars"];
            const _b_105 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_26, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_26, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_105, "frames": _n_105, "finished": _done_105, "usage": _usage_105}, "line": _line_105, "payload": _payload_105, "line_chars": _a_105, "payload_chars": _b_105}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_55.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_106 = _t_54["text"];
            const _n_106 = _t_54["frames"];
            const _done_106 = _t_54["finished"];
            const _usage_106 = _t_54["usage"];
            const _line_106 = _s_0["line"];
            const _payload_106 = _s_0["payload"];
            const _a_106 = _s_0["line_chars"];
            const _b_106 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_26, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_26, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_106, "frames": _n_106, "finished": _done_106, "usage": _usage_106}, "line": _line_106, "payload": _payload_106, "line_chars": _a_106, "payload_chars": _b_106}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_107 = _t_54["text"];
            const _n_107 = _t_54["frames"];
            const _done_107 = _t_54["finished"];
            const _usage_107 = _t_54["usage"];
            const _line_107 = _s_0["line"];
            const _payload_107 = _s_0["payload"];
            const _a_107 = _s_0["line_chars"];
            const _b_107 = _s_0["payload_chars"];
            const _step_25 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_107 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _135_0, "tail": _136_0}}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_26, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_26, "phase": _t_55, "text": _txt_107, "frames": _n_107, "finished": _done_107, "usage": _usage_107}, "line": _line_107, "payload": _payload_107, "line_chars": _a_107, "payload_chars": _b_107}));
            $0 = _rest_25;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_25));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_25)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 63) == 10) {
          const _133_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _134_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_26 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_27 = _s_0["framing"];
          const _t_56 = _s_0["stream"];
          const _p_27 = _t_56["provider"];
          const _t_57 = _t_56["phase"];
          if (_t_57.$ === "../../ai/bend/protocol.Completed") {
            const _txt_108 = _t_56["text"];
            const _n_108 = _t_56["frames"];
            const _done_108 = _t_56["finished"];
            const _usage_108 = _t_56["usage"];
            const _line_108 = _s_0["line"];
            const _payload_108 = _s_0["payload"];
            const _a_108 = _s_0["line_chars"];
            const _b_108 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_27, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_27, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_108, "frames": _n_108, "finished": _done_108, "usage": _usage_108}, "line": _line_108, "payload": _payload_108, "line_chars": _a_108, "payload_chars": _b_108}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_57.$ === "../../ai/bend/protocol.Failed") {
            const _txt_109 = _t_56["text"];
            const _n_109 = _t_56["frames"];
            const _done_109 = _t_56["finished"];
            const _usage_109 = _t_56["usage"];
            const _line_109 = _s_0["line"];
            const _payload_109 = _s_0["payload"];
            const _a_109 = _s_0["line_chars"];
            const _b_109 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_27, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_27, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_109, "frames": _n_109, "finished": _done_109, "usage": _usage_109}, "line": _line_109, "payload": _payload_109, "line_chars": _a_109, "payload_chars": _b_109}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_57.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_110 = _t_56["text"];
            const _n_110 = _t_56["frames"];
            const _done_110 = _t_56["finished"];
            const _usage_110 = _t_56["usage"];
            const _line_110 = _s_0["line"];
            const _payload_110 = _s_0["payload"];
            const _a_110 = _s_0["line_chars"];
            const _b_110 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_27, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_27, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_110, "frames": _n_110, "finished": _done_110, "usage": _usage_110}, "line": _line_110, "payload": _payload_110, "line_chars": _a_110, "payload_chars": _b_110}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_111 = _t_56["text"];
            const _n_111 = _t_56["frames"];
            const _done_111 = _t_56["finished"];
            const _usage_111 = _t_56["usage"];
            const _line_111 = _s_0["line"];
            const _payload_111 = _s_0["payload"];
            const _a_111 = _s_0["line_chars"];
            const _b_111 = _s_0["payload_chars"];
            const _step_26 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_111 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _133_0, "tail": _134_0}}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_27, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_27, "phase": _t_57, "text": _txt_111, "frames": _n_111, "finished": _done_111, "usage": _usage_111}, "line": _line_111, "payload": _payload_111, "line_chars": _a_111, "payload_chars": _b_111}));
            $0 = _rest_26;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_26));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_26)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 31) == 10) {
          const _131_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["head"];
          const _132_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_27 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_28 = _s_0["framing"];
          const _t_58 = _s_0["stream"];
          const _p_28 = _t_58["provider"];
          const _t_59 = _t_58["phase"];
          if (_t_59.$ === "../../ai/bend/protocol.Completed") {
            const _txt_112 = _t_58["text"];
            const _n_112 = _t_58["frames"];
            const _done_112 = _t_58["finished"];
            const _usage_112 = _t_58["usage"];
            const _line_112 = _s_0["line"];
            const _payload_112 = _s_0["payload"];
            const _a_112 = _s_0["line_chars"];
            const _b_112 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_28, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_28, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_112, "frames": _n_112, "finished": _done_112, "usage": _usage_112}, "line": _line_112, "payload": _payload_112, "line_chars": _a_112, "payload_chars": _b_112}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_59.$ === "../../ai/bend/protocol.Failed") {
            const _txt_113 = _t_58["text"];
            const _n_113 = _t_58["frames"];
            const _done_113 = _t_58["finished"];
            const _usage_113 = _t_58["usage"];
            const _line_113 = _s_0["line"];
            const _payload_113 = _s_0["payload"];
            const _a_113 = _s_0["line_chars"];
            const _b_113 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_28, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_28, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_113, "frames": _n_113, "finished": _done_113, "usage": _usage_113}, "line": _line_113, "payload": _payload_113, "line_chars": _a_113, "payload_chars": _b_113}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_59.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_114 = _t_58["text"];
            const _n_114 = _t_58["frames"];
            const _done_114 = _t_58["finished"];
            const _usage_114 = _t_58["usage"];
            const _line_114 = _s_0["line"];
            const _payload_114 = _s_0["payload"];
            const _a_114 = _s_0["line_chars"];
            const _b_114 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_28, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_28, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_114, "frames": _n_114, "finished": _done_114, "usage": _usage_114}, "line": _line_114, "payload": _payload_114, "line_chars": _a_114, "payload_chars": _b_114}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_115 = _t_58["text"];
            const _n_115 = _t_58["frames"];
            const _done_115 = _t_58["finished"];
            const _usage_115 = _t_58["usage"];
            const _line_115 = _s_0["line"];
            const _payload_115 = _s_0["payload"];
            const _a_115 = _s_0["line_chars"];
            const _b_115 = _s_0["payload_chars"];
            const _step_27 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_115 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _131_0, "tail": _132_0}}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_28, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_28, "phase": _t_59, "text": _txt_115, "frames": _n_115, "finished": _done_115, "usage": _usage_115}, "line": _line_115, "payload": _payload_115, "line_chars": _a_115, "payload_chars": _b_115}));
            $0 = _rest_27;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_27));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_27)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 15) == 10) {
          const _129_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["head"];
          const _130_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"]["tail"];
          const _rest_28 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_29 = _s_0["framing"];
          const _t_60 = _s_0["stream"];
          const _p_29 = _t_60["provider"];
          const _t_61 = _t_60["phase"];
          if (_t_61.$ === "../../ai/bend/protocol.Completed") {
            const _txt_116 = _t_60["text"];
            const _n_116 = _t_60["frames"];
            const _done_116 = _t_60["finished"];
            const _usage_116 = _t_60["usage"];
            const _line_116 = _s_0["line"];
            const _payload_116 = _s_0["payload"];
            const _a_116 = _s_0["line_chars"];
            const _b_116 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_29, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_29, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_116, "frames": _n_116, "finished": _done_116, "usage": _usage_116}, "line": _line_116, "payload": _payload_116, "line_chars": _a_116, "payload_chars": _b_116}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_61.$ === "../../ai/bend/protocol.Failed") {
            const _txt_117 = _t_60["text"];
            const _n_117 = _t_60["frames"];
            const _done_117 = _t_60["finished"];
            const _usage_117 = _t_60["usage"];
            const _line_117 = _s_0["line"];
            const _payload_117 = _s_0["payload"];
            const _a_117 = _s_0["line_chars"];
            const _b_117 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_29, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_29, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_117, "frames": _n_117, "finished": _done_117, "usage": _usage_117}, "line": _line_117, "payload": _payload_117, "line_chars": _a_117, "payload_chars": _b_117}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_61.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_118 = _t_60["text"];
            const _n_118 = _t_60["frames"];
            const _done_118 = _t_60["finished"];
            const _usage_118 = _t_60["usage"];
            const _line_118 = _s_0["line"];
            const _payload_118 = _s_0["payload"];
            const _a_118 = _s_0["line_chars"];
            const _b_118 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_29, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_29, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_118, "frames": _n_118, "finished": _done_118, "usage": _usage_118}, "line": _line_118, "payload": _payload_118, "line_chars": _a_118, "payload_chars": _b_118}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_119 = _t_60["text"];
            const _n_119 = _t_60["frames"];
            const _done_119 = _t_60["finished"];
            const _usage_119 = _t_60["usage"];
            const _line_119 = _s_0["line"];
            const _payload_119 = _s_0["payload"];
            const _a_119 = _s_0["line_chars"];
            const _b_119 = _s_0["payload_chars"];
            const _step_28 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_119 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": _129_0, "tail": _130_0}}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_29, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_29, "phase": _t_61, "text": _txt_119, "frames": _n_119, "finished": _done_119, "usage": _usage_119}, "line": _line_119, "payload": _payload_119, "line_chars": _a_119, "payload_chars": _b_119}));
            $0 = _rest_28;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_28));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_28)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 7) == 2) {
          const _127_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["head"];
          const _128_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"]["tail"];
          const _rest_29 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_30 = _s_0["framing"];
          const _t_62 = _s_0["stream"];
          const _p_30 = _t_62["provider"];
          const _t_63 = _t_62["phase"];
          if (_t_63.$ === "../../ai/bend/protocol.Completed") {
            const _txt_120 = _t_62["text"];
            const _n_120 = _t_62["frames"];
            const _done_120 = _t_62["finished"];
            const _usage_120 = _t_62["usage"];
            const _line_120 = _s_0["line"];
            const _payload_120 = _s_0["payload"];
            const _a_120 = _s_0["line_chars"];
            const _b_120 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_30, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_30, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_120, "frames": _n_120, "finished": _done_120, "usage": _usage_120}, "line": _line_120, "payload": _payload_120, "line_chars": _a_120, "payload_chars": _b_120}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_63.$ === "../../ai/bend/protocol.Failed") {
            const _txt_121 = _t_62["text"];
            const _n_121 = _t_62["frames"];
            const _done_121 = _t_62["finished"];
            const _usage_121 = _t_62["usage"];
            const _line_121 = _s_0["line"];
            const _payload_121 = _s_0["payload"];
            const _a_121 = _s_0["line_chars"];
            const _b_121 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_30, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_30, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_121, "frames": _n_121, "finished": _done_121, "usage": _usage_121}, "line": _line_121, "payload": _payload_121, "line_chars": _a_121, "payload_chars": _b_121}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_63.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_122 = _t_62["text"];
            const _n_122 = _t_62["frames"];
            const _done_122 = _t_62["finished"];
            const _usage_122 = _t_62["usage"];
            const _line_122 = _s_0["line"];
            const _payload_122 = _s_0["payload"];
            const _a_122 = _s_0["line_chars"];
            const _b_122 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_30, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_30, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_122, "frames": _n_122, "finished": _done_122, "usage": _usage_122}, "line": _line_122, "payload": _payload_122, "line_chars": _a_122, "payload_chars": _b_122}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_123 = _t_62["text"];
            const _n_123 = _t_62["frames"];
            const _done_123 = _t_62["finished"];
            const _usage_123 = _t_62["usage"];
            const _line_123 = _s_0["line"];
            const _payload_123 = _s_0["payload"];
            const _a_123 = _s_0["line_chars"];
            const _b_123 = _s_0["payload_chars"];
            const _step_29 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_123 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": false, "tail": {$: "WCon", "head": _127_0, "tail": _128_0}}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_30, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_30, "phase": _t_63, "text": _txt_123, "frames": _n_123, "finished": _done_123, "usage": _usage_123}, "line": _line_123, "payload": _payload_123, "line_chars": _a_123, "payload_chars": _b_123}));
            $0 = _rest_29;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_29));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_29)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 3) == 2) {
          const _125_0 = u32_to_word(_t_3)["tail"]["tail"]["head"];
          const _126_0 = u32_to_word(_t_3)["tail"]["tail"]["tail"];
          const _rest_30 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_31 = _s_0["framing"];
          const _t_64 = _s_0["stream"];
          const _p_31 = _t_64["provider"];
          const _t_65 = _t_64["phase"];
          if (_t_65.$ === "../../ai/bend/protocol.Completed") {
            const _txt_124 = _t_64["text"];
            const _n_124 = _t_64["frames"];
            const _done_124 = _t_64["finished"];
            const _usage_124 = _t_64["usage"];
            const _line_124 = _s_0["line"];
            const _payload_124 = _s_0["payload"];
            const _a_124 = _s_0["line_chars"];
            const _b_124 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_31, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_31, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_124, "frames": _n_124, "finished": _done_124, "usage": _usage_124}, "line": _line_124, "payload": _payload_124, "line_chars": _a_124, "payload_chars": _b_124}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_65.$ === "../../ai/bend/protocol.Failed") {
            const _txt_125 = _t_64["text"];
            const _n_125 = _t_64["frames"];
            const _done_125 = _t_64["finished"];
            const _usage_125 = _t_64["usage"];
            const _line_125 = _s_0["line"];
            const _payload_125 = _s_0["payload"];
            const _a_125 = _s_0["line_chars"];
            const _b_125 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_31, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_31, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_125, "frames": _n_125, "finished": _done_125, "usage": _usage_125}, "line": _line_125, "payload": _payload_125, "line_chars": _a_125, "payload_chars": _b_125}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_65.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_126 = _t_64["text"];
            const _n_126 = _t_64["frames"];
            const _done_126 = _t_64["finished"];
            const _usage_126 = _t_64["usage"];
            const _line_126 = _s_0["line"];
            const _payload_126 = _s_0["payload"];
            const _a_126 = _s_0["line_chars"];
            const _b_126 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_31, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_31, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_126, "frames": _n_126, "finished": _done_126, "usage": _usage_126}, "line": _line_126, "payload": _payload_126, "line_chars": _a_126, "payload_chars": _b_126}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_127 = _t_64["text"];
            const _n_127 = _t_64["frames"];
            const _done_127 = _t_64["finished"];
            const _usage_127 = _t_64["usage"];
            const _line_127 = _s_0["line"];
            const _payload_127 = _s_0["payload"];
            const _a_127 = _s_0["line_chars"];
            const _b_127 = _s_0["payload_chars"];
            const _step_30 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_127 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": true, "tail": {$: "WCon", "head": _125_0, "tail": _126_0}}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_31, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_31, "phase": _t_65, "text": _txt_127, "frames": _n_127, "finished": _done_127, "usage": _usage_127}, "line": _line_127, "payload": _payload_127, "line_chars": _a_127, "payload_chars": _b_127}));
            $0 = _rest_30;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_30));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_30)), _acc_0));
            continue;
          }
        } else if ((_t_3 & 1) == 0) {
          const _123_0 = u32_to_word(_t_3)["tail"]["head"];
          const _124_0 = u32_to_word(_t_3)["tail"]["tail"];
          const _rest_31 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_32 = _s_0["framing"];
          const _t_66 = _s_0["stream"];
          const _p_32 = _t_66["provider"];
          const _t_67 = _t_66["phase"];
          if (_t_67.$ === "../../ai/bend/protocol.Completed") {
            const _txt_128 = _t_66["text"];
            const _n_128 = _t_66["frames"];
            const _done_128 = _t_66["finished"];
            const _usage_128 = _t_66["usage"];
            const _line_128 = _s_0["line"];
            const _payload_128 = _s_0["payload"];
            const _a_128 = _s_0["line_chars"];
            const _b_128 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_32, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_32, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_128, "frames": _n_128, "finished": _done_128, "usage": _usage_128}, "line": _line_128, "payload": _payload_128, "line_chars": _a_128, "payload_chars": _b_128}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_67.$ === "../../ai/bend/protocol.Failed") {
            const _txt_129 = _t_66["text"];
            const _n_129 = _t_66["frames"];
            const _done_129 = _t_66["finished"];
            const _usage_129 = _t_66["usage"];
            const _line_129 = _s_0["line"];
            const _payload_129 = _s_0["payload"];
            const _a_129 = _s_0["line_chars"];
            const _b_129 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_32, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_32, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_129, "frames": _n_129, "finished": _done_129, "usage": _usage_129}, "line": _line_129, "payload": _payload_129, "line_chars": _a_129, "payload_chars": _b_129}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_67.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_130 = _t_66["text"];
            const _n_130 = _t_66["frames"];
            const _done_130 = _t_66["finished"];
            const _usage_130 = _t_66["usage"];
            const _line_130 = _s_0["line"];
            const _payload_130 = _s_0["payload"];
            const _a_130 = _s_0["line_chars"];
            const _b_130 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_32, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_32, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_130, "frames": _n_130, "finished": _done_130, "usage": _usage_130}, "line": _line_130, "payload": _payload_130, "line_chars": _a_130, "payload_chars": _b_130}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_131 = _t_66["text"];
            const _n_131 = _t_66["frames"];
            const _done_131 = _t_66["finished"];
            const _usage_131 = _t_66["usage"];
            const _line_131 = _s_0["line"];
            const _payload_131 = _s_0["payload"];
            const _a_131 = _s_0["line_chars"];
            const _b_131 = _s_0["payload_chars"];
            const _step_31 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_131 < 1048576), char_new(word_to_u32({$: "WCon", "head": false, "tail": {$: "WCon", "head": _123_0, "tail": _124_0}})), {$: "../../ai/bend/protocol.RawState", "framing": _f_32, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_32, "phase": _t_67, "text": _txt_131, "frames": _n_131, "finished": _done_131, "usage": _usage_131}, "line": _line_131, "payload": _payload_131, "line_chars": _a_131, "payload_chars": _b_131}));
            $0 = _rest_31;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_31));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_31)), _acc_0));
            continue;
          }
        } else {
          const _121_0 = u32_to_word(_t_3)["head"];
          const _122_0 = u32_to_word(_t_3)["tail"];
          const _rest_32 = (_data_0.codePointAt(0) > 0xFFFF ? _data_0.slice(2) : _data_0.slice(1));
          const _f_33 = _s_0["framing"];
          const _t_68 = _s_0["stream"];
          const _p_33 = _t_68["provider"];
          const _t_69 = _t_68["phase"];
          if (_t_69.$ === "../../ai/bend/protocol.Completed") {
            const _txt_132 = _t_68["text"];
            const _n_132 = _t_68["frames"];
            const _done_132 = _t_68["finished"];
            const _usage_132 = _t_68["usage"];
            const _line_132 = _s_0["line"];
            const _payload_132 = _s_0["payload"];
            const _a_132 = _s_0["line_chars"];
            const _b_132 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_33, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_33, "phase": {$: "../../ai/bend/protocol.Completed"}, "text": _txt_132, "frames": _n_132, "finished": _done_132, "usage": _usage_132}, "line": _line_132, "payload": _payload_132, "line_chars": _a_132, "payload_chars": _b_132}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_69.$ === "../../ai/bend/protocol.Failed") {
            const _txt_133 = _t_68["text"];
            const _n_133 = _t_68["frames"];
            const _done_133 = _t_68["finished"];
            const _usage_133 = _t_68["usage"];
            const _line_133 = _s_0["line"];
            const _payload_133 = _s_0["payload"];
            const _a_133 = _s_0["line_chars"];
            const _b_133 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_33, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_33, "phase": {$: "../../ai/bend/protocol.Failed"}, "text": _txt_133, "frames": _n_133, "finished": _done_133, "usage": _usage_133}, "line": _line_133, "payload": _payload_133, "line_chars": _a_133, "payload_chars": _b_133}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else if (_t_69.$ === "../../ai/bend/protocol.Cancelled") {
            const _txt_134 = _t_68["text"];
            const _n_134 = _t_68["frames"];
            const _done_134 = _t_68["finished"];
            const _usage_134 = _t_68["usage"];
            const _line_134 = _s_0["line"];
            const _payload_134 = _s_0["payload"];
            const _a_134 = _s_0["line_chars"];
            const _b_134 = _s_0["payload_chars"];
            return {$: "../../ai/bend/protocol.Feed", "state": {$: "../../ai/bend/protocol.RawState", "framing": _f_33, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_33, "phase": {$: "../../ai/bend/protocol.Cancelled"}, "text": _txt_134, "frames": _n_134, "finished": _done_134, "usage": _usage_134}, "line": _line_134, "payload": _payload_134, "line_chars": _a_134, "payload_chars": _b_134}, "events": ($$$$047$$$047ai$047bend$047protocol$reverse_events$(_acc_0, {$: "Nil"}))};
          } else {
            const _txt_135 = _t_68["text"];
            const _n_135 = _t_68["frames"];
            const _done_135 = _t_68["finished"];
            const _usage_135 = _t_68["usage"];
            const _line_135 = _s_0["line"];
            const _payload_135 = _s_0["payload"];
            const _a_135 = _s_0["line_chars"];
            const _b_135 = _s_0["payload_chars"];
            const _step_32 = ($$$$047$$$047ai$047bend$047protocol$feed_char$((_a_135 < 1048576), char_new(word_to_u32({$: "WCon", "head": _121_0, "tail": _122_0})), {$: "../../ai/bend/protocol.RawState", "framing": _f_33, "stream": {$: "../../ai/bend/protocol.StreamState", "provider": _p_33, "phase": _t_69, "text": _txt_135, "frames": _n_135, "finished": _done_135, "usage": _usage_135}, "line": _line_135, "payload": _payload_135, "line_chars": _a_135, "payload_chars": _b_135}));
            $0 = _rest_32;
            $1 = ($$$$047$$$047ai$047bend$047protocol$feed_state$(_step_32));
            $2 = ($$$$047$$$047ai$047bend$047protocol$reverse_events$(($$$$047$$$047ai$047bend$047protocol$feed_events$(_step_32)), _acc_0));
            continue;
          }
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047protocol$feed$(_data_0, _s_0) {
  return $$$$047$$$047ai$047bend$047protocol$feed_run$(_data_0, _s_0, {$: "Nil"});
}

function $$$$047$$$047ai$047bend$047protocol$raw_end$(_s_0) {
  const _f_0 = _s_0["framing"];
  const _stream_0 = _s_0["stream"];
  return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$reduce$({$: "../../ai/bend/protocol.EndFrame"}, _stream_0)), _f_0);
}

function $$$$047$$$047ai$047bend$047protocol$raw_cancel$(_s_0) {
  const _f_0 = _s_0["framing"];
  const _stream_0 = _s_0["stream"];
  return $$$$047$$$047ai$047bend$047protocol$raw_event$(($$$$047$$$047ai$047bend$047protocol$reduce$({$: "../../ai/bend/protocol.CancelFrame"}, _stream_0)), _f_0);
}

function $consume_text$(_event_0, _state_0, _message_0) {
  if (_event_0.$ === "../../ai/bend/protocol.TextDelta") {
    const _text_0 = _event_0["text"];
    return {$: "TextOutcome", "message": ($session$reduce_text$({$: "session.TextDelta", "text": _text_0}, _message_0)), "error": ""};
  } else if (_event_0.$ === "../../ai/bend/protocol.TextComplete") {
    return {$: "TextOutcome", "message": ($session$reduce_text$({$: "session.TextResult", "text": ($$$$047$$$047ai$047bend$047protocol$text$(_state_0))}, _message_0)), "error": ""};
  } else if (_event_0.$ === "../../ai/bend/protocol.TextCancelled") {
    return {$: "TextOutcome", "message": ($session$reduce_text$({$: "session.TextCancelled"}, _message_0)), "error": ""};
  } else if (_event_0.$ === "../../ai/bend/protocol.TextFailed") {
    const _error_0 = _event_0["error"];
    return {$: "TextOutcome", "message": ($session$reduce_text$({$: "session.TextError", "message": ($$$$047$$$047ai$047bend$047protocol$error_summary$(_error_0))}, _message_0)), "error": ($$$$047$$$047ai$047bend$047protocol$error_summary$(_error_0))};
  } else {
    return {$: "TextOutcome", "message": _message_0, "error": ""};
  }
}

function $transition_outcome$(_outcome_0, _state_0) {
  const _message_0 = _outcome_0["message"];
  const _error_0 = _outcome_0["error"];
  return {$: "NativeTransition", "stream": _state_0, "message": _message_0, "error": _error_0};
}

function $consume_transition$(_transition_0, _message_0) {
  const _state_0 = _transition_0["state"];
  const _event_0 = _transition_0["event"];
  return $transition_outcome$(($consume_text$(_event_0, _state_0, _message_0)), _state_0);
}

function $reduce_frame$(_frame_0, _state_0, _message_0) {
  return $consume_transition$(($$$$047$$$047ai$047bend$047protocol$reduce$(_frame_0, _state_0)), _message_0);
}

function $streaming_message$(_id_0, _source_0) {
  return {$: "session.Message", "id": _id_0, "role": {$: "session.AssistantMessage"}, "source": _source_0, "text": "", "status": {$: "session.StreamingMessage"}};
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

function $String$take$(_s_0, _n_0) {
  if (_s_0 === "") {
    return "";
  } else {
    const _h_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
    if (_n_0 === 0) {
      return "";
    } else {
      const _p_0 = (_n_0 - 1);
      return (_h_0 + ($String$take$(_t_0, _p_0)));
    }
  }
}

function $String$drop$($0, $1) {
  for (;;) {
    {
      const _s_0 = $0;
      const _n_0 = $1;
      if (_s_0 === "") {
        return "";
      } else {
        const _h_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        if (_n_0 === 0) {
          return (_h_0 + _t_0);
        } else {
          const _p_0 = (_n_0 - 1);
          $0 = _t_0;
          $1 = _p_0;
          continue;
        }
      }
    }
  }
}

function $String$reverse$(_s_0) {
  return $String$reverse$go$(_s_0, "");
}

function $List$is_empty$(_xs_0) {
  if (_xs_0.$ === "Nil") {
    return true;
  } else {
    return false;
  }
}

function $Char$to_u32$(_c_0) {
  return _c_0.codePointAt(0);
}

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
  }
}

function $Result$bind$(_r_0, _f_0) {
  if (_r_0.$ === "Fail") {
    const _e_0 = _r_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _x_0 = _r_0["value"];
    return run_tail(_f_0, _x_0);
  }
}

function $Result$pure$(_x_0) {
  return {$: "Done", "value": _x_0};
}

function $Char$is_eq$(_a_0, _b_0) {
  const _x_0 = _a_0.codePointAt(0);
  const _x_1 = _b_0.codePointAt(0);
  return (_x_0 === _x_1);
}

function $Char$is_digit$(_c_0) {
  const _x_0 = _c_0.codePointAt(0);
  const _x_1 = _c_0.codePointAt(0);
  return $Bool$and$((_x_0 >= 48), (_x_1 <= 57));
}

function $List$reverse$(_xs_0) {
  return $List$reverse$go$(_xs_0, {$: "Nil"});
}

function $U32$read$(_s_0) {
  if (_s_0 === "") {
    return {$: "None"};
  } else {
    const _h_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
    return $U32$read$go$((_h_0 + _t_0), 0);
  }
}

function $Nat$is_le$(_a_0, _b_0) {
  return $Cmp$is_le$(cmp_new(_a_0, _b_0));
}

function $String$is_empty$(_s_0) {
  if (_s_0 === "") {
    return true;
  } else {
    return false;
  }
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

function $String$reverse$go$($0, $1) {
  for (;;) {
    {
      const _s_0 = $0;
      const _acc_0 = $1;
      if (_s_0 === "") {
        return _acc_0;
      } else {
        const _h_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        $0 = _t_0;
        $1 = (_h_0 + _acc_0);
        continue;
      }
    }
  }
}

function $List$reverse$go$($0, $1) {
  for (;;) {
    {
      const _xs_0 = $0;
      const _acc_0 = $1;
      if (_xs_0.$ === "Nil") {
        return _acc_0;
      } else {
        const _h_0 = _xs_0["head"];
        const _t_0 = _xs_0["tail"];
        $0 = _t_0;
        $1 = {$: "Con", "head": _h_0, "tail": _acc_0};
        continue;
      }
    }
  }
}

function $U32$read$go$($0, $1, $2) {
  let $pc = 0;
  for (;;) switch ($pc) {
    case 0: {
      const _s_0 = $0;
      const _acc_0 = $1;
      if (_s_0 === "") {
        return {$: "Some", "value": _acc_0};
      } else {
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        const _x_0 = _t_0.codePointAt(0);
        const _x_1 = (Math.imul(_acc_0, 10) >>> 0);
        const _x_2 = ((_x_0 - 48) >>> 0);
        const _n_0 = ((_x_1 + _x_2) >>> 0);
        const _x_3 = (10 === 0 ? 0 : (_n_0 / 10) >>> 0);
        $0 = _t_1;
        $1 = _n_0;
        $2 = (_x_3 === _acc_0);
        $pc = 1; continue;
      }
    }
    case 1: {
      const _t_0 = $0;
      const _n_0 = $1;
      const _ok_0 = $2;
      if (_ok_0) {
        $0 = _t_0;
        $1 = _n_0;
        $pc = 0; continue;
      } else {
        return {$: "None"};
      }
    }
  }
}

function $Cmp$is_le$(_c_0) {
  if (_c_0.$ === "GT") {
    return false;
  } else {
    return true;
  }
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

function $U32$read$if$($0, $1, $2) {
  let $pc = 1;
  for (;;) switch ($pc) {
    case 0: {
      const _s_0 = $0;
      const _acc_0 = $1;
      if (_s_0 === "") {
        return {$: "Some", "value": _acc_0};
      } else {
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        const _x_0 = _t_0.codePointAt(0);
        const _x_1 = (Math.imul(_acc_0, 10) >>> 0);
        const _x_2 = ((_x_0 - 48) >>> 0);
        const _n_0 = ((_x_1 + _x_2) >>> 0);
        const _x_3 = (10 === 0 ? 0 : (_n_0 / 10) >>> 0);
        $0 = _t_1;
        $1 = _n_0;
        $2 = (_x_3 === _acc_0);
        $pc = 1; continue;
      }
    }
    case 1: {
      const _t_0 = $0;
      const _n_0 = $1;
      const _ok_0 = $2;
      if (_ok_0) {
        $0 = _t_0;
        $1 = _n_0;
        $pc = 0; continue;
      } else {
        return {$: "None"};
      }
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
  "session.initial": run_lib(() => { const r = (run_loop($session$initial$()));  return r; }, 0),
  "session.update": run_lib((a0, a1) => { const r = (run_loop($session$update$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.phase": run_lib((a0) => { const r = (run_loop($session$phase$((a0)))); (a0); return r; }, 1),
  "session.in_call": run_lib((a0) => { const r = (run_loop($session$in_call$((a0)))); (a0); return r; }, 1),
  "session.task_permitted": run_lib((a0) => { const r = (run_loop($session$task_permitted$((a0)))); (a0); return r; }, 1),
  "session.history_initial": run_lib(() => { const r = (run_loop($session$history_initial$()));  return r; }, 0),
  "session.append_message": run_lib((a0, a1) => { const r = (run_loop($session$append_message$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.append_task": run_lib((a0, a1) => { const r = (run_loop($session$append_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.history_message": run_lib((a0, a1) => { const r = (run_loop($session$history_message$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.history_task": run_lib((a0, a1) => { const r = (run_loop($session$history_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.reduce_text": run_lib((a0, a1) => { const r = (run_loop($session$reduce_text$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.reduce_task": run_lib((a0, a1) => { const r = (run_loop($session$reduce_task$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.permissions_initial": run_lib(() => { const r = (run_loop($session$permissions_initial$()));  return r; }, 0),
  "session.reduce_permissions": run_lib((a0, a1) => { const r = (run_loop($session$reduce_permissions$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "session.permission_granted": run_lib((a0) => { const r = (run_loop($session$permission_granted$((a0)))); (a0); return r; }, 1),
  "session.call_record_permitted": run_lib((a0) => { const r = (run_loop($session$call_record_permitted$((a0)))); (a0); return r; }, 1),
  "session.history_record": run_lib((a0, a1, a2) => { const r = (run_loop($session$history_record$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "session.new_task": run_lib((a0, a1, a2) => { const r = (run_loop($session$new_task$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "session.message_id": run_lib((a0) => { const r = (run_loop($session$message_id$((a0)))); (a0); return r; }, 1),
  "session.task_id": run_lib((a0) => { const r = (run_loop($session$task_id$((a0)))); (a0); return r; }, 1),
  "session.reduce_messages": run_lib((a0, a1, a2) => { const r = (run_loop($session$reduce_messages$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "session.reduce_tasks": run_lib((a0, a1, a2) => { const r = (run_loop($session$reduce_tasks$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "session.history_text": run_lib((a0, a1, a2) => { const r = (run_loop($session$history_text$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "session.history_task_event": run_lib((a0, a1, a2) => { const r = (run_loop($session$history_task_event$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.hex": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$hex$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.escape_code": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$escape_code$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.escape_char": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$escape_char$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.escape_go": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$escape_go$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.escape": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$escape$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.quote": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$quote$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.comma": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$comma$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.stringify": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$stringify$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.choose": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$choose$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.get_fields": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$get_fields$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.get": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$get$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.text": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$text$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.select_u32": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$select_u32$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.hex_digit": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$hex_digit$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.checked_char": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$checked_char$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.hex_checked": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$hex_checked$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.hex4": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$hex4$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/wire_json.unicode_escape": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$unicode_escape$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.unicode_escape_code": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$unicode_escape_code$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.unescape": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$unescape$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.string_char": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$string_char$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/wire_json.string_escape": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$string_escape$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.string_read": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$string_read$(nat_host(a0), (a1), (a2)))); BigInt(a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.select_state": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$select_state$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.number_state": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$number_state$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.number_end": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$number_end$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.number_valid": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$number_valid$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.primitive": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$primitive$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.literal_known": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$literal_known$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/wire_json.literal": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$literal$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.delimiter": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$delimiter$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.word_step": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$word_step$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/wire_json.word": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$word$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.lex_string": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex_string$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.lex_word": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex_word$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.select_lex": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$select_lex$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.lex_kind": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex_kind$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.lex_step": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex_step$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/wire_json.lex_acc": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex_acc$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.lex": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$lex$(nat_host(a0), (a1), (a2)))); BigInt(a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.array_end": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$array_end$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.object_end": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$object_end$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.array_after": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$array_after$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.object_after": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$object_after$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/wire_json.parse": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$parse$(nat_host(a0), (a1), (a2)))); BigInt(a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.finish": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$finish$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.depth_guard": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$depth_guard$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.depth_step": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$depth_step$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.depth_valid": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$depth_valid$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.token_count": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$token_count$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/wire_json.parse_checked": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$parse_checked$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/wire_json.parse_tokens": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$parse_tokens$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/wire_json.read": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047wire_json$read$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.protocol_error": run_lib(() => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$protocol_error$()));  return r; }, 0),
  "../../ai/bend/codecs.string": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$string$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.u32_read": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$u32_read$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.u32": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$u32$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.usage_fields": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$usage_fields$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.finish_reason": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$finish_reason$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.finish": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$finish$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.delta": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$delta$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.router_delta": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_delta$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.router_tools": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_tools$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.router_choice_delta": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_choice_delta$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.router_finish": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_finish$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.router_choice": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_choice$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.router_choices": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_choices$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.router_fields": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_fields$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/codecs.router_json": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$router_json$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.responses_status": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$responses_status$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.responses_complete": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$responses_complete$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.responses_fields": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$responses_fields$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.responses_json": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$responses_json$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_delta": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_delta$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.anthropic_delta_json": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_delta_json$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_block": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_block$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_stop": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_stop$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_start_kind": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_start_kind$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_start": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_start$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.anthropic_fields": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_fields$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.anthropic_json": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$anthropic_json$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.claude_result": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$claude_result$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.claude_stream_result": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$claude_stream_result$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.claude_stream": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$claude_stream$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.claude_fields": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$claude_fields$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.claude_json": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$claude_json$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/codecs.parsed": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$parsed$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/codecs.decode": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047codecs$decode$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.initial": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$initial$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.text": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$text$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.terminal": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$terminal$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.error_summary": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$error_summary$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.fail": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$fail$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.complete": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$complete$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.complete_ready": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$complete_ready$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.apply_delta": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$apply_delta$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.apply_result": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$apply_result$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.data_checked": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$data_checked$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.reduce": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$reduce$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.raw_initial": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$raw_initial$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.raw_stream": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$raw_stream$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.append_event": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$append_event$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.strip_cr_reverse": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$strip_cr_reverse$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.strip_cr": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$strip_cr$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.strip_space": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$strip_space$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.raw_event": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$raw_event$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.sse_empty": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_empty$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.sse_data": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_data$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/protocol.sse_join": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_join$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.sse_line_append": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_line_append$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/protocol.sse_line_data": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_line_data$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/protocol.sse_line": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$sse_line$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/protocol.ndjson_line": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$ndjson_line$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.process_line": run_lib((a0, a1, a2, a3, a4) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$process_line$((a0), (a1), (a2), (a3), (a4)))); (a0); (a1); (a2); (a3); (a4); return r; }, 5),
  "../../ai/bend/protocol.line_done": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$line_done$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.reverse_events": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$reverse_events$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.feed_state": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$feed_state$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.feed_events": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$feed_events$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.feed_char": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$feed_char$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.feed_run": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$feed_run$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/protocol.feed": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$feed$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/protocol.raw_end": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$raw_end$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/protocol.raw_cancel": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047protocol$raw_cancel$((a0)))); (a0); return r; }, 1),
  "consume_text": run_lib((a0, a1, a2) => { const r = (run_loop($consume_text$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "transition_outcome": run_lib((a0, a1) => { const r = (run_loop($transition_outcome$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "consume_transition": run_lib((a0, a1) => { const r = (run_loop($consume_transition$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "reduce_frame": run_lib((a0, a1, a2) => { const r = (run_loop($reduce_frame$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "streaming_message": run_lib((a0, a1) => { const r = (run_loop($streaming_message$((a0), (a1)))); (a0); (a1); return r; }, 2),
};
