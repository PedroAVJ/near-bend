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

function $$$$047$$$047ai$047bend$047voice$realtime_initial$() {
  return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": "", "active_responses": {$: "Nil"}};
}

function $$$$047$$$047ai$047bend$047voice$command_name$(_command_0) {
  if (_command_0.$ === "../../ai/bend/voice.Configure") {
    return "session.update";
  } else if (_command_0.$ === "../../ai/bend/voice.AppendAudio") {
    return "input_audio_buffer.append";
  } else if (_command_0.$ === "../../ai/bend/voice.CommitAudio") {
    return "input_audio_buffer.commit";
  } else if (_command_0.$ === "../../ai/bend/voice.ClearAudio") {
    return "input_audio_buffer.clear";
  } else if (_command_0.$ === "../../ai/bend/voice.CreateResponse") {
    return "response.create";
  } else {
    return "response.cancel";
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_encode$(_command_0) {
  if (_command_0.$ === "../../ai/bend/voice.Configure") {
    const _t_0 = _command_0["config"];
    const _instructions_0 = _t_0["instructions"];
    const _voice_0 = _t_0["voice"];
    const _model_0 = _t_0["transcription_model"];
    const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_voice_0));
    const _x_1 = (_x_0 + "}}}}");
    const _x_2 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_model_0));
    const _x_3 = ("},\"turn_detection\":null},\"output\":{\"format\":{\"type\":\"audio/pcm\",\"rate\":24000},\"voice\":" + _x_1);
    const _x_4 = (_x_2 + _x_3);
    const _x_5 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_instructions_0));
    const _x_6 = (",\"audio\":{\"input\":{\"format\":{\"type\":\"audio/pcm\",\"rate\":24000},\"transcription\":{\"model\":" + _x_4);
    const _x_7 = (_x_5 + _x_6);
    return ("{\"type\":\"session.update\",\"session\":{\"type\":\"realtime\",\"instructions\":" + _x_7);
  } else if (_command_0.$ === "../../ai/bend/voice.AppendAudio") {
    const _audio_0 = _command_0["pcm16_base64"];
    const _x_8 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_audio_0));
    const _x_9 = (_x_8 + "}");
    return ("{\"type\":\"input_audio_buffer.append\",\"audio\":" + _x_9);
  } else if (_command_0.$ === "../../ai/bend/voice.CancelResponse") {
    const _id_0 = _command_0["response_id"];
    const _x_10 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_id_0));
    const _x_11 = (_x_10 + "}");
    return ("{\"type\":\"response.cancel\",\"response_id\":" + _x_11);
  } else if (_command_0.$ === "../../ai/bend/voice.CreateResponse") {
    return "{\"type\":\"response.create\",\"response\":{}}";
  } else {
    const _x_12 = ($$$$047$$$047ai$047bend$047wire_json$quote$(($$$$047$$$047ai$047bend$047voice$command_name$(_command_0))));
    const _x_13 = (_x_12 + "}");
    return ("{\"type\":" + _x_13);
  }
}

function $$$$047$$$047ai$047bend$047voice$base64_char$(_code_0) {
  const _x_0 = ($Bool$and$((_code_0 >= 65), (_code_0 <= 90)));
  const _x_1 = ($Bool$and$((_code_0 >= 97), (_code_0 <= 122)));
  const _x_2 = (_x_0 || _x_1);
  const _x_3 = ($Bool$and$((_code_0 >= 48), (_code_0 <= 57)));
  const _x_4 = (_x_2 || _x_3);
  const _x_5 = (_code_0 === 43);
  const _x_6 = (_x_4 || _x_5);
  const _x_7 = (_code_0 === 47);
  return (_x_6 || _x_7);
}

function $$$$047$$$047ai$047bend$047voice$base64_scan$($0, $1, $2) {
  for (;;) {
    {
      const _s_0 = $0;
      const _valid_0 = $1;
      const _padding_0 = $2;
      if (_s_0 === "") {
        if (!_valid_0) {
          return {$: "None"};
        } else {
          return {$: "Some", "value": _padding_0};
        }
      } else {
        const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = _t_0.codePointAt(0);
        if (_t_1 == 61) {
          const _rest_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
          if (!_valid_0) {
            return {$: "None"};
          } else {
            $0 = _rest_0;
            $1 = (_padding_0 < 2);
            $2 = ((_padding_0 + 1) >>> 0);
            continue;
          }
        } else {
          const _26_0 = u32_to_word(_t_1)["head"];
          const _27_0 = u32_to_word(_t_1)["tail"];
          const _rest_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
          if (!_valid_0) {
            return {$: "None"};
          } else {
            $0 = _rest_1;
            $1 = ($Bool$and$((_padding_0 === 0), ($$$$047$$$047ai$047bend$047voice$base64_char$(word_to_u32({$: "WCon", "head": _26_0, "tail": _27_0})))));
            $2 = _padding_0;
            continue;
          }
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$base64_finish$(_length_0, _padding_0) {
  if (_padding_0.$ === "Some") {
    const _pads_0 = _padding_0["value"];
    const _x_0 = (_length_0 >>> 0);
    const _x_1 = ($Nat$div$(_length_0, 4));
    const _x_2 = nat_chk(_x_1 * 3);
    return $Bool$and$(($Bool$and$(($Bool$and$(($Bool$and$((_pads_0 <= 2), ($Nat$is_ne$(_length_0, 0)))), (_x_0 <= 262144))), ($Nat$is_eq$(($Nat$mod$(_length_0, 4)), 0)))), ($Nat$is_eq$(($Nat$mod$((_x_2 < _pads_0 ? 0 : _x_2 - _pads_0), 2)), 0)));
  } else {
    return false;
  }
}

function $$$$047$$$047ai$047bend$047voice$pcm16_limited$(_allowed_0, _audio_0) {
  if (!_allowed_0) {
    return false;
  } else {
    return $$$$047$$$047ai$047bend$047voice$base64_finish$([..._audio_0].length, ($$$$047$$$047ai$047bend$047voice$base64_scan$(_audio_0, true, 0)));
  }
}

function $$$$047$$$047ai$047bend$047voice$pcm16_frame$(_audio_0) {
  const _x_0 = [..._audio_0].length;
  const _x_1 = (_x_0 >>> 0);
  return $$$$047$$$047ai$047bend$047voice$pcm16_limited$((_x_1 <= 262144), _audio_0);
}

function $$$$047$$$047ai$047bend$047voice$text_value$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _s_0 = _t_0["value"];
      return {$: "Some", "value": _s_0};
    } else {
      return {$: "None"};
    }
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$text$(_value_0, _key_0) {
  return $$$$047$$$047ai$047bend$047voice$text_value$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, _key_0)));
}

function $$$$047$$$047ai$047bend$047voice$child$(_value_0, _key_0) {
  return $Maybe$default$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, _key_0)), {$: "../../ai/bend/wire_json.Null"});
}

function $$$$047$$$047ai$047bend$047voice$number_value$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Number") {
      const _s_0 = _t_0["text"];
      return f32_read(_s_0);
    } else {
      return {$: "None"};
    }
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$number$(_value_0, _key_0) {
  return $$$$047$$$047ai$047bend$047voice$number_value$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, _key_0)));
}

