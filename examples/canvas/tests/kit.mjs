import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import App from '../dist/build/app.mjs';
import {rows as typedRows} from '../src/schema.mjs';
// Screen frames and the sign-off law read thousands of boxes.
const rows = (xs, max = 50000) => typedRows(xs, max);
import {drive} from '../src/drive.mjs';
import {readFileSync} from 'node:fs';
import {generate, OUTPUT} from '../scripts/gen/kit_canvas.mjs';

// src/kit_canvas.bend is generated: the committed file equals the generator's output.
assert.equal(readFileSync(OUTPUT, 'utf8'), generate(), 'src/kit_canvas.bend is stale or hand-edited: run npm run gen');

// Compiled kit.bend and kit_canvas.bend: components built from Shape and
// Layout, declared slices, Remote values, motion, accessibility, text rules,
// size cases and the Conversation send.
const K = name => App['kit.' + name], C = name => App['kit_canvas.' + name];
const list = xs => xs.reduceRight((tail, head) => ({$: 'Con', head, tail}), {$: 'Nil'});
const c = (name, fields = {}) => ({$: 'kit.' + name, ...fields});
const unit = {$: 'Unit'}, none = {$: 'None'}, some = value => ({$: 'Some', value});
const tree = x => JSON.stringify(x.tree);
const kind = x => x.$.split('.').pop();
const REMOTE = ['Loading', 'Ready', 'Pending', 'Failed'];
const remote = (kase, value) => kase === 'Loading' ? c('Loading') : kase === 'Failed' ? c('Failed', {last: none}) : c(kase, {value});
const distinct = (label, trees) => assert.equal(new Set(trees).size, trees.length, label + ' draws every case differently');
const moment = (now, reduced = false) => c('Moment', {now, pref: c(reduced ? 'Motion.Reduced' : 'Motion.Full')});
const still = moment(0);
const placed = t => rows(K('placed')(t));
const draws = bx => bx.filter(b => b.mark.$ === 'primitives.Draw');
const COL = 320;

let workspace = null;
await drive(App.paint_workspace(), {workspace: w => { workspace = w; return unit; }});
const live = rows(workspace.specimens).filter(s => s.section === 'kit'), samples = rows(workspace.samples).filter(s => s.section === 'kit');
const frame = id => live.find(s => s.id === id), sampleFrame = id => samples.find(s => s.id === id);
const notesOf = s => rows(s.boxes).filter(b => b.name === 'Case').map(b => b.mark.shape.geometry.string);
assert.equal(live.length, 14); assert.equal(samples.length, 14);

// Remote: every Remote-typed slice part is drawn in all four cases --------------
const label = c('Intent.Send'), text_form = c('Form.Text');
for (const k of ['Primary', 'Quiet']) {
  distinct('Button served (' + k + ')', REMOTE.map(r => tree(K('button')(c('ButtonKind.' + k), c('Served', {form: text_form}), c('ServedState.Enabled', {pressed: c('Press.Up'), content: remote(r, label)})))));
  distinct('Button served, disabled (' + k + ')', REMOTE.map(r => tree(K('button')(c('ButtonKind.' + k), c('Served', {form: text_form}), c('ServedState.Disabled', {content: remote(r, label)})))));
}
const waiting = K('button')(c('ButtonKind.Primary'), c('Served', {form: text_form}), c('ServedState.Enabled', {pressed: c('Press.Up'), content: c('Loading')}));
assert.match(tree(waiting), /"Spinner"/); assert.doesNotMatch(tree(waiting), /"Enviar"/);
const words = t => c('Said.Words', {text: t});
const near = K('bubble')(c('Role.Near'), unit, words('Hola'), c('Presence.Shown'), COL);
const items = list([c('Said', {bubble: near}), c('Receipt', {label: 'Read', time: '12:52'})]);
const threadOf = messages => tree(K('thread')(K('calm')(messages, c('Typing.Hidden')), COL));
distinct('Thread messages', REMOTE.map(r => threadOf(remote(r, items))));
assert.notEqual(threadOf(c('Ready', {value: list([])})), threadOf(c('Ready', {value: items})), 'Ready with no items is the empty state');
for (const [id, cases] of [['button', ['Served · Loading', 'Served · Ready', 'Served · Pending', 'Served · Failed']],
  ['thread', ['messages · Loading', 'Ready · no items', 'Ready · items', 'Pending · items', 'messages · Failed']]])
  for (const kase of cases) assert(notesOf(frame(id)).includes(kase), id + ' matrix shows ' + kase);
for (const kase of ['Near · no slice', 'Mine · Sending', 'Mine · Sent', 'Mine · Failed', 'Mine · photo · Sending', 'Mine · photo · Sent', 'Mine · photo · Failed', 'Shown', 'Reserved (draws nothing)']) assert(notesOf(frame('bubble')).includes(kase), 'bubble shows ' + kase);

// Bubble presence: Reserved takes its space and draws nothing ---------------------
for (const [role, slice] of [['Near', unit], ['Mine', c('Delivery.Sending')], ['Mine', c('Delivery.Failed')]]) {
  const shown = K('bubble')(c('Role.' + role), slice, words('Can you see the component preview?'), c('Presence.Shown'), COL).tree;
  const reserved = K('bubble')(c('Role.' + role), slice, words('Can you see the component preview?'), c('Presence.Reserved'), COL).tree;
  assert.equal(reserved.name, 'Reserved');
  assert.deepEqual([K('width')(reserved), K('height')(reserved)], [K('width')(shown), K('height')(shown)], role + ': Reserved occupies the Shown size');
  assert.equal(draws(placed(reserved)).length, 0, role + ': Reserved draws nothing');
  assert(draws(placed(shown)).length > 0);
}

