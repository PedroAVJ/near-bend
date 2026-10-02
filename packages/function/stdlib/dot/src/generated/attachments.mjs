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

function $$$$047$$$047ai$047bend$047transcription$mime$(_m_0) {
  if (_m_0.$ === "../../ai/bend/transcription.WebM") {
    return "audio/webm";
  } else if (_m_0.$ === "../../ai/bend/transcription.Ogg") {
    return "audio/ogg";
  } else if (_m_0.$ === "../../ai/bend/transcription.Wav") {
    return "audio/wav";
  } else if (_m_0.$ === "../../ai/bend/transcription.MP3") {
    return "audio/mpeg";
  } else if (_m_0.$ === "../../ai/bend/transcription.M4A") {
    return "audio/mp4";
  } else if (_m_0.$ === "../../ai/bend/transcription.Flac") {
    return "audio/flac";
  } else {
    return "audio/aac";
  }
}

function $$$$047$$$047ai$047bend$047transcription$granularity$(_g_0) {
  if (_g_0.$ === "../../ai/bend/transcription.NoTimestamps") {
    return "none";
  } else if (_g_0.$ === "../../ai/bend/transcription.WordTimestamps") {
    return "word";
  } else {
    return "character";
  }
}

function $$$$047$$$047ai$047bend$047transcription$file_format$(_f_0) {
  if (_f_0.$ === "../../ai/bend/transcription.EncodedAudio") {
    return "other";
  } else {
    return "pcm_s16le_16";
  }
}

function $$$$047$$$047ai$047bend$047transcription$boolean$(_b_0) {
  if (_b_0) {
    return "true";
  } else {
    return "false";
  }
}

function $$$$047$$$047ai$047bend$047transcription$optional_language$(_language_0) {
  if (_language_0.$ === "None") {
    return {$: "Nil"};
  } else {
    const _s_0 = _language_0["value"];
    return {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "language_code", "value": _s_0}, "tail": {$: "Nil"}};
  }
}

function $$$$047$$$047ai$047bend$047transcription$optional_speakers$(_speakers_0) {
  if (_speakers_0.$ === "None") {
    return {$: "Nil"};
  } else {
    const _s_0 = _speakers_0["value"];
    return {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "num_speakers", "value": ($U32$show$(_s_0))}, "tail": {$: "Nil"}};
  }
}

function $$$$047$$$047ai$047bend$047transcription$language_chars$(_s_0) {
  if (_s_0 === "") {
    return true;
  } else {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _tail_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
    const _x_0 = _t_0.codePointAt(0);
    const _x_1 = _t_0.codePointAt(0);
    const _x_2 = _t_0.codePointAt(0);
    const _x_3 = _t_0.codePointAt(0);
    const _x_4 = ($Bool$and$((_x_0 >= 97), (_x_1 <= 122)));
    const _x_5 = ($Bool$and$((_x_2 >= 65), (_x_3 <= 90)));
    return $Bool$and$((_x_4 || _x_5), ($$$$047$$$047ai$047bend$047transcription$language_chars$(_tail_0)));
  }
}

function $$$$047$$$047ai$047bend$047transcription$valid_language$(_language_0) {
  if (_language_0.$ === "None") {
    return true;
  } else {
    const _s_0 = _language_0["value"];
    return $Bool$and$(($Bool$and$(($Nat$is_ge$([..._s_0].length, 2)), ($Nat$is_le$([..._s_0].length, 3)))), ($$$$047$$$047ai$047bend$047transcription$language_chars$(_s_0)));
  }
}

function $$$$047$$$047ai$047bend$047transcription$filename_chars$(_s_0) {
  if (_s_0 === "") {
    return true;
  } else {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _tail_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
    const _x_0 = _t_0.codePointAt(0);
    const _x_1 = _t_0.codePointAt(0);
    const _x_2 = _t_0.codePointAt(0);
    const _x_3 = _t_0.codePointAt(0);
    const _x_4 = ($Bool$and$((_x_0 >= 48), (_x_1 <= 57)));
    const _x_5 = ($Bool$and$((_x_2 >= 65), (_x_3 <= 90)));
    const _x_6 = _t_0.codePointAt(0);
    const _x_7 = _t_0.codePointAt(0);
    const _x_8 = (_x_4 || _x_5);
    const _x_9 = ($Bool$and$((_x_6 >= 97), (_x_7 <= 122)));
    const _x_10 = _t_0.codePointAt(0);
    const _x_11 = (_x_8 || _x_9);
    const _x_12 = (_x_10 === 45);
    const _x_13 = _t_0.codePointAt(0);
    const _x_14 = (_x_11 || _x_12);
    const _x_15 = (_x_13 === 95);
    const _x_16 = _t_0.codePointAt(0);
    const _x_17 = (_x_14 || _x_15);
    const _x_18 = (_x_16 === 46);
    const _x_19 = _t_0.codePointAt(0);
    const _x_20 = (_x_17 || _x_18);
    const _x_21 = (_x_19 === 32);
    return $Bool$and$((_x_20 || _x_21), ($$$$047$$$047ai$047bend$047transcription$filename_chars$(_tail_0)));
  }
}

function $$$$047$$$047ai$047bend$047transcription$filename_first$(_s_0) {
  if (_s_0 === "") {
    return false;
  } else {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _x_0 = _t_0.codePointAt(0);
    const _x_1 = _t_0.codePointAt(0);
    const _x_2 = _t_0.codePointAt(0);
    const _x_3 = _t_0.codePointAt(0);
    const _x_4 = ($Bool$and$((_x_0 >= 48), (_x_1 <= 57)));
    const _x_5 = ($Bool$and$((_x_2 >= 65), (_x_3 <= 90)));
    const _x_6 = _t_0.codePointAt(0);
    const _x_7 = _t_0.codePointAt(0);
    const _x_8 = (_x_4 || _x_5);
    const _x_9 = ($Bool$and$((_x_6 >= 97), (_x_7 <= 122)));
    return (_x_8 || _x_9);
  }
}