function $$$$047$$$047ai$047bend$047voice$integer_exact$(_wire_0, _parsed_0) {
  if (_parsed_0.$ === "Some") {
    const _value_0 = _parsed_0["value"];
    return $Bool$pick$(($String$eq$(_wire_0, ($U32$show$(_value_0)))), {$: "Some", "value": _value_0}, {$: "None"});
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$integer_value$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Number") {
      const _s_0 = _t_0["text"];
      return $$$$047$$$047ai$047bend$047voice$integer_exact$(_s_0, ($U32$read$(_s_0)));
    } else {
      return {$: "None"};
    }
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$integer$(_value_0, _key_0) {
  return $$$$047$$$047ai$047bend$047voice$integer_value$(($$$$047$$$047ai$047bend$047wire_json$get$(_value_0, _key_0)));
}

function $$$$047$$$047ai$047bend$047voice$status$(_s_0) {
  if (_s_0 !== "") {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 99) {
      const _t_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 111) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 109) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 112) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 108) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 101) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 116) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 101) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 100) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 === "") {
                                        return {$: "Some", "value": {$: "../../ai/bend/voice.Completed"}};
                                      } else {
                                        return {$: "None"};
                                      }
                                    } else {
                                      return {$: "None"};
                                    }
                                  } else {
                                    return {$: "None"};
                                  }
                                } else {
                                  return {$: "None"};
                                }
                              } else {
                                return {$: "None"};
                              }
                            } else {
                              return {$: "None"};
                            }
                          } else {
                            return {$: "None"};
                          }
                        } else {
                          return {$: "None"};
                        }
                      } else {
                        return {$: "None"};
                      }
                    } else {
                      return {$: "None"};
                    }
                  } else {
                    return {$: "None"};
                  }
                } else {
                  return {$: "None"};
                }
              } else {
                return {$: "None"};
              }
            } else {
              return {$: "None"};
            }
          } else {
            return {$: "None"};
          }
        } else if (_t_4 == 97) {
          const _t_27 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_27 !== "") {
            const _t_28 = (_t_27.codePointAt(0) > 0xFFFF ? _t_27.slice(0, 2) : _t_27[0]);
            const _t_29 = _t_28.codePointAt(0);
            if (_t_29 == 110) {
              const _t_30 = (_t_27.codePointAt(0) > 0xFFFF ? _t_27.slice(2) : _t_27.slice(1));
              if (_t_30 !== "") {
                const _t_31 = (_t_30.codePointAt(0) > 0xFFFF ? _t_30.slice(0, 2) : _t_30[0]);
                const _t_32 = _t_31.codePointAt(0);
                if (_t_32 == 99) {
                  const _t_33 = (_t_30.codePointAt(0) > 0xFFFF ? _t_30.slice(2) : _t_30.slice(1));
                  if (_t_33 !== "") {
                    const _t_34 = (_t_33.codePointAt(0) > 0xFFFF ? _t_33.slice(0, 2) : _t_33[0]);
                    const _t_35 = _t_34.codePointAt(0);
                    if (_t_35 == 101) {
                      const _t_36 = (_t_33.codePointAt(0) > 0xFFFF ? _t_33.slice(2) : _t_33.slice(1));
                      if (_t_36 !== "") {
                        const _t_37 = (_t_36.codePointAt(0) > 0xFFFF ? _t_36.slice(0, 2) : _t_36[0]);
                        const _t_38 = _t_37.codePointAt(0);
                        if (_t_38 == 108) {
                          const _t_39 = (_t_36.codePointAt(0) > 0xFFFF ? _t_36.slice(2) : _t_36.slice(1));
                          if (_t_39 !== "") {
                            const _t_40 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(0, 2) : _t_39[0]);
                            const _t_41 = _t_40.codePointAt(0);
                            if (_t_41 == 108) {
                              const _t_42 = (_t_39.codePointAt(0) > 0xFFFF ? _t_39.slice(2) : _t_39.slice(1));
                              if (_t_42 !== "") {
                                const _t_43 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(0, 2) : _t_42[0]);
                                const _t_44 = _t_43.codePointAt(0);
                                if (_t_44 == 101) {
                                  const _t_45 = (_t_42.codePointAt(0) > 0xFFFF ? _t_42.slice(2) : _t_42.slice(1));
                                  if (_t_45 !== "") {
                                    const _t_46 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(0, 2) : _t_45[0]);
                                    const _t_47 = _t_46.codePointAt(0);
                                    if (_t_47 == 100) {
                                      const _t_48 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(2) : _t_45.slice(1));
                                      if (_t_48 === "") {
                                        return {$: "Some", "value": {$: "../../ai/bend/voice.Cancelled"}};
                                      } else {
                                        return {$: "None"};
                                      }
                                    } else {
                                      return {$: "None"};
                                    }
                                  } else {
                                    return {$: "None"};
                                  }
                                } else {
                                  return {$: "None"};
                                }
                              } else {
                                return {$: "None"};
                              }
                            } else {
                              return {$: "None"};
                            }
                          } else {
                            return {$: "None"};
                          }
                        } else {
                          return {$: "None"};
                        }
                      } else {
                        return {$: "None"};
                      }
                    } else {
                      return {$: "None"};
                    }
                  } else {
                    return {$: "None"};
                  }
                } else {
                  return {$: "None"};
                }
              } else {
                return {$: "None"};
              }
            } else {
              return {$: "None"};
            }
          } else {
            return {$: "None"};
          }
        } else {
          return {$: "None"};
        }
      } else {
        return {$: "None"};
      }
    } else if ((_t_1 & 3) == 3) {
      return {$: "None"};
    } else if (_t_1 == 105) {
      const _t_49 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_49 !== "") {
        const _t_50 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(0, 2) : _t_49[0]);
        const _t_51 = _t_50.codePointAt(0);
        if (_t_51 == 110) {
          const _t_52 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(2) : _t_49.slice(1));
          if (_t_52 !== "") {
            const _t_53 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(0, 2) : _t_52[0]);
            const _t_54 = _t_53.codePointAt(0);
            if (_t_54 == 99) {
              const _t_55 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(2) : _t_52.slice(1));
              if (_t_55 !== "") {
                const _t_56 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(0, 2) : _t_55[0]);
                const _t_57 = _t_56.codePointAt(0);
                if (_t_57 == 111) {
                  const _t_58 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(2) : _t_55.slice(1));
                  if (_t_58 !== "") {
                    const _t_59 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(0, 2) : _t_58[0]);
                    const _t_60 = _t_59.codePointAt(0);
                    if (_t_60 == 109) {
                      const _t_61 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(2) : _t_58.slice(1));
                      if (_t_61 !== "") {
                        const _t_62 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(0, 2) : _t_61[0]);
                        const _t_63 = _t_62.codePointAt(0);
                        if (_t_63 == 112) {
                          const _t_64 = (_t_61.codePointAt(0) > 0xFFFF ? _t_61.slice(2) : _t_61.slice(1));
                          if (_t_64 !== "") {
                            const _t_65 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(0, 2) : _t_64[0]);
                            const _t_66 = _t_65.codePointAt(0);
                            if (_t_66 == 108) {
                              const _t_67 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(2) : _t_64.slice(1));
                              if (_t_67 !== "") {
                                const _t_68 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(0, 2) : _t_67[0]);
                                const _t_69 = _t_68.codePointAt(0);
                                if (_t_69 == 101) {
                                  const _t_70 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(2) : _t_67.slice(1));
                                  if (_t_70 !== "") {
                                    const _t_71 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(0, 2) : _t_70[0]);
                                    const _t_72 = _t_71.codePointAt(0);
                                    if (_t_72 == 116) {
                                      const _t_73 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(2) : _t_70.slice(1));
                                      if (_t_73 !== "") {
                                        const _t_74 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(0, 2) : _t_73[0]);
                                        const _t_75 = _t_74.codePointAt(0);
                                        if (_t_75 == 101) {
                                          const _t_76 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(2) : _t_73.slice(1));
                                          if (_t_76 === "") {
                                            return {$: "Some", "value": {$: "../../ai/bend/voice.Incomplete"}};
                                          } else {
                                            return {$: "None"};
                                          }
                                        } else {
                                          return {$: "None"};
                                        }
                                      } else {
                                        return {$: "None"};
                                      }
                                    } else {
                                      return {$: "None"};
                                    }
                                  } else {
                                    return {$: "None"};
                                  }
                                } else {
                                  return {$: "None"};
                                }
                              } else {
                                return {$: "None"};
                              }
                            } else {
                              return {$: "None"};
                            }
                          } else {
                            return {$: "None"};
                          }
                        } else {
                          return {$: "None"};
                        }
                      } else {
                        return {$: "None"};
                      }
                    } else {
                      return {$: "None"};
                    }
                  } else {
                    return {$: "None"};
                  }
                } else {
                  return {$: "None"};
                }
              } else {
                return {$: "None"};
              }
            } else {
              return {$: "None"};
            }
          } else {
            return {$: "None"};
          }
        } else {
          return {$: "None"};
        }
      } else {
        return {$: "None"};
      }
    } else if ((_t_1 & 3) == 1) {
      return {$: "None"};
    } else if (_t_1 == 102) {
      const _t_77 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_77 !== "") {
        const _t_78 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(0, 2) : _t_77[0]);
        const _t_79 = _t_78.codePointAt(0);
        if (_t_79 == 97) {
          const _t_80 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(2) : _t_77.slice(1));
          if (_t_80 !== "") {
            const _t_81 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(0, 2) : _t_80[0]);
            const _t_82 = _t_81.codePointAt(0);
            if (_t_82 == 105) {
              const _t_83 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(2) : _t_80.slice(1));
              if (_t_83 !== "") {
                const _t_84 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(0, 2) : _t_83[0]);
                const _t_85 = _t_84.codePointAt(0);
                if (_t_85 == 108) {
                  const _t_86 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(2) : _t_83.slice(1));
                  if (_t_86 !== "") {
                    const _t_87 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(0, 2) : _t_86[0]);
                    const _t_88 = _t_87.codePointAt(0);
                    if (_t_88 == 101) {
                      const _t_89 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(2) : _t_86.slice(1));
                      if (_t_89 !== "") {
                        const _t_90 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(0, 2) : _t_89[0]);
                        const _t_91 = _t_90.codePointAt(0);
                        if (_t_91 == 100) {
                          const _t_92 = (_t_89.codePointAt(0) > 0xFFFF ? _t_89.slice(2) : _t_89.slice(1));
                          if (_t_92 === "") {
                            return {$: "Some", "value": {$: "../../ai/bend/voice.Failed"}};
                          } else {
                            return {$: "None"};
                          }
                        } else {
                          return {$: "None"};
                        }
                      } else {
                        return {$: "None"};
                      }
                    } else {
                      return {$: "None"};
                    }
                  } else {
                    return {$: "None"};
                  }
                } else {
                  return {$: "None"};
                }
              } else {
                return {$: "None"};
              }
            } else {
              return {$: "None"};
            }
          } else {
            return {$: "None"};
          }
        } else {
          return {$: "None"};
        }
      } else {
        return {$: "None"};
      }
    } else {
      return {$: "None"};
    }
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_identity$(_kind_0, _id_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 115) {
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
                if (_t_10 == 115) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 105) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 111) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 110) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 46) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 99) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 114) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 101) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 97) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 116) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 !== "") {
                                                        const _t_39 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(0, 2) : _t_38[0]);
                                                        const _t_40 = _t_39.codePointAt(0);
                                                        if (_t_40 == 101) {
                                                          const _t_41 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(2) : _t_38.slice(1));
                                                          if (_t_41 !== "") {
                                                            const _t_42 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(0, 2) : _t_41[0]);
                                                            const _t_43 = _t_42.codePointAt(0);
                                                            if (_t_43 == 100) {
                                                              const _t_44 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_44 === "") {
                                                                if (_id_0.$ === "Some") {
                                                                  const _s_0 = _id_0["value"];
                                                                  return {$: "Done", "value": {$: "../../ai/bend/voice.SessionCreated", "session_id": _s_0}};
                                                                } else {
                                                                  return {$: "Fail", "error": "identity_field"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "identity_field"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "identity_field"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "identity_field"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "identity_field"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "identity_field"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "identity_field"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "identity_field"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "identity_field"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "identity_field"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "identity_field"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "identity_field"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "identity_field"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "identity_field"};
                                      }
                                    } else if (_t_25 == 117) {
                                      const _t_45 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_45 !== "") {
                                        const _t_46 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(0, 2) : _t_45[0]);
                                        const _t_47 = _t_46.codePointAt(0);
                                        if (_t_47 == 112) {
                                          const _t_48 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(2) : _t_45.slice(1));
                                          if (_t_48 !== "") {
                                            const _t_49 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(0, 2) : _t_48[0]);
                                            const _t_50 = _t_49.codePointAt(0);
                                            if (_t_50 == 100) {
                                              const _t_51 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(2) : _t_48.slice(1));
                                              if (_t_51 !== "") {
                                                const _t_52 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(0, 2) : _t_51[0]);
                                                const _t_53 = _t_52.codePointAt(0);
                                                if (_t_53 == 97) {
                                                  const _t_54 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(2) : _t_51.slice(1));
                                                  if (_t_54 !== "") {
                                                    const _t_55 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(0, 2) : _t_54[0]);
                                                    const _t_56 = _t_55.codePointAt(0);
                                                    if (_t_56 == 116) {
                                                      const _t_57 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(2) : _t_54.slice(1));
                                                      if (_t_57 !== "") {
                                                        const _t_58 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(0, 2) : _t_57[0]);
                                                        const _t_59 = _t_58.codePointAt(0);
                                                        if (_t_59 == 101) {
                                                          const _t_60 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(2) : _t_57.slice(1));
                                                          if (_t_60 !== "") {
                                                            const _t_61 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(0, 2) : _t_60[0]);
                                                            const _t_62 = _t_61.codePointAt(0);
                                                            if (_t_62 == 100) {
                                                              const _t_63 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(2) : _t_60.slice(1));
                                                              if (_t_63 === "") {
                                                                if (_id_0.$ === "Some") {
                                                                  const _s_1 = _id_0["value"];
                                                                  return {$: "Done", "value": {$: "../../ai/bend/voice.SessionUpdated", "session_id": _s_1}};
                                                                } else {
                                                                  return {$: "Fail", "error": "identity_field"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "identity_field"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "identity_field"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "identity_field"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "identity_field"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "identity_field"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "identity_field"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "identity_field"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "identity_field"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "identity_field"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "identity_field"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "identity_field"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "identity_field"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "identity_field"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "identity_field"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "identity_field"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "identity_field"};
                                }
                              } else {
                                return {$: "Fail", "error": "identity_field"};
                              }
                            } else {
                              return {$: "Fail", "error": "identity_field"};
                            }
                          } else {
                            return {$: "Fail", "error": "identity_field"};
                          }
                        } else {
                          return {$: "Fail", "error": "identity_field"};
                        }
                      } else {
                        return {$: "Fail", "error": "identity_field"};
                      }
                    } else {
                      return {$: "Fail", "error": "identity_field"};
                    }
                  } else {
                    return {$: "Fail", "error": "identity_field"};
                  }
                } else {
                  return {$: "Fail", "error": "identity_field"};
                }
              } else {
                return {$: "Fail", "error": "identity_field"};
              }
            } else {
              return {$: "Fail", "error": "identity_field"};
            }
          } else {
            return {$: "Fail", "error": "identity_field"};
          }
        } else {
          return {$: "Fail", "error": "identity_field"};
        }
      } else {
        return {$: "Fail", "error": "identity_field"};
      }
    } else if ((_t_1 & 1) == 1) {
      return {$: "Fail", "error": "identity_field"};
    } else if (_t_1 == 114) {
      const _t_64 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_64 !== "") {
        const _t_65 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(0, 2) : _t_64[0]);
        const _t_66 = _t_65.codePointAt(0);
        if (_t_66 == 101) {
          const _t_67 = (_t_64.codePointAt(0) > 0xFFFF ? _t_64.slice(2) : _t_64.slice(1));
          if (_t_67 !== "") {
            const _t_68 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(0, 2) : _t_67[0]);
            const _t_69 = _t_68.codePointAt(0);
            if (_t_69 == 115) {
              const _t_70 = (_t_67.codePointAt(0) > 0xFFFF ? _t_67.slice(2) : _t_67.slice(1));
              if (_t_70 !== "") {
                const _t_71 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(0, 2) : _t_70[0]);
                const _t_72 = _t_71.codePointAt(0);
                if (_t_72 == 112) {
                  const _t_73 = (_t_70.codePointAt(0) > 0xFFFF ? _t_70.slice(2) : _t_70.slice(1));
                  if (_t_73 !== "") {
                    const _t_74 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(0, 2) : _t_73[0]);
                    const _t_75 = _t_74.codePointAt(0);
                    if (_t_75 == 111) {
                      const _t_76 = (_t_73.codePointAt(0) > 0xFFFF ? _t_73.slice(2) : _t_73.slice(1));
                      if (_t_76 !== "") {
                        const _t_77 = (_t_76.codePointAt(0) > 0xFFFF ? _t_76.slice(0, 2) : _t_76[0]);
                        const _t_78 = _t_77.codePointAt(0);
                        if (_t_78 == 110) {
                          const _t_79 = (_t_76.codePointAt(0) > 0xFFFF ? _t_76.slice(2) : _t_76.slice(1));
                          if (_t_79 !== "") {
                            const _t_80 = (_t_79.codePointAt(0) > 0xFFFF ? _t_79.slice(0, 2) : _t_79[0]);
                            const _t_81 = _t_80.codePointAt(0);
                            if (_t_81 == 115) {
                              const _t_82 = (_t_79.codePointAt(0) > 0xFFFF ? _t_79.slice(2) : _t_79.slice(1));
                              if (_t_82 !== "") {
                                const _t_83 = (_t_82.codePointAt(0) > 0xFFFF ? _t_82.slice(0, 2) : _t_82[0]);
                                const _t_84 = _t_83.codePointAt(0);
                                if (_t_84 == 101) {
                                  const _t_85 = (_t_82.codePointAt(0) > 0xFFFF ? _t_82.slice(2) : _t_82.slice(1));
                                  if (_t_85 !== "") {
                                    const _t_86 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(0, 2) : _t_85[0]);
                                    const _t_87 = _t_86.codePointAt(0);
                                    if (_t_87 == 46) {
                                      const _t_88 = (_t_85.codePointAt(0) > 0xFFFF ? _t_85.slice(2) : _t_85.slice(1));
                                      if (_t_88 !== "") {
                                        const _t_89 = (_t_88.codePointAt(0) > 0xFFFF ? _t_88.slice(0, 2) : _t_88[0]);
                                        const _t_90 = _t_89.codePointAt(0);
                                        if (_t_90 == 99) {
                                          const _t_91 = (_t_88.codePointAt(0) > 0xFFFF ? _t_88.slice(2) : _t_88.slice(1));
                                          if (_t_91 !== "") {
                                            const _t_92 = (_t_91.codePointAt(0) > 0xFFFF ? _t_91.slice(0, 2) : _t_91[0]);
                                            const _t_93 = _t_92.codePointAt(0);
                                            if (_t_93 == 114) {
                                              const _t_94 = (_t_91.codePointAt(0) > 0xFFFF ? _t_91.slice(2) : _t_91.slice(1));
                                              if (_t_94 !== "") {
                                                const _t_95 = (_t_94.codePointAt(0) > 0xFFFF ? _t_94.slice(0, 2) : _t_94[0]);
                                                const _t_96 = _t_95.codePointAt(0);
                                                if (_t_96 == 101) {
                                                  const _t_97 = (_t_94.codePointAt(0) > 0xFFFF ? _t_94.slice(2) : _t_94.slice(1));
                                                  if (_t_97 !== "") {
                                                    const _t_98 = (_t_97.codePointAt(0) > 0xFFFF ? _t_97.slice(0, 2) : _t_97[0]);
                                                    const _t_99 = _t_98.codePointAt(0);
                                                    if (_t_99 == 97) {
                                                      const _t_100 = (_t_97.codePointAt(0) > 0xFFFF ? _t_97.slice(2) : _t_97.slice(1));
                                                      if (_t_100 !== "") {
                                                        const _t_101 = (_t_100.codePointAt(0) > 0xFFFF ? _t_100.slice(0, 2) : _t_100[0]);
                                                        const _t_102 = _t_101.codePointAt(0);
                                                        if (_t_102 == 116) {
                                                          const _t_103 = (_t_100.codePointAt(0) > 0xFFFF ? _t_100.slice(2) : _t_100.slice(1));
                                                          if (_t_103 !== "") {
                                                            const _t_104 = (_t_103.codePointAt(0) > 0xFFFF ? _t_103.slice(0, 2) : _t_103[0]);
                                                            const _t_105 = _t_104.codePointAt(0);
                                                            if (_t_105 == 101) {
                                                              const _t_106 = (_t_103.codePointAt(0) > 0xFFFF ? _t_103.slice(2) : _t_103.slice(1));
                                                              if (_t_106 !== "") {
                                                                const _t_107 = (_t_106.codePointAt(0) > 0xFFFF ? _t_106.slice(0, 2) : _t_106[0]);
                                                                const _t_108 = _t_107.codePointAt(0);
                                                                if (_t_108 == 100) {
                                                                  const _t_109 = (_t_106.codePointAt(0) > 0xFFFF ? _t_106.slice(2) : _t_106.slice(1));
                                                                  if (_t_109 === "") {
                                                                    if (_id_0.$ === "Some") {
                                                                      const _s_2 = _id_0["value"];
                                                                      return {$: "Done", "value": {$: "../../ai/bend/voice.ResponseCreated", "response_id": _s_2}};
                                                                    } else {
                                                                      return {$: "Fail", "error": "identity_field"};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": "identity_field"};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": "identity_field"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "identity_field"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "identity_field"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "identity_field"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "identity_field"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "identity_field"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "identity_field"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "identity_field"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "identity_field"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "identity_field"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "identity_field"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "identity_field"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "identity_field"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "identity_field"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "identity_field"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "identity_field"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "identity_field"};
                                }
                              } else {
                                return {$: "Fail", "error": "identity_field"};
                              }
                            } else {
                              return {$: "Fail", "error": "identity_field"};
                            }
                          } else {
                            return {$: "Fail", "error": "identity_field"};
                          }
                        } else {
                          return {$: "Fail", "error": "identity_field"};
                        }
                      } else {
                        return {$: "Fail", "error": "identity_field"};
                      }
                    } else {
                      return {$: "Fail", "error": "identity_field"};
                    }
                  } else {
                    return {$: "Fail", "error": "identity_field"};
                  }
                } else {
                  return {$: "Fail", "error": "identity_field"};
                }
              } else {
                return {$: "Fail", "error": "identity_field"};
              }
            } else {
              return {$: "Fail", "error": "identity_field"};
            }
          } else {
            return {$: "Fail", "error": "identity_field"};
          }
        } else {
          return {$: "Fail", "error": "identity_field"};
        }
      } else {
        return {$: "Fail", "error": "identity_field"};
      }
    } else {
      return {$: "Fail", "error": "identity_field"};
    }
  } else {
    return {$: "Fail", "error": "identity_field"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_pair$(_kind_0, _id_0, _value_0) {
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
                                                                    if (_t_49 == 97) {
                                                                      const _t_50 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(2) : _t_47.slice(1));
                                                                      if (_t_50 !== "") {
                                                                        const _t_51 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(0, 2) : _t_50[0]);
                                                                        const _t_52 = _t_51.codePointAt(0);
                                                                        if (_t_52 == 117) {
                                                                          const _t_53 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(2) : _t_50.slice(1));
                                                                          if (_t_53 !== "") {
                                                                            const _t_54 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(0, 2) : _t_53[0]);
                                                                            const _t_55 = _t_54.codePointAt(0);
                                                                            if (_t_55 == 100) {
                                                                              const _t_56 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(2) : _t_53.slice(1));
                                                                              if (_t_56 !== "") {
                                                                                const _t_57 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(0, 2) : _t_56[0]);
                                                                                const _t_58 = _t_57.codePointAt(0);
                                                                                if (_t_58 == 105) {
                                                                                  const _t_59 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(2) : _t_56.slice(1));
                                                                                  if (_t_59 !== "") {
                                                                                    const _t_60 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(0, 2) : _t_59[0]);
                                                                                    const _t_61 = _t_60.codePointAt(0);
                                                                                    if (_t_61 == 111) {
                                                                                      const _t_62 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(2) : _t_59.slice(1));
                                                                                      if (_t_62 !== "") {
                                                                                        const _t_63 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(0, 2) : _t_62[0]);
                                                                                        const _t_64 = _t_63.codePointAt(0);
                                                                                        if (_t_64 == 46) {
                                                                                          const _t_65 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(2) : _t_62.slice(1));
                                                                                          if (_t_65 !== "") {
                                                                                            const _t_66 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(0, 2) : _t_65[0]);
                                                                                            const _t_67 = _t_66.codePointAt(0);
                                                                                            if (_t_67 == 100) {
                                                                                              const _t_68 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(2) : _t_65.slice(1));
                                                                                              if (_t_68 !== "") {
                                                                                                const _t_69 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(0, 2) : _t_68[0]);
                                                                                                const _t_70 = _t_69.codePointAt(0);
                                                                                                if (_t_70 == 101) {
                                                                                                  const _t_71 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(2) : _t_68.slice(1));
                                                                                                  if (_t_71 !== "") {
                                                                                                    const _t_72 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(0, 2) : _t_71[0]);
                                                                                                    const _t_73 = _t_72.codePointAt(0);
                                                                                                    if (_t_73 == 108) {
                                                                                                      const _t_74 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(2) : _t_71.slice(1));
                                                                                                      if (_t_74 !== "") {
                                                                                                        const _t_75 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(0, 2) : _t_74[0]);
                                                                                                        const _t_76 = _t_75.codePointAt(0);
                                                                                                        if (_t_76 == 116) {
                                                                                                          const _t_77 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(2) : _t_74.slice(1));
                                                                                                          if (_t_77 !== "") {
                                                                                                            const _t_78 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(0, 2) : _t_77[0]);
                                                                                                            const _t_79 = _t_78.codePointAt(0);
                                                                                                            if (_t_79 == 97) {
                                                                                                              const _t_80 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(2) : _t_77.slice(1));
                                                                                                              if (_t_80 === "") {
                                                                                                                if (_id_0.$ === "Some") {
                                                                                                                  const _i_0 = _id_0["value"];
                                                                                                                  if (_value_0.$ === "Some") {
                                                                                                                    const _v_0 = _value_0["value"];
                                                                                                                    return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$pcm16_frame$(_v_0)), {$: "Done", "value": {$: "../../ai/bend/voice.AudioDelta", "response_id": _i_0, "pcm16_base64": _v_0}}, {$: "Fail", "error": "invalid_pcm16"});
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                          }
                                                                                        } else if ((_t_64 & 1) == 0) {
                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                        } else if (_t_64 == 95) {
                                                                                          const _t_81 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(2) : _t_62.slice(1));
                                                                                          if (_t_81 !== "") {
                                                                                            const _t_82 = (_t_81.codePointAt(0) > 0xFFFF ? _t_81.slice(0, 2) : _t_81[0]);
                                                                                            const _t_83 = _t_82.codePointAt(0);
                                                                                            if (_t_83 == 116) {
                                                                                              const _t_84 = (_t_81.codePointAt(0) > 0xFFFF ? _t_81.slice(2) : _t_81.slice(1));
                                                                                              if (_t_84 !== "") {
                                                                                                const _t_85 = (_t_84.codePointAt(0) > 0xFFFF ? _t_84.slice(0, 2) : _t_84[0]);
                                                                                                const _t_86 = _t_85.codePointAt(0);
                                                                                                if (_t_86 == 114) {
                                                                                                  const _t_87 = (_t_84.codePointAt(0) > 0xFFFF ? _t_84.slice(2) : _t_84.slice(1));
                                                                                                  if (_t_87 !== "") {
                                                                                                    const _t_88 = (_t_87.codePointAt(0) > 0xFFFF ? _t_87.slice(0, 2) : _t_87[0]);
                                                                                                    const _t_89 = _t_88.codePointAt(0);
                                                                                                    if (_t_89 == 97) {
                                                                                                      const _t_90 = (_t_87.codePointAt(0) > 0xFFFF ? _t_87.slice(2) : _t_87.slice(1));
                                                                                                      if (_t_90 !== "") {
                                                                                                        const _t_91 = (_t_90.codePointAt(0) > 0xFFFF ? _t_90.slice(0, 2) : _t_90[0]);
                                                                                                        const _t_92 = _t_91.codePointAt(0);
                                                                                                        if (_t_92 == 110) {
                                                                                                          const _t_93 = (_t_90.codePointAt(0) > 0xFFFF ? _t_90.slice(2) : _t_90.slice(1));
                                                                                                          if (_t_93 !== "") {
                                                                                                            const _t_94 = (_t_93.codePointAt(0) > 0xFFFF ? _t_93.slice(0, 2) : _t_93[0]);
                                                                                                            const _t_95 = _t_94.codePointAt(0);
                                                                                                            if (_t_95 == 115) {
                                                                                                              const _t_96 = (_t_93.codePointAt(0) > 0xFFFF ? _t_93.slice(2) : _t_93.slice(1));
                                                                                                              if (_t_96 !== "") {
                                                                                                                const _t_97 = (_t_96.codePointAt(0) > 0xFFFF ? _t_96.slice(0, 2) : _t_96[0]);
                                                                                                                const _t_98 = _t_97.codePointAt(0);
                                                                                                                if (_t_98 == 99) {
                                                                                                                  const _t_99 = (_t_96.codePointAt(0) > 0xFFFF ? _t_96.slice(2) : _t_96.slice(1));
                                                                                                                  if (_t_99 !== "") {
                                                                                                                    const _t_100 = (_t_99.codePointAt(0) > 0xFFFF ? _t_99.slice(0, 2) : _t_99[0]);
                                                                                                                    const _t_101 = _t_100.codePointAt(0);
                                                                                                                    if (_t_101 == 114) {
                                                                                                                      const _t_102 = (_t_99.codePointAt(0) > 0xFFFF ? _t_99.slice(2) : _t_99.slice(1));
                                                                                                                      if (_t_102 !== "") {
                                                                                                                        const _t_103 = (_t_102.codePointAt(0) > 0xFFFF ? _t_102.slice(0, 2) : _t_102[0]);
                                                                                                                        const _t_104 = _t_103.codePointAt(0);
                                                                                                                        if (_t_104 == 105) {
                                                                                                                          const _t_105 = (_t_102.codePointAt(0) > 0xFFFF ? _t_102.slice(2) : _t_102.slice(1));
                                                                                                                          if (_t_105 !== "") {
                                                                                                                            const _t_106 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(0, 2) : _t_105[0]);
                                                                                                                            const _t_107 = _t_106.codePointAt(0);
                                                                                                                            if (_t_107 == 112) {
                                                                                                                              const _t_108 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(2) : _t_105.slice(1));
                                                                                                                              if (_t_108 !== "") {
                                                                                                                                const _t_109 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(0, 2) : _t_108[0]);
                                                                                                                                const _t_110 = _t_109.codePointAt(0);
                                                                                                                                if (_t_110 == 116) {
                                                                                                                                  const _t_111 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(2) : _t_108.slice(1));
                                                                                                                                  if (_t_111 !== "") {
                                                                                                                                    const _t_112 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(0, 2) : _t_111[0]);
                                                                                                                                    const _t_113 = _t_112.codePointAt(0);
                                                                                                                                    if (_t_113 == 46) {
                                                                                                                                      const _t_114 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(2) : _t_111.slice(1));
                                                                                                                                      if (_t_114 !== "") {
                                                                                                                                        const _t_115 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(0, 2) : _t_114[0]);
                                                                                                                                        const _t_116 = _t_115.codePointAt(0);
                                                                                                                                        if (_t_116 == 100) {
                                                                                                                                          const _t_117 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(2) : _t_114.slice(1));
                                                                                                                                          if (_t_117 !== "") {
                                                                                                                                            const _t_118 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(0, 2) : _t_117[0]);
                                                                                                                                            const _t_119 = _t_118.codePointAt(0);
                                                                                                                                            if (_t_119 == 111) {
                                                                                                                                              const _t_120 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(2) : _t_117.slice(1));
                                                                                                                                              if (_t_120 !== "") {
                                                                                                                                                const _t_121 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(0, 2) : _t_120[0]);
                                                                                                                                                const _t_122 = _t_121.codePointAt(0);
                                                                                                                                                if (_t_122 == 110) {
                                                                                                                                                  const _t_123 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(2) : _t_120.slice(1));
                                                                                                                                                  if (_t_123 !== "") {
                                                                                                                                                    const _t_124 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(0, 2) : _t_123[0]);
                                                                                                                                                    const _t_125 = _t_124.codePointAt(0);
                                                                                                                                                    if (_t_125 == 101) {
                                                                                                                                                      const _t_126 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(2) : _t_123.slice(1));
                                                                                                                                                      if (_t_126 === "") {
                                                                                                                                                        if (_id_0.$ === "Some") {
                                                                                                                                                          const _i_1 = _id_0["value"];
                                                                                                                                                          if (_value_0.$ === "Some") {
                                                                                                                                                            const _v_1 = _value_0["value"];
                                                                                                                                                            return {$: "Done", "value": {$: "../../ai/bend/voice.OutputTranscript", "response_id": _i_1, "text": _v_1}};
                                                                                                                                                          } else {
                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                          }
                                                                                                                                                        } else {
                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                        }
                                                                                                                                                      } else {
                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                      }
                                                                                                                                                    } else {
                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                    }
                                                                                                                                                  } else {
                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                  }
                                                                                                                                                } else {
                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                }
                                                                                                                                              } else {
                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                              }
                                                                                                                                            } else {
                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                            }
                                                                                                                                          } else {
                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                          }
                                                                                                                                        } else {
                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                        }
                                                                                                                                      } else {
                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                      }
                                                                                                                                    } else {
                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                    }
                                                                                                                                  } else {
                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                  }
                                                                                                                                } else {
                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                }
                                                                                                                              } else {
                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                              }
                                                                                                                            } else {
                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                            }
                                                                                                                          } else {
                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                          }
                                                                                                                        } else {
                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                        }
                                                                                                                      } else {
                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                      }
                                                                                                                    } else {
                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                    }
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": "event_fields"};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": "event_fields"};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": "event_fields"};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": "event_fields"};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": "event_fields"};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": "event_fields"};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": "event_fields"};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": "event_fields"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "event_fields"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "event_fields"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "event_fields"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "event_fields"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "event_fields"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "event_fields"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "event_fields"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "event_fields"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "event_fields"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "event_fields"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "event_fields"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "event_fields"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "event_fields"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "event_fields"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "event_fields"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "event_fields"};
                                }
                              } else {
                                return {$: "Fail", "error": "event_fields"};
                              }
                            } else {
                              return {$: "Fail", "error": "event_fields"};
                            }
                          } else {
                            return {$: "Fail", "error": "event_fields"};
                          }
                        } else {
                          return {$: "Fail", "error": "event_fields"};
                        }
                      } else {
                        return {$: "Fail", "error": "event_fields"};
                      }
                    } else {
                      return {$: "Fail", "error": "event_fields"};
                    }
                  } else {
                    return {$: "Fail", "error": "event_fields"};
                  }
                } else {
                  return {$: "Fail", "error": "event_fields"};
                }
              } else {
                return {$: "Fail", "error": "event_fields"};
              }
            } else {
              return {$: "Fail", "error": "event_fields"};
            }
          } else {
            return {$: "Fail", "error": "event_fields"};
          }
        } else {
          return {$: "Fail", "error": "event_fields"};
        }
      } else {
        return {$: "Fail", "error": "event_fields"};
      }
    } else if ((_t_1 & 1) == 0) {
      return {$: "Fail", "error": "event_fields"};
    } else if (_t_1 == 99) {
      const _t_127 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(2) : _kind_0.slice(1));
      if (_t_127 !== "") {
        const _t_128 = (_t_127.codePointAt(0) > 0xFFFF ? _t_127.slice(0, 2) : _t_127[0]);
        const _t_129 = _t_128.codePointAt(0);
        if (_t_129 == 111) {
          const _t_130 = (_t_127.codePointAt(0) > 0xFFFF ? _t_127.slice(2) : _t_127.slice(1));
          if (_t_130 !== "") {
            const _t_131 = (_t_130.codePointAt(0) > 0xFFFF ? _t_130.slice(0, 2) : _t_130[0]);
            const _t_132 = _t_131.codePointAt(0);
            if (_t_132 == 110) {
              const _t_133 = (_t_130.codePointAt(0) > 0xFFFF ? _t_130.slice(2) : _t_130.slice(1));
              if (_t_133 !== "") {
                const _t_134 = (_t_133.codePointAt(0) > 0xFFFF ? _t_133.slice(0, 2) : _t_133[0]);
                const _t_135 = _t_134.codePointAt(0);
                if (_t_135 == 118) {
                  const _t_136 = (_t_133.codePointAt(0) > 0xFFFF ? _t_133.slice(2) : _t_133.slice(1));
                  if (_t_136 !== "") {
                    const _t_137 = (_t_136.codePointAt(0) > 0xFFFF ? _t_136.slice(0, 2) : _t_136[0]);
                    const _t_138 = _t_137.codePointAt(0);
                    if (_t_138 == 101) {
                      const _t_139 = (_t_136.codePointAt(0) > 0xFFFF ? _t_136.slice(2) : _t_136.slice(1));
                      if (_t_139 !== "") {
                        const _t_140 = (_t_139.codePointAt(0) > 0xFFFF ? _t_139.slice(0, 2) : _t_139[0]);
                        const _t_141 = _t_140.codePointAt(0);
                        if (_t_141 == 114) {
                          const _t_142 = (_t_139.codePointAt(0) > 0xFFFF ? _t_139.slice(2) : _t_139.slice(1));
                          if (_t_142 !== "") {
                            const _t_143 = (_t_142.codePointAt(0) > 0xFFFF ? _t_142.slice(0, 2) : _t_142[0]);
                            const _t_144 = _t_143.codePointAt(0);
                            if (_t_144 == 115) {
                              const _t_145 = (_t_142.codePointAt(0) > 0xFFFF ? _t_142.slice(2) : _t_142.slice(1));
                              if (_t_145 !== "") {
                                const _t_146 = (_t_145.codePointAt(0) > 0xFFFF ? _t_145.slice(0, 2) : _t_145[0]);
                                const _t_147 = _t_146.codePointAt(0);
                                if (_t_147 == 97) {
                                  const _t_148 = (_t_145.codePointAt(0) > 0xFFFF ? _t_145.slice(2) : _t_145.slice(1));
                                  if (_t_148 !== "") {
                                    const _t_149 = (_t_148.codePointAt(0) > 0xFFFF ? _t_148.slice(0, 2) : _t_148[0]);
                                    const _t_150 = _t_149.codePointAt(0);
                                    if (_t_150 == 116) {
                                      const _t_151 = (_t_148.codePointAt(0) > 0xFFFF ? _t_148.slice(2) : _t_148.slice(1));
                                      if (_t_151 !== "") {
                                        const _t_152 = (_t_151.codePointAt(0) > 0xFFFF ? _t_151.slice(0, 2) : _t_151[0]);
                                        const _t_153 = _t_152.codePointAt(0);
                                        if (_t_153 == 105) {
                                          const _t_154 = (_t_151.codePointAt(0) > 0xFFFF ? _t_151.slice(2) : _t_151.slice(1));
                                          if (_t_154 !== "") {
                                            const _t_155 = (_t_154.codePointAt(0) > 0xFFFF ? _t_154.slice(0, 2) : _t_154[0]);
                                            const _t_156 = _t_155.codePointAt(0);
                                            if (_t_156 == 111) {
                                              const _t_157 = (_t_154.codePointAt(0) > 0xFFFF ? _t_154.slice(2) : _t_154.slice(1));
                                              if (_t_157 !== "") {
                                                const _t_158 = (_t_157.codePointAt(0) > 0xFFFF ? _t_157.slice(0, 2) : _t_157[0]);
                                                const _t_159 = _t_158.codePointAt(0);
                                                if (_t_159 == 110) {
                                                  const _t_160 = (_t_157.codePointAt(0) > 0xFFFF ? _t_157.slice(2) : _t_157.slice(1));
                                                  if (_t_160 !== "") {
                                                    const _t_161 = (_t_160.codePointAt(0) > 0xFFFF ? _t_160.slice(0, 2) : _t_160[0]);
                                                    const _t_162 = _t_161.codePointAt(0);
                                                    if (_t_162 == 46) {
                                                      const _t_163 = (_t_160.codePointAt(0) > 0xFFFF ? _t_160.slice(2) : _t_160.slice(1));
                                                      if (_t_163 !== "") {
                                                        const _t_164 = (_t_163.codePointAt(0) > 0xFFFF ? _t_163.slice(0, 2) : _t_163[0]);
                                                        const _t_165 = _t_164.codePointAt(0);
                                                        if (_t_165 == 105) {
                                                          const _t_166 = (_t_163.codePointAt(0) > 0xFFFF ? _t_163.slice(2) : _t_163.slice(1));
                                                          if (_t_166 !== "") {
                                                            const _t_167 = (_t_166.codePointAt(0) > 0xFFFF ? _t_166.slice(0, 2) : _t_166[0]);
                                                            const _t_168 = _t_167.codePointAt(0);
                                                            if (_t_168 == 116) {
                                                              const _t_169 = (_t_166.codePointAt(0) > 0xFFFF ? _t_166.slice(2) : _t_166.slice(1));
                                                              if (_t_169 !== "") {
                                                                const _t_170 = (_t_169.codePointAt(0) > 0xFFFF ? _t_169.slice(0, 2) : _t_169[0]);
                                                                const _t_171 = _t_170.codePointAt(0);
                                                                if (_t_171 == 101) {
                                                                  const _t_172 = (_t_169.codePointAt(0) > 0xFFFF ? _t_169.slice(2) : _t_169.slice(1));
                                                                  if (_t_172 !== "") {
                                                                    const _t_173 = (_t_172.codePointAt(0) > 0xFFFF ? _t_172.slice(0, 2) : _t_172[0]);
                                                                    const _t_174 = _t_173.codePointAt(0);
                                                                    if (_t_174 == 109) {
                                                                      const _t_175 = (_t_172.codePointAt(0) > 0xFFFF ? _t_172.slice(2) : _t_172.slice(1));
                                                                      if (_t_175 !== "") {
                                                                        const _t_176 = (_t_175.codePointAt(0) > 0xFFFF ? _t_175.slice(0, 2) : _t_175[0]);
                                                                        const _t_177 = _t_176.codePointAt(0);
                                                                        if (_t_177 == 46) {
                                                                          const _t_178 = (_t_175.codePointAt(0) > 0xFFFF ? _t_175.slice(2) : _t_175.slice(1));
                                                                          if (_t_178 !== "") {
                                                                            const _t_179 = (_t_178.codePointAt(0) > 0xFFFF ? _t_178.slice(0, 2) : _t_178[0]);
                                                                            const _t_180 = _t_179.codePointAt(0);
                                                                            if (_t_180 == 105) {
                                                                              const _t_181 = (_t_178.codePointAt(0) > 0xFFFF ? _t_178.slice(2) : _t_178.slice(1));
                                                                              if (_t_181 !== "") {
                                                                                const _t_182 = (_t_181.codePointAt(0) > 0xFFFF ? _t_181.slice(0, 2) : _t_181[0]);
                                                                                const _t_183 = _t_182.codePointAt(0);
                                                                                if (_t_183 == 110) {
                                                                                  const _t_184 = (_t_181.codePointAt(0) > 0xFFFF ? _t_181.slice(2) : _t_181.slice(1));
                                                                                  if (_t_184 !== "") {
                                                                                    const _t_185 = (_t_184.codePointAt(0) > 0xFFFF ? _t_184.slice(0, 2) : _t_184[0]);
                                                                                    const _t_186 = _t_185.codePointAt(0);
                                                                                    if (_t_186 == 112) {
                                                                                      const _t_187 = (_t_184.codePointAt(0) > 0xFFFF ? _t_184.slice(2) : _t_184.slice(1));
                                                                                      if (_t_187 !== "") {
                                                                                        const _t_188 = (_t_187.codePointAt(0) > 0xFFFF ? _t_187.slice(0, 2) : _t_187[0]);
                                                                                        const _t_189 = _t_188.codePointAt(0);
                                                                                        if (_t_189 == 117) {
                                                                                          const _t_190 = (_t_187.codePointAt(0) > 0xFFFF ? _t_187.slice(2) : _t_187.slice(1));
                                                                                          if (_t_190 !== "") {
                                                                                            const _t_191 = (_t_190.codePointAt(0) > 0xFFFF ? _t_190.slice(0, 2) : _t_190[0]);
                                                                                            const _t_192 = _t_191.codePointAt(0);
                                                                                            if (_t_192 == 116) {
                                                                                              const _t_193 = (_t_190.codePointAt(0) > 0xFFFF ? _t_190.slice(2) : _t_190.slice(1));
                                                                                              if (_t_193 !== "") {
                                                                                                const _t_194 = (_t_193.codePointAt(0) > 0xFFFF ? _t_193.slice(0, 2) : _t_193[0]);
                                                                                                const _t_195 = _t_194.codePointAt(0);
                                                                                                if (_t_195 == 95) {
                                                                                                  const _t_196 = (_t_193.codePointAt(0) > 0xFFFF ? _t_193.slice(2) : _t_193.slice(1));
                                                                                                  if (_t_196 !== "") {
                                                                                                    const _t_197 = (_t_196.codePointAt(0) > 0xFFFF ? _t_196.slice(0, 2) : _t_196[0]);
                                                                                                    const _t_198 = _t_197.codePointAt(0);
                                                                                                    if (_t_198 == 97) {
                                                                                                      const _t_199 = (_t_196.codePointAt(0) > 0xFFFF ? _t_196.slice(2) : _t_196.slice(1));
                                                                                                      if (_t_199 !== "") {
                                                                                                        const _t_200 = (_t_199.codePointAt(0) > 0xFFFF ? _t_199.slice(0, 2) : _t_199[0]);
                                                                                                        const _t_201 = _t_200.codePointAt(0);
                                                                                                        if (_t_201 == 117) {
                                                                                                          const _t_202 = (_t_199.codePointAt(0) > 0xFFFF ? _t_199.slice(2) : _t_199.slice(1));
                                                                                                          if (_t_202 !== "") {
                                                                                                            const _t_203 = (_t_202.codePointAt(0) > 0xFFFF ? _t_202.slice(0, 2) : _t_202[0]);
                                                                                                            const _t_204 = _t_203.codePointAt(0);
                                                                                                            if (_t_204 == 100) {
                                                                                                              const _t_205 = (_t_202.codePointAt(0) > 0xFFFF ? _t_202.slice(2) : _t_202.slice(1));
                                                                                                              if (_t_205 !== "") {
                                                                                                                const _t_206 = (_t_205.codePointAt(0) > 0xFFFF ? _t_205.slice(0, 2) : _t_205[0]);
                                                                                                                const _t_207 = _t_206.codePointAt(0);
                                                                                                                if (_t_207 == 105) {
                                                                                                                  const _t_208 = (_t_205.codePointAt(0) > 0xFFFF ? _t_205.slice(2) : _t_205.slice(1));
                                                                                                                  if (_t_208 !== "") {
                                                                                                                    const _t_209 = (_t_208.codePointAt(0) > 0xFFFF ? _t_208.slice(0, 2) : _t_208[0]);
                                                                                                                    const _t_210 = _t_209.codePointAt(0);
                                                                                                                    if (_t_210 == 111) {
                                                                                                                      const _t_211 = (_t_208.codePointAt(0) > 0xFFFF ? _t_208.slice(2) : _t_208.slice(1));
                                                                                                                      if (_t_211 !== "") {
                                                                                                                        const _t_212 = (_t_211.codePointAt(0) > 0xFFFF ? _t_211.slice(0, 2) : _t_211[0]);
                                                                                                                        const _t_213 = _t_212.codePointAt(0);
                                                                                                                        if (_t_213 == 95) {
                                                                                                                          const _t_214 = (_t_211.codePointAt(0) > 0xFFFF ? _t_211.slice(2) : _t_211.slice(1));
                                                                                                                          if (_t_214 !== "") {
                                                                                                                            const _t_215 = (_t_214.codePointAt(0) > 0xFFFF ? _t_214.slice(0, 2) : _t_214[0]);
                                                                                                                            const _t_216 = _t_215.codePointAt(0);
                                                                                                                            if (_t_216 == 116) {
                                                                                                                              const _t_217 = (_t_214.codePointAt(0) > 0xFFFF ? _t_214.slice(2) : _t_214.slice(1));
                                                                                                                              if (_t_217 !== "") {
                                                                                                                                const _t_218 = (_t_217.codePointAt(0) > 0xFFFF ? _t_217.slice(0, 2) : _t_217[0]);
                                                                                                                                const _t_219 = _t_218.codePointAt(0);
                                                                                                                                if (_t_219 == 114) {
                                                                                                                                  const _t_220 = (_t_217.codePointAt(0) > 0xFFFF ? _t_217.slice(2) : _t_217.slice(1));
                                                                                                                                  if (_t_220 !== "") {
                                                                                                                                    const _t_221 = (_t_220.codePointAt(0) > 0xFFFF ? _t_220.slice(0, 2) : _t_220[0]);
                                                                                                                                    const _t_222 = _t_221.codePointAt(0);
                                                                                                                                    if (_t_222 == 97) {
                                                                                                                                      const _t_223 = (_t_220.codePointAt(0) > 0xFFFF ? _t_220.slice(2) : _t_220.slice(1));
                                                                                                                                      if (_t_223 !== "") {
                                                                                                                                        const _t_224 = (_t_223.codePointAt(0) > 0xFFFF ? _t_223.slice(0, 2) : _t_223[0]);
                                                                                                                                        const _t_225 = _t_224.codePointAt(0);
                                                                                                                                        if (_t_225 == 110) {
                                                                                                                                          const _t_226 = (_t_223.codePointAt(0) > 0xFFFF ? _t_223.slice(2) : _t_223.slice(1));
                                                                                                                                          if (_t_226 !== "") {
                                                                                                                                            const _t_227 = (_t_226.codePointAt(0) > 0xFFFF ? _t_226.slice(0, 2) : _t_226[0]);
                                                                                                                                            const _t_228 = _t_227.codePointAt(0);
                                                                                                                                            if (_t_228 == 115) {
                                                                                                                                              const _t_229 = (_t_226.codePointAt(0) > 0xFFFF ? _t_226.slice(2) : _t_226.slice(1));
                                                                                                                                              if (_t_229 !== "") {
                                                                                                                                                const _t_230 = (_t_229.codePointAt(0) > 0xFFFF ? _t_229.slice(0, 2) : _t_229[0]);
                                                                                                                                                const _t_231 = _t_230.codePointAt(0);
                                                                                                                                                if (_t_231 == 99) {
                                                                                                                                                  const _t_232 = (_t_229.codePointAt(0) > 0xFFFF ? _t_229.slice(2) : _t_229.slice(1));
                                                                                                                                                  if (_t_232 !== "") {
                                                                                                                                                    const _t_233 = (_t_232.codePointAt(0) > 0xFFFF ? _t_232.slice(0, 2) : _t_232[0]);
                                                                                                                                                    const _t_234 = _t_233.codePointAt(0);
                                                                                                                                                    if (_t_234 == 114) {
                                                                                                                                                      const _t_235 = (_t_232.codePointAt(0) > 0xFFFF ? _t_232.slice(2) : _t_232.slice(1));
                                                                                                                                                      if (_t_235 !== "") {
                                                                                                                                                        const _t_236 = (_t_235.codePointAt(0) > 0xFFFF ? _t_235.slice(0, 2) : _t_235[0]);
                                                                                                                                                        const _t_237 = _t_236.codePointAt(0);
                                                                                                                                                        if (_t_237 == 105) {
                                                                                                                                                          const _t_238 = (_t_235.codePointAt(0) > 0xFFFF ? _t_235.slice(2) : _t_235.slice(1));
                                                                                                                                                          if (_t_238 !== "") {
                                                                                                                                                            const _t_239 = (_t_238.codePointAt(0) > 0xFFFF ? _t_238.slice(0, 2) : _t_238[0]);
                                                                                                                                                            const _t_240 = _t_239.codePointAt(0);
                                                                                                                                                            if (_t_240 == 112) {
                                                                                                                                                              const _t_241 = (_t_238.codePointAt(0) > 0xFFFF ? _t_238.slice(2) : _t_238.slice(1));
                                                                                                                                                              if (_t_241 !== "") {
                                                                                                                                                                const _t_242 = (_t_241.codePointAt(0) > 0xFFFF ? _t_241.slice(0, 2) : _t_241[0]);
                                                                                                                                                                const _t_243 = _t_242.codePointAt(0);
                                                                                                                                                                if (_t_243 == 116) {
                                                                                                                                                                  const _t_244 = (_t_241.codePointAt(0) > 0xFFFF ? _t_241.slice(2) : _t_241.slice(1));
                                                                                                                                                                  if (_t_244 !== "") {
                                                                                                                                                                    const _t_245 = (_t_244.codePointAt(0) > 0xFFFF ? _t_244.slice(0, 2) : _t_244[0]);
                                                                                                                                                                    const _t_246 = _t_245.codePointAt(0);
                                                                                                                                                                    if (_t_246 == 105) {
                                                                                                                                                                      const _t_247 = (_t_244.codePointAt(0) > 0xFFFF ? _t_244.slice(2) : _t_244.slice(1));
                                                                                                                                                                      if (_t_247 !== "") {
                                                                                                                                                                        const _t_248 = (_t_247.codePointAt(0) > 0xFFFF ? _t_247.slice(0, 2) : _t_247[0]);
                                                                                                                                                                        const _t_249 = _t_248.codePointAt(0);
                                                                                                                                                                        if (_t_249 == 111) {
                                                                                                                                                                          const _t_250 = (_t_247.codePointAt(0) > 0xFFFF ? _t_247.slice(2) : _t_247.slice(1));
                                                                                                                                                                          if (_t_250 !== "") {
                                                                                                                                                                            const _t_251 = (_t_250.codePointAt(0) > 0xFFFF ? _t_250.slice(0, 2) : _t_250[0]);
                                                                                                                                                                            const _t_252 = _t_251.codePointAt(0);
                                                                                                                                                                            if (_t_252 == 110) {
                                                                                                                                                                              const _t_253 = (_t_250.codePointAt(0) > 0xFFFF ? _t_250.slice(2) : _t_250.slice(1));
                                                                                                                                                                              if (_t_253 !== "") {
                                                                                                                                                                                const _t_254 = (_t_253.codePointAt(0) > 0xFFFF ? _t_253.slice(0, 2) : _t_253[0]);
                                                                                                                                                                                const _t_255 = _t_254.codePointAt(0);
                                                                                                                                                                                if (_t_255 == 46) {
                                                                                                                                                                                  const _t_256 = (_t_253.codePointAt(0) > 0xFFFF ? _t_253.slice(2) : _t_253.slice(1));
                                                                                                                                                                                  if (_t_256 !== "") {
                                                                                                                                                                                    const _t_257 = (_t_256.codePointAt(0) > 0xFFFF ? _t_256.slice(0, 2) : _t_256[0]);
                                                                                                                                                                                    const _t_258 = _t_257.codePointAt(0);
                                                                                                                                                                                    if (_t_258 == 99) {
                                                                                                                                                                                      const _t_259 = (_t_256.codePointAt(0) > 0xFFFF ? _t_256.slice(2) : _t_256.slice(1));
                                                                                                                                                                                      if (_t_259 !== "") {
                                                                                                                                                                                        const _t_260 = (_t_259.codePointAt(0) > 0xFFFF ? _t_259.slice(0, 2) : _t_259[0]);
                                                                                                                                                                                        const _t_261 = _t_260.codePointAt(0);
                                                                                                                                                                                        if (_t_261 == 111) {
                                                                                                                                                                                          const _t_262 = (_t_259.codePointAt(0) > 0xFFFF ? _t_259.slice(2) : _t_259.slice(1));
                                                                                                                                                                                          if (_t_262 !== "") {
                                                                                                                                                                                            const _t_263 = (_t_262.codePointAt(0) > 0xFFFF ? _t_262.slice(0, 2) : _t_262[0]);
                                                                                                                                                                                            const _t_264 = _t_263.codePointAt(0);
                                                                                                                                                                                            if (_t_264 == 109) {
                                                                                                                                                                                              const _t_265 = (_t_262.codePointAt(0) > 0xFFFF ? _t_262.slice(2) : _t_262.slice(1));
                                                                                                                                                                                              if (_t_265 !== "") {
                                                                                                                                                                                                const _t_266 = (_t_265.codePointAt(0) > 0xFFFF ? _t_265.slice(0, 2) : _t_265[0]);
                                                                                                                                                                                                const _t_267 = _t_266.codePointAt(0);
                                                                                                                                                                                                if (_t_267 == 112) {
                                                                                                                                                                                                  const _t_268 = (_t_265.codePointAt(0) > 0xFFFF ? _t_265.slice(2) : _t_265.slice(1));
                                                                                                                                                                                                  if (_t_268 !== "") {
                                                                                                                                                                                                    const _t_269 = (_t_268.codePointAt(0) > 0xFFFF ? _t_268.slice(0, 2) : _t_268[0]);
                                                                                                                                                                                                    const _t_270 = _t_269.codePointAt(0);
                                                                                                                                                                                                    if (_t_270 == 108) {
                                                                                                                                                                                                      const _t_271 = (_t_268.codePointAt(0) > 0xFFFF ? _t_268.slice(2) : _t_268.slice(1));
                                                                                                                                                                                                      if (_t_271 !== "") {
                                                                                                                                                                                                        const _t_272 = (_t_271.codePointAt(0) > 0xFFFF ? _t_271.slice(0, 2) : _t_271[0]);
                                                                                                                                                                                                        const _t_273 = _t_272.codePointAt(0);
                                                                                                                                                                                                        if (_t_273 == 101) {
                                                                                                                                                                                                          const _t_274 = (_t_271.codePointAt(0) > 0xFFFF ? _t_271.slice(2) : _t_271.slice(1));
                                                                                                                                                                                                          if (_t_274 !== "") {
                                                                                                                                                                                                            const _t_275 = (_t_274.codePointAt(0) > 0xFFFF ? _t_274.slice(0, 2) : _t_274[0]);
                                                                                                                                                                                                            const _t_276 = _t_275.codePointAt(0);
                                                                                                                                                                                                            if (_t_276 == 116) {
                                                                                                                                                                                                              const _t_277 = (_t_274.codePointAt(0) > 0xFFFF ? _t_274.slice(2) : _t_274.slice(1));
                                                                                                                                                                                                              if (_t_277 !== "") {
                                                                                                                                                                                                                const _t_278 = (_t_277.codePointAt(0) > 0xFFFF ? _t_277.slice(0, 2) : _t_277[0]);
                                                                                                                                                                                                                const _t_279 = _t_278.codePointAt(0);
                                                                                                                                                                                                                if (_t_279 == 101) {
                                                                                                                                                                                                                  const _t_280 = (_t_277.codePointAt(0) > 0xFFFF ? _t_277.slice(2) : _t_277.slice(1));
                                                                                                                                                                                                                  if (_t_280 !== "") {
                                                                                                                                                                                                                    const _t_281 = (_t_280.codePointAt(0) > 0xFFFF ? _t_280.slice(0, 2) : _t_280[0]);
                                                                                                                                                                                                                    const _t_282 = _t_281.codePointAt(0);
                                                                                                                                                                                                                    if (_t_282 == 100) {
                                                                                                                                                                                                                      const _t_283 = (_t_280.codePointAt(0) > 0xFFFF ? _t_280.slice(2) : _t_280.slice(1));
                                                                                                                                                                                                                      if (_t_283 === "") {
                                                                                                                                                                                                                        if (_id_0.$ === "Some") {
                                                                                                                                                                                                                          const _i_2 = _id_0["value"];
                                                                                                                                                                                                                          if (_value_0.$ === "Some") {
                                                                                                                                                                                                                            const _v_2 = _value_0["value"];
                                                                                                                                                                                                                            return {$: "Done", "value": {$: "../../ai/bend/voice.InputTranscript", "item_id": _i_2, "text": _v_2}};
                                                                                                                                                                                                                          } else {
                                                                                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                        } else {
                                                                                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                      } else {
                                                                                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                      }
                                                                                                                                                                                                                    } else {
                                                                                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                  } else {
                                                                                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                  }
                                                                                                                                                                                                                } else {
                                                                                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                                }
                                                                                                                                                                                                              } else {
                                                                                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                              }
                                                                                                                                                                                                            } else {
                                                                                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                            }
                                                                                                                                                                                                          } else {
                                                                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                          }
                                                                                                                                                                                                        } else {
                                                                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                        }
                                                                                                                                                                                                      } else {
                                                                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                      }
                                                                                                                                                                                                    } else {
                                                                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                    }
                                                                                                                                                                                                  } else {
                                                                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                  }
                                                                                                                                                                                                } else {
                                                                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                                }
                                                                                                                                                                                              } else {
                                                                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                              }
                                                                                                                                                                                            } else {
                                                                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                            }
                                                                                                                                                                                          } else {
                                                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                          }
                                                                                                                                                                                        } else {
                                                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                        }
                                                                                                                                                                                      } else {
                                                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                      }
                                                                                                                                                                                    } else {
                                                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                    }
                                                                                                                                                                                  } else {
                                                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                  }
                                                                                                                                                                                } else {
                                                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                                }
                                                                                                                                                                              } else {
                                                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                              }
                                                                                                                                                                            } else {
                                                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                            }
                                                                                                                                                                          } else {
                                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                          }
                                                                                                                                                                        } else {
                                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                        }
                                                                                                                                                                      } else {
                                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                      }
                                                                                                                                                                    } else {
                                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                    }
                                                                                                                                                                  } else {
                                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                  }
                                                                                                                                                                } else {
                                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                                }
                                                                                                                                                              } else {
                                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                                              }
                                                                                                                                                            } else {
                                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                                            }
                                                                                                                                                          } else {
                                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                                          }
                                                                                                                                                        } else {
                                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                                        }
                                                                                                                                                      } else {
                                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                                      }
                                                                                                                                                    } else {
                                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                                    }
                                                                                                                                                  } else {
                                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                                  }
                                                                                                                                                } else {
                                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                                }
                                                                                                                                              } else {
                                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                                              }
                                                                                                                                            } else {
                                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                                            }
                                                                                                                                          } else {
                                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                                          }
                                                                                                                                        } else {
                                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                                        }
                                                                                                                                      } else {
                                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                                      }
                                                                                                                                    } else {
                                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                                    }
                                                                                                                                  } else {
                                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                                  }
                                                                                                                                } else {
                                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                                }
                                                                                                                              } else {
                                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                                              }
                                                                                                                            } else {
                                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                                            }
                                                                                                                          } else {
                                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                                          }
                                                                                                                        } else {
                                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                                        }
                                                                                                                      } else {
                                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                                      }
                                                                                                                    } else {
                                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                                    }
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": "event_fields"};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": "event_fields"};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": "event_fields"};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": "event_fields"};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": "event_fields"};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": "event_fields"};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": "event_fields"};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": "event_fields"};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": "event_fields"};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": "event_fields"};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": "event_fields"};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": "event_fields"};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": "event_fields"};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": "event_fields"};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": "event_fields"};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": "event_fields"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "event_fields"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "event_fields"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "event_fields"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "event_fields"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "event_fields"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "event_fields"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "event_fields"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "event_fields"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "event_fields"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "event_fields"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "event_fields"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "event_fields"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "event_fields"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "event_fields"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "event_fields"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "event_fields"};
                                }
                              } else {
                                return {$: "Fail", "error": "event_fields"};
                              }
                            } else {
                              return {$: "Fail", "error": "event_fields"};
                            }
                          } else {
                            return {$: "Fail", "error": "event_fields"};
                          }
                        } else {
                          return {$: "Fail", "error": "event_fields"};
                        }
                      } else {
                        return {$: "Fail", "error": "event_fields"};
                      }
                    } else {
                      return {$: "Fail", "error": "event_fields"};
                    }
                  } else {
                    return {$: "Fail", "error": "event_fields"};
                  }
                } else {
                  return {$: "Fail", "error": "event_fields"};
                }
              } else {
                return {$: "Fail", "error": "event_fields"};
              }
            } else {
              return {$: "Fail", "error": "event_fields"};
            }
          } else {
            return {$: "Fail", "error": "event_fields"};
          }
        } else {
          return {$: "Fail", "error": "event_fields"};
        }
      } else {
        return {$: "Fail", "error": "event_fields"};
      }
    } else {
      return {$: "Fail", "error": "event_fields"};
    }
  } else {
    return {$: "Fail", "error": "event_fields"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_tokens$(_i_0, _o_0) {
  if (_i_0.$ === "Some") {
    const _i_1 = _i_0["value"];
    if (_o_0.$ === "Some") {
      const _o_1 = _o_0["value"];
      return {$: "Some", "value": {$: "../../ai/bend/voice.ReportedTokens", "input_tokens": _i_1, "output_tokens": _o_1}};
    } else {
      return {$: "None"};
    }
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_usage$(_value_0) {
  if (_value_0.$ === "../../ai/bend/wire_json.Null") {
    return {$: "Some", "value": {$: "../../ai/bend/voice.UsageUnavailable"}};
  } else if (_value_0.$ === "../../ai/bend/wire_json.Object") {
    const _fields_0 = _value_0["fields"];
    return $$$$047$$$047ai$047bend$047voice$rt_tokens$(($$$$047$$$047ai$047bend$047voice$integer$({$: "../../ai/bend/wire_json.Object", "fields": _fields_0}, "input_tokens")), ($$$$047$$$047ai$047bend$047voice$integer$({$: "../../ai/bend/wire_json.Object", "fields": _fields_0}, "output_tokens")));
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_done$(_id_0, _st_0, _usage_0) {
  if (_id_0.$ === "Some") {
    const _id_1 = _id_0["value"];
    if (_st_0.$ === "Some") {
      const _s_0 = _st_0["value"];
      if (_usage_0.$ === "Some") {
        const _u_0 = _usage_0["value"];
        return {$: "Done", "value": {$: "../../ai/bend/voice.ResponseDone", "response_id": _id_1, "status": _s_0, "usage": _u_0}};
      } else {
        return {$: "Fail", "error": "response_terminal"};
      }
    } else {
      return {$: "Fail", "error": "response_terminal"};
    }
  } else {
    return {$: "Fail", "error": "response_terminal"};
  }
}

function $$$$047$$$047ai$047bend$047voice$status_value$(_s_0) {
  if (_s_0.$ === "Some") {
    const _s_1 = _s_0["value"];
    return $$$$047$$$047ai$047bend$047voice$status$(_s_1);
  } else {
    return {$: "None"};
  }
}

function $$$$047$$$047ai$047bend$047voice$rt_error$(_code_0, _message_0) {
  if (_message_0.$ === "Some") {
    const _s_0 = _message_0["value"];
    return {$: "Done", "value": {$: "../../ai/bend/voice.ProviderError", "code": ($Maybe$default$(_code_0, "provider_error")), "message": _s_0}};
  } else {
    return {$: "Fail", "error": "provider_error_frame"};
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_wire_kind$(_kind_0) {
  return $Bool$pick$(($String$eq$(_kind_0, "session.created")), {$: "../../ai/bend/voice.RTSessionCreated"}, ($Bool$pick$(($String$eq$(_kind_0, "session.updated")), {$: "../../ai/bend/voice.RTSessionUpdated"}, ($Bool$pick$(($String$eq$(_kind_0, "response.created")), {$: "../../ai/bend/voice.RTResponseCreated"}, ($Bool$pick$(($String$eq$(_kind_0, "response.output_audio.delta")), {$: "../../ai/bend/voice.RTAudioDelta"}, ($Bool$pick$(($String$eq$(_kind_0, "response.output_audio_transcript.done")), {$: "../../ai/bend/voice.RTOutputTranscript"}, ($Bool$pick$(($String$eq$(_kind_0, "conversation.item.input_audio_transcription.completed")), {$: "../../ai/bend/voice.RTInputTranscript"}, ($Bool$pick$(($String$eq$(_kind_0, "response.done")), {$: "../../ai/bend/voice.RTResponseDone"}, ($Bool$pick$(($String$eq$(_kind_0, "error")), {$: "../../ai/bend/voice.RTError"}, {$: "../../ai/bend/voice.RTUnknown"})))))))))))))));
}

function $$$$047$$$047ai$047bend$047voice$realtime_fields$(_wire_kind_0, _kind_0, _value_0) {
  if (_wire_kind_0.$ === "../../ai/bend/voice.RTSessionCreated") {
    return $$$$047$$$047ai$047bend$047voice$rt_identity$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_value_0, "session")), "id")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTSessionUpdated") {
    return $$$$047$$$047ai$047bend$047voice$rt_identity$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_value_0, "session")), "id")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTResponseCreated") {
    return $$$$047$$$047ai$047bend$047voice$rt_identity$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_value_0, "response")), "id")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTAudioDelta") {
    return $$$$047$$$047ai$047bend$047voice$rt_pair$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "response_id")), ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "delta")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTOutputTranscript") {
    return $$$$047$$$047ai$047bend$047voice$rt_pair$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "response_id")), ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "transcript")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTInputTranscript") {
    return $$$$047$$$047ai$047bend$047voice$rt_pair$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "item_id")), ($$$$047$$$047ai$047bend$047voice$text$(_value_0, "transcript")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTResponseDone") {
    const _r_0 = ($$$$047$$$047ai$047bend$047voice$child$(_value_0, "response"));
    const _u_0 = ($$$$047$$$047ai$047bend$047voice$child$(_r_0, "usage"));
    return $$$$047$$$047ai$047bend$047voice$rt_done$(($$$$047$$$047ai$047bend$047voice$text$(_r_0, "id")), ($$$$047$$$047ai$047bend$047voice$status_value$(($$$$047$$$047ai$047bend$047voice$text$(_r_0, "status")))), ($$$$047$$$047ai$047bend$047voice$rt_usage$(_u_0)));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.RTError") {
    const _e_0 = ($$$$047$$$047ai$047bend$047voice$child$(_value_0, "error"));
    return $$$$047$$$047ai$047bend$047voice$rt_error$(($$$$047$$$047ai$047bend$047voice$text$(_e_0, "code")), ($$$$047$$$047ai$047bend$047voice$text$(_e_0, "message")));
  } else {
    return {$: "Done", "value": {$: "../../ai/bend/voice.UnknownRealtime", "event_type": _kind_0}};
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_event$(_kind_0, _value_0) {
  return $$$$047$$$047ai$047bend$047voice$realtime_fields$(($$$$047$$$047ai$047bend$047voice$realtime_wire_kind$(_kind_0)), _kind_0, _value_0);
}

function $$$$047$$$047ai$047bend$047voice$realtime_kind$(_kind_0, _value_0) {
  if (_kind_0.$ === "Some") {
    const _s_0 = _kind_0["value"];
    return $$$$047$$$047ai$047bend$047voice$realtime_event$(_s_0, _value_0);
  } else {
    return {$: "Fail", "error": "event_type"};
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_parsed$(_result_0) {
  if (_result_0.$ === "Fail") {
    const _e_0 = _result_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _v_0 = _result_0["value"];
    return $$$$047$$$047ai$047bend$047voice$realtime_kind$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "type")), _v_0);
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_limited$(_allowed_0, _wire_0) {
  if (!_allowed_0) {
    return {$: "Fail", "error": "frame_limit"};
  } else {
    return $$$$047$$$047ai$047bend$047voice$realtime_parsed$(run_loop($$$$047$$$047ai$047bend$047wire_json$read$(_wire_0)));
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_decode$(_wire_0) {
  const _x_0 = [..._wire_0].length;
  const _x_1 = (_x_0 >>> 0);
  return $$$$047$$$047ai$047bend$047voice$realtime_limited$((_x_1 <= 1048576), _wire_0);
}

function $$$$047$$$047ai$047bend$047voice$contains$(_xs_0, _id_0) {
  return $List$contains$1260$(_xs_0, _id_0);
}

function $$$$047$$$047ai$047bend$047voice$remove_go$($0, $1, $2) {
  for (;;) {
    {
      const _xs_0 = $0;
      const _id_0 = $1;
      const _acc_0 = $2;
      if (_xs_0.$ === "Nil") {
        return $List$reverse$(_acc_0);
      } else {
        const _head_0 = _xs_0["head"];
        const _tail_0 = _xs_0["tail"];
        $0 = _tail_0;
        $1 = _id_0;
        $2 = ($Bool$pick$(($String$eq$(_head_0, _id_0)), _acc_0, {$: "Con", "head": _head_0, "tail": _acc_0}));
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$remove$(_xs_0, _id_0) {
  return $$$$047$$$047ai$047bend$047voice$remove_go$(_xs_0, _id_0, {$: "Nil"});
}

function $$$$047$$$047ai$047bend$047voice$realtime_response$(_event_0, _s_0) {
  if (_event_0.$ === "../../ai/bend/voice.ResponseCreated") {
    const _id_0 = _event_0["response_id"];
    const _p_0 = _s_0["phase"];
    const _session_0 = _s_0["session_id"];
    const _active_0 = _s_0["active_responses"];
    const _x_0 = ($String$eq$(_id_0, ""));
    const _x_1 = ($$$$047$$$047ai$047bend$047voice$contains$(_active_0, _id_0));
    return $Bool$pick$((_x_0 || _x_1), {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "response_identity"}, "session_id": _session_0, "active_responses": _active_0}, {$: "../../ai/bend/voice.RealtimeState", "phase": _p_0, "session_id": _session_0, "active_responses": {$: "Con", "head": _id_0, "tail": _active_0}});
  } else if (_event_0.$ === "../../ai/bend/voice.ResponseDone") {
    const _id_1 = _event_0["response_id"];
    const _p_1 = _s_0["phase"];
    const _session_1 = _s_0["session_id"];
    const _active_1 = _s_0["active_responses"];
    return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$contains$(_active_1, _id_1)), {$: "../../ai/bend/voice.RealtimeState", "phase": _p_1, "session_id": _session_1, "active_responses": ($$$$047$$$047ai$047bend$047voice$remove$(_active_1, _id_1))}, {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "response_order"}, "session_id": _session_1, "active_responses": _active_1});
  } else if (_event_0.$ === "../../ai/bend/voice.AudioDelta") {
    const _id_2 = _event_0["response_id"];
    const _p_2 = _s_0["phase"];
    const _session_2 = _s_0["session_id"];
    const _active_2 = _s_0["active_responses"];
    return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$contains$(_active_2, _id_2)), {$: "../../ai/bend/voice.RealtimeState", "phase": _p_2, "session_id": _session_2, "active_responses": _active_2}, {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "response_order"}, "session_id": _session_2, "active_responses": _active_2});
  } else if (_event_0.$ === "../../ai/bend/voice.OutputTranscript") {
    const _id_3 = _event_0["response_id"];
    const _p_3 = _s_0["phase"];
    const _session_3 = _s_0["session_id"];
    const _active_3 = _s_0["active_responses"];
    return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$contains$(_active_3, _id_3)), {$: "../../ai/bend/voice.RealtimeState", "phase": _p_3, "session_id": _session_3, "active_responses": _active_3}, {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "response_order"}, "session_id": _session_3, "active_responses": _active_3});
  } else {
    return _s_0;
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_reduce$(_event_0, _s_0) {
  if (_event_0.$ === "../../ai/bend/voice.SessionCreated") {
    const _id_0 = _event_0["session_id"];
    const _t_0 = _s_0["phase"];
    if (_t_0.$ === "../../ai/bend/voice.Broken") {
      const _code_0 = _t_0["code"];
      const _id_1 = _s_0["session_id"];
      const _active_0 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_0}, "session_id": _id_1, "active_responses": _active_0};
    } else if (_t_0.$ === "../../ai/bend/voice.Closed") {
      const _id_2 = _s_0["session_id"];
      const _active_1 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_2, "active_responses": _active_1};
    } else if (_t_0.$ === "../../ai/bend/voice.Connecting") {
      const _id_3 = _s_0["session_id"];
      const _active_2 = _s_0["active_responses"];
      return $Bool$pick$(($String$eq$(_id_0, "")), {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "session_identity"}, "session_id": _id_3, "active_responses": _active_2}, {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_0, "active_responses": _active_2});
    } else {
      const _id_4 = _s_0["session_id"];
      const _active_3 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "session_identity"}, "session_id": _id_4, "active_responses": _active_3};
    }
  } else if (_event_0.$ === "../../ai/bend/voice.ProviderError") {
    const _code_1 = _event_0["code"];
    const _message_0 = _event_0["message"];
    const _t_1 = _s_0["phase"];
    if (_t_1.$ === "../../ai/bend/voice.Broken") {
      const _code_2 = _t_1["code"];
      const _id_5 = _s_0["session_id"];
      const _active_4 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_2}, "session_id": _id_5, "active_responses": _active_4};
    } else if (_t_1.$ === "../../ai/bend/voice.Closed") {
      const _id_6 = _s_0["session_id"];
      const _active_5 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_6, "active_responses": _active_5};
    } else if (_t_1.$ === "../../ai/bend/voice.Connecting") {
      const _id_7 = _s_0["session_id"];
      const _active_6 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_1}, "session_id": _id_7, "active_responses": _active_6};
    } else {
      const _id_8 = _s_0["session_id"];
      const _active_7 = _s_0["active_responses"];
      return $$$$047$$$047ai$047bend$047voice$realtime_response$({$: "../../ai/bend/voice.ProviderError", "code": _code_1, "message": _message_0}, {$: "../../ai/bend/voice.RealtimeState", "phase": _t_1, "session_id": _id_8, "active_responses": _active_7});
    }
  } else if (_event_0.$ === "../../ai/bend/voice.SessionUpdated") {
    const _id_9 = _event_0["session_id"];
    const _t_2 = _s_0["phase"];
    if (_t_2.$ === "../../ai/bend/voice.Broken") {
      const _code_3 = _t_2["code"];
      const _id_10 = _s_0["session_id"];
      const _active_8 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_3}, "session_id": _id_10, "active_responses": _active_8};
    } else if (_t_2.$ === "../../ai/bend/voice.Closed") {
      const _id_11 = _s_0["session_id"];
      const _active_9 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_11, "active_responses": _active_9};
    } else if (_t_2.$ === "../../ai/bend/voice.Connecting") {
      const _id_12 = _s_0["session_id"];
      const _active_10 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "before_ready"}, "session_id": _id_12, "active_responses": _active_10};
    } else {
      const _id_13 = _s_0["session_id"];
      const _active_11 = _s_0["active_responses"];
      return $Bool$pick$(($String$eq$(_id_9, _id_13)), {$: "../../ai/bend/voice.RealtimeState", "phase": _t_2, "session_id": _id_13, "active_responses": _active_11}, {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "session_identity"}, "session_id": _id_13, "active_responses": _active_11});
    }
  } else {
    const _t_3 = _s_0["phase"];
    if (_t_3.$ === "../../ai/bend/voice.Broken") {
      const _code_4 = _t_3["code"];
      const _id_14 = _s_0["session_id"];
      const _active_12 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_4}, "session_id": _id_14, "active_responses": _active_12};
    } else if (_t_3.$ === "../../ai/bend/voice.Closed") {
      const _id_15 = _s_0["session_id"];
      const _active_13 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_15, "active_responses": _active_13};
    } else if (_t_3.$ === "../../ai/bend/voice.Connecting") {
      const _id_16 = _s_0["session_id"];
      const _active_14 = _s_0["active_responses"];
      return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": "before_ready"}, "session_id": _id_16, "active_responses": _active_14};
    } else {
      const _id_17 = _s_0["session_id"];
      const _active_15 = _s_0["active_responses"];
      return $$$$047$$$047ai$047bend$047voice$realtime_response$(_event_0, {$: "../../ai/bend/voice.RealtimeState", "phase": _t_3, "session_id": _id_17, "active_responses": _active_15});
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$live_initial$() {
  return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": "", "delegations": {$: "Nil"}, "pending": {$: "Nil"}, "used_ids": {$: "Nil"}, "usage_seconds": 0, "finalized": false};
}

function $$$$047$$$047ai$047bend$047voice$context_name$(_kind_0) {
  if (_kind_0.$ === "../../ai/bend/voice.Commentary") {
    return "session.commentary.append";
  } else if (_kind_0.$ === "../../ai/bend/voice.Thinking") {
    return "session.thinking.append";
  } else {
    return "session.instructions.append";
  }
}

function $$$$047$$$047ai$047bend$047voice$optional_id$(_id_0) {
  if (_id_0.$ === "Some") {
    const _s_0 = _id_0["value"];
    return $$$$047$$$047ai$047bend$047wire_json$quote$(_s_0);
  } else {
    return "null";
  }
}

function $$$$047$$$047ai$047bend$047voice$live_encode$(_command_0) {
  if (_command_0.$ === "../../ai/bend/voice.StartSession") {
    const _id_0 = _command_0["event_id"];
    const _t_0 = _command_0["config"];
    const _model_0 = _t_0["model"];
    const _instructions_0 = _t_0["instructions"];
    const _voice_0 = _t_0["voice"];
    const _store_0 = _t_0["store"];
    const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_voice_0));
    const _x_1 = (_x_0 + "}},\"delegation\":{\"type\":\"client\"}}}");
    const _x_2 = ($Bool$pick$(_store_0, "true", "false"));
    const _x_3 = (",\"audio\":{\"format\":{\"type\":\"audio/pcm\",\"rate\":24000},\"output\":{\"voice\":" + _x_1);
    const _x_4 = (_x_2 + _x_3);
    const _x_5 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_instructions_0));
    const _x_6 = (",\"store\":" + _x_4);
    const _x_7 = (_x_5 + _x_6);
    const _x_8 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_model_0));
    const _x_9 = (",\"instructions\":" + _x_7);
    const _x_10 = (_x_8 + _x_9);
    const _x_11 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_id_0));
    const _x_12 = (",\"session\":{\"model\":" + _x_10);
    const _x_13 = (_x_11 + _x_12);
    return ("{\"type\":\"session.start\",\"event_id\":" + _x_13);
  } else if (_command_0.$ === "../../ai/bend/voice.LiveAudio") {
    const _audio_0 = _command_0["pcm16_base64"];
    const _x_14 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_audio_0));
    const _x_15 = (_x_14 + "}");
    return ("{\"type\":\"session.input_audio.append\",\"audio\":" + _x_15);
  } else if (_command_0.$ === "../../ai/bend/voice.AppendContext") {
    const _id_1 = _command_0["event_id"];
    const _delegation_0 = _command_0["delegation_id"];
    const _kind_0 = _command_0["kind"];
    const _content_0 = _command_0["content"];
    const _x_16 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_content_0));
    const _x_17 = (_x_16 + "}");
    const _x_18 = ($$$$047$$$047ai$047bend$047voice$optional_id$(_delegation_0));
    const _x_19 = (",\"content\":" + _x_17);
    const _x_20 = (_x_18 + _x_19);
    const _x_21 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_id_1));
    const _x_22 = (",\"delegation_id\":" + _x_20);
    const _x_23 = (_x_21 + _x_22);
    const _x_24 = ($$$$047$$$047ai$047bend$047wire_json$quote$(($$$$047$$$047ai$047bend$047voice$context_name$(_kind_0))));
    const _x_25 = (",\"event_id\":" + _x_23);
    const _x_26 = (_x_24 + _x_25);
    return ("{\"type\":" + _x_26);
  } else if (_command_0.$ === "../../ai/bend/voice.Mute") {
    const _id_2 = _command_0["event_id"];
    const _x_27 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_id_2));
    const _x_28 = (_x_27 + "}");
    return ("{\"type\":\"session.input_audio.mute\",\"event_id\":" + _x_28);
  } else if (_command_0.$ === "../../ai/bend/voice.Unmute") {
    const _id_3 = _command_0["event_id"];
    const _x_29 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_id_3));
    const _x_30 = (_x_29 + "}");
    return ("{\"type\":\"session.input_audio.unmute\",\"event_id\":" + _x_30);
  } else {
    return "{\"type\":\"session.close\"}";
  }
}

