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

function $initial$() {
  return {$: "State", "permission": {$: "Denied"}, "in_call": false, "active": false, "phase": {$: "Off"}, "latest_id": "", "captured_at_ms": 0, "provider_event_id": "", "failure_code": ""};
}

function $off$(_s_0) {
  const _call_0 = _s_0["in_call"];
  const _at_0 = _s_0["captured_at_ms"];
  return {$: "State", "permission": {$: "Denied"}, "in_call": _call_0, "active": false, "phase": {$: "Off"}, "latest_id": "", "captured_at_ms": _at_0, "provider_event_id": "", "failure_code": ""};
}

function $available$(_s_0) {
  const _t_0 = _s_0["permission"];
  if (_t_0.$ === "Granted") {
    const _t_1 = _s_0["in_call"];
    if (_t_1) {
      const _t_2 = _s_0["active"];
      if (_t_2) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function $can_queue$(_s_0) {
  const _t_0 = _s_0["permission"];
  if (_t_0.$ === "Granted") {
    const _t_1 = _s_0["in_call"];
    if (_t_1) {
      const _t_2 = _s_0["active"];
      if (_t_2) {
        const _t_3 = _s_0["phase"];
        if (_t_3.$ === "Ready") {
          return true;
        } else if (_t_3.$ === "Accepted") {
          return true;
        } else if (_t_3.$ === "Error") {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function $queue_allowed$(_metadata_0, _s_0) {
  const _id_0 = _metadata_0["id"];
  const _at_0 = _metadata_0["captured_at_ms"];
  const _bytes_0 = _metadata_0["byte_length"];
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _active_0 = _s_0["active"];
  const _phase_0 = _s_0["phase"];
  const _old_0 = _s_0["latest_id"];
  const _previous_0 = _s_0["captured_at_ms"];
  const _event_0 = _s_0["provider_event_id"];
  const _error_0 = _s_0["failure_code"];
  const _x_0 = ($String$eq$(_old_0, ""));
  const _x_1 = ($Nat$is_ge$(_at_0, nat_chk(_previous_0 + 1000)));
  return $Bool$and$(($Bool$and$(($Bool$and$(($Bool$and$(($Bool$and$(($can_queue$({$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": _phase_0, "latest_id": _old_0, "captured_at_ms": _previous_0, "provider_event_id": _event_0, "failure_code": _error_0})), ($Bool$not$(($String$eq$(_id_0, "")))))), (_bytes_0 > 0))), (_bytes_0 <= 262144))), ($Nat$is_ge$(_at_0, _previous_0)))), (_x_0 || _x_1));
}

function $queued$(_metadata_0, _s_0) {
  const _id_0 = _metadata_0["id"];
  const _at_0 = _metadata_0["captured_at_ms"];
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _active_0 = _s_0["active"];
  return {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": {$: "Pending"}, "latest_id": _id_0, "captured_at_ms": _at_0, "provider_event_id": "", "failure_code": ""};
}

function $submit$(_id_0, _event_id_0, _s_0) {
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _active_0 = _s_0["active"];
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "Pending") {
    const _old_0 = _s_0["latest_id"];
    const _at_0 = _s_0["captured_at_ms"];
    const _event_0 = _s_0["provider_event_id"];
    const _error_0 = _s_0["failure_code"];
    return $Bool$pick$(($String$eq$(_id_0, _old_0)), {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": {$: "Sent"}, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_id_0, "failure_code": ""}, {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": {$: "Pending"}, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": _error_0});
  } else {
    const _old_1 = _s_0["latest_id"];
    const _at_1 = _s_0["captured_at_ms"];
    const _event_1 = _s_0["provider_event_id"];
    const _error_1 = _s_0["failure_code"];
    return {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": _t_0, "latest_id": _old_1, "captured_at_ms": _at_1, "provider_event_id": _event_1, "failure_code": _error_1};
  }
}

function $acknowledge$(_id_0, _event_id_0, _s_0) {
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _active_0 = _s_0["active"];
  const _t_0 = _s_0["phase"];
  if (_t_0.$ === "Sent") {
    const _old_0 = _s_0["latest_id"];
    const _at_0 = _s_0["captured_at_ms"];
    const _event_0 = _s_0["provider_event_id"];
    const _error_0 = _s_0["failure_code"];
    return $Bool$pick$(($Bool$and$(($String$eq$(_id_0, _old_0)), ($String$eq$(_event_id_0, _event_0)))), {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": {$: "Accepted"}, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": ""}, {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": {$: "Sent"}, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": _error_0});
  } else {
    const _old_1 = _s_0["latest_id"];
    const _at_1 = _s_0["captured_at_ms"];
    const _event_1 = _s_0["provider_event_id"];
    const _error_1 = _s_0["failure_code"];
    return {$: "State", "permission": _p_0, "in_call": _call_0, "active": _active_0, "phase": _t_0, "latest_id": _old_1, "captured_at_ms": _at_1, "provider_event_id": _event_1, "failure_code": _error_1};
  }
}

function $reject$(_id_0, _code_0, _s_0) {
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _t_0 = _s_0["active"];
  if (_t_0) {
    const _phase_0 = _s_0["phase"];
    const _old_0 = _s_0["latest_id"];
    const _at_0 = _s_0["captured_at_ms"];
    const _event_0 = _s_0["provider_event_id"];
    const _error_0 = _s_0["failure_code"];
    return $Bool$pick$(($String$eq$(_id_0, _old_0)), {$: "State", "permission": _p_0, "in_call": _call_0, "active": true, "phase": {$: "Error"}, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": _code_0}, {$: "State", "permission": _p_0, "in_call": _call_0, "active": true, "phase": _phase_0, "latest_id": _old_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": _error_0});
  } else {
    const _phase_1 = _s_0["phase"];
    const _old_1 = _s_0["latest_id"];
    const _at_1 = _s_0["captured_at_ms"];
    const _event_1 = _s_0["provider_event_id"];
    const _error_1 = _s_0["failure_code"];
    return {$: "State", "permission": _p_0, "in_call": _call_0, "active": _t_0, "phase": _phase_1, "latest_id": _old_1, "captured_at_ms": _at_1, "provider_event_id": _event_1, "failure_code": _error_1};
  }
}

function $failed$(_code_0, _s_0) {
  const _p_0 = _s_0["permission"];
  const _call_0 = _s_0["in_call"];
  const _t_0 = _s_0["active"];
  if (_t_0) {
    const _id_0 = _s_0["latest_id"];
    const _at_0 = _s_0["captured_at_ms"];
    const _event_0 = _s_0["provider_event_id"];
    return {$: "State", "permission": _p_0, "in_call": _call_0, "active": true, "phase": {$: "Error"}, "latest_id": _id_0, "captured_at_ms": _at_0, "provider_event_id": _event_0, "failure_code": _code_0};
  } else {
    const _id_1 = _s_0["latest_id"];
    const _at_1 = _s_0["captured_at_ms"];
    const _event_1 = _s_0["provider_event_id"];
    return {$: "State", "permission": {$: "Denied"}, "in_call": _call_0, "active": false, "phase": {$: "Error"}, "latest_id": _id_1, "captured_at_ms": _at_1, "provider_event_id": _event_1, "failure_code": _code_0};
  }
}

function $reduce$(_event_0, _s_0) {
  if (_event_0.$ === "Consent") {
    const _call_0 = _s_0["in_call"];
    const _active_0 = _s_0["active"];
    const _phase_0 = _s_0["phase"];
    const _id_0 = _s_0["latest_id"];
    const _at_0 = _s_0["captured_at_ms"];
    const _event_1 = _s_0["provider_event_id"];
    const _error_0 = _s_0["failure_code"];
    return {$: "State", "permission": {$: "Granted"}, "in_call": _call_0, "active": _active_0, "phase": _phase_0, "latest_id": _id_0, "captured_at_ms": _at_0, "provider_event_id": _event_1, "failure_code": _error_0};
  } else if (_event_0.$ === "BeginCall") {
    const _p_1 = _s_0["permission"];
    const _active_1 = _s_0["active"];
    const _phase_1 = _s_0["phase"];
    const _id_1 = _s_0["latest_id"];
    const _at_1 = _s_0["captured_at_ms"];
    const _event_2 = _s_0["provider_event_id"];
    const _error_1 = _s_0["failure_code"];
    return {$: "State", "permission": _p_1, "in_call": true, "active": _active_1, "phase": _phase_1, "latest_id": _id_1, "captured_at_ms": _at_1, "provider_event_id": _event_2, "failure_code": _error_1};
  } else if (_event_0.$ === "EndCall") {
    const _at_2 = _s_0["captured_at_ms"];
    return {$: "State", "permission": {$: "Denied"}, "in_call": false, "active": false, "phase": {$: "Off"}, "latest_id": "", "captured_at_ms": _at_2, "provider_event_id": "", "failure_code": ""};
  } else if (_event_0.$ === "Revoke") {
    return $off$(_s_0);
  } else if (_event_0.$ === "Stop") {
    return $off$(_s_0);
  } else if (_event_0.$ === "StartRequested") {
    const _t_0 = _s_0["permission"];
    if (_t_0.$ === "Granted") {
      const _t_1 = _s_0["in_call"];
      if (_t_1) {
        const _t_2 = _s_0["active"];
        if (!_t_2) {
          const _id_3 = _s_0["latest_id"];
          const _at_3 = _s_0["captured_at_ms"];
          const _event_4 = _s_0["provider_event_id"];
          return {$: "State", "permission": {$: "Granted"}, "in_call": true, "active": false, "phase": {$: "Starting"}, "latest_id": _id_3, "captured_at_ms": _at_3, "provider_event_id": _event_4, "failure_code": ""};
        } else {
          const _phase_4 = _s_0["phase"];
          const _id_4 = _s_0["latest_id"];
          const _at_4 = _s_0["captured_at_ms"];
          const _event_5 = _s_0["provider_event_id"];
          const _error_4 = _s_0["failure_code"];
          return {$: "State", "permission": {$: "Granted"}, "in_call": true, "active": _t_2, "phase": _phase_4, "latest_id": _id_4, "captured_at_ms": _at_4, "provider_event_id": _event_5, "failure_code": _error_4};
        }
      } else {
        const _109_0 = _s_0["active"];
        const _phase_5 = _s_0["phase"];
        const _id_5 = _s_0["latest_id"];
        const _at_5 = _s_0["captured_at_ms"];
        const _event_6 = _s_0["provider_event_id"];
        const _error_5 = _s_0["failure_code"];
        return {$: "State", "permission": {$: "Granted"}, "in_call": _t_1, "active": _109_0, "phase": _phase_5, "latest_id": _id_5, "captured_at_ms": _at_5, "provider_event_id": _event_6, "failure_code": _error_5};
      }
    } else {
      const _108_0 = _s_0["in_call"];
      const _109_1 = _s_0["active"];
      const _phase_6 = _s_0["phase"];
      const _id_6 = _s_0["latest_id"];
      const _at_6 = _s_0["captured_at_ms"];
      const _event_7 = _s_0["provider_event_id"];
      const _error_6 = _s_0["failure_code"];
      return {$: "State", "permission": _t_0, "in_call": _108_0, "active": _109_1, "phase": _phase_6, "latest_id": _id_6, "captured_at_ms": _at_6, "provider_event_id": _event_7, "failure_code": _error_6};
    }
  } else if (_event_0.$ === "CameraStarted") {
    const _t_3 = _s_0["permission"];
    if (_t_3.$ === "Granted") {
      const _t_4 = _s_0["in_call"];
      if (_t_4) {
        const _t_5 = _s_0["active"];
        if (!_t_5) {
          const _t_6 = _s_0["phase"];
          if (_t_6.$ === "Starting") {
            const _id_7 = _s_0["latest_id"];
            const _at_7 = _s_0["captured_at_ms"];
            const _event_8 = _s_0["provider_event_id"];
            return {$: "State", "permission": {$: "Granted"}, "in_call": true, "active": true, "phase": {$: "Ready"}, "latest_id": _id_7, "captured_at_ms": _at_7, "provider_event_id": _event_8, "failure_code": ""};
          } else {
            const _id_8 = _s_0["latest_id"];
            const _at_8 = _s_0["captured_at_ms"];
            const _event_9 = _s_0["provider_event_id"];
            const _error_8 = _s_0["failure_code"];
            return {$: "State", "permission": {$: "Granted"}, "in_call": true, "active": false, "phase": _t_6, "latest_id": _id_8, "captured_at_ms": _at_8, "provider_event_id": _event_9, "failure_code": _error_8};
          }
        } else {
          const _113_0 = _s_0["phase"];
          const _id_9 = _s_0["latest_id"];
          const _at_9 = _s_0["captured_at_ms"];
          const _event_10 = _s_0["provider_event_id"];
          const _error_9 = _s_0["failure_code"];
          return {$: "State", "permission": {$: "Granted"}, "in_call": true, "active": _t_5, "phase": _113_0, "latest_id": _id_9, "captured_at_ms": _at_9, "provider_event_id": _event_10, "failure_code": _error_9};
        }
      } else {
        const _112_0 = _s_0["active"];
        const _113_1 = _s_0["phase"];
        const _id_10 = _s_0["latest_id"];
        const _at_10 = _s_0["captured_at_ms"];
        const _event_11 = _s_0["provider_event_id"];
        const _error_10 = _s_0["failure_code"];
        return {$: "State", "permission": {$: "Granted"}, "in_call": _t_4, "active": _112_0, "phase": _113_1, "latest_id": _id_10, "captured_at_ms": _at_10, "provider_event_id": _event_11, "failure_code": _error_10};
      }
    } else {
      const _111_0 = _s_0["in_call"];
      const _112_1 = _s_0["active"];
      const _113_2 = _s_0["phase"];
      const _id_11 = _s_0["latest_id"];
      const _at_11 = _s_0["captured_at_ms"];
      const _event_12 = _s_0["provider_event_id"];
      const _error_11 = _s_0["failure_code"];
      return {$: "State", "permission": _t_3, "in_call": _111_0, "active": _112_1, "phase": _113_2, "latest_id": _id_11, "captured_at_ms": _at_11, "provider_event_id": _event_12, "failure_code": _error_11};
    }
  } else if (_event_0.$ === "Queue") {
    const _metadata_0 = _event_0["metadata"];
    return $Bool$pick$(($queue_allowed$(_metadata_0, _s_0)), ($queued$(_metadata_0, _s_0)), _s_0);
  } else if (_event_0.$ === "Submitted") {
    const _id_12 = _event_0["id"];
    const _event_13 = _event_0["event_id"];
    return $submit$(_id_12, _event_13, _s_0);
  } else if (_event_0.$ === "Acknowledged") {
    const _id_13 = _event_0["id"];
    const _event_14 = _event_0["event_id"];
    return $acknowledge$(_id_13, _event_14, _s_0);
  } else if (_event_0.$ === "Rejected") {
    const _id_14 = _event_0["id"];
    const _code_0 = _event_0["code"];
    return $reject$(_id_14, _code_0, _s_0);
  } else {
    const _code_1 = _event_0["code"];
    return $failed$(_code_1, _s_0);
  }
}

function $phase_name$(_phase_0) {
  if (_phase_0.$ === "Off") {
    return "off";
  } else if (_phase_0.$ === "Starting") {
    return "starting";
  } else if (_phase_0.$ === "Ready") {
    return "ready";
  } else if (_phase_0.$ === "Pending") {
    return "pending";
  } else if (_phase_0.$ === "Sent") {
    return "sent";
  } else if (_phase_0.$ === "Accepted") {
    return "accepted";
  } else {
    return "error";
  }
}

function $status$(_s_0) {
  const _phase_0 = _s_0["phase"];
  return $phase_name$(_phase_0);
}

function $mime$(_format_0) {
  if (_format_0.$ === "PNG") {
    return "image/png";
  } else {
    return "image/jpeg";
  }
}

function $realtime_image$(_event_id_0, _item_id_0, _image_0) {
  const _format_0 = _image_0["format"];
  const _payload_0 = _image_0["payload_base64"];
  const _x_0 = ($mime$(_format_0));
  const _x_1 = (";base64," + _payload_0);
  const _x_2 = (_x_0 + _x_1);
  const _x_3 = ($$$$047$$$047ai$047bend$047wire_json$quote$(("data:" + _x_2)));
  const _x_4 = (_x_3 + "}]}}");
  const _x_5 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_item_id_0));
  const _x_6 = (",\"type\":\"message\",\"role\":\"user\",\"content\":[{\"type\":\"input_image\",\"image_url\":" + _x_4);
  const _x_7 = (_x_5 + _x_6);
  const _x_8 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_event_id_0));
  const _x_9 = (",\"item\":{\"id\":" + _x_7);
  const _x_10 = (_x_8 + _x_9);
  return ("{\"type\":\"conversation.item.create\",\"event_id\":" + _x_10);
}

function $live_context$(_event_id_0, _findings_0) {
  const _x_0 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_findings_0));
  const _x_1 = (_x_0 + "}");
  const _x_2 = ($$$$047$$$047ai$047bend$047wire_json$quote$(_event_id_0));
  const _x_3 = (",\"delegation_id\":null,\"content\":" + _x_1);
  const _x_4 = (_x_2 + _x_3);
  return ("{\"type\":\"session.instructions.append\",\"event_id\":" + _x_4);
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

function $Bool$not$(_b_0) {
  if (!_b_0) {
    return true;
  } else {
    return false;
  }
}

function $Nat$is_ge$(_a_0, _b_0) {
  return $Cmp$is_ge$(cmp_new(_a_0, _b_0));
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

function $Cmp$is_ge$(_c_0) {
  if (_c_0.$ === "LT") {
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

function $0m0(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "State": at = at[key] = {...v, "captured_at_ms": BigInt(v["captured_at_ms"])}; return top[0];
      default: throw "bend: State has no tag " + v?.$ + " (its tags: State); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m1(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "State": at = at[key] = {...v, "captured_at_ms": nat_host(v["captured_at_ms"])}; return top[0];
      default: throw "bend: State has no tag " + v?.$ + " (its tags: State); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m2(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Metadata": at = at[key] = {...v, "captured_at_ms": nat_host(v["captured_at_ms"])}; return top[0];
      default: throw "bend: Metadata has no tag " + v?.$ + " (its tags: Metadata); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m3(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Metadata": at = at[key] = {...v, "captured_at_ms": BigInt(v["captured_at_ms"])}; return top[0];
      default: throw "bend: Metadata has no tag " + v?.$ + " (its tags: Metadata); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m4(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Consent": at[key] = v; return top[0];
      case "Revoke": at[key] = v; return top[0];
      case "BeginCall": at[key] = v; return top[0];
      case "EndCall": at[key] = v; return top[0];
      case "StartRequested": at[key] = v; return top[0];
      case "CameraStarted": at[key] = v; return top[0];
      case "Stop": at[key] = v; return top[0];
      case "Queue": at = at[key] = {...v, "metadata": $0m2(v["metadata"])}; return top[0];
      case "Submitted": at[key] = v; return top[0];
      case "Acknowledged": at[key] = v; return top[0];
      case "Rejected": at[key] = v; return top[0];
      case "Failed": at[key] = v; return top[0];
      default: throw "bend: VisionEvent has no tag " + v?.$ + " (its tags: Consent, Revoke, BeginCall, EndCall, StartRequested, CameraStarted, Stop, Queue, Submitted, Acknowledged, Rejected, Failed); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m5(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Consent": at[key] = v; return top[0];
      case "Revoke": at[key] = v; return top[0];
      case "BeginCall": at[key] = v; return top[0];
      case "EndCall": at[key] = v; return top[0];
      case "StartRequested": at[key] = v; return top[0];
      case "CameraStarted": at[key] = v; return top[0];
      case "Stop": at[key] = v; return top[0];
      case "Queue": at = at[key] = {...v, "metadata": $0m3(v["metadata"])}; return top[0];
      case "Submitted": at[key] = v; return top[0];
      case "Acknowledged": at[key] = v; return top[0];
      case "Rejected": at[key] = v; return top[0];
      case "Failed": at[key] = v; return top[0];
      default: throw "bend: VisionEvent has no tag " + v?.$ + " (its tags: Consent, Revoke, BeginCall, EndCall, StartRequested, CameraStarted, Stop, Queue, Submitted, Acknowledged, Rejected, Failed); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m6(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "ImageContext": at = at[key] = {...v, "metadata": $0m2(v["metadata"])}; return top[0];
      default: throw "bend: ImageContext has no tag " + v?.$ + " (its tags: ImageContext); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m7(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "ImageContext": at = at[key] = {...v, "metadata": $0m3(v["metadata"])}; return top[0];
      default: throw "bend: ImageContext has no tag " + v?.$ + " (its tags: ImageContext); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
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
  "initial": run_lib(() => { const r = $0m0(run_loop($initial$()));  return r; }, 0),
  "off": run_lib((a0) => { const r = $0m0(run_loop($off$($0m1(a0)))); $0m0(a0); return r; }, 1),
  "available": run_lib((a0) => { const r = (run_loop($available$($0m1(a0)))); $0m0(a0); return r; }, 1),
  "can_queue": run_lib((a0) => { const r = (run_loop($can_queue$($0m1(a0)))); $0m0(a0); return r; }, 1),
  "queue_allowed": run_lib((a0, a1) => { const r = (run_loop($queue_allowed$($0m2(a0), $0m1(a1)))); $0m3(a0); $0m0(a1); return r; }, 2),
  "queued": run_lib((a0, a1) => { const r = $0m0(run_loop($queued$($0m2(a0), $0m1(a1)))); $0m3(a0); $0m0(a1); return r; }, 2),
  "submit": run_lib((a0, a1, a2) => { const r = $0m0(run_loop($submit$((a0), (a1), $0m1(a2)))); (a0); (a1); $0m0(a2); return r; }, 3),
  "acknowledge": run_lib((a0, a1, a2) => { const r = $0m0(run_loop($acknowledge$((a0), (a1), $0m1(a2)))); (a0); (a1); $0m0(a2); return r; }, 3),
  "reject": run_lib((a0, a1, a2) => { const r = $0m0(run_loop($reject$((a0), (a1), $0m1(a2)))); (a0); (a1); $0m0(a2); return r; }, 3),
  "failed": run_lib((a0, a1) => { const r = $0m0(run_loop($failed$((a0), $0m1(a1)))); (a0); $0m0(a1); return r; }, 2),
  "reduce": run_lib((a0, a1) => { const r = $0m0(run_loop($reduce$($0m4(a0), $0m1(a1)))); $0m5(a0); $0m0(a1); return r; }, 2),
  "phase_name": run_lib((a0) => { const r = (run_loop($phase_name$((a0)))); (a0); return r; }, 1),
  "status": run_lib((a0) => { const r = (run_loop($status$($0m1(a0)))); $0m0(a0); return r; }, 1),
  "mime": run_lib((a0) => { const r = (run_loop($mime$((a0)))); (a0); return r; }, 1),
  "realtime_image": run_lib((a0, a1, a2) => { const r = (run_loop($realtime_image$((a0), (a1), $0m6(a2)))); (a0); (a1); $0m7(a2); return r; }, 3),
  "live_context": run_lib((a0, a1) => { const r = (run_loop($live_context$((a0), (a1)))); (a0); (a1); return r; }, 2),
};