function $$$$047$$$047ai$047bend$047transcription$valid_filename$(_s_0) {
  if (_s_0 === "") {
    return false;
  } else {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 46) {
      const _t_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_2 === "") {
        return false;
      } else {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 46) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 === "") {
            return false;
          } else {
            const _x_0 = ("." + ("." + _t_5));
            return $Bool$and$(($Bool$and$(($Nat$is_le$([..._x_0].length, 128)), ($$$$047$$$047ai$047bend$047transcription$filename_first$(("." + ("." + _t_5)))))), ($$$$047$$$047ai$047bend$047transcription$filename_chars$(("." + ("." + _t_5)))));
          }
        } else {
          const _81_0 = u32_to_word(_t_4)["head"];
          const _82_0 = u32_to_word(_t_4)["tail"];
          const _78_0 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          const _x_1 = ("." + (char_new(word_to_u32({$: "WCon", "head": _81_0, "tail": _82_0})) + _78_0));
          return $Bool$and$(($Bool$and$(($Nat$is_le$([..._x_1].length, 128)), ($$$$047$$$047ai$047bend$047transcription$filename_first$(("." + (char_new(word_to_u32({$: "WCon", "head": _81_0, "tail": _82_0})) + _78_0)))))), ($$$$047$$$047ai$047bend$047transcription$filename_chars$(("." + (char_new(word_to_u32({$: "WCon", "head": _81_0, "tail": _82_0})) + _78_0)))));
        }
      }
    } else {
      const _13_0 = u32_to_word(_t_1)["head"];
      const _14_0 = u32_to_word(_t_1)["tail"];
      const _10_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      const _x_2 = (char_new(word_to_u32({$: "WCon", "head": _13_0, "tail": _14_0})) + _10_0);
      return $Bool$and$(($Bool$and$(($Nat$is_le$([..._x_2].length, 128)), ($$$$047$$$047ai$047bend$047transcription$filename_first$((char_new(word_to_u32({$: "WCon", "head": _13_0, "tail": _14_0})) + _10_0))))), ($$$$047$$$047ai$047bend$047transcription$filename_chars$((char_new(word_to_u32({$: "WCon", "head": _13_0, "tail": _14_0})) + _10_0))));
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$count_bytes_run$($0, $1, $2) {
  for (;;) {
    {
      const _items_0 = $0;
      const _valid_0 = $1;
      const _count_0 = $2;
      if (_items_0.$ === "Nil") {
        if (!_valid_0) {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}};
        } else {
          return {$: "Done", "value": _count_0};
        }
      } else {
        const _byte_0 = _items_0["head"];
        const _rest_0 = _items_0["tail"];
        if (!_valid_0) {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}};
        } else {
          $0 = _rest_0;
          $1 = ($Bool$and$((_byte_0 <= 255), (_count_0 < 33554432)));
          $2 = ((_count_0 + 1) >>> 0);
          continue;
        }
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$count_bytes$(_bytes_0, _count_0) {
  return $$$$047$$$047ai$047bend$047transcription$count_bytes_run$(_bytes_0, true, _count_0);
}

function $$$$047$$$047ai$047bend$047transcription$speakers_valid$(_diarize_0, _speakers_0) {
  if (!_diarize_0) {
    if (_speakers_0.$ === "None") {
      return true;
    } else {
      return false;
    }
  } else {
    if (_speakers_0.$ === "None") {
      return true;
    } else {
      const _n_1 = _speakers_0["value"];
      return $Bool$and$((_n_1 >= 1), (_n_1 <= 32));
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$fields$(_language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0) {
  return $List$append$({$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "model_id", "value": "scribe_v2"}, "tail": {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "diarize", "value": ($$$$047$$$047ai$047bend$047transcription$boolean$(_diarize_0))}, "tail": {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "timestamps_granularity", "value": ($$$$047$$$047ai$047bend$047transcription$granularity$(_timestamps_0))}, "tail": {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "tag_audio_events", "value": ($$$$047$$$047ai$047bend$047transcription$boolean$(_tags_0))}, "tail": {$: "Con", "head": {$: "../../ai/bend/transcription.FormField", "name": "file_format", "value": ($$$$047$$$047ai$047bend$047transcription$file_format$(_format_0))}, "tail": {$: "Nil"}}}}}}, ($List$append$(($$$$047$$$047ai$047bend$047transcription$optional_language$(_language_0)), ($$$$047$$$047ai$047bend$047transcription$optional_speakers$(_speakers_0)))));
}

function $$$$047$$$047ai$047bend$047transcription$request_checked$(_valid_0, _count_0, _file_0, _language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0) {
  if (!_valid_0) {
    if (_count_0.$ === "Fail") {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""}};
    } else {
      const _t_0 = _count_0["value"];
      if (_t_0 == 0) {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""}};
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""}};
      }
    }
  } else {
    if (_count_0.$ === "Fail") {
      const _error_1 = _count_0["error"];
      return {$: "Fail", "error": _error_1};
    } else {
      const _t_1 = _count_0["value"];
      if (_t_1 == 0) {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""}};
      } else {
        return {$: "Done", "value": {$: "../../ai/bend/transcription.MultipartPlan", "url": "https://api.elevenlabs.io/v1/speech-to-text", "fields": ($$$$047$$$047ai$047bend$047transcription$fields$(_language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0)), "file": _file_0}};
      }
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$request_file$(_file_0, _language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0) {
  const _filename_0 = _file_0["filename"];
  const _m_0 = _file_0["mime"];
  const _bytes_0 = _file_0["bytes"];
  return $$$$047$$$047ai$047bend$047transcription$request_checked$(($Bool$and$(($Bool$and$(($$$$047$$$047ai$047bend$047transcription$valid_filename$(_filename_0)), ($$$$047$$$047ai$047bend$047transcription$valid_language$(_language_0)))), ($$$$047$$$047ai$047bend$047transcription$speakers_valid$(_diarize_0, _speakers_0)))), ($$$$047$$$047ai$047bend$047transcription$count_bytes$(_bytes_0, 0)), {$: "../../ai/bend/transcription.AudioFile", "filename": _filename_0, "mime": _m_0, "bytes": _bytes_0}, _language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0);
}

function $$$$047$$$047ai$047bend$047transcription$request$(_r_0) {
  const _file_0 = _r_0["file"];
  const _language_0 = _r_0["language"];
  const _diarize_0 = _r_0["diarize"];
  const _speakers_0 = _r_0["speakers"];
  const _timestamps_0 = _r_0["timestamps"];
  const _tags_0 = _r_0["tag_audio_events"];
  const _format_0 = _r_0["format"];
  return $$$$047$$$047ai$047bend$047transcription$request_file$(_file_0, _language_0, _diarize_0, _speakers_0, _timestamps_0, _tags_0, _format_0);
}