function $$$$047$$$047ai$047bend$047voice$live_identity$(_kind_0, _id_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 115) {
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
                if (_t_10 == 115) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 105) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 111) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 110) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 46) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 115) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 116) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 97) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 114) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 116) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 !== "") {
                                                        const _t_39 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(0, 2) : _t_38[0]);
                                                        const _t_40 = _t_39.codePointAt(0);
                                                        if (_t_40 == 101) {
                                                          const _t_41 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(2) : _t_38.slice(1));
                                                          if (_t_41 !== "") {
                                                            const _t_42 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(0, 2) : _t_41[0]);
                                                            const _t_43 = _t_42.codePointAt(0);
                                                            if (_t_43 == 100) {
                                                              const _t_44 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_44 === "") {
                                                                if (_id_0.$ === "Some") {
                                                                  const _s_0 = _id_0["value"];
                                                                  return {$: "Done", "value": {$: "../../ai/bend/voice.Started", "session_id": _s_0}};
                                                                } else {
                                                                  return {$: "Fail", "error": "session_identity"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "session_identity"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "session_identity"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "session_identity"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "session_identity"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "session_identity"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "session_identity"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "session_identity"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "session_identity"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "session_identity"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "session_identity"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "session_identity"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "session_identity"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "session_identity"};
                                      }
                                    } else if (_t_25 == 117) {
                                      const _t_45 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_45 !== "") {
                                        const _t_46 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(0, 2) : _t_45[0]);
                                        const _t_47 = _t_46.codePointAt(0);
                                        if (_t_47 == 112) {
                                          const _t_48 = (_t_45.codePointAt(0) > 0xFFFF ? _t_45.slice(2) : _t_45.slice(1));
                                          if (_t_48 !== "") {
                                            const _t_49 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(0, 2) : _t_48[0]);
                                            const _t_50 = _t_49.codePointAt(0);
                                            if (_t_50 == 100) {
                                              const _t_51 = (_t_48.codePointAt(0) > 0xFFFF ? _t_48.slice(2) : _t_48.slice(1));
                                              if (_t_51 !== "") {
                                                const _t_52 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(0, 2) : _t_51[0]);
                                                const _t_53 = _t_52.codePointAt(0);
                                                if (_t_53 == 97) {
                                                  const _t_54 = (_t_51.codePointAt(0) > 0xFFFF ? _t_51.slice(2) : _t_51.slice(1));
                                                  if (_t_54 !== "") {
                                                    const _t_55 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(0, 2) : _t_54[0]);
                                                    const _t_56 = _t_55.codePointAt(0);
                                                    if (_t_56 == 116) {
                                                      const _t_57 = (_t_54.codePointAt(0) > 0xFFFF ? _t_54.slice(2) : _t_54.slice(1));
                                                      if (_t_57 !== "") {
                                                        const _t_58 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(0, 2) : _t_57[0]);
                                                        const _t_59 = _t_58.codePointAt(0);
                                                        if (_t_59 == 101) {
                                                          const _t_60 = (_t_57.codePointAt(0) > 0xFFFF ? _t_57.slice(2) : _t_57.slice(1));
                                                          if (_t_60 !== "") {
                                                            const _t_61 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(0, 2) : _t_60[0]);
                                                            const _t_62 = _t_61.codePointAt(0);
                                                            if (_t_62 == 100) {
                                                              const _t_63 = (_t_60.codePointAt(0) > 0xFFFF ? _t_60.slice(2) : _t_60.slice(1));
                                                              if (_t_63 === "") {
                                                                if (_id_0.$ === "Some") {
                                                                  const _s_1 = _id_0["value"];
                                                                  return {$: "Done", "value": {$: "../../ai/bend/voice.Updated", "session_id": _s_1}};
                                                                } else {
                                                                  return {$: "Fail", "error": "session_identity"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "session_identity"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "session_identity"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "session_identity"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "session_identity"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "session_identity"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "session_identity"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "session_identity"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "session_identity"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "session_identity"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "session_identity"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "session_identity"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "session_identity"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "session_identity"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "session_identity"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "session_identity"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "session_identity"};
                                }
                              } else {
                                return {$: "Fail", "error": "session_identity"};
                              }
                            } else {
                              return {$: "Fail", "error": "session_identity"};
                            }
                          } else {
                            return {$: "Fail", "error": "session_identity"};
                          }
                        } else {
                          return {$: "Fail", "error": "session_identity"};
                        }
                      } else {
                        return {$: "Fail", "error": "session_identity"};
                      }
                    } else {
                      return {$: "Fail", "error": "session_identity"};
                    }
                  } else {
                    return {$: "Fail", "error": "session_identity"};
                  }
                } else {
                  return {$: "Fail", "error": "session_identity"};
                }
              } else {
                return {$: "Fail", "error": "session_identity"};
              }
            } else {
              return {$: "Fail", "error": "session_identity"};
            }
          } else {
            return {$: "Fail", "error": "session_identity"};
          }
        } else {
          return {$: "Fail", "error": "session_identity"};
        }
      } else {
        return {$: "Fail", "error": "session_identity"};
      }
    } else {
      return {$: "Fail", "error": "session_identity"};
    }
  } else {
    return {$: "Fail", "error": "session_identity"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_delegation$(_id_0, _target_0, _offset_0) {
  if (_id_0.$ === "Some") {
    const _id_1 = _id_0["value"];
    if (_target_0.$ === "Some") {
      const _t_0 = _target_0["value"];
      if (_t_0 !== "") {
        const _t_1 = (_t_0.codePointAt(0) > 0xFFFF ? _t_0.slice(0, 2) : _t_0[0]);
        const _t_2 = _t_1.codePointAt(0);
        if (_t_2 == 99) {
          const _t_3 = (_t_0.codePointAt(0) > 0xFFFF ? _t_0.slice(2) : _t_0.slice(1));
          if (_t_3 !== "") {
            const _t_4 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(0, 2) : _t_3[0]);
            const _t_5 = _t_4.codePointAt(0);
            if (_t_5 == 108) {
              const _t_6 = (_t_3.codePointAt(0) > 0xFFFF ? _t_3.slice(2) : _t_3.slice(1));
              if (_t_6 !== "") {
                const _t_7 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(0, 2) : _t_6[0]);
                const _t_8 = _t_7.codePointAt(0);
                if (_t_8 == 105) {
                  const _t_9 = (_t_6.codePointAt(0) > 0xFFFF ? _t_6.slice(2) : _t_6.slice(1));
                  if (_t_9 !== "") {
                    const _t_10 = (_t_9.codePointAt(0) > 0xFFFF ? _t_9.slice(0, 2) : _t_9[0]);
                    const _t_11 = _t_10.codePointAt(0);
                    if (_t_11 == 101) {
                      const _t_12 = (_t_9.codePointAt(0) > 0xFFFF ? _t_9.slice(2) : _t_9.slice(1));
                      if (_t_12 !== "") {
                        const _t_13 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(0, 2) : _t_12[0]);
                        const _t_14 = _t_13.codePointAt(0);
                        if (_t_14 == 110) {
                          const _t_15 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(2) : _t_12.slice(1));
                          if (_t_15 !== "") {
                            const _t_16 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(0, 2) : _t_15[0]);
                            const _t_17 = _t_16.codePointAt(0);
                            if (_t_17 == 116) {
                              const _t_18 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(2) : _t_15.slice(1));
                              if (_t_18 === "") {
                                if (_offset_0.$ === "Some") {
                                  const _ms_0 = _offset_0["value"];
                                  return {$: "Done", "value": {$: "../../ai/bend/voice.Delegated", "delegation_id": _id_1, "offset_ms": _ms_0}};
                                } else {
                                  return {$: "Fail", "error": "delegation_target"};
                                }
                              } else {
                                return {$: "Fail", "error": "delegation_target"};
                              }
                            } else {
                              return {$: "Fail", "error": "delegation_target"};
                            }
                          } else {
                            return {$: "Fail", "error": "delegation_target"};
                          }
                        } else {
                          return {$: "Fail", "error": "delegation_target"};
                        }
                      } else {
                        return {$: "Fail", "error": "delegation_target"};
                      }
                    } else {
                      return {$: "Fail", "error": "delegation_target"};
                    }
                  } else {
                    return {$: "Fail", "error": "delegation_target"};
                  }
                } else {
                  return {$: "Fail", "error": "delegation_target"};
                }
              } else {
                return {$: "Fail", "error": "delegation_target"};
              }
            } else {
              return {$: "Fail", "error": "delegation_target"};
            }
          } else {
            return {$: "Fail", "error": "delegation_target"};
          }
        } else {
          return {$: "Fail", "error": "delegation_target"};
        }
      } else {
        return {$: "Fail", "error": "delegation_target"};
      }
    } else {
      return {$: "Fail", "error": "delegation_target"};
    }
  } else {
    return {$: "Fail", "error": "delegation_target"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_audio$(_audio_0) {
  if (_audio_0.$ === "Some") {
    const _s_0 = _audio_0["value"];
    return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$pcm16_frame$(_s_0)), {$: "Done", "value": {$: "../../ai/bend/voice.LiveAudioDelta", "pcm16_base64": _s_0}}, {$: "Fail", "error": "invalid_pcm16"});
  } else {
    return {$: "Fail", "error": "audio_frame"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_fragment$(_kind_0, _text_0, _start_0, _end_0) {
  if (_kind_0 !== "") {
    const _t_0 = (_kind_0.codePointAt(0) > 0xFFFF ? _kind_0.slice(0, 2) : _kind_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 115) {
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
                if (_t_10 == 115) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 !== "") {
                    const _t_12 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(0, 2) : _t_11[0]);
                    const _t_13 = _t_12.codePointAt(0);
                    if (_t_13 == 105) {
                      const _t_14 = (_t_11.codePointAt(0) > 0xFFFF ? _t_11.slice(2) : _t_11.slice(1));
                      if (_t_14 !== "") {
                        const _t_15 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(0, 2) : _t_14[0]);
                        const _t_16 = _t_15.codePointAt(0);
                        if (_t_16 == 111) {
                          const _t_17 = (_t_14.codePointAt(0) > 0xFFFF ? _t_14.slice(2) : _t_14.slice(1));
                          if (_t_17 !== "") {
                            const _t_18 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(0, 2) : _t_17[0]);
                            const _t_19 = _t_18.codePointAt(0);
                            if (_t_19 == 110) {
                              const _t_20 = (_t_17.codePointAt(0) > 0xFFFF ? _t_17.slice(2) : _t_17.slice(1));
                              if (_t_20 !== "") {
                                const _t_21 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(0, 2) : _t_20[0]);
                                const _t_22 = _t_21.codePointAt(0);
                                if (_t_22 == 46) {
                                  const _t_23 = (_t_20.codePointAt(0) > 0xFFFF ? _t_20.slice(2) : _t_20.slice(1));
                                  if (_t_23 !== "") {
                                    const _t_24 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(0, 2) : _t_23[0]);
                                    const _t_25 = _t_24.codePointAt(0);
                                    if (_t_25 == 105) {
                                      const _t_26 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_26 !== "") {
                                        const _t_27 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(0, 2) : _t_26[0]);
                                        const _t_28 = _t_27.codePointAt(0);
                                        if (_t_28 == 110) {
                                          const _t_29 = (_t_26.codePointAt(0) > 0xFFFF ? _t_26.slice(2) : _t_26.slice(1));
                                          if (_t_29 !== "") {
                                            const _t_30 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(0, 2) : _t_29[0]);
                                            const _t_31 = _t_30.codePointAt(0);
                                            if (_t_31 == 112) {
                                              const _t_32 = (_t_29.codePointAt(0) > 0xFFFF ? _t_29.slice(2) : _t_29.slice(1));
                                              if (_t_32 !== "") {
                                                const _t_33 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(0, 2) : _t_32[0]);
                                                const _t_34 = _t_33.codePointAt(0);
                                                if (_t_34 == 117) {
                                                  const _t_35 = (_t_32.codePointAt(0) > 0xFFFF ? _t_32.slice(2) : _t_32.slice(1));
                                                  if (_t_35 !== "") {
                                                    const _t_36 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(0, 2) : _t_35[0]);
                                                    const _t_37 = _t_36.codePointAt(0);
                                                    if (_t_37 == 116) {
                                                      const _t_38 = (_t_35.codePointAt(0) > 0xFFFF ? _t_35.slice(2) : _t_35.slice(1));
                                                      if (_t_38 !== "") {
                                                        const _t_39 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(0, 2) : _t_38[0]);
                                                        const _t_40 = _t_39.codePointAt(0);
                                                        if (_t_40 == 95) {
                                                          const _t_41 = (_t_38.codePointAt(0) > 0xFFFF ? _t_38.slice(2) : _t_38.slice(1));
                                                          if (_t_41 !== "") {
                                                            const _t_42 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(0, 2) : _t_41[0]);
                                                            const _t_43 = _t_42.codePointAt(0);
                                                            if (_t_43 == 116) {
                                                              const _t_44 = (_t_41.codePointAt(0) > 0xFFFF ? _t_41.slice(2) : _t_41.slice(1));
                                                              if (_t_44 !== "") {
                                                                const _t_45 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(0, 2) : _t_44[0]);
                                                                const _t_46 = _t_45.codePointAt(0);
                                                                if (_t_46 == 114) {
                                                                  const _t_47 = (_t_44.codePointAt(0) > 0xFFFF ? _t_44.slice(2) : _t_44.slice(1));
                                                                  if (_t_47 !== "") {
                                                                    const _t_48 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(0, 2) : _t_47[0]);
                                                                    const _t_49 = _t_48.codePointAt(0);
                                                                    if (_t_49 == 97) {
                                                                      const _t_50 = (_t_47.codePointAt(0) > 0xFFFF ? _t_47.slice(2) : _t_47.slice(1));
                                                                      if (_t_50 !== "") {
                                                                        const _t_51 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(0, 2) : _t_50[0]);
                                                                        const _t_52 = _t_51.codePointAt(0);
                                                                        if (_t_52 == 110) {
                                                                          const _t_53 = (_t_50.codePointAt(0) > 0xFFFF ? _t_50.slice(2) : _t_50.slice(1));
                                                                          if (_t_53 !== "") {
                                                                            const _t_54 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(0, 2) : _t_53[0]);
                                                                            const _t_55 = _t_54.codePointAt(0);
                                                                            if (_t_55 == 115) {
                                                                              const _t_56 = (_t_53.codePointAt(0) > 0xFFFF ? _t_53.slice(2) : _t_53.slice(1));
                                                                              if (_t_56 !== "") {
                                                                                const _t_57 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(0, 2) : _t_56[0]);
                                                                                const _t_58 = _t_57.codePointAt(0);
                                                                                if (_t_58 == 99) {
                                                                                  const _t_59 = (_t_56.codePointAt(0) > 0xFFFF ? _t_56.slice(2) : _t_56.slice(1));
                                                                                  if (_t_59 !== "") {
                                                                                    const _t_60 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(0, 2) : _t_59[0]);
                                                                                    const _t_61 = _t_60.codePointAt(0);
                                                                                    if (_t_61 == 114) {
                                                                                      const _t_62 = (_t_59.codePointAt(0) > 0xFFFF ? _t_59.slice(2) : _t_59.slice(1));
                                                                                      if (_t_62 !== "") {
                                                                                        const _t_63 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(0, 2) : _t_62[0]);
                                                                                        const _t_64 = _t_63.codePointAt(0);
                                                                                        if (_t_64 == 105) {
                                                                                          const _t_65 = (_t_62.codePointAt(0) > 0xFFFF ? _t_62.slice(2) : _t_62.slice(1));
                                                                                          if (_t_65 !== "") {
                                                                                            const _t_66 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(0, 2) : _t_65[0]);
                                                                                            const _t_67 = _t_66.codePointAt(0);
                                                                                            if (_t_67 == 112) {
                                                                                              const _t_68 = (_t_65.codePointAt(0) > 0xFFFF ? _t_65.slice(2) : _t_65.slice(1));
                                                                                              if (_t_68 !== "") {
                                                                                                const _t_69 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(0, 2) : _t_68[0]);
                                                                                                const _t_70 = _t_69.codePointAt(0);
                                                                                                if (_t_70 == 116) {
                                                                                                  const _t_71 = (_t_68.codePointAt(0) > 0xFFFF ? _t_68.slice(2) : _t_68.slice(1));
                                                                                                  if (_t_71 !== "") {
                                                                                                    const _t_72 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(0, 2) : _t_71[0]);
                                                                                                    const _t_73 = _t_72.codePointAt(0);
                                                                                                    if (_t_73 == 46) {
                                                                                                      const _t_74 = (_t_71.codePointAt(0) > 0xFFFF ? _t_71.slice(2) : _t_71.slice(1));
                                                                                                      if (_t_74 !== "") {
                                                                                                        const _t_75 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(0, 2) : _t_74[0]);
                                                                                                        const _t_76 = _t_75.codePointAt(0);
                                                                                                        if (_t_76 == 100) {
                                                                                                          const _t_77 = (_t_74.codePointAt(0) > 0xFFFF ? _t_74.slice(2) : _t_74.slice(1));
                                                                                                          if (_t_77 !== "") {
                                                                                                            const _t_78 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(0, 2) : _t_77[0]);
                                                                                                            const _t_79 = _t_78.codePointAt(0);
                                                                                                            if (_t_79 == 101) {
                                                                                                              const _t_80 = (_t_77.codePointAt(0) > 0xFFFF ? _t_77.slice(2) : _t_77.slice(1));
                                                                                                              if (_t_80 !== "") {
                                                                                                                const _t_81 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(0, 2) : _t_80[0]);
                                                                                                                const _t_82 = _t_81.codePointAt(0);
                                                                                                                if (_t_82 == 108) {
                                                                                                                  const _t_83 = (_t_80.codePointAt(0) > 0xFFFF ? _t_80.slice(2) : _t_80.slice(1));
                                                                                                                  if (_t_83 !== "") {
                                                                                                                    const _t_84 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(0, 2) : _t_83[0]);
                                                                                                                    const _t_85 = _t_84.codePointAt(0);
                                                                                                                    if (_t_85 == 116) {
                                                                                                                      const _t_86 = (_t_83.codePointAt(0) > 0xFFFF ? _t_83.slice(2) : _t_83.slice(1));
                                                                                                                      if (_t_86 !== "") {
                                                                                                                        const _t_87 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(0, 2) : _t_86[0]);
                                                                                                                        const _t_88 = _t_87.codePointAt(0);
                                                                                                                        if (_t_88 == 97) {
                                                                                                                          const _t_89 = (_t_86.codePointAt(0) > 0xFFFF ? _t_86.slice(2) : _t_86.slice(1));
                                                                                                                          if (_t_89 === "") {
                                                                                                                            if (_text_0.$ === "Some") {
                                                                                                                              const _s_0 = _text_0["value"];
                                                                                                                              if (_start_0.$ === "Some") {
                                                                                                                                const _a_0 = _start_0["value"];
                                                                                                                                if (_end_0.$ === "Some") {
                                                                                                                                  const _b_0 = _end_0["value"];
                                                                                                                                  return {$: "Done", "value": {$: "../../ai/bend/voice.InputFragment", "text": _s_0, "start_ms": _a_0, "end_ms": _b_0}};
                                                                                                                                } else {
                                                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                                                }
                                                                                                                              } else {
                                                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                                                              }
                                                                                                                            } else {
                                                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                                                            }
                                                                                                                          } else {
                                                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                                                          }
                                                                                                                        } else {
                                                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                                                        }
                                                                                                                      } else {
                                                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                                                      }
                                                                                                                    } else {
                                                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                                                    }
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "transcript_frame"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "transcript_frame"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "transcript_frame"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "transcript_frame"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "transcript_frame"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "transcript_frame"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "transcript_frame"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "transcript_frame"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "transcript_frame"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "transcript_frame"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "transcript_frame"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "transcript_frame"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "transcript_frame"};
                                      }
                                    } else if (_t_25 == 111) {
                                      const _t_90 = (_t_23.codePointAt(0) > 0xFFFF ? _t_23.slice(2) : _t_23.slice(1));
                                      if (_t_90 !== "") {
                                        const _t_91 = (_t_90.codePointAt(0) > 0xFFFF ? _t_90.slice(0, 2) : _t_90[0]);
                                        const _t_92 = _t_91.codePointAt(0);
                                        if (_t_92 == 117) {
                                          const _t_93 = (_t_90.codePointAt(0) > 0xFFFF ? _t_90.slice(2) : _t_90.slice(1));
                                          if (_t_93 !== "") {
                                            const _t_94 = (_t_93.codePointAt(0) > 0xFFFF ? _t_93.slice(0, 2) : _t_93[0]);
                                            const _t_95 = _t_94.codePointAt(0);
                                            if (_t_95 == 116) {
                                              const _t_96 = (_t_93.codePointAt(0) > 0xFFFF ? _t_93.slice(2) : _t_93.slice(1));
                                              if (_t_96 !== "") {
                                                const _t_97 = (_t_96.codePointAt(0) > 0xFFFF ? _t_96.slice(0, 2) : _t_96[0]);
                                                const _t_98 = _t_97.codePointAt(0);
                                                if (_t_98 == 112) {
                                                  const _t_99 = (_t_96.codePointAt(0) > 0xFFFF ? _t_96.slice(2) : _t_96.slice(1));
                                                  if (_t_99 !== "") {
                                                    const _t_100 = (_t_99.codePointAt(0) > 0xFFFF ? _t_99.slice(0, 2) : _t_99[0]);
                                                    const _t_101 = _t_100.codePointAt(0);
                                                    if (_t_101 == 117) {
                                                      const _t_102 = (_t_99.codePointAt(0) > 0xFFFF ? _t_99.slice(2) : _t_99.slice(1));
                                                      if (_t_102 !== "") {
                                                        const _t_103 = (_t_102.codePointAt(0) > 0xFFFF ? _t_102.slice(0, 2) : _t_102[0]);
                                                        const _t_104 = _t_103.codePointAt(0);
                                                        if (_t_104 == 116) {
                                                          const _t_105 = (_t_102.codePointAt(0) > 0xFFFF ? _t_102.slice(2) : _t_102.slice(1));
                                                          if (_t_105 !== "") {
                                                            const _t_106 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(0, 2) : _t_105[0]);
                                                            const _t_107 = _t_106.codePointAt(0);
                                                            if (_t_107 == 95) {
                                                              const _t_108 = (_t_105.codePointAt(0) > 0xFFFF ? _t_105.slice(2) : _t_105.slice(1));
                                                              if (_t_108 !== "") {
                                                                const _t_109 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(0, 2) : _t_108[0]);
                                                                const _t_110 = _t_109.codePointAt(0);
                                                                if (_t_110 == 116) {
                                                                  const _t_111 = (_t_108.codePointAt(0) > 0xFFFF ? _t_108.slice(2) : _t_108.slice(1));
                                                                  if (_t_111 !== "") {
                                                                    const _t_112 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(0, 2) : _t_111[0]);
                                                                    const _t_113 = _t_112.codePointAt(0);
                                                                    if (_t_113 == 114) {
                                                                      const _t_114 = (_t_111.codePointAt(0) > 0xFFFF ? _t_111.slice(2) : _t_111.slice(1));
                                                                      if (_t_114 !== "") {
                                                                        const _t_115 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(0, 2) : _t_114[0]);
                                                                        const _t_116 = _t_115.codePointAt(0);
                                                                        if (_t_116 == 97) {
                                                                          const _t_117 = (_t_114.codePointAt(0) > 0xFFFF ? _t_114.slice(2) : _t_114.slice(1));
                                                                          if (_t_117 !== "") {
                                                                            const _t_118 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(0, 2) : _t_117[0]);
                                                                            const _t_119 = _t_118.codePointAt(0);
                                                                            if (_t_119 == 110) {
                                                                              const _t_120 = (_t_117.codePointAt(0) > 0xFFFF ? _t_117.slice(2) : _t_117.slice(1));
                                                                              if (_t_120 !== "") {
                                                                                const _t_121 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(0, 2) : _t_120[0]);
                                                                                const _t_122 = _t_121.codePointAt(0);
                                                                                if (_t_122 == 115) {
                                                                                  const _t_123 = (_t_120.codePointAt(0) > 0xFFFF ? _t_120.slice(2) : _t_120.slice(1));
                                                                                  if (_t_123 !== "") {
                                                                                    const _t_124 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(0, 2) : _t_123[0]);
                                                                                    const _t_125 = _t_124.codePointAt(0);
                                                                                    if (_t_125 == 99) {
                                                                                      const _t_126 = (_t_123.codePointAt(0) > 0xFFFF ? _t_123.slice(2) : _t_123.slice(1));
                                                                                      if (_t_126 !== "") {
                                                                                        const _t_127 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(0, 2) : _t_126[0]);
                                                                                        const _t_128 = _t_127.codePointAt(0);
                                                                                        if (_t_128 == 114) {
                                                                                          const _t_129 = (_t_126.codePointAt(0) > 0xFFFF ? _t_126.slice(2) : _t_126.slice(1));
                                                                                          if (_t_129 !== "") {
                                                                                            const _t_130 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(0, 2) : _t_129[0]);
                                                                                            const _t_131 = _t_130.codePointAt(0);
                                                                                            if (_t_131 == 105) {
                                                                                              const _t_132 = (_t_129.codePointAt(0) > 0xFFFF ? _t_129.slice(2) : _t_129.slice(1));
                                                                                              if (_t_132 !== "") {
                                                                                                const _t_133 = (_t_132.codePointAt(0) > 0xFFFF ? _t_132.slice(0, 2) : _t_132[0]);
                                                                                                const _t_134 = _t_133.codePointAt(0);
                                                                                                if (_t_134 == 112) {
                                                                                                  const _t_135 = (_t_132.codePointAt(0) > 0xFFFF ? _t_132.slice(2) : _t_132.slice(1));
                                                                                                  if (_t_135 !== "") {
                                                                                                    const _t_136 = (_t_135.codePointAt(0) > 0xFFFF ? _t_135.slice(0, 2) : _t_135[0]);
                                                                                                    const _t_137 = _t_136.codePointAt(0);
                                                                                                    if (_t_137 == 116) {
                                                                                                      const _t_138 = (_t_135.codePointAt(0) > 0xFFFF ? _t_135.slice(2) : _t_135.slice(1));
                                                                                                      if (_t_138 !== "") {
                                                                                                        const _t_139 = (_t_138.codePointAt(0) > 0xFFFF ? _t_138.slice(0, 2) : _t_138[0]);
                                                                                                        const _t_140 = _t_139.codePointAt(0);
                                                                                                        if (_t_140 == 46) {
                                                                                                          const _t_141 = (_t_138.codePointAt(0) > 0xFFFF ? _t_138.slice(2) : _t_138.slice(1));
                                                                                                          if (_t_141 !== "") {
                                                                                                            const _t_142 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(0, 2) : _t_141[0]);
                                                                                                            const _t_143 = _t_142.codePointAt(0);
                                                                                                            if (_t_143 == 100) {
                                                                                                              const _t_144 = (_t_141.codePointAt(0) > 0xFFFF ? _t_141.slice(2) : _t_141.slice(1));
                                                                                                              if (_t_144 !== "") {
                                                                                                                const _t_145 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(0, 2) : _t_144[0]);
                                                                                                                const _t_146 = _t_145.codePointAt(0);
                                                                                                                if (_t_146 == 101) {
                                                                                                                  const _t_147 = (_t_144.codePointAt(0) > 0xFFFF ? _t_144.slice(2) : _t_144.slice(1));
                                                                                                                  if (_t_147 !== "") {
                                                                                                                    const _t_148 = (_t_147.codePointAt(0) > 0xFFFF ? _t_147.slice(0, 2) : _t_147[0]);
                                                                                                                    const _t_149 = _t_148.codePointAt(0);
                                                                                                                    if (_t_149 == 108) {
                                                                                                                      const _t_150 = (_t_147.codePointAt(0) > 0xFFFF ? _t_147.slice(2) : _t_147.slice(1));
                                                                                                                      if (_t_150 !== "") {
                                                                                                                        const _t_151 = (_t_150.codePointAt(0) > 0xFFFF ? _t_150.slice(0, 2) : _t_150[0]);
                                                                                                                        const _t_152 = _t_151.codePointAt(0);
                                                                                                                        if (_t_152 == 116) {
                                                                                                                          const _t_153 = (_t_150.codePointAt(0) > 0xFFFF ? _t_150.slice(2) : _t_150.slice(1));
                                                                                                                          if (_t_153 !== "") {
                                                                                                                            const _t_154 = (_t_153.codePointAt(0) > 0xFFFF ? _t_153.slice(0, 2) : _t_153[0]);
                                                                                                                            const _t_155 = _t_154.codePointAt(0);
                                                                                                                            if (_t_155 == 97) {
                                                                                                                              const _t_156 = (_t_153.codePointAt(0) > 0xFFFF ? _t_153.slice(2) : _t_153.slice(1));
                                                                                                                              if (_t_156 === "") {
                                                                                                                                if (_text_0.$ === "Some") {
                                                                                                                                  const _s_1 = _text_0["value"];
                                                                                                                                  if (_start_0.$ === "Some") {
                                                                                                                                    const _a_1 = _start_0["value"];
                                                                                                                                    if (_end_0.$ === "Some") {
                                                                                                                                      const _b_1 = _end_0["value"];
                                                                                                                                      return {$: "Done", "value": {$: "../../ai/bend/voice.OutputFragment", "text": _s_1, "start_ms": _a_1, "end_ms": _b_1}};
                                                                                                                                    } else {
                                                                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                                                                    }
                                                                                                                                  } else {
                                                                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                                                                  }
                                                                                                                                } else {
                                                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                                                }
                                                                                                                              } else {
                                                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                                                              }
                                                                                                                            } else {
                                                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                                                            }
                                                                                                                          } else {
                                                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                                                          }
                                                                                                                        } else {
                                                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                                                        }
                                                                                                                      } else {
                                                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                                                      }
                                                                                                                    } else {
                                                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                                                    }
                                                                                                                  } else {
                                                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                                                  }
                                                                                                                } else {
                                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                                }
                                                                                                              } else {
                                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                                              }
                                                                                                            } else {
                                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                                            }
                                                                                                          } else {
                                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                                          }
                                                                                                        } else {
                                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                                        }
                                                                                                      } else {
                                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                                      }
                                                                                                    } else {
                                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                                    }
                                                                                                  } else {
                                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                                  }
                                                                                                } else {
                                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                                }
                                                                                              } else {
                                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                                              }
                                                                                            } else {
                                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                                            }
                                                                                          } else {
                                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                                          }
                                                                                        } else {
                                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                                        }
                                                                                      } else {
                                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                                      }
                                                                                    } else {
                                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                                    }
                                                                                  } else {
                                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                                  }
                                                                                } else {
                                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                                }
                                                                              } else {
                                                                                return {$: "Fail", "error": "transcript_frame"};
                                                                              }
                                                                            } else {
                                                                              return {$: "Fail", "error": "transcript_frame"};
                                                                            }
                                                                          } else {
                                                                            return {$: "Fail", "error": "transcript_frame"};
                                                                          }
                                                                        } else {
                                                                          return {$: "Fail", "error": "transcript_frame"};
                                                                        }
                                                                      } else {
                                                                        return {$: "Fail", "error": "transcript_frame"};
                                                                      }
                                                                    } else {
                                                                      return {$: "Fail", "error": "transcript_frame"};
                                                                    }
                                                                  } else {
                                                                    return {$: "Fail", "error": "transcript_frame"};
                                                                  }
                                                                } else {
                                                                  return {$: "Fail", "error": "transcript_frame"};
                                                                }
                                                              } else {
                                                                return {$: "Fail", "error": "transcript_frame"};
                                                              }
                                                            } else {
                                                              return {$: "Fail", "error": "transcript_frame"};
                                                            }
                                                          } else {
                                                            return {$: "Fail", "error": "transcript_frame"};
                                                          }
                                                        } else {
                                                          return {$: "Fail", "error": "transcript_frame"};
                                                        }
                                                      } else {
                                                        return {$: "Fail", "error": "transcript_frame"};
                                                      }
                                                    } else {
                                                      return {$: "Fail", "error": "transcript_frame"};
                                                    }
                                                  } else {
                                                    return {$: "Fail", "error": "transcript_frame"};
                                                  }
                                                } else {
                                                  return {$: "Fail", "error": "transcript_frame"};
                                                }
                                              } else {
                                                return {$: "Fail", "error": "transcript_frame"};
                                              }
                                            } else {
                                              return {$: "Fail", "error": "transcript_frame"};
                                            }
                                          } else {
                                            return {$: "Fail", "error": "transcript_frame"};
                                          }
                                        } else {
                                          return {$: "Fail", "error": "transcript_frame"};
                                        }
                                      } else {
                                        return {$: "Fail", "error": "transcript_frame"};
                                      }
                                    } else {
                                      return {$: "Fail", "error": "transcript_frame"};
                                    }
                                  } else {
                                    return {$: "Fail", "error": "transcript_frame"};
                                  }
                                } else {
                                  return {$: "Fail", "error": "transcript_frame"};
                                }
                              } else {
                                return {$: "Fail", "error": "transcript_frame"};
                              }
                            } else {
                              return {$: "Fail", "error": "transcript_frame"};
                            }
                          } else {
                            return {$: "Fail", "error": "transcript_frame"};
                          }
                        } else {
                          return {$: "Fail", "error": "transcript_frame"};
                        }
                      } else {
                        return {$: "Fail", "error": "transcript_frame"};
                      }
                    } else {
                      return {$: "Fail", "error": "transcript_frame"};
                    }
                  } else {
                    return {$: "Fail", "error": "transcript_frame"};
                  }
                } else {
                  return {$: "Fail", "error": "transcript_frame"};
                }
              } else {
                return {$: "Fail", "error": "transcript_frame"};
              }
            } else {
              return {$: "Fail", "error": "transcript_frame"};
            }
          } else {
            return {$: "Fail", "error": "transcript_frame"};
          }
        } else {
          return {$: "Fail", "error": "transcript_frame"};
        }
      } else {
        return {$: "Fail", "error": "transcript_frame"};
      }
    } else {
      return {$: "Fail", "error": "transcript_frame"};
    }
  } else {
    return {$: "Fail", "error": "transcript_frame"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_context_ack$(_id_0, _kind_0) {
  if (_id_0.$ === "Some") {
    const _s_0 = _id_0["value"];
    return {$: "Done", "value": {$: "../../ai/bend/voice.ContextAccepted", "client_event_id": _s_0, "kind": _kind_0}};
  } else {
    return {$: "Fail", "error": "ack_id"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_mute_ack$(_id_0, _muted_0) {
  if (_id_0.$ === "Some") {
    const _s_0 = _id_0["value"];
    return {$: "Done", "value": {$: "../../ai/bend/voice.MuteAccepted", "client_event_id": _s_0, "muted": _muted_0}};
  } else {
    return {$: "Fail", "error": "ack_id"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_usage$(_seconds_0) {
  if (_seconds_0.$ === "Some") {
    const _s_0 = _seconds_0["value"];
    return {$: "Done", "value": {$: "../../ai/bend/voice.UsageUpdated", "seconds": _s_0}};
  } else {
    return {$: "Fail", "error": "usage_frame"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_final$(_id_0, _reason_0, _seconds_0) {
  if (_reason_0.$ === "Some") {
    const _r_0 = _reason_0["value"];
    if (_seconds_0.$ === "Some") {
      const _s_0 = _seconds_0["value"];
      return {$: "Done", "value": {$: "../../ai/bend/voice.SessionClosed", "session_id": _id_0, "reason": _r_0, "seconds": _s_0}};
    } else {
      return {$: "Fail", "error": "final_usage"};
    }
  } else {
    return {$: "Fail", "error": "final_usage"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_error$(_code_0, _message_0, _id_0) {
  if (_message_0.$ === "Some") {
    const _s_0 = _message_0["value"];
    return {$: "Done", "value": {$: "../../ai/bend/voice.LiveProviderError", "code": ($Maybe$default$(_code_0, "provider_error")), "message": _s_0, "client_event_id": _id_0}};
  } else {
    return {$: "Fail", "error": "provider_error_frame"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_wire_kind$(_kind_0) {
  return $Bool$pick$(($String$eq$(_kind_0, "session.started")), {$: "../../ai/bend/voice.LVStarted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.updated")), {$: "../../ai/bend/voice.LVUpdated"}, ($Bool$pick$(($String$eq$(_kind_0, "session.delegation.created")), {$: "../../ai/bend/voice.LVDelegated"}, ($Bool$pick$(($String$eq$(_kind_0, "session.output_audio.delta")), {$: "../../ai/bend/voice.LVAudioDelta"}, ($Bool$pick$(($String$eq$(_kind_0, "session.input_transcript.delta")), {$: "../../ai/bend/voice.LVInputFragment"}, ($Bool$pick$(($String$eq$(_kind_0, "session.output_transcript.delta")), {$: "../../ai/bend/voice.LVOutputFragment"}, ($Bool$pick$(($String$eq$(_kind_0, "session.commentary.appended")), {$: "../../ai/bend/voice.LVCommentaryAccepted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.thinking.appended")), {$: "../../ai/bend/voice.LVThinkingAccepted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.instructions.appended")), {$: "../../ai/bend/voice.LVInstructionsAccepted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.input_audio.muted")), {$: "../../ai/bend/voice.LVMuted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.input_audio.unmuted")), {$: "../../ai/bend/voice.LVUnmuted"}, ($Bool$pick$(($String$eq$(_kind_0, "session.usage.updated")), {$: "../../ai/bend/voice.LVUsageUpdated"}, ($Bool$pick$(($String$eq$(_kind_0, "session.closed")), {$: "../../ai/bend/voice.LVClosed"}, ($Bool$pick$(($String$eq$(_kind_0, "error")), {$: "../../ai/bend/voice.LVError"}, {$: "../../ai/bend/voice.LVUnknown"})))))))))))))))))))))))))));
}

function $$$$047$$$047ai$047bend$047voice$live_fields$(_wire_kind_0, _kind_0, _v_0) {
  if (_wire_kind_0.$ === "../../ai/bend/voice.LVStarted") {
    return $$$$047$$$047ai$047bend$047voice$live_identity$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_v_0, "session")), "id")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVUpdated") {
    return $$$$047$$$047ai$047bend$047voice$live_identity$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_v_0, "session")), "id")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVDelegated") {
    const _d_0 = ($$$$047$$$047ai$047bend$047voice$child$(_v_0, "delegation"));
    return $$$$047$$$047ai$047bend$047voice$live_delegation$(($$$$047$$$047ai$047bend$047voice$text$(_d_0, "id")), ($$$$047$$$047ai$047bend$047voice$text$(_d_0, "target")), ($$$$047$$$047ai$047bend$047voice$integer$(_v_0, "offset_ms")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVAudioDelta") {
    return $$$$047$$$047ai$047bend$047voice$live_audio$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "delta")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVInputFragment") {
    return $$$$047$$$047ai$047bend$047voice$live_fragment$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(_v_0, "delta")), ($$$$047$$$047ai$047bend$047voice$integer$(_v_0, "start_ms")), ($$$$047$$$047ai$047bend$047voice$integer$(_v_0, "end_ms")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVOutputFragment") {
    return $$$$047$$$047ai$047bend$047voice$live_fragment$(_kind_0, ($$$$047$$$047ai$047bend$047voice$text$(_v_0, "delta")), ($$$$047$$$047ai$047bend$047voice$integer$(_v_0, "start_ms")), ($$$$047$$$047ai$047bend$047voice$integer$(_v_0, "end_ms")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVCommentaryAccepted") {
    return $$$$047$$$047ai$047bend$047voice$live_context_ack$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "client_event_id")), {$: "../../ai/bend/voice.Commentary"});
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVThinkingAccepted") {
    return $$$$047$$$047ai$047bend$047voice$live_context_ack$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "client_event_id")), {$: "../../ai/bend/voice.Thinking"});
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVInstructionsAccepted") {
    return $$$$047$$$047ai$047bend$047voice$live_context_ack$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "client_event_id")), {$: "../../ai/bend/voice.Instructions"});
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVMuted") {
    return $$$$047$$$047ai$047bend$047voice$live_mute_ack$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "client_event_id")), true);
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVUnmuted") {
    return $$$$047$$$047ai$047bend$047voice$live_mute_ack$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "client_event_id")), false);
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVUsageUpdated") {
    return $$$$047$$$047ai$047bend$047voice$live_usage$(($$$$047$$$047ai$047bend$047voice$number$(($$$$047$$$047ai$047bend$047voice$child$(_v_0, "usage")), "seconds")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVClosed") {
    return $$$$047$$$047ai$047bend$047voice$live_final$(($$$$047$$$047ai$047bend$047voice$text$(($$$$047$$$047ai$047bend$047voice$child$(_v_0, "session")), "id")), ($$$$047$$$047ai$047bend$047voice$text$(_v_0, "reason")), ($$$$047$$$047ai$047bend$047voice$number$(($$$$047$$$047ai$047bend$047voice$child$(_v_0, "usage")), "seconds")));
  } else if (_wire_kind_0.$ === "../../ai/bend/voice.LVError") {
    const _e_0 = ($$$$047$$$047ai$047bend$047voice$child$(_v_0, "error"));
    return $$$$047$$$047ai$047bend$047voice$live_error$(($$$$047$$$047ai$047bend$047voice$text$(_e_0, "code")), ($$$$047$$$047ai$047bend$047voice$text$(_e_0, "message")), ($$$$047$$$047ai$047bend$047voice$text$(_e_0, "client_event_id")));
  } else {
    return {$: "Done", "value": {$: "../../ai/bend/voice.UnknownLive", "event_type": _kind_0}};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_event$(_kind_0, _v_0) {
  return $$$$047$$$047ai$047bend$047voice$live_fields$(($$$$047$$$047ai$047bend$047voice$live_wire_kind$(_kind_0)), _kind_0, _v_0);
}

function $$$$047$$$047ai$047bend$047voice$live_kind$(_kind_0, _value_0) {
  if (_kind_0.$ === "Some") {
    const _s_0 = _kind_0["value"];
    return $$$$047$$$047ai$047bend$047voice$live_event$(_s_0, _value_0);
  } else {
    return {$: "Fail", "error": "event_type"};
  }
}

function $$$$047$$$047ai$047bend$047voice$live_parsed$(_result_0) {
  if (_result_0.$ === "Fail") {
    const _e_0 = _result_0["error"];
    return {$: "Fail", "error": _e_0};
  } else {
    const _v_0 = _result_0["value"];
    return $$$$047$$$047ai$047bend$047voice$live_kind$(($$$$047$$$047ai$047bend$047voice$text$(_v_0, "type")), _v_0);
  }
}

function $$$$047$$$047ai$047bend$047voice$live_limited$(_allowed_0, _wire_0) {
  if (!_allowed_0) {
    return {$: "Fail", "error": "frame_limit"};
  } else {
    return $$$$047$$$047ai$047bend$047voice$live_parsed$(run_loop($$$$047$$$047ai$047bend$047wire_json$read$(_wire_0)));
  }
}

function $$$$047$$$047ai$047bend$047voice$live_decode$(_wire_0) {
  const _x_0 = [..._wire_0].length;
  const _x_1 = (_x_0 >>> 0);
  return $$$$047$$$047ai$047bend$047voice$live_limited$((_x_1 <= 1048576), _wire_0);
}

function $$$$047$$$047ai$047bend$047voice$context_eq$(_a_0, _b_0) {
  return $String$eq$(($$$$047$$$047ai$047bend$047voice$context_name$(_a_0)), ($$$$047$$$047ai$047bend$047voice$context_name$(_b_0)));
}

function $$$$047$$$047ai$047bend$047voice$pending_id$(_p_0) {
  if (_p_0.$ === "../../ai/bend/voice.PendingContext") {
    const _id_0 = _p_0["event_id"];
    return _id_0;
  } else {
    const _id_1 = _p_0["event_id"];
    return _id_1;
  }
}

function $$$$047$$$047ai$047bend$047voice$bool_eq$(_a_0, _b_0) {
  if (_a_0) {
    if (_b_0) {
      return true;
    } else {
      return false;
    }
  } else {
    if (!_b_0) {
      return true;
    } else {
      return false;
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$ack_matches$(_event_0, _pending_0) {
  if (_event_0.$ === "../../ai/bend/voice.ContextAccepted") {
    const _id_0 = _event_0["client_event_id"];
    const _kind_0 = _event_0["kind"];
    if (_pending_0.$ === "../../ai/bend/voice.PendingContext") {
      const _other_0 = _pending_0["event_id"];
      const _p_0 = _pending_0["kind"];
      return $Bool$and$(($String$eq$(_id_0, _other_0)), ($$$$047$$$047ai$047bend$047voice$context_eq$(_kind_0, _p_0)));
    } else {
      return false;
    }
  } else if (_event_0.$ === "../../ai/bend/voice.MuteAccepted") {
    const _id_1 = _event_0["client_event_id"];
    const _muted_0 = _event_0["muted"];
    if (_pending_0.$ === "../../ai/bend/voice.PendingMute") {
      const _other_1 = _pending_0["event_id"];
      const _value_0 = _pending_0["muted"];
      return $Bool$and$(($String$eq$(_id_1, _other_1)), ($$$$047$$$047ai$047bend$047voice$bool_eq$(_muted_0, _value_0)));
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function $$$$047$$$047ai$047bend$047voice$has_ack$(_event_0, _pending_0) {
  if (_pending_0.$ === "Nil") {
    return false;
  } else {
    const _p_0 = _pending_0["head"];
    const _tail_0 = _pending_0["tail"];
    const _x_0 = ($$$$047$$$047ai$047bend$047voice$ack_matches$(_event_0, _p_0));
    const _x_1 = ($$$$047$$$047ai$047bend$047voice$has_ack$(_event_0, _tail_0));
    return (_x_0 || _x_1);
  }
}

function $$$$047$$$047ai$047bend$047voice$remove_ack_go$($0, $1, $2) {
  for (;;) {
    {
      const _event_0 = $0;
      const _pending_0 = $1;
      const _acc_0 = $2;
      if (_pending_0.$ === "Nil") {
        return $List$reverse$(_acc_0);
      } else {
        const _p_0 = _pending_0["head"];
        const _tail_0 = _pending_0["tail"];
        $0 = _event_0;
        $1 = _tail_0;
        $2 = ($Bool$pick$(($$$$047$$$047ai$047bend$047voice$ack_matches$(_event_0, _p_0)), _acc_0, {$: "Con", "head": _p_0, "tail": _acc_0}));
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$remove_ack$(_event_0, _pending_0) {
  return $$$$047$$$047ai$047bend$047voice$remove_ack_go$(_event_0, _pending_0, {$: "Nil"});
}

function $$$$047$$$047ai$047bend$047voice$live_break$(_code_0, _s_0) {
  const _id_0 = _s_0["session_id"];
  const _ds_0 = _s_0["delegations"];
  const _used_0 = _s_0["used_ids"];
  const _seconds_0 = _s_0["usage_seconds"];
  const _finalized_0 = _s_0["finalized"];
  return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_0}, "session_id": _id_0, "delegations": _ds_0, "pending": {$: "Nil"}, "used_ids": _used_0, "usage_seconds": _seconds_0, "finalized": _finalized_0};
}

function $$$$047$$$047ai$047bend$047voice$live_ready$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "../../ai/bend/voice.Ready") {
    return true;
  } else {
    return false;
  }
}

function $$$$047$$$047ai$047bend$047voice$remember$(_command_0, _s_0) {
  const _phase_0 = _s_0["phase"];
  const _id_0 = _s_0["session_id"];
  const _ds_0 = _s_0["delegations"];
  const _ps_0 = _s_0["pending"];
  const _used_0 = _s_0["used_ids"];
  const _seconds_0 = _s_0["usage_seconds"];
  const _finalized_0 = _s_0["finalized"];
  const _key_0 = ($$$$047$$$047ai$047bend$047voice$pending_id$(_command_0));
  const _x_0 = ($String$eq$(_key_0, ""));
  const _x_1 = ($$$$047$$$047ai$047bend$047voice$contains$(_used_0, _key_0));
  const _x_2 = ($List$length$(_used_0));
  const _x_3 = (_x_2 >>> 0);
  const _x_4 = (_x_0 || _x_1);
  const _x_5 = (_x_3 >= 1024);
  const _x_6 = ($List$length$(_ps_0));
  const _x_7 = (_x_6 >>> 0);
  const _x_8 = (_x_4 || _x_5);
  const _x_9 = (_x_7 >= 256);
  return $Bool$pick$((_x_8 || _x_9), {$: "Fail", "error": "command_id_or_limit"}, {$: "Done", "value": {$: "../../ai/bend/voice.LiveState", "phase": _phase_0, "session_id": _id_0, "delegations": _ds_0, "pending": {$: "Con", "head": _command_0, "tail": _ps_0}, "used_ids": {$: "Con", "head": _key_0, "tail": _used_0}, "usage_seconds": _seconds_0, "finalized": _finalized_0}});
}

function $$$$047$$$047ai$047bend$047voice$delegation_valid$(_delegation_0, _ds_0) {
  if (_delegation_0.$ === "None") {
    return true;
  } else {
    const _id_0 = _delegation_0["value"];
    return $$$$047$$$047ai$047bend$047voice$contains$(_ds_0, _id_0);
  }
}

function $$$$047$$$047ai$047bend$047voice$live_config_valid$(_config_0) {
  const _model_0 = _config_0["model"];
  const _voice_0 = _config_0["voice"];
  return $Bool$and$(($Bool$not$(($String$eq$(_model_0, "")))), ($Bool$not$(($String$eq$(_voice_0, "")))));
}

function $$$$047$$$047ai$047bend$047voice$live_prepare$(_command_0, _s_0) {
  if (_command_0.$ === "../../ai/bend/voice.StartSession") {
    const _event_id_0 = _command_0["event_id"];
    const _config_0 = _command_0["config"];
    const _t_0 = _s_0["phase"];
    if (_t_0.$ === "../../ai/bend/voice.Connecting") {
      const _id_0 = _s_0["session_id"];
      const _ds_0 = _s_0["delegations"];
      const _ps_0 = _s_0["pending"];
      const _used_0 = _s_0["used_ids"];
      const _seconds_0 = _s_0["usage_seconds"];
      const _finalized_0 = _s_0["finalized"];
      const _x_0 = ($String$eq$(_event_id_0, ""));
      const _x_1 = ($Nat$is_ne$(($List$length$(_used_0)), 0));
      const _x_2 = (_x_0 || _x_1);
      const _x_3 = ($Bool$not$(($$$$047$$$047ai$047bend$047voice$live_config_valid$(_config_0))));
      return $Bool$pick$((_x_2 || _x_3), {$: "Fail", "error": "command_id"}, {$: "Done", "value": {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_0, "delegations": _ds_0, "pending": _ps_0, "used_ids": {$: "Con", "head": _event_id_0, "tail": _used_0}, "usage_seconds": _seconds_0, "finalized": _finalized_0}});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.AppendContext") {
    const _event_id_1 = _command_0["event_id"];
    const _delegation_0 = _command_0["delegation_id"];
    const _kind_0 = _command_0["kind"];
    const _content_0 = _command_0["content"];
    const _t_1 = _s_0["phase"];
    if (_t_1.$ === "../../ai/bend/voice.Ready") {
      const _id_2 = _s_0["session_id"];
      const _ds_2 = _s_0["delegations"];
      const _ps_2 = _s_0["pending"];
      const _used_2 = _s_0["used_ids"];
      const _seconds_2 = _s_0["usage_seconds"];
      const _finalized_2 = _s_0["finalized"];
      const _x_4 = [..._content_0].length;
      const _x_5 = (_x_4 >>> 0);
      return $Bool$pick$(($Bool$and$(($Bool$and$(($$$$047$$$047ai$047bend$047voice$delegation_valid$(_delegation_0, _ds_2)), ($Bool$not$(($String$eq$(_content_0, "")))))), (_x_5 <= 4000))), ($$$$047$$$047ai$047bend$047voice$remember$({$: "../../ai/bend/voice.PendingContext", "event_id": _event_id_1, "delegation_id": _delegation_0, "kind": _kind_0}, {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_2, "delegations": _ds_2, "pending": _ps_2, "used_ids": _used_2, "usage_seconds": _seconds_2, "finalized": _finalized_2})), {$: "Fail", "error": "delegation_or_content"});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.Mute") {
    const _event_id_2 = _command_0["event_id"];
    const _t_2 = _s_0["phase"];
    if (_t_2.$ === "../../ai/bend/voice.Ready") {
      const _id_4 = _s_0["session_id"];
      const _ds_4 = _s_0["delegations"];
      const _ps_4 = _s_0["pending"];
      const _used_4 = _s_0["used_ids"];
      const _seconds_4 = _s_0["usage_seconds"];
      const _finalized_4 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$remember$({$: "../../ai/bend/voice.PendingMute", "event_id": _event_id_2, "muted": true}, {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_4, "delegations": _ds_4, "pending": _ps_4, "used_ids": _used_4, "usage_seconds": _seconds_4, "finalized": _finalized_4});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.Unmute") {
    const _event_id_3 = _command_0["event_id"];
    const _t_3 = _s_0["phase"];
    if (_t_3.$ === "../../ai/bend/voice.Ready") {
      const _id_6 = _s_0["session_id"];
      const _ds_6 = _s_0["delegations"];
      const _ps_6 = _s_0["pending"];
      const _used_6 = _s_0["used_ids"];
      const _seconds_6 = _s_0["usage_seconds"];
      const _finalized_6 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$remember$({$: "../../ai/bend/voice.PendingMute", "event_id": _event_id_3, "muted": false}, {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_6, "delegations": _ds_6, "pending": _ps_6, "used_ids": _used_6, "usage_seconds": _seconds_6, "finalized": _finalized_6});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.CloseSession") {
    const _t_4 = _s_0["phase"];
    if (_t_4.$ === "../../ai/bend/voice.Ready") {
      const _id_8 = _s_0["session_id"];
      const _ds_8 = _s_0["delegations"];
      const _ps_8 = _s_0["pending"];
      const _used_8 = _s_0["used_ids"];
      const _seconds_8 = _s_0["usage_seconds"];
      const _finalized_8 = _s_0["finalized"];
      return {$: "Done", "value": {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closing"}, "session_id": _id_8, "delegations": _ds_8, "pending": _ps_8, "used_ids": _used_8, "usage_seconds": _seconds_8, "finalized": _finalized_8}};
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else {
    const _audio_0 = _command_0["pcm16_base64"];
    const _t_5 = _s_0["phase"];
    if (_t_5.$ === "../../ai/bend/voice.Ready") {
      const _id_10 = _s_0["session_id"];
      const _ds_10 = _s_0["delegations"];
      const _ps_10 = _s_0["pending"];
      const _used_10 = _s_0["used_ids"];
      const _seconds_10 = _s_0["usage_seconds"];
      const _finalized_10 = _s_0["finalized"];
      return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$pcm16_frame$(_audio_0)), {$: "Done", "value": {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_10, "delegations": _ds_10, "pending": _ps_10, "used_ids": _used_10, "usage_seconds": _seconds_10, "finalized": _finalized_10}}, {$: "Fail", "error": "invalid_pcm16"});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$live_ack_reduce$(_event_0, _s_0) {
  const _phase_0 = _s_0["phase"];
  const _id_0 = _s_0["session_id"];
  const _ds_0 = _s_0["delegations"];
  const _ps_0 = _s_0["pending"];
  const _used_0 = _s_0["used_ids"];
  const _seconds_0 = _s_0["usage_seconds"];
  const _finalized_0 = _s_0["finalized"];
  return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$has_ack$(_event_0, _ps_0)), {$: "../../ai/bend/voice.LiveState", "phase": _phase_0, "session_id": _id_0, "delegations": _ds_0, "pending": ($$$$047$$$047ai$047bend$047voice$remove_ack$(_event_0, _ps_0)), "used_ids": _used_0, "usage_seconds": _seconds_0, "finalized": _finalized_0}, ($$$$047$$$047ai$047bend$047voice$live_break$("ack_mismatch", {$: "../../ai/bend/voice.LiveState", "phase": _phase_0, "session_id": _id_0, "delegations": _ds_0, "pending": _ps_0, "used_ids": _used_0, "usage_seconds": _seconds_0, "finalized": _finalized_0})));
}

function $$$$047$$$047ai$047bend$047voice$valid_usage$(_seconds_0, _previous_0) {
  const _x_0 = Math.fround(_seconds_0 - _seconds_0);
  return $Bool$and$(($Bool$and$((_seconds_0 >= _previous_0), (_seconds_0 >= 0))), (_x_0 === 0));
}

function $$$$047$$$047ai$047bend$047voice$remove_pending_go$($0, $1, $2) {
  for (;;) {
    {
      const _key_0 = $0;
      const _pending_0 = $1;
      const _acc_0 = $2;
      if (_pending_0.$ === "Nil") {
        return $List$reverse$(_acc_0);
      } else {
        const _p_0 = _pending_0["head"];
        const _tail_0 = _pending_0["tail"];
        $0 = _key_0;
        $1 = _tail_0;
        $2 = ($Bool$pick$(($String$eq$(_key_0, ($$$$047$$$047ai$047bend$047voice$pending_id$(_p_0)))), _acc_0, {$: "Con", "head": _p_0, "tail": _acc_0}));
        continue;
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$remove_pending$(_key_0, _pending_0) {
  return $$$$047$$$047ai$047bend$047voice$remove_pending_go$(_key_0, _pending_0, {$: "Nil"});
}

function $$$$047$$$047ai$047bend$047voice$error_pending$(_command_0, _pending_0) {
  if (_command_0.$ === "Some") {
    const _id_0 = _command_0["value"];
    return $$$$047$$$047ai$047bend$047voice$remove_pending$(_id_0, _pending_0);
  } else {
    return _pending_0;
  }
}

function $$$$047$$$047ai$047bend$047voice$live_reduce$(_event_0, _s_0) {
  if (_event_0.$ === "../../ai/bend/voice.Started") {
    const _session_0 = _event_0["session_id"];
    const _t_0 = _s_0["phase"];
    if (_t_0.$ === "../../ai/bend/voice.Closed") {
      const _id_0 = _s_0["session_id"];
      const _ds_0 = _s_0["delegations"];
      const _ps_0 = _s_0["pending"];
      const _used_0 = _s_0["used_ids"];
      const _seconds_0 = _s_0["usage_seconds"];
      const _finalized_0 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_0, "delegations": _ds_0, "pending": _ps_0, "used_ids": _used_0, "usage_seconds": _seconds_0, "finalized": _finalized_0};
    } else if (_t_0.$ === "../../ai/bend/voice.Broken") {
      const _code_0 = _t_0["code"];
      const _id_1 = _s_0["session_id"];
      const _ds_1 = _s_0["delegations"];
      const _ps_1 = _s_0["pending"];
      const _used_1 = _s_0["used_ids"];
      const _seconds_1 = _s_0["usage_seconds"];
      const _finalized_1 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_0}, "session_id": _id_1, "delegations": _ds_1, "pending": _ps_1, "used_ids": _used_1, "usage_seconds": _seconds_1, "finalized": _finalized_1};
    } else if (_t_0.$ === "../../ai/bend/voice.Connecting") {
      const _id_2 = _s_0["session_id"];
      const _ds_2 = _s_0["delegations"];
      const _ps_2 = _s_0["pending"];
      const _used_2 = _s_0["used_ids"];
      const _seconds_2 = _s_0["usage_seconds"];
      const _finalized_2 = _s_0["finalized"];
      return $Bool$pick$(($String$eq$(_session_0, "")), ($$$$047$$$047ai$047bend$047voice$live_break$("session_identity", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_2, "delegations": _ds_2, "pending": _ps_2, "used_ids": _used_2, "usage_seconds": _seconds_2, "finalized": _finalized_2})), {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _session_0, "delegations": _ds_2, "pending": _ps_2, "used_ids": _used_2, "usage_seconds": _seconds_2, "finalized": _finalized_2});
    } else {
      const _id_3 = _s_0["session_id"];
      const _ds_3 = _s_0["delegations"];
      const _ps_3 = _s_0["pending"];
      const _used_3 = _s_0["used_ids"];
      const _seconds_3 = _s_0["usage_seconds"];
      const _finalized_3 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("session_identity", {$: "../../ai/bend/voice.LiveState", "phase": _t_0, "session_id": _id_3, "delegations": _ds_3, "pending": _ps_3, "used_ids": _used_3, "usage_seconds": _seconds_3, "finalized": _finalized_3});
    }
  } else if (_event_0.$ === "../../ai/bend/voice.LiveProviderError") {
    const _code_1 = _event_0["code"];
    const _command_0 = _event_0["client_event_id"];
    const _t_1 = _s_0["phase"];
    if (_t_1.$ === "../../ai/bend/voice.Closed") {
      const _id_4 = _s_0["session_id"];
      const _ds_4 = _s_0["delegations"];
      const _ps_4 = _s_0["pending"];
      const _used_4 = _s_0["used_ids"];
      const _seconds_4 = _s_0["usage_seconds"];
      const _finalized_4 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_4, "delegations": _ds_4, "pending": _ps_4, "used_ids": _used_4, "usage_seconds": _seconds_4, "finalized": _finalized_4};
    } else if (_t_1.$ === "../../ai/bend/voice.Broken") {
      const _code_2 = _t_1["code"];
      const _id_5 = _s_0["session_id"];
      const _ds_5 = _s_0["delegations"];
      const _ps_5 = _s_0["pending"];
      const _used_5 = _s_0["used_ids"];
      const _seconds_5 = _s_0["usage_seconds"];
      const _finalized_5 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_2}, "session_id": _id_5, "delegations": _ds_5, "pending": _ps_5, "used_ids": _used_5, "usage_seconds": _seconds_5, "finalized": _finalized_5};
    } else if (_t_1.$ === "../../ai/bend/voice.Connecting") {
      const _id_6 = _s_0["session_id"];
      const _ds_6 = _s_0["delegations"];
      const _ps_6 = _s_0["pending"];
      const _used_6 = _s_0["used_ids"];
      const _seconds_6 = _s_0["usage_seconds"];
      const _finalized_6 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$(_code_1, {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_6, "delegations": _ds_6, "pending": _ps_6, "used_ids": _used_6, "usage_seconds": _seconds_6, "finalized": _finalized_6});
    } else {
      const _id_7 = _s_0["session_id"];
      const _ds_7 = _s_0["delegations"];
      const _ps_7 = _s_0["pending"];
      const _used_7 = _s_0["used_ids"];
      const _seconds_7 = _s_0["usage_seconds"];
      const _finalized_7 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": _t_1, "session_id": _id_7, "delegations": _ds_7, "pending": ($$$$047$$$047ai$047bend$047voice$error_pending$(_command_0, _ps_7)), "used_ids": _used_7, "usage_seconds": _seconds_7, "finalized": _finalized_7};
    }
  } else if (_event_0.$ === "../../ai/bend/voice.Updated") {
    const _session_1 = _event_0["session_id"];
    const _t_2 = _s_0["phase"];
    if (_t_2.$ === "../../ai/bend/voice.Closed") {
      const _id_8 = _s_0["session_id"];
      const _ds_8 = _s_0["delegations"];
      const _ps_8 = _s_0["pending"];
      const _used_8 = _s_0["used_ids"];
      const _seconds_8 = _s_0["usage_seconds"];
      const _finalized_8 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_8, "delegations": _ds_8, "pending": _ps_8, "used_ids": _used_8, "usage_seconds": _seconds_8, "finalized": _finalized_8};
    } else if (_t_2.$ === "../../ai/bend/voice.Broken") {
      const _code_3 = _t_2["code"];
      const _id_9 = _s_0["session_id"];
      const _ds_9 = _s_0["delegations"];
      const _ps_9 = _s_0["pending"];
      const _used_9 = _s_0["used_ids"];
      const _seconds_9 = _s_0["usage_seconds"];
      const _finalized_9 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_3}, "session_id": _id_9, "delegations": _ds_9, "pending": _ps_9, "used_ids": _used_9, "usage_seconds": _seconds_9, "finalized": _finalized_9};
    } else if (_t_2.$ === "../../ai/bend/voice.Connecting") {
      const _id_10 = _s_0["session_id"];
      const _ds_10 = _s_0["delegations"];
      const _ps_10 = _s_0["pending"];
      const _used_10 = _s_0["used_ids"];
      const _seconds_10 = _s_0["usage_seconds"];
      const _finalized_10 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_10, "delegations": _ds_10, "pending": _ps_10, "used_ids": _used_10, "usage_seconds": _seconds_10, "finalized": _finalized_10});
    } else {
      const _id_11 = _s_0["session_id"];
      const _ds_11 = _s_0["delegations"];
      const _ps_11 = _s_0["pending"];
      const _used_11 = _s_0["used_ids"];
      const _seconds_11 = _s_0["usage_seconds"];
      const _finalized_11 = _s_0["finalized"];
      return $Bool$pick$(($String$eq$(_session_1, _id_11)), {$: "../../ai/bend/voice.LiveState", "phase": _t_2, "session_id": _id_11, "delegations": _ds_11, "pending": _ps_11, "used_ids": _used_11, "usage_seconds": _seconds_11, "finalized": _finalized_11}, ($$$$047$$$047ai$047bend$047voice$live_break$("session_identity", {$: "../../ai/bend/voice.LiveState", "phase": _t_2, "session_id": _id_11, "delegations": _ds_11, "pending": _ps_11, "used_ids": _used_11, "usage_seconds": _seconds_11, "finalized": _finalized_11})));
    }
  } else if (_event_0.$ === "../../ai/bend/voice.Delegated") {
    const _delegation_0 = _event_0["delegation_id"];
    const _t_3 = _s_0["phase"];
    if (_t_3.$ === "../../ai/bend/voice.Closed") {
      const _id_12 = _s_0["session_id"];
      const _ds_12 = _s_0["delegations"];
      const _ps_12 = _s_0["pending"];
      const _used_12 = _s_0["used_ids"];
      const _seconds_12 = _s_0["usage_seconds"];
      const _finalized_12 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_12, "delegations": _ds_12, "pending": _ps_12, "used_ids": _used_12, "usage_seconds": _seconds_12, "finalized": _finalized_12};
    } else if (_t_3.$ === "../../ai/bend/voice.Broken") {
      const _code_4 = _t_3["code"];
      const _id_13 = _s_0["session_id"];
      const _ds_13 = _s_0["delegations"];
      const _ps_13 = _s_0["pending"];
      const _used_13 = _s_0["used_ids"];
      const _seconds_13 = _s_0["usage_seconds"];
      const _finalized_13 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_4}, "session_id": _id_13, "delegations": _ds_13, "pending": _ps_13, "used_ids": _used_13, "usage_seconds": _seconds_13, "finalized": _finalized_13};
    } else if (_t_3.$ === "../../ai/bend/voice.Connecting") {
      const _id_14 = _s_0["session_id"];
      const _ds_14 = _s_0["delegations"];
      const _ps_14 = _s_0["pending"];
      const _used_14 = _s_0["used_ids"];
      const _seconds_14 = _s_0["usage_seconds"];
      const _finalized_14 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_14, "delegations": _ds_14, "pending": _ps_14, "used_ids": _used_14, "usage_seconds": _seconds_14, "finalized": _finalized_14});
    } else {
      const _id_15 = _s_0["session_id"];
      const _ds_15 = _s_0["delegations"];
      const _ps_15 = _s_0["pending"];
      const _used_15 = _s_0["used_ids"];
      const _seconds_15 = _s_0["usage_seconds"];
      const _finalized_15 = _s_0["finalized"];
      const _x_0 = ($String$eq$(_delegation_0, ""));
      const _x_1 = ($$$$047$$$047ai$047bend$047voice$contains$(_ds_15, _delegation_0));
      const _x_2 = ($List$length$(_ds_15));
      const _x_3 = (_x_2 >>> 0);
      const _x_4 = (_x_0 || _x_1);
      const _x_5 = (_x_3 >= 128);
      return $Bool$pick$((_x_4 || _x_5), ($$$$047$$$047ai$047bend$047voice$live_break$("delegation_identity", {$: "../../ai/bend/voice.LiveState", "phase": _t_3, "session_id": _id_15, "delegations": _ds_15, "pending": _ps_15, "used_ids": _used_15, "usage_seconds": _seconds_15, "finalized": _finalized_15})), {$: "../../ai/bend/voice.LiveState", "phase": _t_3, "session_id": _id_15, "delegations": {$: "Con", "head": _delegation_0, "tail": _ds_15}, "pending": _ps_15, "used_ids": _used_15, "usage_seconds": _seconds_15, "finalized": _finalized_15});
    }
  } else if (_event_0.$ === "../../ai/bend/voice.ContextAccepted") {
    const _id_16 = _event_0["client_event_id"];
    const _kind_0 = _event_0["kind"];
    const _t_4 = _s_0["phase"];
    if (_t_4.$ === "../../ai/bend/voice.Closed") {
      const _id_17 = _s_0["session_id"];
      const _ds_16 = _s_0["delegations"];
      const _ps_16 = _s_0["pending"];
      const _used_16 = _s_0["used_ids"];
      const _seconds_16 = _s_0["usage_seconds"];
      const _finalized_16 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_17, "delegations": _ds_16, "pending": _ps_16, "used_ids": _used_16, "usage_seconds": _seconds_16, "finalized": _finalized_16};
    } else if (_t_4.$ === "../../ai/bend/voice.Broken") {
      const _code_5 = _t_4["code"];
      const _id_18 = _s_0["session_id"];
      const _ds_17 = _s_0["delegations"];
      const _ps_17 = _s_0["pending"];
      const _used_17 = _s_0["used_ids"];
      const _seconds_17 = _s_0["usage_seconds"];
      const _finalized_17 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_5}, "session_id": _id_18, "delegations": _ds_17, "pending": _ps_17, "used_ids": _used_17, "usage_seconds": _seconds_17, "finalized": _finalized_17};
    } else if (_t_4.$ === "../../ai/bend/voice.Connecting") {
      const _id_19 = _s_0["session_id"];
      const _ds_18 = _s_0["delegations"];
      const _ps_18 = _s_0["pending"];
      const _used_18 = _s_0["used_ids"];
      const _seconds_18 = _s_0["usage_seconds"];
      const _finalized_18 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_19, "delegations": _ds_18, "pending": _ps_18, "used_ids": _used_18, "usage_seconds": _seconds_18, "finalized": _finalized_18});
    } else {
      const _id_20 = _s_0["session_id"];
      const _ds_19 = _s_0["delegations"];
      const _ps_19 = _s_0["pending"];
      const _used_19 = _s_0["used_ids"];
      const _seconds_19 = _s_0["usage_seconds"];
      const _finalized_19 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_ack_reduce$({$: "../../ai/bend/voice.ContextAccepted", "client_event_id": _id_16, "kind": _kind_0}, {$: "../../ai/bend/voice.LiveState", "phase": _t_4, "session_id": _id_20, "delegations": _ds_19, "pending": _ps_19, "used_ids": _used_19, "usage_seconds": _seconds_19, "finalized": _finalized_19});
    }
  } else if (_event_0.$ === "../../ai/bend/voice.MuteAccepted") {
    const _id_21 = _event_0["client_event_id"];
    const _muted_0 = _event_0["muted"];
    const _t_5 = _s_0["phase"];
    if (_t_5.$ === "../../ai/bend/voice.Closed") {
      const _id_22 = _s_0["session_id"];
      const _ds_20 = _s_0["delegations"];
      const _ps_20 = _s_0["pending"];
      const _used_20 = _s_0["used_ids"];
      const _seconds_20 = _s_0["usage_seconds"];
      const _finalized_20 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_22, "delegations": _ds_20, "pending": _ps_20, "used_ids": _used_20, "usage_seconds": _seconds_20, "finalized": _finalized_20};
    } else if (_t_5.$ === "../../ai/bend/voice.Broken") {
      const _code_6 = _t_5["code"];
      const _id_23 = _s_0["session_id"];
      const _ds_21 = _s_0["delegations"];
      const _ps_21 = _s_0["pending"];
      const _used_21 = _s_0["used_ids"];
      const _seconds_21 = _s_0["usage_seconds"];
      const _finalized_21 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_6}, "session_id": _id_23, "delegations": _ds_21, "pending": _ps_21, "used_ids": _used_21, "usage_seconds": _seconds_21, "finalized": _finalized_21};
    } else if (_t_5.$ === "../../ai/bend/voice.Connecting") {
      const _id_24 = _s_0["session_id"];
      const _ds_22 = _s_0["delegations"];
      const _ps_22 = _s_0["pending"];
      const _used_22 = _s_0["used_ids"];
      const _seconds_22 = _s_0["usage_seconds"];
      const _finalized_22 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_24, "delegations": _ds_22, "pending": _ps_22, "used_ids": _used_22, "usage_seconds": _seconds_22, "finalized": _finalized_22});
    } else {
      const _id_25 = _s_0["session_id"];
      const _ds_23 = _s_0["delegations"];
      const _ps_23 = _s_0["pending"];
      const _used_23 = _s_0["used_ids"];
      const _seconds_23 = _s_0["usage_seconds"];
      const _finalized_23 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_ack_reduce$({$: "../../ai/bend/voice.MuteAccepted", "client_event_id": _id_21, "muted": _muted_0}, {$: "../../ai/bend/voice.LiveState", "phase": _t_5, "session_id": _id_25, "delegations": _ds_23, "pending": _ps_23, "used_ids": _used_23, "usage_seconds": _seconds_23, "finalized": _finalized_23});
    }
  } else if (_event_0.$ === "../../ai/bend/voice.UsageUpdated") {
    const _next_0 = _event_0["seconds"];
    const _t_6 = _s_0["phase"];
    if (_t_6.$ === "../../ai/bend/voice.Closed") {
      const _id_26 = _s_0["session_id"];
      const _ds_24 = _s_0["delegations"];
      const _ps_24 = _s_0["pending"];
      const _used_24 = _s_0["used_ids"];
      const _seconds_24 = _s_0["usage_seconds"];
      const _finalized_24 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_26, "delegations": _ds_24, "pending": _ps_24, "used_ids": _used_24, "usage_seconds": _seconds_24, "finalized": _finalized_24};
    } else if (_t_6.$ === "../../ai/bend/voice.Broken") {
      const _code_7 = _t_6["code"];
      const _id_27 = _s_0["session_id"];
      const _ds_25 = _s_0["delegations"];
      const _ps_25 = _s_0["pending"];
      const _used_25 = _s_0["used_ids"];
      const _seconds_25 = _s_0["usage_seconds"];
      const _finalized_25 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_7}, "session_id": _id_27, "delegations": _ds_25, "pending": _ps_25, "used_ids": _used_25, "usage_seconds": _seconds_25, "finalized": _finalized_25};
    } else if (_t_6.$ === "../../ai/bend/voice.Connecting") {
      const _id_28 = _s_0["session_id"];
      const _ds_26 = _s_0["delegations"];
      const _ps_26 = _s_0["pending"];
      const _used_26 = _s_0["used_ids"];
      const _seconds_26 = _s_0["usage_seconds"];
      const _finalized_26 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_28, "delegations": _ds_26, "pending": _ps_26, "used_ids": _used_26, "usage_seconds": _seconds_26, "finalized": _finalized_26});
    } else {
      const _id_29 = _s_0["session_id"];
      const _ds_27 = _s_0["delegations"];
      const _ps_27 = _s_0["pending"];
      const _used_27 = _s_0["used_ids"];
      const _seconds_27 = _s_0["usage_seconds"];
      const _finalized_27 = _s_0["finalized"];
      return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$valid_usage$(_next_0, _seconds_27)), {$: "../../ai/bend/voice.LiveState", "phase": _t_6, "session_id": _id_29, "delegations": _ds_27, "pending": _ps_27, "used_ids": _used_27, "usage_seconds": _next_0, "finalized": _finalized_27}, ($$$$047$$$047ai$047bend$047voice$live_break$("usage_regression", {$: "../../ai/bend/voice.LiveState", "phase": _t_6, "session_id": _id_29, "delegations": _ds_27, "pending": _ps_27, "used_ids": _used_27, "usage_seconds": _seconds_27, "finalized": _finalized_27})));
    }
  } else if (_event_0.$ === "../../ai/bend/voice.SessionClosed") {
    const _session_2 = _event_0["session_id"];
    const _next_1 = _event_0["seconds"];
    const _t_7 = _s_0["phase"];
    if (_t_7.$ === "../../ai/bend/voice.Closed") {
      const _id_30 = _s_0["session_id"];
      const _ds_28 = _s_0["delegations"];
      const _ps_28 = _s_0["pending"];
      const _used_28 = _s_0["used_ids"];
      const _seconds_28 = _s_0["usage_seconds"];
      const _finalized_28 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_30, "delegations": _ds_28, "pending": _ps_28, "used_ids": _used_28, "usage_seconds": _seconds_28, "finalized": _finalized_28};
    } else if (_t_7.$ === "../../ai/bend/voice.Broken") {
      const _code_8 = _t_7["code"];
      const _id_31 = _s_0["session_id"];
      const _ds_29 = _s_0["delegations"];
      const _ps_29 = _s_0["pending"];
      const _used_29 = _s_0["used_ids"];
      const _seconds_29 = _s_0["usage_seconds"];
      const _finalized_29 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_8}, "session_id": _id_31, "delegations": _ds_29, "pending": _ps_29, "used_ids": _used_29, "usage_seconds": _seconds_29, "finalized": _finalized_29};
    } else if (_t_7.$ === "../../ai/bend/voice.Connecting") {
      const _id_32 = _s_0["session_id"];
      const _ds_30 = _s_0["delegations"];
      const _ps_30 = _s_0["pending"];
      const _used_30 = _s_0["used_ids"];
      const _seconds_30 = _s_0["usage_seconds"];
      const _finalized_30 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_32, "delegations": _ds_30, "pending": _ps_30, "used_ids": _used_30, "usage_seconds": _seconds_30, "finalized": _finalized_30});
    } else {
      const _id_33 = _s_0["session_id"];
      const _ds_31 = _s_0["delegations"];
      const _ps_31 = _s_0["pending"];
      const _used_31 = _s_0["used_ids"];
      const _seconds_31 = _s_0["usage_seconds"];
      const _finalized_31 = _s_0["finalized"];
      return $Bool$pick$(($Bool$and$(($String$eq$(($Maybe$default$(_session_2, _id_33)), _id_33)), ($$$$047$$$047ai$047bend$047voice$valid_usage$(_next_1, _seconds_31)))), {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_33, "delegations": _ds_31, "pending": {$: "Nil"}, "used_ids": _used_31, "usage_seconds": _next_1, "finalized": true}, ($$$$047$$$047ai$047bend$047voice$live_break$("final_usage", {$: "../../ai/bend/voice.LiveState", "phase": _t_7, "session_id": _id_33, "delegations": _ds_31, "pending": _ps_31, "used_ids": _used_31, "usage_seconds": _seconds_31, "finalized": _finalized_31})));
    }
  } else {
    const _t_8 = _s_0["phase"];
    if (_t_8.$ === "../../ai/bend/voice.Closed") {
      const _id_34 = _s_0["session_id"];
      const _ds_32 = _s_0["delegations"];
      const _ps_32 = _s_0["pending"];
      const _used_32 = _s_0["used_ids"];
      const _seconds_32 = _s_0["usage_seconds"];
      const _finalized_32 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_34, "delegations": _ds_32, "pending": _ps_32, "used_ids": _used_32, "usage_seconds": _seconds_32, "finalized": _finalized_32};
    } else if (_t_8.$ === "../../ai/bend/voice.Broken") {
      const _code_9 = _t_8["code"];
      const _id_35 = _s_0["session_id"];
      const _ds_33 = _s_0["delegations"];
      const _ps_33 = _s_0["pending"];
      const _used_33 = _s_0["used_ids"];
      const _seconds_33 = _s_0["usage_seconds"];
      const _finalized_33 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_9}, "session_id": _id_35, "delegations": _ds_33, "pending": _ps_33, "used_ids": _used_33, "usage_seconds": _seconds_33, "finalized": _finalized_33};
    } else if (_t_8.$ === "../../ai/bend/voice.Connecting") {
      const _id_36 = _s_0["session_id"];
      const _ds_34 = _s_0["delegations"];
      const _ps_34 = _s_0["pending"];
      const _used_34 = _s_0["used_ids"];
      const _seconds_34 = _s_0["usage_seconds"];
      const _finalized_34 = _s_0["finalized"];
      return $$$$047$$$047ai$047bend$047voice$live_break$("before_ready", {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Connecting"}, "session_id": _id_36, "delegations": _ds_34, "pending": _ps_34, "used_ids": _used_34, "usage_seconds": _seconds_34, "finalized": _finalized_34});
    } else {
      const _id_37 = _s_0["session_id"];
      const _ds_35 = _s_0["delegations"];
      const _ps_35 = _s_0["pending"];
      const _used_35 = _s_0["used_ids"];
      const _seconds_35 = _s_0["usage_seconds"];
      const _finalized_35 = _s_0["finalized"];
      return {$: "../../ai/bend/voice.LiveState", "phase": _t_8, "session_id": _id_37, "delegations": _ds_35, "pending": _ps_35, "used_ids": _used_35, "usage_seconds": _seconds_35, "finalized": _finalized_35};
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$live_abort$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "../../ai/bend/voice.Closed") {
    const _id_0 = _s_0["session_id"];
    const _ds_0 = _s_0["delegations"];
    const _ps_0 = _s_0["pending"];
    const _used_0 = _s_0["used_ids"];
    const _seconds_0 = _s_0["usage_seconds"];
    const _finalized_0 = _s_0["finalized"];
    return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_0, "delegations": _ds_0, "pending": _ps_0, "used_ids": _used_0, "usage_seconds": _seconds_0, "finalized": _finalized_0};
  } else if (_t_0.$ === "../../ai/bend/voice.Broken") {
    const _code_0 = _t_0["code"];
    const _id_1 = _s_0["session_id"];
    const _ds_1 = _s_0["delegations"];
    const _ps_1 = _s_0["pending"];
    const _used_1 = _s_0["used_ids"];
    const _seconds_1 = _s_0["usage_seconds"];
    const _finalized_1 = _s_0["finalized"];
    return {$: "../../ai/bend/voice.LiveState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_0}, "session_id": _id_1, "delegations": _ds_1, "pending": _ps_1, "used_ids": _used_1, "usage_seconds": _seconds_1, "finalized": _finalized_1};
  } else {
    const _id_2 = _s_0["session_id"];
    const _ds_2 = _s_0["delegations"];
    const _ps_2 = _s_0["pending"];
    const _used_2 = _s_0["used_ids"];
    const _seconds_2 = _s_0["usage_seconds"];
    const _finalized_2 = _s_0["finalized"];
    return $$$$047$$$047ai$047bend$047voice$live_break$("aborted_without_final_usage", {$: "../../ai/bend/voice.LiveState", "phase": _t_0, "session_id": _id_2, "delegations": _ds_2, "pending": _ps_2, "used_ids": _used_2, "usage_seconds": _seconds_2, "finalized": _finalized_2});
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_close$(_s_0) {
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "../../ai/bend/voice.Broken") {
    const _code_0 = _t_0["code"];
    const _id_0 = _s_0["session_id"];
    const _active_0 = _s_0["active_responses"];
    return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Broken", "code": _code_0}, "session_id": _id_0, "active_responses": _active_0};
  } else if (_t_0.$ === "../../ai/bend/voice.Closed") {
    const _id_1 = _s_0["session_id"];
    const _active_1 = _s_0["active_responses"];
    return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_1, "active_responses": _active_1};
  } else {
    const _id_2 = _s_0["session_id"];
    return {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Closed"}, "session_id": _id_2, "active_responses": {$: "Nil"}};
  }
}

function $$$$047$$$047ai$047bend$047voice$realtime_prepare$(_command_0, _s_0) {
  if (_command_0.$ === "../../ai/bend/voice.AppendAudio") {
    const _audio_0 = _command_0["pcm16_base64"];
    const _t_0 = _s_0["phase"];
    if (_t_0.$ === "../../ai/bend/voice.Ready") {
      const _id_0 = _s_0["session_id"];
      const _active_0 = _s_0["active_responses"];
      return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$pcm16_frame$(_audio_0)), {$: "Done", "value": {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_0, "active_responses": _active_0}}, {$: "Fail", "error": "invalid_pcm16"});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.CancelResponse") {
    const _response_0 = _command_0["response_id"];
    const _t_1 = _s_0["phase"];
    if (_t_1.$ === "../../ai/bend/voice.Ready") {
      const _id_2 = _s_0["session_id"];
      const _active_2 = _s_0["active_responses"];
      return $Bool$pick$(($$$$047$$$047ai$047bend$047voice$contains$(_active_2, _response_0)), {$: "Done", "value": {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_2, "active_responses": _active_2}}, {$: "Fail", "error": "unknown_response"});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else if (_command_0.$ === "../../ai/bend/voice.Configure") {
    const _t_2 = _command_0["config"];
    const _voice_0 = _t_2["voice"];
    const _model_0 = _t_2["transcription_model"];
    const _t_3 = _s_0["phase"];
    if (_t_3.$ === "../../ai/bend/voice.Ready") {
      const _id_4 = _s_0["session_id"];
      const _active_4 = _s_0["active_responses"];
      return $Bool$pick$(($Bool$and$(($Bool$not$(($String$eq$(_voice_0, "")))), ($Bool$not$(($String$eq$(_model_0, "")))))), {$: "Done", "value": {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_4, "active_responses": _active_4}}, {$: "Fail", "error": "configuration"});
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  } else {
    const _t_4 = _s_0["phase"];
    if (_t_4.$ === "../../ai/bend/voice.Ready") {
      const _id_6 = _s_0["session_id"];
      const _active_6 = _s_0["active_responses"];
      return {$: "Done", "value": {$: "../../ai/bend/voice.RealtimeState", "phase": {$: "../../ai/bend/voice.Ready"}, "session_id": _id_6, "active_responses": _active_6}};
    } else {
      return {$: "Fail", "error": "not_ready"};
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$context_receipt$($0, $1) {
  for (;;) {
    {
      const _event_0 = $0;
      const _pending_0 = $1;
      if (_event_0.$ === "../../ai/bend/voice.ContextAccepted") {
        const _ack_id_0 = _event_0["client_event_id"];
        const _ack_kind_0 = _event_0["kind"];
        if (_pending_0.$ === "Nil") {
          return {$: "None"};
        } else {
          const _t_0 = _pending_0["head"];
          if (_t_0.$ === "../../ai/bend/voice.PendingContext") {
            const _id_0 = _t_0["event_id"];
            const _delegation_0 = _t_0["delegation_id"];
            const _kind_0 = _t_0["kind"];
            const _tail_0 = _pending_0["tail"];
            return $Bool$pick$(($Bool$and$(($String$eq$(_ack_id_0, _id_0)), ($$$$047$$$047ai$047bend$047voice$context_eq$(_ack_kind_0, _kind_0)))), {$: "Some", "value": {$: "../../ai/bend/voice.ContextReceipt", "event_id": _id_0, "delegation_id": _delegation_0, "kind": _kind_0}}, ($$$$047$$$047ai$047bend$047voice$context_receipt$({$: "../../ai/bend/voice.ContextAccepted", "client_event_id": _ack_id_0, "kind": _ack_kind_0}, _tail_0)));
          } else {
            const _tail_1 = _pending_0["tail"];
            $0 = {$: "../../ai/bend/voice.ContextAccepted", "client_event_id": _ack_id_0, "kind": _ack_kind_0};
            $1 = _tail_1;
            continue;
          }
        }
      } else {
        if (_pending_0.$ === "Nil") {
          return {$: "None"};
        } else {
          const _tail_2 = _pending_0["tail"];
          $0 = _event_0;
          $1 = _tail_2;
          continue;
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047voice$live_receipt$(_event_0, _state_0) {
  const _pending_0 = _state_0["pending"];
  return $$$$047$$$047ai$047bend$047voice$context_receipt$(_event_0, _pending_0);
}

function $realtime_history$(_event_0, _id_0, _session_0, _history_0) {
  if (_event_0.$ === "../../ai/bend/voice.InputTranscript") {
    const _text_0 = _event_0["text"];
    return $session$history_record$(_session_0, {$: "session.Message", "id": _id_0, "role": {$: "session.UserMessage"}, "source": {$: "session.CallMessage"}, "text": _text_0, "status": {$: "session.UserRecorded"}}, _history_0);
  } else if (_event_0.$ === "../../ai/bend/voice.OutputTranscript") {
    const _text_1 = _event_0["text"];
    return $session$history_record$(_session_0, {$: "session.Message", "id": _id_0, "role": {$: "session.AssistantMessage"}, "source": {$: "session.CallMessage"}, "text": _text_1, "status": {$: "session.CompleteMessage"}}, _history_0);
  } else {
    return _history_0;
  }
}

function $live_fragment$(_event_0, _id_0) {
  if (_event_0.$ === "../../ai/bend/voice.InputFragment") {
    const _text_0 = _event_0["text"];
    const _start_0 = _event_0["start_ms"];
    const _end_0 = _event_0["end_ms"];
    return {$: "Some", "value": {$: "Fragment", "message": {$: "session.Message", "id": _id_0, "role": {$: "session.UserMessage"}, "source": {$: "session.CallMessage"}, "text": _text_0, "status": {$: "session.FragmentMessage"}}, "start_ms": _start_0, "end_ms": _end_0}};
  } else if (_event_0.$ === "../../ai/bend/voice.OutputFragment") {
    const _text_1 = _event_0["text"];
    const _start_1 = _event_0["start_ms"];
    const _end_1 = _event_0["end_ms"];
    return {$: "Some", "value": {$: "Fragment", "message": {$: "session.Message", "id": _id_0, "role": {$: "session.AssistantMessage"}, "source": {$: "session.CallMessage"}, "text": _text_1, "status": {$: "session.FragmentMessage"}}, "start_ms": _start_1, "end_ms": _end_1}};
  } else {
    return {$: "None"};
  }
}

function $fragment_history$(_fragment_0, _session_0, _history_0) {
  if (_fragment_0.$ === "Some") {
    const _t_0 = _fragment_0["value"];
    const _message_0 = _t_0["message"];
    const _start_0 = _t_0["start_ms"];
    const _end_0 = _t_0["end_ms"];
    return $Bool$pick$((_start_0 <= _end_0), ($session$history_record$(_session_0, _message_0, _history_0)), _history_0);
  } else {
    return _history_0;
  }
}

function $live_history$(_event_0, _id_0, _session_0, _history_0) {
  if (_event_0.$ === "../../ai/bend/voice.Delegated") {
    const _delegation_0 = _event_0["delegation_id"];
    return $Bool$pick$(($session$call_record_permitted$(_session_0)), ($session$history_task$({$: "session.Task", "id": _id_0, "title": ("Live delegation " + _delegation_0), "status": {$: "session.TaskReady"}, "approval": {$: "session.AwaitingApproval"}, "result": "", "error": ""}, _history_0)), _history_0);
  } else {
    return $fragment_history$(($live_fragment$(_event_0, _id_0)), _session_0, _history_0);
  }
}

function $history_initial$() {
  return $session$history_initial$();
}

function $session_initial$() {
  return $session$initial$();
}

function $microphone_permission$(_allowed_0, _session_0) {
  return $session$update$(($Bool$pick$(_allowed_0, {$: "session.GrantMic"}, {$: "session.DenyMic"})), _session_0);
}

function $begin_call$(_session_0) {
  return $session$update$({$: "session.BeginCall"}, _session_0);
}

function $end_call$(_session_0) {
  return $session$update$({$: "session.EndCall"}, _session_0);
}

function $cancel_call$(_session_0) {
  return $session$update$({$: "session.Cancel"}, _session_0);
}

function $realtime_decoded$(_result_0, _id_0, _session_0, _history_0) {
  if (_result_0.$ === "Done") {
    const _event_0 = _result_0["value"];
    return {$: "Done", "value": ($realtime_history$(_event_0, _id_0, _session_0, _history_0))};
  } else {
    const _error_0 = _result_0["error"];
    return {$: "Fail", "error": _error_0};
  }
}

function $realtime_wire$(_wire_0, _id_0, _session_0, _history_0) {
  return $realtime_decoded$(($$$$047$$$047ai$047bend$047voice$realtime_decode$(_wire_0)), _id_0, _session_0, _history_0);
}

function $live_decoded$(_result_0, _id_0, _session_0, _history_0) {
  if (_result_0.$ === "Done") {
    const _event_0 = _result_0["value"];
    return {$: "Done", "value": ($live_history$(_event_0, _id_0, _session_0, _history_0))};
  } else {
    const _error_0 = _result_0["error"];
    return {$: "Fail", "error": _error_0};
  }
}

function $live_wire$(_wire_0, _id_0, _session_0, _history_0) {
  return $live_decoded$(($$$$047$$$047ai$047bend$047voice$live_decode$(_wire_0)), _id_0, _session_0, _history_0);
}

function $live_fragment_decoded$(_result_0, _id_0) {
  if (_result_0.$ === "Done") {
    const _event_0 = _result_0["value"];
    return {$: "Done", "value": ($live_fragment$(_event_0, _id_0))};
  } else {
    const _error_0 = _result_0["error"];
    return {$: "Fail", "error": _error_0};
  }
}

function $live_fragment_wire$(_wire_0, _id_0) {
  return $live_fragment_decoded$(($$$$047$$$047ai$047bend$047voice$live_decode$(_wire_0)), _id_0);
}

function $task_decision$(_id_0, _approved_0, _history_0) {
  return $session$history_task_event$(($Bool$pick$(_approved_0, {$: "session.ApproveTask"}, {$: "session.RejectTask"})), _id_0, _history_0);
}

function $task_start$(_id_0, _history_0) {
  return $session$history_task_event$({$: "session.StartTask"}, _id_0, _history_0);
}

function $task_result$(_id_0, _result_0, _history_0) {
  return $session$history_task_event$({$: "session.FinishTask", "result": _result_0}, _id_0, _history_0);
}

function $task_cancel$(_id_0, _history_0) {
  return $session$history_task_event$({$: "session.CancelTask"}, _id_0, _history_0);
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

function $Nat$is_ne$(_a_0, _b_0) {
  return $Bool$not$(($Cmp$is_eq$(cmp_new(_a_0, _b_0))));
}

function $Nat$is_eq$(_a_0, _b_0) {
  return $Cmp$is_eq$(cmp_new(_a_0, _b_0));
}

function $Nat$mod$(_a_0, _b_0) {
  return $Pair$snd$(nat_divmod(_a_0, _b_0));
}

function $Nat$div$(_a_0, _b_0) {
  return $Pair$fst$(nat_divmod(_a_0, _b_0));
}

function $Maybe$default$(_m_0, _d_0) {
  if (_m_0.$ === "None") {
    return _d_0;
  } else {
    const _x_0 = _m_0["value"];
    return _x_0;
  }
}

function $U32$show$(_a_0) {
  const _b_0 = _a_0;
  return $U32$show$if$(_b_0, (_b_0 === 0));
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

function $List$contains$1260$(_xs_0, _x_0) {
  if (_xs_0.$ === "Nil") {
    return false;
  } else {
    const _h_0 = _xs_0["head"];
    const _t_0 = _xs_0["tail"];
    const _x_1 = ($String$eq$(_h_0, _x_0));
    const _x_2 = ($List$contains$1260$(_t_0, _x_0));
    return (_x_1 || _x_2);
  }
}

function $List$length$(_xs_0) {
  if (_xs_0.$ === "Nil") {
    return 0;
  } else {
    const _t_0 = _xs_0["tail"];
    return nat_chk(($List$length$(_t_0)) + 1);
  }
}

function $Bool$not$(_b_0) {
  if (!_b_0) {
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

function $Pair$snd$(_p_0) {
  const _b_0 = _p_0["snd"];
  return _b_0;
}

function $Pair$fst$(_p_0) {
  const _a_0 = _p_0["fst"];
  return _a_0;
}

function $U32$show$if$(_a_0, _z_0) {
  if (_z_0) {
    return "0";
  } else {
    return $U32$show$go$(10, _a_0, "");
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

function $U32$show$go$($0, $1, $2, $3) {
  let $pc = 0;
  for (;;) switch ($pc) {
    case 0: {
      const _f_0 = $0;
      const _n_0 = $1;
      const _acc_0 = $2;
      if (_f_0 === 0) {
        return _acc_0;
      } else {
        const _g_0 = (_f_0 - 1);
        $0 = _g_0;
        $1 = _acc_0;
        $2 = _n_0;
        $3 = (_n_0 === 0);
        $pc = 1; continue;
      }
    }
    case 1: {
      const _g_0 = $0;
      const _acc_0 = $1;
      const _n_0 = $2;
      const _z_0 = $3;
      if (_z_0) {
        return _acc_0;
      } else {
        const _x_0 = (10 === 0 ? _n_0 : _n_0 % 10);
        $0 = _g_0;
        $1 = (10 === 0 ? 0 : (_n_0 / 10) >>> 0);
        $2 = (char_new(((48 + _x_0) >>> 0)) + _acc_0);
        $pc = 0; continue;
      }
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

function $U32$show$fin$($0, $1, $2, $3) {
  let $pc = 1;
  for (;;) switch ($pc) {
    case 0: {
      const _f_0 = $0;
      const _n_0 = $1;
      const _acc_0 = $2;
      if (_f_0 === 0) {
        return _acc_0;
      } else {
        const _g_0 = (_f_0 - 1);
        $0 = _g_0;
        $1 = _acc_0;
        $2 = _n_0;
        $3 = (_n_0 === 0);
        $pc = 1; continue;
      }
    }
    case 1: {
      const _g_0 = $0;
      const _acc_0 = $1;
      const _n_0 = $2;
      const _z_0 = $3;
      if (_z_0) {
        return _acc_0;
      } else {
        const _x_0 = (10 === 0 ? _n_0 : _n_0 % 10);
        $0 = _g_0;
        $1 = (10 === 0 ? 0 : (_n_0 / 10) >>> 0);
        $2 = (char_new(((48 + _x_0) >>> 0)) + _acc_0);
        $pc = 0; continue;
      }
    }
  }
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
  "../../ai/bend/voice.realtime_initial": run_lib(() => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_initial$()));  return r; }, 0),
  "../../ai/bend/voice.command_name": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$command_name$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.realtime_encode": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_encode$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.base64_char": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$base64_char$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.base64_scan": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$base64_scan$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.base64_finish": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$base64_finish$(nat_host(a0), (a1)))); BigInt(a0); (a1); return r; }, 2),
  "../../ai/bend/voice.pcm16_limited": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$pcm16_limited$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.pcm16_frame": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$pcm16_frame$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.text_value": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$text_value$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.text": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$text$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.child": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$child$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.number_value": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$number_value$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.number": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$number$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.integer_exact": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$integer_exact$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.integer_value": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$integer_value$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.integer": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$integer$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.status": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$status$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.rt_identity": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_identity$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.rt_pair": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_pair$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.rt_tokens": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_tokens$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.rt_usage": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_usage$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.rt_done": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_done$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.status_value": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$status_value$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.rt_error": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$rt_error$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_wire_kind": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_wire_kind$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.realtime_fields": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_fields$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.realtime_event": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_event$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_kind": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_kind$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_parsed": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_parsed$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.realtime_limited": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_limited$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_decode": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_decode$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.contains": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$contains$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.remove_go": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove_go$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.remove": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_response": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_response$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.realtime_reduce": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_reduce$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_initial": run_lib(() => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_initial$()));  return r; }, 0),
  "../../ai/bend/voice.context_name": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$context_name$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.optional_id": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$optional_id$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_encode": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_encode$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_identity": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_identity$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_delegation": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_delegation$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.live_audio": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_audio$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_fragment": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_fragment$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/voice.live_context_ack": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_context_ack$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_mute_ack": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_mute_ack$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_usage": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_usage$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_final": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_final$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.live_error": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_error$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.live_wire_kind": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_wire_kind$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_fields": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_fields$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.live_event": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_event$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_kind": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_kind$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_parsed": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_parsed$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_limited": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_limited$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_decode": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_decode$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.context_eq": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$context_eq$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.pending_id": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$pending_id$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.bool_eq": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$bool_eq$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.ack_matches": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$ack_matches$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.has_ack": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$has_ack$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.remove_ack_go": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove_ack_go$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.remove_ack": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove_ack$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_break": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_break$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_ready": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_ready$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.remember": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remember$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.delegation_valid": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$delegation_valid$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_config_valid": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_config_valid$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.live_prepare": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_prepare$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_ack_reduce": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_ack_reduce$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.valid_usage": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$valid_usage$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.remove_pending_go": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove_pending_go$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/voice.remove_pending": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$remove_pending$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.error_pending": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$error_pending$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_reduce": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_reduce$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_abort": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_abort$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.realtime_close": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_close$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/voice.realtime_prepare": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$realtime_prepare$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.context_receipt": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$context_receipt$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/voice.live_receipt": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047voice$live_receipt$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "realtime_history": run_lib((a0, a1, a2, a3) => { const r = (run_loop($realtime_history$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "live_fragment": run_lib((a0, a1) => { const r = (run_loop($live_fragment$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "fragment_history": run_lib((a0, a1, a2) => { const r = (run_loop($fragment_history$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "live_history": run_lib((a0, a1, a2, a3) => { const r = (run_loop($live_history$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "history_initial": run_lib(() => { const r = (run_loop($history_initial$()));  return r; }, 0),
  "session_initial": run_lib(() => { const r = (run_loop($session_initial$()));  return r; }, 0),
  "microphone_permission": run_lib((a0, a1) => { const r = (run_loop($microphone_permission$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "begin_call": run_lib((a0) => { const r = (run_loop($begin_call$((a0)))); (a0); return r; }, 1),
  "end_call": run_lib((a0) => { const r = (run_loop($end_call$((a0)))); (a0); return r; }, 1),
  "cancel_call": run_lib((a0) => { const r = (run_loop($cancel_call$((a0)))); (a0); return r; }, 1),
  "realtime_decoded": run_lib((a0, a1, a2, a3) => { const r = (run_loop($realtime_decoded$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "realtime_wire": run_lib((a0, a1, a2, a3) => { const r = (run_loop($realtime_wire$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "live_decoded": run_lib((a0, a1, a2, a3) => { const r = (run_loop($live_decoded$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "live_wire": run_lib((a0, a1, a2, a3) => { const r = (run_loop($live_wire$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "live_fragment_decoded": run_lib((a0, a1) => { const r = (run_loop($live_fragment_decoded$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "live_fragment_wire": run_lib((a0, a1) => { const r = (run_loop($live_fragment_wire$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "task_decision": run_lib((a0, a1, a2) => { const r = (run_loop($task_decision$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "task_start": run_lib((a0, a1) => { const r = (run_loop($task_start$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "task_result": run_lib((a0, a1, a2) => { const r = (run_loop($task_result$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "task_cancel": run_lib((a0, a1) => { const r = (run_loop($task_cancel$((a0), (a1)))); (a0); (a1); return r; }, 2),
};
