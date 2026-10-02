// Generates src/kit_canvas.bend from scripts/gen/kit_canvas.template.bend.
// The template is the source of truth; the generator only writes the lazy
// dispatch chains Bend needs (one `match` per key, so a stage computes only
// the content it is asked for) for the motion and resize stages listed here.
//   node scripts/gen/kit_canvas.mjs          write src/kit_canvas.bend
//   node scripts/gen/kit_canvas.mjs --check  exit 1 if it differs
// scripts/build.mjs runs it before compiling; tests/kit.mjs checks the
// committed file equals generate().
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE = join(here, 'kit_canvas.template.bend');
export const OUTPUT = join(here, '..', '..', 'src', 'kit_canvas.bend');

// [key, stage function, transition]
export const MOTION = [
  ['button-press', 'press_stage', 'K.press_t()'],
  ['field-grow', 'grow_stage', 'K.grow_t()'],
  ['field-cap', 'cap_stage', 'K.cap_t()'],
  ['typing-appear', 'appear_stage', 'K.appear_t()'],
  ['typing-dots', 'dots_stage', 'K.dots_t()'],
  ['near-pet', 'pet_stage', 'K.pet_t()'],
  ['thread-item', 'item_stage', 'K.item_t()'],
  ['thread-keyboard', 'keyboard_stage', 'K.keyboard_t()'],
  ['thread-reply', 'reply_stage', 'K.reply_t()'],
  ['composer-cap', 'composer_cap_stage', 'K.composer_cap_t()'],
  ['conversation-send', 'send_stage', 'K.send_t()'],
  ['hero-leave', 'hero_leave_stage', 'K.hero_leave_t()'],
  ['sheet-open', 'sheet_open_stage', 'K.sheet_t()'],
  ['thread-highlight', 'highlight_stage', 'K.highlight_t()'],
];
// [key, sized function]
export const RESIZE = [
  ['button-resize', 'button_sized'], ['badge-resize', 'badge_sized'], ['bubble-resize', 'bubble_sized'],
  ['field-resize', 'field_sized'], ['header-resize', 'header_sized'], ['composer-resize', 'composer_sized'],
  ['thread-resize', 'thread_sized'], ['conversation-resize', 'conversation_sized'],
  ['hero-resize', 'hero_sized'], ['sheet-resize', 'sheet_sized'],
];

// prefix_i(hit, key, ...) calls fn(keys[i]) on a hit, else tests the next key.
function chain(prefix, keys, sigParams, callParams, ret, fallback, fnOf) {
  const out = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    const next = i + 1 < keys.length ? `${prefix}_${i + 1}(String.eq(key, "${keys[i + 1][0]}"), key, ${callParams})` : fallback;
    out.push(`def ${prefix}_${i}(hit: Bool, +key: String, ${sigParams}) -> ${ret}:\n  match hit:\n    case True{}: ${fnOf(keys[i])}(${callParams})\n    case False{}: ${next}`);
  }
  out.push(`def ${prefix}(+key: String, ${sigParams}) -> ${ret}:\n  ${prefix}_0(String.eq(key, "${keys[0][0]}"), key, ${callParams})`);
  return out.join('\n');
}

export function generate() {
  const empty = 'K.spacer("Empty", 1, 1, P.Leading{})';
  return readFileSync(TEMPLATE, 'utf8')
    .replace('%%TRANSITION_DEFS%%', MOTION.map(k => `def t_${k[1]}(+u: Bool) -> K.Transition: ${k[2]}`).join('\n'))
    .replace('%%MOTION_CHAIN%%', chain('motion_content', MOTION, '+t: U32, +r: Bool', 't, r', 'P.Tree', empty, k => k[1]))
    .replace('%%TRANSITION_CHAIN%%', chain('transition_of', MOTION, '+u: Bool', 'u', 'K.Transition', 'K.press_t()', k => 't_' + k[1]))
    .replace('%%SIZED_CHAIN%%', chain('sized_content', RESIZE, '+w: U32, +h: U32', 'w, h', 'P.Tree', empty, k => k[1]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = generate();
  if (process.argv.includes('--check')) {
    if (readFileSync(OUTPUT, 'utf8') !== src) { console.error('src/kit_canvas.bend is stale: run npm run gen'); process.exit(1); }
  } else writeFileSync(OUTPUT, src);
}