function $$$$047$$$047ai$047bend$047transcription$fail$() {
  return {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.ProtocolError"}, "status": 0, "request_id": ""};
}

function $$$$047$$$047ai$047bend$047transcription$string$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _s_0 = _t_0["value"];
      return {$: "Done", "value": _s_0};
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$optional_string$(_value_0) {
  if (_value_0.$ === "None") {
    return {$: "Done", "value": {$: "None"}};
  } else {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Null") {
      return {$: "Done", "value": {$: "None"}};
    } else if (_t_0.$ === "../../ai/bend/wire_json.Text") {
      const _s_0 = _t_0["value"];
      return {$: "Done", "value": {$: "Some", "value": _s_0}};
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$float_parsed$(_value_0) {
  if (_value_0.$ === "Some") {
    const _n_0 = _value_0["value"];
    return {$: "Done", "value": _n_0};
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$number$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Number") {
      const _s_0 = _t_0["text"];
      return $$$$047$$$047ai$047bend$047transcription$float_parsed$(f32_read(_s_0));
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$optional_number$(_value_0) {
  if (_value_0.$ === "None") {
    return {$: "Done", "value": {$: "None"}};
  } else {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Null") {
      return {$: "Done", "value": {$: "None"}};
    } else {
      return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$number$({$: "Some", "value": _t_0})), run_clo((_x_0) => {
  return {$: "Done", "value": {$: "Some", "value": _x_0}};
}));
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$kind$(_s_0) {
  if (_s_0 !== "") {
    const _t_0 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
    const _t_1 = _t_0.codePointAt(0);
    if (_t_1 == 119) {
      const _t_2 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_2 !== "") {
        const _t_3 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(0, 2) : _t_2[0]);
        const _t_4 = _t_3.codePointAt(0);
        if (_t_4 == 111) {
          const _t_5 = (_t_2.codePointAt(0) > 0xFFFF ? _t_2.slice(2) : _t_2.slice(1));
          if (_t_5 !== "") {
            const _t_6 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(0, 2) : _t_5[0]);
            const _t_7 = _t_6.codePointAt(0);
            if (_t_7 == 114) {
              const _t_8 = (_t_5.codePointAt(0) > 0xFFFF ? _t_5.slice(2) : _t_5.slice(1));
              if (_t_8 !== "") {
                const _t_9 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(0, 2) : _t_8[0]);
                const _t_10 = _t_9.codePointAt(0);
                if (_t_10 == 100) {
                  const _t_11 = (_t_8.codePointAt(0) > 0xFFFF ? _t_8.slice(2) : _t_8.slice(1));
                  if (_t_11 === "") {
                    return {$: "Done", "value": {$: "../../ai/bend/transcription.Word"}};
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if (_t_1 == 115) {
      const _t_12 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_12 !== "") {
        const _t_13 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(0, 2) : _t_12[0]);
        const _t_14 = _t_13.codePointAt(0);
        if (_t_14 == 112) {
          const _t_15 = (_t_12.codePointAt(0) > 0xFFFF ? _t_12.slice(2) : _t_12.slice(1));
          if (_t_15 !== "") {
            const _t_16 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(0, 2) : _t_15[0]);
            const _t_17 = _t_16.codePointAt(0);
            if (_t_17 == 97) {
              const _t_18 = (_t_15.codePointAt(0) > 0xFFFF ? _t_15.slice(2) : _t_15.slice(1));
              if (_t_18 !== "") {
                const _t_19 = (_t_18.codePointAt(0) > 0xFFFF ? _t_18.slice(0, 2) : _t_18[0]);
                const _t_20 = _t_19.codePointAt(0);
                if (_t_20 == 99) {
                  const _t_21 = (_t_18.codePointAt(0) > 0xFFFF ? _t_18.slice(2) : _t_18.slice(1));
                  if (_t_21 !== "") {
                    const _t_22 = (_t_21.codePointAt(0) > 0xFFFF ? _t_21.slice(0, 2) : _t_21[0]);
                    const _t_23 = _t_22.codePointAt(0);
                    if (_t_23 == 105) {
                      const _t_24 = (_t_21.codePointAt(0) > 0xFFFF ? _t_21.slice(2) : _t_21.slice(1));
                      if (_t_24 !== "") {
                        const _t_25 = (_t_24.codePointAt(0) > 0xFFFF ? _t_24.slice(0, 2) : _t_24[0]);
                        const _t_26 = _t_25.codePointAt(0);
                        if (_t_26 == 110) {
                          const _t_27 = (_t_24.codePointAt(0) > 0xFFFF ? _t_24.slice(2) : _t_24.slice(1));
                          if (_t_27 !== "") {
                            const _t_28 = (_t_27.codePointAt(0) > 0xFFFF ? _t_27.slice(0, 2) : _t_27[0]);
                            const _t_29 = _t_28.codePointAt(0);
                            if (_t_29 == 103) {
                              const _t_30 = (_t_27.codePointAt(0) > 0xFFFF ? _t_27.slice(2) : _t_27.slice(1));
                              if (_t_30 === "") {
                                return {$: "Done", "value": {$: "../../ai/bend/transcription.Spacing"}};
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
      } else {
        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
      }
    } else if (_t_1 == 97) {
      const _t_31 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
      if (_t_31 !== "") {
        const _t_32 = (_t_31.codePointAt(0) > 0xFFFF ? _t_31.slice(0, 2) : _t_31[0]);
        const _t_33 = _t_32.codePointAt(0);
        if (_t_33 == 117) {
          const _t_34 = (_t_31.codePointAt(0) > 0xFFFF ? _t_31.slice(2) : _t_31.slice(1));
          if (_t_34 !== "") {
            const _t_35 = (_t_34.codePointAt(0) > 0xFFFF ? _t_34.slice(0, 2) : _t_34[0]);
            const _t_36 = _t_35.codePointAt(0);
            if (_t_36 == 100) {
              const _t_37 = (_t_34.codePointAt(0) > 0xFFFF ? _t_34.slice(2) : _t_34.slice(1));
              if (_t_37 !== "") {
                const _t_38 = (_t_37.codePointAt(0) > 0xFFFF ? _t_37.slice(0, 2) : _t_37[0]);
                const _t_39 = _t_38.codePointAt(0);
                if (_t_39 == 105) {
                  const _t_40 = (_t_37.codePointAt(0) > 0xFFFF ? _t_37.slice(2) : _t_37.slice(1));
                  if (_t_40 !== "") {
                    const _t_41 = (_t_40.codePointAt(0) > 0xFFFF ? _t_40.slice(0, 2) : _t_40[0]);
                    const _t_42 = _t_41.codePointAt(0);
                    if (_t_42 == 111) {
                      const _t_43 = (_t_40.codePointAt(0) > 0xFFFF ? _t_40.slice(2) : _t_40.slice(1));
                      if (_t_43 !== "") {
                        const _t_44 = (_t_43.codePointAt(0) > 0xFFFF ? _t_43.slice(0, 2) : _t_43[0]);
                        const _t_45 = _t_44.codePointAt(0);
                        if (_t_45 == 95) {
                          const _t_46 = (_t_43.codePointAt(0) > 0xFFFF ? _t_43.slice(2) : _t_43.slice(1));
                          if (_t_46 !== "") {
                            const _t_47 = (_t_46.codePointAt(0) > 0xFFFF ? _t_46.slice(0, 2) : _t_46[0]);
                            const _t_48 = _t_47.codePointAt(0);
                            if (_t_48 == 101) {
                              const _t_49 = (_t_46.codePointAt(0) > 0xFFFF ? _t_46.slice(2) : _t_46.slice(1));
                              if (_t_49 !== "") {
                                const _t_50 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(0, 2) : _t_49[0]);
                                const _t_51 = _t_50.codePointAt(0);
                                if (_t_51 == 118) {
                                  const _t_52 = (_t_49.codePointAt(0) > 0xFFFF ? _t_49.slice(2) : _t_49.slice(1));
                                  if (_t_52 !== "") {
                                    const _t_53 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(0, 2) : _t_52[0]);
                                    const _t_54 = _t_53.codePointAt(0);
                                    if (_t_54 == 101) {
                                      const _t_55 = (_t_52.codePointAt(0) > 0xFFFF ? _t_52.slice(2) : _t_52.slice(1));
                                      if (_t_55 !== "") {
                                        const _t_56 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(0, 2) : _t_55[0]);
                                        const _t_57 = _t_56.codePointAt(0);
                                        if (_t_57 == 110) {
                                          const _t_58 = (_t_55.codePointAt(0) > 0xFFFF ? _t_55.slice(2) : _t_55.slice(1));
                                          if (_t_58 !== "") {
                                            const _t_59 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(0, 2) : _t_58[0]);
                                            const _t_60 = _t_59.codePointAt(0);
                                            if (_t_60 == 116) {
                                              const _t_61 = (_t_58.codePointAt(0) > 0xFFFF ? _t_58.slice(2) : _t_58.slice(1));
                                              if (_t_61 === "") {
                                                return {$: "Done", "value": {$: "../../ai/bend/transcription.AudioEvent"}};
                                              } else {
                                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                              }
                                            } else {
                                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                            }
                                          } else {
                                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                          }
                                        } else {
                                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                        }
                                      } else {
                                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                      }
                                    } else {
                                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                    }
                                  } else {
                                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                  }
                                } else {
                                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                                }
                              } else {
                                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                              }
                            } else {
                              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                            }
                          } else {
                            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                          }
                        } else {
                          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                        }
                      } else {
                        return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                      }
                    } else {
                      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                    }
                  } else {
                    return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                  }
                } else {
                  return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
                }
              } else {
                return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
              }
            } else {
              return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
            }
          } else {
            return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
          }
        } else {
          return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.UnsupportedEvent"}, "status": 0, "request_id": ""}};
        }
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

function $$$$047$$$047ai$047bend$047transcription$nonnegative$(_n_0) {
  if (_n_0.$ === "None") {
    return true;
  } else {
    const _n_1 = _n_0["value"];
    return $Bool$and$((_n_1 >= 0), (_n_1 < 1000000000));
  }
}

function $$$$047$$$047ai$047bend$047transcription$timing$(_start_0, _end_0) {
  if (_start_0.$ === "Some") {
    const _a_0 = _start_0["value"];
    if (_end_0.$ === "Some") {
      const _b_0 = _end_0["value"];
      return (_b_0 >= _a_0);
    } else {
      return true;
    }
  } else {
    return true;
  }
}

function $$$$047$$$047ai$047bend$047transcription$character_checked$(_valid_0, _text_0, _start_0, _end_0) {
  if (_valid_0) {
    return {$: "Done", "value": {$: "../../ai/bend/transcription.Character", "text": _text_0, "start": _start_0, "end": _end_0}};
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$character$(_v_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "text")))), run_clo((_x_0) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "start")))), run_clo((_x_1) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "end")))), run_clo((_x_2) => {
  return $$$$047$$$047ai$047bend$047transcription$character_checked$(($Bool$and$(($Bool$and$(($$$$047$$$047ai$047bend$047transcription$nonnegative$(_x_1)), ($$$$047$$$047ai$047bend$047transcription$nonnegative$(_x_2)))), ($$$$047$$$047ai$047bend$047transcription$timing$(_x_1, _x_2)))), _x_0, _x_1, _x_2);
}));
}));
}));
}

function $$$$047$$$047ai$047bend$047transcription$characters_list$(_xs_0, _fuel_0) {
  if (_xs_0.$ === "Nil") {
    if (_fuel_0 == 0) {
      return {$: "Done", "value": {$: "Nil"}};
    } else {
      return {$: "Done", "value": {$: "Nil"}};
    }
  } else {
    const _v_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    if (_fuel_0 == 0) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}};
    } else {
      const _96_0 = u32_to_word(_fuel_0)["head"];
      const _97_0 = u32_to_word(_fuel_0)["tail"];
      return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$character$(_v_0)), run_clo((_x_0) => {
  const _x_1 = word_to_u32({$: "WCon", "head": _96_0, "tail": _97_0});
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$characters_list$(_tail_0, ((_x_1 - 1) >>> 0))), run_clo((_x_2) => {
  return {$: "Done", "value": {$: "Con", "head": _x_0, "tail": _x_2}};
}));
}));
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$characters$(_value_0) {
  if (_value_0.$ === "None") {
    return {$: "Done", "value": {$: "Nil"}};
  } else {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Array") {
      const _xs_0 = _t_0["items"];
      return $$$$047$$$047ai$047bend$047transcription$characters_list$(_xs_0, 10000);
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$word_checked$(_valid_0, _text_0, _kind_0, _start_0, _end_0, _logprob_0, _speaker_0, _chars_0) {
  if (_valid_0) {
    return {$: "Done", "value": {$: "../../ai/bend/transcription.TranscriptWord", "text": _text_0, "kind": _kind_0, "start": _start_0, "end": _end_0, "logprob": _logprob_0, "speaker": _speaker_0, "characters": _chars_0}};
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$word$(_v_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "text")))), run_clo((_x_0) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "type")))), run_clo((_x_1) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$kind$(_x_1)), run_clo((_x_2) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "start")))), run_clo((_x_3) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "end")))), run_clo((_x_4) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "logprob")))), run_clo((_x_5) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$optional_string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "speaker_id")))), run_clo((_x_6) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$characters$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "characters")))), run_clo((_x_7) => {
  const _x_8 = Math.fround(0 - 1000000000);
  return $$$$047$$$047ai$047bend$047transcription$word_checked$(($Bool$and$(($Bool$and$(($Bool$and$(($Bool$and$(($$$$047$$$047ai$047bend$047transcription$nonnegative$(_x_3)), ($$$$047$$$047ai$047bend$047transcription$nonnegative$(_x_4)))), ($$$$047$$$047ai$047bend$047transcription$timing$(_x_3, _x_4)))), (_x_5 <= 0))), (_x_5 > _x_8))), _x_0, _x_2, _x_3, _x_4, _x_5, _x_6, _x_7);
}));
}));
}));
}));
}));
}));
}));
}));
}