// Photo bubbles: a Rounded shape with an Image fill (a photo), with delivery.
const photo = d => placed(K('bubble')(c('Role.Mine'), c('Delivery.' + d), c('Said.Photo', {picture: c('Picture', {asset:'sample-image.svg', width:480, height:360, label:'Neutral geometric sample'})}), c('Presence.Shown'), COL).tree);
const photoShape = draws(photo('Sent')).find(b => b.name === 'Photo').mark.shape;
assert.equal(photoShape.geometry.$, 'primitives.Rounded'); assert.equal(photoShape.fill.$, 'primitives.Image'); assert.equal(photoShape.fill.bitmap.$, 'primitives.Bitmap.Photo');
assert.equal(photoShape.fill.bitmap.asset, 'sample-image.svg');
assert(photo('Sending').some(b => b.name === 'listitem · Tú: Neutral geometric sample') && draws(photo('Sending')).some(b => b.mark.shape.geometry.string === 'Enviando…'));
assert(photo('Failed').some(b => b.name === 'button · Reintentar envío'));
// Composer: one pill [ + | text | mic | Send ] (the reference); the camera lives under the +.
const composerBoxes = (draft, size = 'Regular') => placed(K('composer')(K('plain')(c('Lines.Growing', {cap: 4}), 'Escribe a Near', list([]), c('FieldState', {draft, focus: c('Focus.Blurred')})), c('ComposerSize.' + size), COL).tree);
{
  const bx = composerBoxes(''), pill = bx.find(b => b.name === 'Pill'), pillBox = bx.find(b => b.name === 'Container' && b.width === pill.width);
  const order = bx.filter(b => /^(button|textbox)(, disabled)? · /.test(b.name)).map(b => b.name);
  assert.deepEqual(order, ['button · Adjuntar', 'textbox · Escribe a Near', 'button · Dictar', 'button, disabled · Enviar'], 'one pill: + | text | mic | Send (Disabled rule while empty)');
  for (const b of bx.filter(b => /^(button|textbox)/.test(b.name))) assert(b.x >= pill.x && b.x + b.width <= pill.x + pill.width && b.y >= pill.y && b.y + b.height <= pill.y + pill.height, b.name + ' sits inside the pill');
  assert(!bx.some(b => /Tomar foto/.test(b.name)), 'no separate camera button');
  const inside = (outer, name) => bx.find(b => b.name === name && b.x >= outer.x && b.y >= outer.y && b.x + b.width <= outer.x + outer.width && b.y + b.height <= outer.y + outer.height);
  for (const n of ['button · Adjuntar', 'button · Dictar']) {
    const btn = bx.find(b => b.name === n), cont = inside(btn, 'Container');
    assert.equal(kind(cont.mark.shape.fill), 'None', n + ' is Plain: no container fill'); assert.equal(kind(cont.mark.shape.stroke), 'NoStroke', n + ' has no ring');
    assert(btn.width >= 44 && btn.height >= 44, n + ' press region ≥ 44pt');
  }
  const send = bx.find(b => b.name === 'button, disabled · Enviar'), circle = inside(send, 'Container');
  assert.equal(kind(circle.mark.shape.fill), 'Solid'); assert.equal(circle.mark.shape.fill.color.$, 'tokens.SurfaceRole.Action', 'Send is filled with Action (the icon-only accent)');
  assert.equal(pillBox.mark.shape.fill.color.$, 'tokens.SurfaceRole.Field', 'the pill is the Field surface');
  assert.deepEqual([pillBox.mark.shape.stroke.color.$, pillBox.mark.shape.stroke.width], ['tokens.LineRole.Edge', '0.5'], 'a faint, half-point decorative Edge');
  const arrow = bx.find(b => b.name === 'Send' && kind(b.mark.shape.geometry) === 'Path' && b.x >= send.x && b.x + b.width <= send.x + send.width);
  assert(Number(arrow.mark.shape.stroke.width) < Number(arrow.mark.shape.geometry.drawing.width), 'a thin arrow: its stroke is thinner than the drawing\'s own (the approved geometry is unchanged)');
  assert.equal(arrow.width, 11);
  assert.equal(circle.mark.shape.fill.state.$, 'tokens.State.Disabled', 'empty draft: the Disabled rule (50% opacity, the reference dimmed look)');
  assert.equal(kind(circle.mark.shape.stroke), 'NoStroke', 'no outline or ring');
  assert.equal(circle.width, circle.height); assert.equal(kind(circle.mark.shape.geometry.radius), 'Full');
  const right = pillBox.x + pillBox.width - (circle.x + circle.width), top = circle.y - pillBox.y, bottom = pillBox.y + pillBox.height - (circle.y + circle.height);
  assert.deepEqual([top, bottom, right], [(pillBox.height - circle.height) / 2, (pillBox.height - circle.height) / 2, 7], 'Send is centred vertically with the approved right inset');
  const mid = b => b.y + b.height / 2, centre = mid(pillBox);
  for (const n of ['button · Adjuntar', 'textbox · Escribe a Near', 'button · Dictar', 'button, disabled · Enviar']) assert.equal(mid(bx.find(b => b.name === n)), centre, n + ' is vertically centred in the pill');
  assert(Math.abs(mid(bx.find(b => b.name === 'Line')) - centre) <= 0.5, 'the placeholder line is vertically centred (21pt line in 44pt: within half a point)');
  assert(composerBoxes('Hola').some(b => b.name === 'button · Enviar'), 'a draft enables Send');
  assert.equal(composerBoxes('Hola').filter(b => b.name === 'Container' && b.mark.shape.fill.color?.$ === 'tokens.SurfaceRole.Action').at(-1).mark.shape.fill.state.$, 'tokens.State.Rest');
  assert(!composerBoxes('', 'Compact').some(b => /Enviar/.test(b.name)), 'Compact empty: no Send');
  assert(composerBoxes('Hola', 'Compact').some(b => b.name === 'button · Enviar'), 'Compact filled: Send');
  const open = placed(K('attach_panel')(c('Lang.Es')));
  assert.deepEqual(open.filter(b => /^button · /.test(b.name)).map(b => b.name), ['button · Cámara', 'button · Fotos', 'button · Archivos'], 'the attach panel derives its three rows from intents');
  assert.equal(App['primitives.queued']().$, 'Con');
}