function $$$$047$$$047ai$047bend$047transcription$words_list$(_xs_0, _fuel_0) {
  if (_xs_0.$ === "Nil") {
    if (_fuel_0 == 0) {
      return {$: "Done", "value": {$: "Nil"}};
    } else {
      return {$: "Done", "value": {$: "Nil"}};
    }
  } else {
    const _v_0 = _xs_0["head"];
    const _tail_0 = _xs_0["tail"];
    if (_fuel_0 == 0) {
      return {$: "Fail", "error": {$: "../../ai/bend/codecs.Error", "code": {$: "../../ai/bend/codecs.FrameLimit"}, "status": 0, "request_id": ""}};
    } else {
      const _96_0 = u32_to_word(_fuel_0)["head"];
      const _97_0 = u32_to_word(_fuel_0)["tail"];
      return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$word$(_v_0)), run_clo((_x_0) => {
  const _x_1 = word_to_u32({$: "WCon", "head": _96_0, "tail": _97_0});
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$words_list$(_tail_0, ((_x_1 - 1) >>> 0))), run_clo((_x_2) => {
  return {$: "Done", "value": {$: "Con", "head": _x_0, "tail": _x_2}};
}));
}));
    }
  }
}

function $$$$047$$$047ai$047bend$047transcription$words$(_value_0) {
  if (_value_0.$ === "Some") {
    const _t_0 = _value_0["value"];
    if (_t_0.$ === "../../ai/bend/wire_json.Array") {
      const _xs_0 = _t_0["items"];
      return $$$$047$$$047ai$047bend$047transcription$words_list$(_xs_0, 100000);
    } else {
      return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
    }
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$transcript_checked$(_valid_0, _text_0, _language_0, _probability_0, _words_0, _id_0, _duration_0) {
  if (_valid_0) {
    return {$: "Done", "value": {$: "../../ai/bend/transcription.Transcript", "text": _text_0, "language_code": _language_0, "language_probability": _probability_0, "words": _words_0, "transcription_id": _id_0, "audio_duration_secs": _duration_0}};
  } else {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  }
}

function $$$$047$$$047ai$047bend$047transcription$transcript$(_v_0) {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "text")))), run_clo((_x_0) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "language_code")))), run_clo((_x_1) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "language_probability")))), run_clo((_x_2) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$words$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "words")))), run_clo((_x_3) => {
  return $Result$bind$(($$$$047$$$047ai$047bend$047transcription$optional_string$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "transcription_id")))), run_clo((_x_4) => {
  return $Result$bind$(run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$(($$$$047$$$047ai$047bend$047wire_json$get$(_v_0, "audio_duration_secs")))), run_clo((_x_5) => {
  return $$$$047$$$047ai$047bend$047transcription$transcript_checked$(($Bool$and$(($Bool$and$((_x_2 >= 0), (_x_2 <= 1))), ($$$$047$$$047ai$047bend$047transcription$nonnegative$(_x_5)))), _x_0, _x_1, _x_2, _x_3, _x_4, _x_5);
}));
}));
}));
}));
}));
}));
}

function $$$$047$$$047ai$047bend$047transcription$parsed$(_value_0) {
  if (_value_0.$ === "Fail") {
    return {$: "Fail", "error": ($$$$047$$$047ai$047bend$047transcription$fail$())};
  } else {
    const _v_0 = _value_0["value"];
    return $$$$047$$$047ai$047bend$047transcription$transcript$(_v_0);
  }
}

function $$$$047$$$047ai$047bend$047transcription$decode$(_wire_0) {
  return $$$$047$$$047ai$047bend$047transcription$parsed$(run_loop($$$$047$$$047ai$047bend$047wire_json$read$(_wire_0)));
}

function $metadata_valid$(_asset_0) {
  const _t_0 = _asset_0["kind"];
  if (_t_0.$ === "AudioAsset") {
    const _mime_0 = _asset_0["mime_type"];
    const _size_0 = _asset_0["size"];
    return $Bool$and$(($Bool$and$((_size_0 > 0), (_size_0 <= 8388608))), ($String$starts_with$(_mime_0, "audio/")));
  } else if (_t_0.$ === "PhotoAsset") {
    const _mime_1 = _asset_0["mime_type"];
    const _size_1 = _asset_0["size"];
    return $Bool$and$(($Bool$and$((_size_1 > 0), (_size_1 <= 8388608))), ($String$starts_with$(_mime_1, "image/")));
  } else if (_t_0.$ === "VideoAsset") {
    const _mime_2 = _asset_0["mime_type"];
    const _size_2 = _asset_0["size"];
    return $Bool$and$(($Bool$and$((_size_2 > 0), (_size_2 <= 8388608))), ($String$starts_with$(_mime_2, "video/")));
  } else {
    const _size_3 = _asset_0["size"];
    return $Bool$and$((_size_3 > 0), (_size_3 <= 8388608));
  }
}

function $asset_id$(_asset_0) {
  const _id_0 = _asset_0["id"];
  return _id_0;
}

function $audio_new$(_id_0, _asset_0, _model_0) {
  return {$: "AudioMessage", "message_id": _id_0, "asset": _asset_0, "transcription": {$: "Transcription", "phase": {$: "AwaitingTranscription"}, "attempt": 0, "provenance": {$: "Provenance", "provider": "elevenlabs", "model": _model_0, "source_asset_id": ($asset_id$(_asset_0))}, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": false}};
}

function $attachment_new$(_id_0, _asset_0) {
  return {$: "Attachment", "message_id": _id_0, "asset": _asset_0};
}

function $begin_pending$(_attempt_0, _provenance_0) {
  return $Bool$pick$((_attempt_0 < 3), {$: "Transcription", "phase": {$: "Transcribing"}, "attempt": ((_attempt_0 + 1) >>> 0), "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": false}, {$: "Transcription", "phase": {$: "TranscriptionFailed"}, "attempt": _attempt_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "Transcription retry limit reached", "retry_required": false});
}

function $begin_transcription$(_t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "AwaitingTranscription") {
    const _attempt_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    return $begin_pending$(_attempt_0, _provenance_0);
  } else if (_t_1.$ === "TranscriptionFailed") {
    const _attempt_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    return $begin_pending$(_attempt_1, _provenance_1);
  } else if (_t_1.$ === "TranscriptionCancelled") {
    const _attempt_2 = _t_0["attempt"];
    const _provenance_2 = _t_0["provenance"];
    return $begin_pending$(_attempt_2, _provenance_2);
  } else {
    const _attempt_3 = _t_0["attempt"];
    const _provenance_3 = _t_0["provenance"];
    const _words_3 = _t_0["words"];
    const _text_3 = _t_0["text"];
    const _error_3 = _t_0["error"];
    const _retry_3 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _attempt_3, "provenance": _provenance_3, "words": _words_3, "text": _text_3, "error": _error_3, "retry_required": _retry_3};
  }
}

function $result_transcription$(_attempt_0, _text_0, _words_0, _t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "Transcribing") {
    const _current_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    const _old_words_0 = _t_0["words"];
    const _old_0 = _t_0["text"];
    const _error_0 = _t_0["error"];
    const _retry_0 = _t_0["retry_required"];
    return $Bool$pick$((_attempt_0 === _current_0), {$: "Transcription", "phase": {$: "Transcribed"}, "attempt": _current_0, "provenance": _provenance_0, "words": _words_0, "text": _text_0, "error": "", "retry_required": false}, {$: "Transcription", "phase": {$: "Transcribing"}, "attempt": _current_0, "provenance": _provenance_0, "words": _old_words_0, "text": _old_0, "error": _error_0, "retry_required": _retry_0});
  } else {
    const _current_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    const _old_words_1 = _t_0["words"];
    const _old_1 = _t_0["text"];
    const _error_1 = _t_0["error"];
    const _retry_1 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _current_1, "provenance": _provenance_1, "words": _old_words_1, "text": _old_1, "error": _error_1, "retry_required": _retry_1};
  }
}

function $fail_transcription$(_attempt_0, _error_0, _t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "Transcribing") {
    const _current_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    const _words_0 = _t_0["words"];
    const _text_0 = _t_0["text"];
    const _old_0 = _t_0["error"];
    const _retry_0 = _t_0["retry_required"];
    return $Bool$pick$((_attempt_0 === _current_0), {$: "Transcription", "phase": {$: "TranscriptionFailed"}, "attempt": _current_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": _error_0, "retry_required": (_current_0 < 3)}, {$: "Transcription", "phase": {$: "Transcribing"}, "attempt": _current_0, "provenance": _provenance_0, "words": _words_0, "text": _text_0, "error": _old_0, "retry_required": _retry_0});
  } else {
    const _current_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    const _words_1 = _t_0["words"];
    const _text_1 = _t_0["text"];
    const _old_1 = _t_0["error"];
    const _retry_1 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _current_1, "provenance": _provenance_1, "words": _words_1, "text": _text_1, "error": _old_1, "retry_required": _retry_1};
  }
}