// Conversation: the send flight on a shared clock ----------------------------------
const msgs = C('conversation_messages')(COL), text = C('sent_text')(), H = 420;
const flight = K('start_send')('Escribe a Near', COL, H, msgs, text, 1000);
assert.equal(flight.$, 'kit.Transitioning'); assert.equal(flight.started_at, 1000);
const area = a => [a.x, a.y, a.width, a.height];
// from: the composer's text box before sending (draft typed, Settled).
const settledDraft = placed(K('conversation')('Escribe a Near', COL, H, c('Settled'), c('SettledState', {messages: c('Ready', {value: msgs}), draft: text, focus: c('Focus.Focused'), menu: c('AttachMenu.Closed')})).tree);
const textBox = settledDraft.find(b => b.name === 'Field text');
assert.deepEqual(area(flight.from), [textBox.x, textBox.y, textBox.width, textBox.height], 'flight starts at the composer text box');
// to: the new bubble's final box (Settled, bubble Shown, still Sending).
const after = placed(K('conversation')('Escribe a Near', COL, H, c('Settled'), c('SettledState', {messages: c('Ready', {value: K('append_items')(msgs, list([K('mine_new')(text, c('Presence.Shown'), COL)]))}), draft: '', focus: c('Focus.Blurred'), menu: c('AttachMenu.Closed')})).tree);
const myBubbles = draws(after).filter(b => b.name === 'Container' && b.mark.shape.fill.color?.$ === 'tokens.SurfaceRole.Mine' && kind(b.mark.shape.geometry.radius) === 'Corner');
const finalPill = myBubbles.at(-1);
assert.deepEqual(area(flight.to), [finalPill.x, finalPill.y, finalPill.width, finalPill.height], 'flight lands on the bubble\'s final box');
// Shared clock: the Thread's transition starts at the same time, same duration.
const motion = K('sending_motion')(3, flight.started_at);
assert.equal(motion.started_at, flight.started_at, 'same started_at');
assert.equal(K('duration_ms')(K('item_t')().duration), K('duration_ms')(K('send_t')().duration), 'same duration token (Normal)');
assert.equal(kind(K('send_t')().duration), 'Normal');
const sending = now => placed(K('conversation')('Escribe a Near', COL, H, flight, c('SendingState', {messages: msgs, text, moment: moment(now)})).tree);
const at = now => { const bx = sending(now); return {copy: bx.find(b => b.name === 'Flight'), slot: bx.find(b => b.name === 'Slot' || b.name === 'Reserved'), field: bx.find(b => b.name === 'Field text')}; };
const dur = K('duration_ms')(K('send_t')().duration);
assert.deepEqual(area(at(1000).copy), area(flight.from), '0%: the copy is the composer text box');
const mid = at(1000 + Math.floor(dur / 3)), mid2 = at(1000 + Math.floor(2 * dur / 3)), end = at(1000 + dur);
assert(mid.slot.height > 0 && mid.slot.height < mid2.slot.height && mid2.slot.height < end.slot.height, 'the slot grows from 0 to full');
assert.equal(at(1000).slot.height, 0, 'the slot starts at 0');
assert.deepEqual(area(end.copy), area(flight.to), '100%: the copy reaches its final box');
assert.equal(end.slot.name, 'Reserved', '100%: the slot is the Reserved bubble at full size');
assert.deepEqual([end.copy.x + end.copy.width, end.copy.y], [end.slot.x + end.slot.width, end.slot.y], '100%: copy and slot coincide (the pill at the top right of its slot)');
{ const bx = sending(1000 + dur), under = bx.slice(0, bx.findIndex(b => b.name === 'Flight layer'));
  const inSlot = b => b.x >= end.slot.x && b.y >= end.slot.y && b.x + b.width <= end.slot.x + end.slot.width && b.y + b.height <= end.slot.y + end.slot.height;
  assert.equal(draws(under).filter(inSlot).length, 0, 'under the copy, the slot draws nothing'); }
assert(draws(sending(1000)).some(b => b.mark.shape.geometry.string === 'Escribe a Near'), 'the composer is already cleared (placeholder)');
// Reduced motion: the flight snaps to its end.
const snapped = placed(K('conversation')('Escribe a Near', COL, H, flight, c('SendingState', {messages: msgs, text, moment: moment(1000, true)})).tree).find(b => b.name === 'Flight');
assert.deepEqual(area(snapped), area(flight.to));