function $cancel_transcription$(_attempt_0, _t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "Transcribing") {
    const _current_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    const _words_0 = _t_0["words"];
    const _text_0 = _t_0["text"];
    const _error_0 = _t_0["error"];
    const _retry_0 = _t_0["retry_required"];
    return $Bool$pick$((_attempt_0 === _current_0), {$: "Transcription", "phase": {$: "TranscriptionCancelled"}, "attempt": _current_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": (_current_0 < 3)}, {$: "Transcription", "phase": {$: "Transcribing"}, "attempt": _current_0, "provenance": _provenance_0, "words": _words_0, "text": _text_0, "error": _error_0, "retry_required": _retry_0});
  } else if (_t_1.$ === "AwaitingTranscription") {
    const _current_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    return {$: "Transcription", "phase": {$: "TranscriptionCancelled"}, "attempt": _current_1, "provenance": _provenance_1, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": (_current_1 < 3)};
  } else {
    const _current_2 = _t_0["attempt"];
    const _provenance_2 = _t_0["provenance"];
    const _words_2 = _t_0["words"];
    const _text_2 = _t_0["text"];
    const _error_2 = _t_0["error"];
    const _retry_2 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _current_2, "provenance": _provenance_2, "words": _words_2, "text": _text_2, "error": _error_2, "retry_required": _retry_2};
  }
}

function $restored_pending$(_attempt_0, _provenance_0) {
  return $Bool$pick$((_attempt_0 < 3), {$: "Transcription", "phase": {$: "AwaitingTranscription"}, "attempt": _attempt_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": true}, {$: "Transcription", "phase": {$: "TranscriptionFailed"}, "attempt": _attempt_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "Transcription retry limit reached", "retry_required": false});
}

function $restore_transcription$(_t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "Transcribing") {
    const _attempt_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    return $restored_pending$(_attempt_0, _provenance_0);
  } else if (_t_1.$ === "AwaitingTranscription") {
    const _attempt_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    return $restored_pending$(_attempt_1, _provenance_1);
  } else {
    const _attempt_2 = _t_0["attempt"];
    const _provenance_2 = _t_0["provenance"];
    const _words_2 = _t_0["words"];
    const _text_2 = _t_0["text"];
    const _error_2 = _t_0["error"];
    const _retry_2 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _attempt_2, "provenance": _provenance_2, "words": _words_2, "text": _text_2, "error": _error_2, "retry_required": _retry_2};
  }
}

function $queue_transcription$(_t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "AwaitingTranscription") {
    const _attempt_0 = _t_0["attempt"];
    const _provenance_0 = _t_0["provenance"];
    return {$: "Transcription", "phase": {$: "AwaitingTranscription"}, "attempt": _attempt_0, "provenance": _provenance_0, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": false};
  } else if (_t_1.$ === "TranscriptionFailed") {
    const _attempt_1 = _t_0["attempt"];
    const _provenance_1 = _t_0["provenance"];
    return {$: "Transcription", "phase": {$: "AwaitingTranscription"}, "attempt": _attempt_1, "provenance": _provenance_1, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": false};
  } else if (_t_1.$ === "TranscriptionCancelled") {
    const _attempt_2 = _t_0["attempt"];
    const _provenance_2 = _t_0["provenance"];
    return {$: "Transcription", "phase": {$: "AwaitingTranscription"}, "attempt": _attempt_2, "provenance": _provenance_2, "words": {$: "Nil"}, "text": "", "error": "", "retry_required": false};
  } else {
    const _attempt_3 = _t_0["attempt"];
    const _provenance_3 = _t_0["provenance"];
    const _words_3 = _t_0["words"];
    const _text_3 = _t_0["text"];
    const _error_3 = _t_0["error"];
    const _retry_3 = _t_0["retry_required"];
    return {$: "Transcription", "phase": _t_1, "attempt": _attempt_3, "provenance": _provenance_3, "words": _words_3, "text": _text_3, "error": _error_3, "retry_required": _retry_3};
  }
}

function $update_transcription$(_event_0, _t_0) {
  if (_event_0.$ === "QueueTranscription") {
    return $queue_transcription$(_t_0);
  } else if (_event_0.$ === "BeginTranscription") {
    return $begin_transcription$(_t_0);
  } else if (_event_0.$ === "TranscriptReceived") {
    const _attempt_0 = _event_0["attempt"];
    const _text_0 = _event_0["text"];
    const _words_0 = _event_0["words"];
    return $result_transcription$(_attempt_0, _text_0, _words_0, _t_0);
  } else if (_event_0.$ === "TranscriptFailed") {
    const _attempt_1 = _event_0["attempt"];
    const _error_0 = _event_0["error"];
    return $fail_transcription$(_attempt_1, _error_0, _t_0);
  } else if (_event_0.$ === "CancelTranscription") {
    const _attempt_2 = _event_0["attempt"];
    return $cancel_transcription$(_attempt_2, _t_0);
  } else {
    return $restore_transcription$(_t_0);
  }
}

function $reduce_audio$(_event_0, _message_0) {
  const _id_0 = _message_0["message_id"];
  const _asset_0 = _message_0["asset"];
  const _t_0 = _message_0["transcription"];
  return {$: "AudioMessage", "message_id": _id_0, "asset": _asset_0, "transcription": ($update_transcription$(_event_0, _t_0))};
}

function $transcription_status$(_t_0) {
  const _t_1 = _t_0["phase"];
  if (_t_1.$ === "AwaitingTranscription") {
    return "pending";
  } else if (_t_1.$ === "Transcribing") {
    return "running";
  } else if (_t_1.$ === "Transcribed") {
    return "ready";
  } else if (_t_1.$ === "TranscriptionFailed") {
    return "failed";
  } else {
    return "cancelled";
  }
}

function $reply_new$(_id_0) {
  return {$: "AudioReply", "message_id": _id_0, "response_id": "", "phase": {$: "ReplyIdle"}, "error": ""};
}

function $reduce_reply$(_event_0, _reply_0) {
  if (_event_0.$ === "EnqueueReply") {
    const _id_0 = _reply_0["message_id"];
    const _response_0 = _reply_0["response_id"];
    const _t_0 = _reply_0["phase"];
    if (_t_0.$ === "ReplyIdle") {
      return {$: "AudioReply", "message_id": _id_0, "response_id": "", "phase": {$: "ReplyPending"}, "error": ""};
    } else if (_t_0.$ === "ReplyFailed") {
      return {$: "AudioReply", "message_id": _id_0, "response_id": "", "phase": {$: "ReplyPending"}, "error": ""};
    } else if (_t_0.$ === "ReplyCancelled") {
      return {$: "AudioReply", "message_id": _id_0, "response_id": "", "phase": {$: "ReplyPending"}, "error": ""};
    } else {
      const _error_3 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_0, "response_id": _response_0, "phase": _t_0, "error": _error_3};
    }
  } else if (_event_0.$ === "StartReply") {
    const _response_1 = _event_0["response_id"];
    const _id_1 = _reply_0["message_id"];
    const _old_0 = _reply_0["response_id"];
    const _t_1 = _reply_0["phase"];
    if (_t_1.$ === "ReplyPending") {
      return {$: "AudioReply", "message_id": _id_1, "response_id": _response_1, "phase": {$: "ReplyRunning"}, "error": ""};
    } else {
      const _error_5 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_1, "response_id": _old_0, "phase": _t_1, "error": _error_5};
    }
  } else if (_event_0.$ === "FinishReply") {
    const _response_2 = _event_0["response_id"];
    const _id_2 = _reply_0["message_id"];
    const _current_0 = _reply_0["response_id"];
    const _t_2 = _reply_0["phase"];
    if (_t_2.$ === "ReplyRunning") {
      const _error_6 = _reply_0["error"];
      return $Bool$pick$(($String$eq$(_response_2, _current_0)), {$: "AudioReply", "message_id": _id_2, "response_id": _current_0, "phase": {$: "ReplyReady"}, "error": ""}, {$: "AudioReply", "message_id": _id_2, "response_id": _current_0, "phase": {$: "ReplyRunning"}, "error": _error_6});
    } else {
      const _error_7 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_2, "response_id": _current_0, "phase": _t_2, "error": _error_7};
    }
  } else if (_event_0.$ === "FailReply") {
    const _response_3 = _event_0["response_id"];
    const _error_8 = _event_0["error"];
    const _id_3 = _reply_0["message_id"];
    const _current_1 = _reply_0["response_id"];
    const _t_3 = _reply_0["phase"];
    if (_t_3.$ === "ReplyRunning") {
      const _old_1 = _reply_0["error"];
      return $Bool$pick$(($String$eq$(_response_3, _current_1)), {$: "AudioReply", "message_id": _id_3, "response_id": _current_1, "phase": {$: "ReplyFailed"}, "error": _error_8}, {$: "AudioReply", "message_id": _id_3, "response_id": _current_1, "phase": {$: "ReplyRunning"}, "error": _old_1});
    } else {
      const _old_2 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_3, "response_id": _current_1, "phase": _t_3, "error": _old_2};
    }
  } else if (_event_0.$ === "CancelReply") {
    const _id_4 = _reply_0["message_id"];
    const _response_4 = _reply_0["response_id"];
    const _t_4 = _reply_0["phase"];
    if (_t_4.$ === "ReplyPending") {
      return {$: "AudioReply", "message_id": _id_4, "response_id": _response_4, "phase": {$: "ReplyCancelled"}, "error": ""};
    } else if (_t_4.$ === "ReplyRunning") {
      return {$: "AudioReply", "message_id": _id_4, "response_id": _response_4, "phase": {$: "ReplyCancelled"}, "error": ""};
    } else {
      const _error_11 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_4, "response_id": _response_4, "phase": _t_4, "error": _error_11};
    }
  } else {
    const _id_5 = _reply_0["message_id"];
    const _response_5 = _reply_0["response_id"];
    const _t_5 = _reply_0["phase"];
    if (_t_5.$ === "ReplyPending") {
      return {$: "AudioReply", "message_id": _id_5, "response_id": _response_5, "phase": {$: "ReplyCancelled"}, "error": "Reply was interrupted; request it explicitly."};
    } else if (_t_5.$ === "ReplyRunning") {
      return {$: "AudioReply", "message_id": _id_5, "response_id": _response_5, "phase": {$: "ReplyCancelled"}, "error": "Reply was interrupted; request it explicitly."};
    } else {
      const _error_14 = _reply_0["error"];
      return {$: "AudioReply", "message_id": _id_5, "response_id": _response_5, "phase": _t_5, "error": _error_14};
    }
  }
}

function $reply_status$(_reply_0) {
  const _t_0 = _reply_0["phase"];
  if (_t_0.$ === "ReplyIdle") {
    return "none";
  } else if (_t_0.$ === "ReplyPending") {
    return "pending";
  } else if (_t_0.$ === "ReplyRunning") {
    return "running";
  } else if (_t_0.$ === "ReplyReady") {
    return "ready";
  } else if (_t_0.$ === "ReplyFailed") {
    return "failed";
  } else {
    return "cancelled";
  }
}

function $native_word_kind$(_kind_0) {
  if (_kind_0.$ === "../../ai/bend/transcription.Word") {
    return {$: "SpokenWord"};
  } else if (_kind_0.$ === "../../ai/bend/transcription.Spacing") {
    return {$: "WordSpacing"};
  } else {
    return {$: "AudioEventWord"};
  }
}

function $native_words$(_words_0) {
  if (_words_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _t_0 = _words_0["head"];
    const _text_0 = _t_0["text"];
    const _kind_0 = _t_0["kind"];
    const _start_0 = _t_0["start"];
    const _end_0 = _t_0["end"];
    const _logprob_0 = _t_0["logprob"];
    const _speaker_0 = _t_0["speaker"];
    const _tail_0 = _words_0["tail"];
    return {$: "Con", "head": {$: "TimedWord", "text": _text_0, "kind": ($native_word_kind$(_kind_0)), "start": _start_0, "end": _end_0, "speaker_id": _speaker_0, "logprob": {$: "Some", "value": _logprob_0}}, "tail": ($native_words$(_tail_0))};
  }
}