// Motion: every declared transition, live and as samples ---------------------------
const transitions = rows(K('transitions')());
assert.equal(transitions.length, 14);
for (const t of transitions) {
  const owner = live.find(s => rows(s.players).some(p => p.key === t.key));
  assert(owner, t.key + ' has a live player');
  const p = rows(owner.players).find(p => p.key === t.key);
  assert.equal(p.kind, 'motion'); assert.equal(p.duration, K('duration_ms')(t.duration));
  assert.match(p.label, new RegExp(t.trigger.replace(/[.*+?^${}()|[\]\\']/g, '.') + '.*' + K('duration_name')(t.duration) + ' ' + K('duration_ms')(t.duration) + ' ms.*' + K('reason_name')(t.reason)), t.key + ' caption: trigger, token, reason');
  const names = rows(owner.boxes).map(b => b.name);
  for (const mode of ['live', 'reduced']) assert(names.includes('Stage:' + t.key + ':' + mode), t.key + ' live stage ' + mode);
  assert(names.includes('Controls:' + t.key), t.key + ' controls');
  const sampleNames = rows(sampleFrame(owner.id).boxes).map(b => b.name);
  for (const pct of ['0', '33', '66', '100', 'r0', 'r33', 'r66', 'r100']) assert(sampleNames.includes('Stage:' + t.key + ':' + pct), t.key + ' sample ' + pct);
  // Reduced motion forces Instant, except content motion.
  const snaps = kind(t.reason) !== 'Content';
  for (const now of [0, 50, 160]) assert.equal(K('progress')(0, moment(now, true), t) === 1000, snaps || K('duration_ms')(t.duration) === 0, t.key + ' reduced at ' + now);
  // Content motion (the dots' lift, the pet's frame) keeps running under reduced motion.
  const CONTENT = ['Lift', 'Dot', 'Dot column', 'Near'];
  const boxesAt = (now, r, all = false) => JSON.stringify(rows(C('stage_boxes')(t.key, now, r, p.width, p.height)).filter(b => all || !CONTENT.includes(b.name)).map(b => [b.name, b.x, b.y, b.width, b.height, JSON.stringify(b.mark)]));
  if (snaps) assert.ok(boxesAt(0, true) === boxesAt(p.duration, false), t.key + ': reduced motion snaps to the end');
  else assert.ok(boxesAt(150, true, true) !== boxesAt(450, true, true), t.key + ': content motion keeps moving under reduced motion');
  assert.ok(boxesAt(0, false, true) !== boxesAt(Math.floor(p.duration * 0.33), false, true), t.key + ' moves');
}
assert.equal(kind(K('dots_t')().reason), 'Content'); assert.equal(kind(K('pet_t')().reason), 'Content'); assert.equal(kind(K('press_t')().reason), 'Feedback'); assert.equal(kind(K('press_t')().duration), 'Fast');
for (const k of ['item_t', 'keyboard_t', 'reply_t', 'appear_t', 'grow_t', 'cap_t', 'send_t', 'hero_leave_t', 'sheet_t']) assert.equal(kind(K(k)().reason), 'Continuity', k);
// Status changes stay Instant and are labelled so.
const instantNotes = live.flatMap(s => notesOf(s).filter(n => / · Instant/.test(n)));
for (const change of ['served Ready → Failed', 'delivery Sending → Sent', 'delivery Sending → Failed', 'send Disabled ↔ Enabled', 'messages Ready → Failed', 'the composer clears on send', 'redeem Loading → Failed', 'phase Ringing → Connected']) assert(instantNotes.some(n => n.startsWith(change)), change + ' is labelled Instant');
assert.equal(rows(K('instants')()).length, 7);
// Press: the container shrinks and the Pressed rule applies past half.
const press = now => draws(placed(K('pressing')(c('ButtonKind.Primary'), label, text_form, c('Press.Up'), c('Transitioning', {from: c('Press.Up'), to: c('Press.Down'), started_at: 0}), moment(now)).tree)).find(b => b.name === 'Container');
assert.equal(press(0).width, K('width')(K('button_tree')(K('act')(c('ButtonKind.Primary'), label, text_form)))); assert.equal(press(160).width, press(0).width - 4, 'the container shrinks 2pt each side'); assert.equal(press(160).mark.shape.fill.state.$, 'tokens.State.Pressed'); assert.equal(press(0).mark.shape.fill.state.$, 'tokens.State.Rest');
// Thread: Near's reply grows out of the typing indicator.
const reply = now => placed(C('reply_stage')(now, false));
assert(reply(0).some(b => b.name === 'Reply') && reply(0).some(b => /status · Near está escribiendo/.test(b.name)), '0%: the indicator');
assert(reply(320).some(b => b.name === 'listitem · Near: Dos kilos, lo anoto.') && !reply(320).some(b => b.name === 'Reply'), '100%: the bubble in its place');
// Keyboard: the inset grows with the same progress as the silhouette.
const kb = now => placed(C('keyboard_stage')(now, false));
assert.equal(kb(320).find(b => b.name === 'Keyboard inset').height, kb(320).find(b => b.name === 'Keyboard silhouette').height);
assert.equal(kb(320).find(b => b.name === 'Keyboard inset').height, 140);

// Field: Lines Growing has Fits and Capped -----------------------------------------
const longText = C('long_message')();
const fieldOf = (draft, grow = c('Settled'), m = still) => K('field')(c('FieldMarkup', {lines: c('Lines.Growing', {cap: 4}), placeholder: 'Escribe a Near', accessories: list([]), state: c('FieldState', {draft, focus: c('Focus.Blurred')}), grow, moment: m}), 236).tree;
const tw = K('text_width')(236, list([]));
assert.equal(kind(K('growth')(c('Lines.Growing', {cap: 4}), 'Hola', tw)), 'Fits');
assert.equal(kind(K('growth')(c('Lines.Growing', {cap: 4}), longText, tw)), 'Capped');
const capped = placed(fieldOf(longText)), fits = placed(fieldOf('A short sample.'));
const container = bx => bx.find(b => b.name === 'Container');
assert.equal(container(capped).height, K('field_height')(4), 'Capped stops at the cap');
assert.equal(draws(capped).filter(b => b.name === 'Line').length, 4, 'Capped shows the last cap lines (scrolled to the end)');
assert.deepEqual(rows(container(capped).mark.shape.effects).map(kind), ['Shadow'], 'Capped gains depth');
assert.deepEqual(rows(container(fits).mark.shape.effects), [], 'Fits has no shadow');
const capMove = now => container(placed(fieldOf(longText, c('Transitioning', {from: 4, to: 5, started_at: 0}), moment(now))));
assert.equal(rows(capMove(0).mark.shape.effects).length, 0); assert.equal(rows(capMove(320).mark.shape.effects)[0].blur, 16, 'Fits → Capped: the shadow fades in');
for (const id of ['field', 'composer']) assert(notesOf(frame(id)).some(n => /Capped/.test(n)), id + ' shows Capped');

// Accessibility ---------------------------------------------------------------------
const ROLE = /^(button|textbox|list|listitem|status|img|group|banner|heading|text|dialog)(, disabled)? · /;
const declared = new Map(rows(K('roles')()).map(r => [r.component, K('role_name')(r.role)]));
assert.equal(declared.size, 16);
for (const s of live) { const role = declared.get(s.label); assert(role, s.label + ' declares a role'); assert(rows(s.boxes).some(b => b.name.startsWith(role + ' · ') || b.name.startsWith(role + ', disabled · ')), s.label + ' draws its role'); }
// Press regions ≥ 44pt, everywhere: frames and stage frames.
// Real-size laws skip the canvas's scaled views (boxes inside a "Scaled NN%" node).
function unscaled(bx) {
  const out = []; let inside = null;
  for (const b of bx) { if (inside !== null && b.level <= inside) inside = null; if (inside === null && /^Scaled \d+%$/.test(b.name)) { inside = b.level; continue; } if (inside === null) out.push(b); }
  return out;
}
const pressRegions = bx => unscaled(bx).filter(b => /^(button|textbox)(, disabled)? · /.test(b.name));
const stageBoxes = transitions.flatMap(t => { const owner = live.find(s => rows(s.players).some(p => p.key === t.key)); const p = rows(owner.players).find(p => p.key === t.key); return [0, p.duration].flatMap(now => rows(C('stage_boxes')(t.key, now, false, p.width, p.height))); });
const allBoxes = [...live.flatMap(s => rows(s.boxes)), ...stageBoxes];
assert(pressRegions(allBoxes).length > 100);
for (const b of pressRegions(allBoxes)) assert(b.width >= 44 && b.height >= 40, b.name + ' press region ' + b.width + '×' + b.height + ' is at least 44pt');
for (const b of pressRegions(live.flatMap(s => rows(s.boxes)))) assert(b.width >= 44 && b.height >= 44, b.name + ' ≥ 44pt');
// Icon-only buttons carry a spoken label (the type requires it; see probes below).
// No unlabeled button exists anywhere: a Button takes an intent, which always has a label.
assert.equal(live.flatMap(s => rows(s.boxes).filter(b => /^button(, disabled)? · $/.test(b.name))).length, 0, 'no unlabeled button');
// Intents: every label is unique and every Button's name is its intent's label, so a label and
// its message cannot disagree; an icon-only Button speaks its intent's label.
{
  const intents = rows(K('intents')()), labels = intents.map(i => K('intent_label')(i));
  assert.equal(new Set(labels).size, labels.length, 'intent labels are unique: ' + labels.join(', '));
  for (const i of intents) for (const form of ['Text', 'Icon', 'Both']) {
    const bx = placed(K('button_tree')(K('act')(c('ButtonKind.Quiet'), i, c('Form.' + form))));
    assert.equal(bx[0].name, 'button · ' + K('intent_label')(i), kind(i) + ' · ' + form + ': the name is the intent');
  }
  const within = placed(K('button_tree')(K('act')(c('ButtonKind.Primary'), c('Intent.AllowMic'), c('Form.Within', {max: 40}))));
  assert.equal(within[0].name, 'button · Permitir micrófono', 'a truncated label keeps its whole spoken name');
  assert(draws(within).some(b => b.mark.shape.geometry.string?.endsWith('…')));
  assert.equal(K('intent_label')(c('Intent.Open', {id: 2, who: 'Near'})), 'Ir al mensaje 3: Near');
  // Every button-named node in every frame is an intent's label (or a search result).
  const localized = ['Es', 'En'].flatMap(lang => intents.map(i => K('intent_text')(i, c('Lang.' + lang))));
  const allowed = new Set(localized.map(l => 'button · ' + l)), disabled = new Set(localized.map(l => 'button, disabled · ' + l));
  for (const b of live.flatMap(s => rows(s.boxes)).filter(b => /^button(, disabled)? · /.test(b.name)))
    assert(allowed.has(b.name) || disabled.has(b.name) || /^button · Ir al mensaje \d+: /.test(b.name) || b.name === 'button, disabled · Esperando', b.name + ' is not an intent label');
}
assert.equal(stageBoxes.filter(b => /^button · $/.test(b.name)).length, 0);
assert(allBoxes.some(b => b.name === 'button · Enviar') && allBoxes.some(b => b.name === 'button · Adjuntar') && allBoxes.some(b => b.name === 'button · Llamar a Near'));
// Header focus: left, center, right (declared override of the Depth rule).
const header = K('header')(C('icon_button')(c('Intent.Menu')), C('idle')(), C('icon_button')(c('Intent.Call')), COL).tree;
const order = (t, f) => { const out = []; const walk = n => { if (n.$ === 'primitives.Last') return; out.push(n.name); if (n.$ === 'primitives.Node') walk(n.first); walk(n.next); }; walk(t); return rows(f(t)).map(i => out[i]); };
assert.deepEqual(order(header, App['primitives.focus_order']), ['button · Menú', 'button · Llamar a Near']);
assert.deepEqual(order(header, App['primitives.reading_order']), ['button · Llamar a Near', 'button · Menú'], 'without the override the top layer reads first');

// Extreme content: text rules -------------------------------------------------------
const texts = bx => draws(bx).filter(b => b.mark.shape.geometry.$ === 'primitives.Text');
const within = K('button_tree')(K('act')(c('ButtonKind.Primary'), c('Intent.AllowMic'), c('Form.Within', {max: 60})));
assert(texts(placed(within)).find(b => b.name === 'Label').mark.shape.geometry.string.endsWith('…'), 'a label within a narrow box truncates (Truncate rule)');
assert(K('width')(within) <= 60 + 36);
for (const i of rows(K('intents')())) assert(K('width')(K('button_tree')(K('act')(c('ButtonKind.Primary'), i, c('Form.Text')))) <= K('label_max')() + 36, kind(i) + ' fits label_max');
assert(texts(placed(K('badge_tree')(K('badge')(C('long_name')()))))[0].mark.shape.geometry.string.endsWith('…'), 'a long badge name truncates');
const longBubble = texts(placed(K('bubble_tree')(K('bubble')(c('Role.Near'), unit, words(longText), c('Presence.Shown'), COL))));
assert(longBubble.length > 4, 'a long message wraps');
for (const b of longBubble) assert(b.width <= K('text_max')(COL) + 1, 'wrapped lines fit 75% of the box');
// Readability: no body line is longer than about 70 characters.
for (const b of texts(live.flatMap(s => rows(s.boxes)))) if (b.mark.shape.geometry.text_type.size >= 15) assert(b.mark.shape.geometry.string.length <= 72, 'line too long: ' + b.mark.shape.geometry.string);
for (const id of ['button', 'badge', 'bubble', 'field']) assert(rows(frame(id).boxes).some(b => b.name === 'Extreme content' || /^Extreme/.test(b.name) || /long/.test(b.name)), id + ' shows extreme content');

// Overflow law: in every frame, every box stays inside its parent ---------------------
// In a stage, motion that enters or leaves the box (the Sheet sliding in, the
// hero leaving, the call sliding up) is clipped by the stage: only those
// carriers may pass their parent's edge, and only in stages.
const CARRIERS = new Set(['Placement', 'Hero', 'Call layer']);
function overflow(bx, moving = false) {
  const flat = bx.filter(b => b.mark.$ !== 'primitives.Spacing'), stack = [], bad = [];
  for (const b of flat) {
    while (stack.length && stack.at(-1).level >= b.level) stack.pop();
    const parent = stack.at(-1);
    if (parent && b.level === parent.level + 1 && !(moving && CARRIERS.has(b.name)) && !(b.x >= parent.x - 1 && b.y >= parent.y - 1 && b.x + b.width <= parent.x + parent.width + 1 && b.y + b.height <= parent.y + parent.height + 1)) bad.push(b.name + ' in ' + parent.name + ' (' + [b.x, b.y, b.width, b.height] + ' vs ' + [parent.x, parent.y, parent.width, parent.height] + ')');
    if (b.mark.$ === 'primitives.Outline') stack.push(b);
  }
  return bad;
}
for (const s of [...live, ...samples]) assert.deepEqual(overflow(rows(s.boxes)), [], s.id + ' overflows');
for (const s of rows(workspace.specimens).filter(s => s.section !== 'kit')) assert.deepEqual(overflow(rows(s.boxes)), [], s.id + ' overflows');
// ... and in every live stage, at its start, middle and end.
for (const s of live) for (const p of rows(s.players).filter(p => p.kind === 'motion')) for (const now of [0, Math.floor(p.duration / 2), p.duration]) for (const r of [false, true])
  assert.deepEqual(overflow(rows(C('stage_boxes')(p.key, now, r, p.width, p.height)), true), [], p.key + ' at ' + now + ' overflows');
// Settled, nothing passes its parent (the carriers included).
for (const [key, t] of [['sheet-open', 320], ['hero-leave', 0]]) assert.deepEqual(overflow(rows(C('stage_boxes')(key, t, false, 400, 600))), [], key + ' settled');

// Size cases: ranges, thresholds, representative boxes ---------------------------------
const viewports = rows(K('viewports')());
assert.deepEqual(viewports.map(v => [v.name, v.width, v.height]), [['Phone portrait', 390, 844], ['Phone landscape', 844, 390], ['Phone with keyboard', 390, 500], ['Desktop', 1440, 900]]);
const caseNames = s => (s.sizes.match(/Sizes: (.*)\./) || [])[1].split(' · ').map(x => x.split(' w ')[0]);
for (const s of live) {
  const cases = caseNames(s), shown = notesOf(s);
  assert(cases.length >= 1, s.id + ' declares size cases');
  for (const kase of cases) assert(kase === 'Fixed' || shown.some(n => new RegExp(' · ' + kase + '( · shown at \\d+%)?$').test(n) && /^(in |typical )/.test(n)), s.id + ': size case ' + kase + ' has a representative box');
}
assert(notesOf(frame('header')).some(n => /^typical Collapsed/.test(n)), 'a case no viewport lands in gets a typical box');
assert(notesOf(frame('conversation')).some(n => /^in Phone portrait: 358×812 · Compact$/.test(n)) && notesOf(frame('conversation')).some(n => /^in Desktop: 1408×868 · Regular · shown at 53%$/.test(n)));
// A box wider than the frame's budget is laid out at its real size and shown scaled to fit.
for (const id of ['conversation', 'sheet', 'welcome-hero']) {
  const s = frame(id), scaledNodes = rows(s.boxes).filter(b => /^Scaled \d+%$/.test(b.name));
  assert(scaledNodes.length >= 1, id + ' scales its desktop box');
  for (const b of scaledNodes) assert(b.width <= C('preset_budget')() + 1, id + ': ' + b.name + ' fits the budget (' + b.width + ')');
  const stage = Math.max(0, ...rows(s.players).filter(p => p.kind === 'resize').map(p => p.width));
  assert(s.width <= Math.max(C('preset_budget')(), stage) + 100, id + ' frame is as wide as its budget or its resize stage (' + s.width + ')');
}
assert.equal(C('scale_for')(1408), 539); assert.equal(C('scale_for')(358), 1000);
// Thresholds switch exactly at the derived value, from the component's own ranges.
const th = K('header_threshold')(C('side')(), C('idle')());
const hcases = C('header_cases')();
assert.equal(K('case_of')(th.at - 1, hcases), 'Collapsed'); assert.equal(K('case_of')(th.at, hcases), 'Full');
assert.equal(th.at, rows(hcases)[0].range.min_width, 'the Full minimum is the threshold');
const ct = K('conversation_threshold')();
assert.equal(K('case_of')(ct.at - 1, K('conversation_sizes')()), 'Compact'); assert.equal(K('case_of')(ct.at, K('conversation_sizes')()), 'Regular');
assert.equal(ct.at, K('readable')() + 48, 'Regular once the box holds the readable width and its margins');
assert(K('readable')() > 400 && K('readable')() < 640, 'readable width of a 70-character sample');
// Resize players: from the smallest minimum up; no overflow at the minimum box.
for (const s of live) for (const p of rows(s.players).filter(p => p.kind === 'resize')) {
  assert(p.min > 0 && p.max > p.min && p.start >= p.min && p.start <= p.max, p.key + ' range');
  assert.deepEqual(overflow(rows(C('sized_boxes')(p.key, p.min, 0))), [], p.key + ' at its minimum box');
  assert(rows(s.boxes).some(b => b.name === 'Resize:' + p.key));
}
assert.equal(live.filter(s => rows(s.players).some(p => p.kind === 'resize')).length, 10);
// New size cases: the hero goes Beside and the Sheet goes Side exactly at their derived thresholds.
for (const [t, cases, below, above] of [[K('hero_threshold')(), K('hero_sizes')(), 'Stacked', 'Beside'], [K('sheet_threshold')(), K('sheet_sizes')(), 'Bottom', 'Side']]) {
  assert.equal(K('case_of')(t.at - 1, cases), below); assert.equal(K('case_of')(t.at, cases), above);
}
assert.equal(K('side_min')(), K('regular_min')() + 24 + K('sheet_w')(), 'Side once the Conversation stays Regular beside the panel');

// Slices and their axes ---------------------------------------------------------------
const parts = name => rows(K(name + '_slice')()).map(p => [p.name, kind(p.source) + ' × ' + kind(p.persistence)]);
assert.deepEqual(parts('button'), [['pressed', 'Local × Ephemeral'], ['intent', 'Server × Persistent'], ['press motion', 'Local × Ephemeral']]);
assert.deepEqual(parts('field'), [['draft', 'Local × Persistent'], ['focus', 'Local × Persistent'], ['grow motion', 'Local × Ephemeral']]);
assert.deepEqual(parts('bubble'), [['delivery', 'Server × Persistent']]);
assert.deepEqual(parts('thread'), [['messages', 'Server × Persistent'], ['scroll', 'Local × Persistent'], ['typing', 'Server × Ephemeral'], ['keyboard', 'Local × Ephemeral'], ['motion', 'Local × Ephemeral']]);
assert.deepEqual(parts('conversation'), [['flight', 'Local × Ephemeral'], ['messages', 'Server × Persistent'], ['draft, focus', 'Local × Persistent'], ['attach menu', 'Local × Ephemeral'], ['text, now', 'Local × Ephemeral']]);
assert.deepEqual(parts('composer'), [], 'attach menu belongs to Conversation; Composer derives size and draft cases');
assert.deepEqual(parts('hero'), [['redeem', 'Server × Persistent'], ['sky', 'Local × Ephemeral']]);
assert.deepEqual(parts('sheet'), [['motion', 'Local × Ephemeral']]);
assert.deepEqual(parts('call'), [['request', 'Local × Ephemeral'], ['phase', 'Server × Ephemeral'], ['mic, speaker', 'Local × Ephemeral'], ['now', 'Local × Ephemeral']]);
// The hero never redeems on load: with a Link and no request it shows the one tap; Loading waits (pessimistic).
const heroOf = (arrival, slice) => tree(K('welcome_hero')('Hola', 'Texto', c('Intent.Enter'), arrival, slice, c('Settled'), still, COL, 480));
const linkArrival = c('Arrival.Link', {token: 'a1'});
assert.match(heroOf(linkArrival, c('HeroState', {redeem: none})), /button · Entrar a Near/);
assert.match(heroOf(linkArrival, c('HeroState', {redeem: some(c('Loading'))})), /button, disabled · Esperando/);
distinct('WelcomeHero', [heroOf(linkArrival, c('HeroState', {redeem: none})), ...REMOTE.map(r => heroOf(linkArrival, c('HeroState', {redeem: some(remote(r, 'Sample User'))}))), heroOf(c('Arrival.NoLink'), unit), heroOf(c('Arrival.Expired'), unit)]);
assert.match(heroOf(c('Arrival.Expired'), unit), /Tu sesión expiró/);
assert.doesNotMatch(heroOf(c('Arrival.NoLink'), unit), /button · /, 'no link, nothing to redeem');
// CallControls: every permission case, hang up on Danger.
const callOf = (perm, slice) => tree(K('call_controls')(c('Permission.' + perm), slice));
const liveCall = (phase, now = 0) => c('LiveCall', {phase, mic: c('Mic.Live'), speaker: c('Speaker.Off'), moment: moment(now)});
distinct('CallControls', [callOf('Unknown', c('Asking.Idle')), callOf('Unknown', c('Asking.Prompting')), callOf('Granted', liveCall(c('Phase.Ringing', {since: 0}))), callOf('Granted', liveCall(c('Phase.Connected', {since: 0}), 42000)), callOf('Granted', liveCall(c('Phase.Ended', {at: 0}))), callOf('Denied', unit)]);
assert.match(callOf('Granted', liveCall(c('Phase.Connected', {since: 1000}), 43000)), /En llamada · 0:42/);
assert.match(callOf('Granted', liveCall(c('Phase.Ringing', {since: 0}))), /"tokens.SurfaceRole.Danger"[^]*button · Colgar|button · Colgar[^]*"tokens.SurfaceRole.Danger"/);
const mode = m => kind(K('mode')(c('Message.' + m)));
assert.equal(mode('Revoke'), 'Pessimistic'); assert.equal(mode('Send'), 'Optimistic');
for (const m of ['Retry', 'CreateAccess', 'Receive', 'Confirm', 'Share']) assert.equal(mode(m), 'Pessimistic');

// Metrics ---------------------------------------------------------------------------------
const body = {$: 'primitives.TextType', name: 'Body', size: 16, weight: 400};
for (const line of rows(App['metrics.lines'](longText, 204, body))) assert(App['metrics.width'](line, body) <= 204, line);
const cut = App['metrics.truncate'](C('long_name')(), 120, body);
assert(cut.endsWith('…') && App['metrics.width'](cut, body) <= 121);

// Type probes: state outside a declared slice, unlabeled icons and wrong roles are rejected
const dir = mkdtempSync(join(tmpdir(), 'kit-slices-'));
try {
  for (const f of ['kit.bend', 'primitives.bend', 'symbols.bend', 'nearling.bend', 'metrics.bend', 'tokens.bend']) copyFileSync('src/' + f, join(dir, f));
  const check = (name, body) => {
    writeFileSync(join(dir, name + '.bend'), 'import Base\nimport ./kit.bend as K\nimport ./nearling.bend as N\nimport ./primitives.bend as P\nimport ./tokens.bend as T\nimport ./symbols.bend as S\n\ndef probe() -> ' + body + '\n');
    const r = spawnSync('bun', ['../../tools/bend/main.ts', join(dir, name + '.bend'), '--check-only'], {encoding: 'utf8', env: {...process.env, BEND_NO_TELEMETRY: '1'}});
    return {ok: r.status === 0 && /ALL PROOFS CHECK/.test(r.stdout + r.stderr) && !/FAIL/.test(r.stdout + r.stderr), out: r.stdout + r.stderr};
  };
  const good = check('good', 'List<&2, K.Bubble>:\n  [K.bubble(K.Role.Near{}, Unit{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, 320), K.bubble(K.Role.Mine{}, K.Delivery.Sent{}, K.Said.Photo{K.Picture{"sample-image.svg", 480, 360, "Neutral geometric sample"}}, K.Presence.Reserved{}, 320)]\n' +
    'def probe2() -> K.NearIdentity:\n  K.near_identity(N.Idle{}, K.Motion.Reduced{}, Unit{})\n' +
    'def probe3() -> K.Button:\n  K.act(K.ButtonKind.Quiet{}, K.Intent.Attach{}, K.Form.Icon{})\n' +
    'def probe4() -> K.Conversation:\n  K.conversation("x", 320, 420, K.Settled{}, K.SettledState{K.Loading{}, "", K.Focus.Blurred{}, K.AttachMenu.Closed{}})\n' +
    'def probe5() -> K.WelcomeHero:\n  K.welcome_hero("a", "b", K.Intent.Enter{}, K.Arrival.Link{"t"}, K.HeroState{None{}}, K.Settled{}, K.still(), 320, 480)\n' +
    'def probe6() -> K.CallControls:\n  K.call_controls(K.Permission.Granted{}, K.LiveCall{K.Phase.Ringing{0}, K.Mic.Live{}, K.Speaker.Off{}, K.still()})');
  assert(good.ok, 'the well-typed program checks:\n' + good.out);
  const bad = [
    ['near-bubble-delivery', 'K.Bubble:\n  K.bubble(K.Role.Near{}, K.Delivery.Sent{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, 320)', /expected\s*:\s*Unit/],
    ['mine-bubble-no-delivery', 'K.Bubble:\n  K.bubble(K.Role.Mine{}, Unit{}, K.Said.Words{"Hola"}, K.Presence.Shown{}, 320)', /expected\s*:\s*K\.Delivery/],
    ['reduced-motion-clock', 'K.NearIdentity:\n  K.near_identity(N.Idle{}, K.Motion.Reduced{}, K.Clock{0})', /expected\s*:\s*Unit/],
    ['fixed-button-served-state', 'K.Button:\n  K.button(K.ButtonKind.Primary{}, K.Fixed{K.Intent.Send{}, K.Form.Text{}}, K.ServedState.Disabled{K.Loading{}})', /expected\s*:\s*K\.FixedState/],
    ['button-without-intent', 'K.Button:\n  K.act(K.ButtonKind.Primary{}, "Enviar", K.Form.Text{})', /expected\s*:\s*K\.Intent/],
    ['disabled-button-pressed', 'K.FixedState:\n  K.FixedState.Disabled{K.Press.Down{}}', /Disabled with 0 fields/],
    ['expired-invite-revoking', 'K.Invite:\n  K.Invite.Expired{K.Revoke.InFlight{}}', /Expired with 0 fields/],
    ['unlabeled-icon-button', 'K.Content:\n  K.Icon{S.drawing(S.Plus{})}', /./],
    ['settled-conversation-given-a-clock', 'K.Conversation:\n  K.conversation("x", 320, 420, K.Settled{}, K.SendingState{[], "x", K.still()})', /expected\s*:\s*K\.SettledState/],
    ['text-filled-with-a-surface-role', 'P.Shape:\n  P.Shape{P.Text{"Hola", P.TextType{"Body", 16, 400}}, P.Solid{T.SurfaceRole.Raised{}, T.State.Rest{}}, P.NoStroke{}, []}', /expected\s*:\s*P\.TextFill/],
    ['bubble-filled-with-a-text-role', 'P.Shape:\n  P.Shape{P.Rounded{40, 40, P.Full{}}, P.TextFill.Solid{T.TextRole.Muted{}, T.State.Rest{}}, P.NoStroke{}, []}', /expected\s*:\s*P\.Fill/],
    ['nolink-hero-given-a-redeem', 'K.WelcomeHero:\n  K.welcome_hero("a", "b", K.Intent.Enter{}, K.Arrival.NoLink{}, K.HeroState{None{}}, K.Settled{}, K.still(), 320, 480)', /expected\s*:\s*Unit/],
    ['denied-call-given-a-request', 'K.CallControls:\n  K.call_controls(K.Permission.Denied{}, K.Asking.Idle{})', /expected\s*:\s*Unit/],
    ['unknown-call-given-a-call', 'K.CallControls:\n  K.call_controls(K.Permission.Unknown{}, K.LiveCall{K.Phase.Ringing{0}, K.Mic.Live{}, K.Speaker.Off{}, K.still()})', /expected\s*:\s*K\.Asking/],
    ['stroke-with-a-surface-role', 'P.Stroke:\n  P.Stroke{T.SurfaceRole.Accent{}, T.State.Rest{}, "1"}', /expected\s*:\s*T\.LineRole/],
  ];
  for (const [name, body, why] of bad) {
    const r = check(name, body);
    assert(!r.ok, name + ' must not check');
    assert.match(r.out, /SOME PROOFS FAIL/, name + ' fails in the checker');
    assert.match(r.out, why, name + ' fails for the right reason');
  }
} finally { rmSync(dir, {recursive: true, force: true}); }

console.log('PASS generic component kit: 14 reusable specimens; remote/error states, motion, resizing, accessibility, no overflow, generation drift and rejected type probes.');