function $native_transcript$(_attempt_0, _transcript_0, _message_0) {
  const _text_0 = _transcript_0["text"];
  const _words_0 = _transcript_0["words"];
  return $reduce_audio$({$: "TranscriptReceived", "attempt": _attempt_0, "text": _text_0, "words": ($native_words$(_words_0))}, _message_0);
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

function $String$eq$(_a_0, _b_0) {
  return $Cmp$is_eq$(($String$order$(_a_0, _b_0)));
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

function $U32$show$(_a_0) {
  const _b_0 = _a_0;
  return $U32$show$if$(_b_0, (_b_0 === 0));
}

function $Nat$is_ge$(_a_0, _b_0) {
  return $Cmp$is_ge$(cmp_new(_a_0, _b_0));
}

function $Nat$is_le$(_a_0, _b_0) {
  return $Cmp$is_le$(cmp_new(_a_0, _b_0));
}

function $List$append$(_xs_0, _ys_0) {
  if (_xs_0.$ === "Nil") {
    return _ys_0;
  } else {
    const _h_0 = _xs_0["head"];
    const _t_0 = _xs_0["tail"];
    return {$: "Con", "head": _h_0, "tail": ($List$append$(_t_0, _ys_0))};
  }
}

function $String$starts_with$($0, $1, $2) {
  let $pc = 0;
  for (;;) switch ($pc) {
    case 0: {
      const _s_0 = $0;
      const _p_0 = $1;
      if (_s_0 === "") {
        if (_p_0 === "") {
          return true;
        } else {
          return false;
        }
      } else {
        const _h_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        if (_p_0 === "") {
          return true;
        } else {
          const _y_0 = (_p_0.codePointAt(0) > 0xFFFF ? _p_0.slice(0, 2) : _p_0[0]);
          const _yt_0 = (_p_0.codePointAt(0) > 0xFFFF ? _p_0.slice(2) : _p_0.slice(1));
          $0 = _t_1;
          $1 = _yt_0;
          $2 = ($Char$is_eq$(_h_1, _y_0));
          $pc = 1; continue;
        }
      }
    }
    case 1: {
      const _t_0 = $0;
      const _pt_0 = $1;
      const _same_0 = $2;
      if (!_same_0) {
        return false;
      } else {
        $0 = _t_0;
        $1 = _pt_0;
        $pc = 0; continue;
      }
    }
  }
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
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

function $U32$show$if$(_a_0, _z_0) {
  if (_z_0) {
    return "0";
  } else {
    return $U32$show$go$(10, _a_0, "");
  }
}

function $Cmp$is_ge$(_c_0) {
  if (_c_0.$ === "LT") {
    return false;
  } else {
    return true;
  }
}

function $Cmp$is_le$(_c_0) {
  if (_c_0.$ === "GT") {
    return false;
  } else {
    return true;
  }
}

function $String$starts_with$if$($0, $1, $2) {
  let $pc = 1;
  for (;;) switch ($pc) {
    case 0: {
      const _s_0 = $0;
      const _p_0 = $1;
      if (_s_0 === "") {
        if (_p_0 === "") {
          return true;
        } else {
          return false;
        }
      } else {
        const _h_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(0, 2) : _s_0[0]);
        const _t_1 = (_s_0.codePointAt(0) > 0xFFFF ? _s_0.slice(2) : _s_0.slice(1));
        if (_p_0 === "") {
          return true;
        } else {
          const _y_0 = (_p_0.codePointAt(0) > 0xFFFF ? _p_0.slice(0, 2) : _p_0[0]);
          const _yt_0 = (_p_0.codePointAt(0) > 0xFFFF ? _p_0.slice(2) : _p_0.slice(1));
          $0 = _t_1;
          $1 = _yt_0;
          $2 = ($Char$is_eq$(_h_1, _y_0));
          $pc = 1; continue;
        }
      }
    }
    case 1: {
      const _t_0 = $0;
      const _pt_0 = $1;
      const _same_0 = $2;
      if (!_same_0) {
        return false;
      } else {
        $0 = _t_0;
        $1 = _pt_0;
        $pc = 0; continue;
      }
    }
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
  "../../ai/bend/transcription.mime": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$mime$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.granularity": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$granularity$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.file_format": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$file_format$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.boolean": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$boolean$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.optional_language": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$optional_language$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.optional_speakers": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$optional_speakers$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.language_chars": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$language_chars$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.valid_language": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$valid_language$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.filename_chars": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$filename_chars$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.filename_first": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$filename_first$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.valid_filename": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$valid_filename$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.count_bytes_run": run_lib((a0, a1, a2) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$count_bytes_run$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "../../ai/bend/transcription.count_bytes": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$count_bytes$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/transcription.speakers_valid": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$speakers_valid$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/transcription.fields": run_lib((a0, a1, a2, a3, a4, a5) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$fields$((a0), (a1), (a2), (a3), (a4), (a5)))); (a0); (a1); (a2); (a3); (a4); (a5); return r; }, 6),
  "../../ai/bend/transcription.request_checked": run_lib((a0, a1, a2, a3, a4, a5, a6, a7, a8) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$request_checked$((a0), (a1), (a2), (a3), (a4), (a5), (a6), (a7), (a8)))); (a0); (a1); (a2); (a3); (a4); (a5); (a6); (a7); (a8); return r; }, 9),
  "../../ai/bend/transcription.request_file": run_lib((a0, a1, a2, a3, a4, a5, a6) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$request_file$((a0), (a1), (a2), (a3), (a4), (a5), (a6)))); (a0); (a1); (a2); (a3); (a4); (a5); (a6); return r; }, 7),
  "../../ai/bend/transcription.request": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$request$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.fail": run_lib(() => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$fail$()));  return r; }, 0),
  "../../ai/bend/transcription.string": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$string$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.optional_string": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$optional_string$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.float_parsed": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$float_parsed$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.number": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$number$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.optional_number": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$optional_number$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.kind": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$kind$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.nonnegative": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$nonnegative$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.timing": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$timing$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/transcription.character_checked": run_lib((a0, a1, a2, a3) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$character_checked$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "../../ai/bend/transcription.character": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$character$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.characters_list": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$characters_list$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/transcription.characters": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$characters$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.word_checked": run_lib((a0, a1, a2, a3, a4, a5, a6, a7) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$word_checked$((a0), (a1), (a2), (a3), (a4), (a5), (a6), (a7)))); (a0); (a1); (a2); (a3); (a4); (a5); (a6); (a7); return r; }, 8),
  "../../ai/bend/transcription.word": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$word$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.words_list": run_lib((a0, a1) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$words_list$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "../../ai/bend/transcription.words": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$words$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.transcript_checked": run_lib((a0, a1, a2, a3, a4, a5, a6) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$transcript_checked$((a0), (a1), (a2), (a3), (a4), (a5), (a6)))); (a0); (a1); (a2); (a3); (a4); (a5); (a6); return r; }, 7),
  "../../ai/bend/transcription.transcript": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$transcript$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.parsed": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$parsed$((a0)))); (a0); return r; }, 1),
  "../../ai/bend/transcription.decode": run_lib((a0) => { const r = (run_loop($$$$047$$$047ai$047bend$047transcription$decode$((a0)))); (a0); return r; }, 1),
  "metadata_valid": run_lib((a0) => { const r = (run_loop($metadata_valid$((a0)))); (a0); return r; }, 1),
  "asset_id": run_lib((a0) => { const r = (run_loop($asset_id$((a0)))); (a0); return r; }, 1),
  "audio_new": run_lib((a0, a1, a2) => { const r = (run_loop($audio_new$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "attachment_new": run_lib((a0, a1) => { const r = (run_loop($attachment_new$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "begin_pending": run_lib((a0, a1) => { const r = (run_loop($begin_pending$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "begin_transcription": run_lib((a0) => { const r = (run_loop($begin_transcription$((a0)))); (a0); return r; }, 1),
  "result_transcription": run_lib((a0, a1, a2, a3) => { const r = (run_loop($result_transcription$((a0), (a1), (a2), (a3)))); (a0); (a1); (a2); (a3); return r; }, 4),
  "fail_transcription": run_lib((a0, a1, a2) => { const r = (run_loop($fail_transcription$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
  "cancel_transcription": run_lib((a0, a1) => { const r = (run_loop($cancel_transcription$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "restored_pending": run_lib((a0, a1) => { const r = (run_loop($restored_pending$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "restore_transcription": run_lib((a0) => { const r = (run_loop($restore_transcription$((a0)))); (a0); return r; }, 1),
  "queue_transcription": run_lib((a0) => { const r = (run_loop($queue_transcription$((a0)))); (a0); return r; }, 1),
  "update_transcription": run_lib((a0, a1) => { const r = (run_loop($update_transcription$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "reduce_audio": run_lib((a0, a1) => { const r = (run_loop($reduce_audio$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "transcription_status": run_lib((a0) => { const r = (run_loop($transcription_status$((a0)))); (a0); return r; }, 1),
  "reply_new": run_lib((a0) => { const r = (run_loop($reply_new$((a0)))); (a0); return r; }, 1),
  "reduce_reply": run_lib((a0, a1) => { const r = (run_loop($reduce_reply$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "reply_status": run_lib((a0) => { const r = (run_loop($reply_status$((a0)))); (a0); return r; }, 1),
  "native_word_kind": run_lib((a0) => { const r = (run_loop($native_word_kind$((a0)))); (a0); return r; }, 1),
  "native_words": run_lib((a0) => { const r = (run_loop($native_words$((a0)))); (a0); return r; }, 1),
  "native_transcript": run_lib((a0, a1, a2) => { const r = (run_loop($native_transcript$((a0), (a1), (a2)))); (a0); (a1); (a2); return r; }, 3),
};
