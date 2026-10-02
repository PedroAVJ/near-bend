import App from '../build/app.mjs';
import {drive} from './drive.mjs';
import {rows} from './schema.mjs';
import {createSpritePlayer} from './nearling-player.mjs';
import {glassTier} from './glass.mjs';
import {createShapePainter, place} from './shapes.mjs';
import {framed, model, route, breadcrumbs, fit, zoomAt, gesture, labels, dotStep, openingCamera, fitAll, TITLE_PX} from './canvas-layout.mjs';

// Browser projection only: pages, sections, frame positions and every specimen
// box come from compiled Bend. This file paints them and handles pan/zoom.
const root = document.documentElement, viewport = document.querySelector('#viewport'), world = document.querySelector('#world');
const pagesNav = document.querySelector('#pages'), layerList = document.querySelector('#layer-list'), crumbs = document.querySelector('#breadcrumbs');
const jump = document.querySelector('#jump'), toggle = document.querySelector('#layout-toggle'), zoomLevel = document.querySelector('#zoom-level');
const SVG = 'http://www.w3.org/2000/svg', TILT = 55;
const pointers = new Map();
let view = {x: 0, y: 0, scale: 1}, workspace = null, m = null, current = null;
let layoutOn = /^(1|on|true)$/.test(new URL(location.href).searchParams.get('layout') || '');
// ?samples=1 shows transitions as static 0/33/66/100% samples instead of the live scrubber.
const samplesView = /^(1|on|true)$/.test(new URL(location.href).searchParams.get('samples') || '');
// The Scheme case (Dark | Light) picks the token value of every colour role.
const DARK = {$: 'tokens.Scheme.Dark'}, LIGHT = {$: 'tokens.Scheme.Light'};
let scheme = new URL(location.href).searchParams.get('scheme') === 'light' ? LIGHT : DARK;
// Colour fields are roles of the field's kind (text, surface, line, stop),
// each in a state; tokens.bend turns role + state + scheme into a colour.
const tokenCache = new Map();
const token = (kind, s, ...args) => { const k = kind + JSON.stringify(args) + s.$; if (!tokenCache.has(k)) tokenCache.set(k, App['tokens.' + kind](...args, s)); return tokenCache.get(k); };
const REST = {$: 'tokens.State.Rest'};
const surfaceColor = (name, s = scheme) => token('surface', s, {$: 'tokens.SurfaceRole.' + name}, REST);
const textColor = (name, s = scheme) => token('text', s, {$: 'tokens.TextRole.' + name}, REST);
// Liquid Glass tier for this browser (glass.mjs): 2 refraction (Chromium), 1 CSS, 0 solid.
const GLASS_TIER = glassTier();
root.dataset.glassTier = String(GLASS_TIER);

function apply() {
  root.style.setProperty('--canvas-scale', String(view.scale));
  world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.scale + ')';
  const step = dotStep(view.scale);
  viewport.style.backgroundSize = step + 'px ' + step + 'px';
  viewport.style.backgroundPosition = (view.x - step / 2) + 'px ' + (view.y - step / 2) + 'px';
  const show = labels(view.scale);
  root.dataset.labels = [show.frames ? '' : 'no-frames', show.titles ? '' : 'no-titles'].join(' ').trim();
  zoomLevel.textContent = Math.round(view.scale * 100) + '%';
}
function dimensions() {
  const rect = viewport.getBoundingClientRect();
  return {width: rect.width || innerWidth, height: rect.height || innerHeight - 44, left: rect.left, top: rect.top};
}
function zoom(ratio, x, y) { view = zoomAt(view, ratio, x, y); apply(); }
function position(e) { const d = dimensions(); return {x: e.clientX - d.left, y: e.clientY - d.top}; }
function movePointer(id, point) {
  if (!pointers.has(id)) return;
  const before = gesture(pointers.values());
  pointers.set(id, point);
  const after = gesture(pointers.values());
  if (before.distance > 0 && after.distance > 0) zoom(after.distance / before.distance, before.x, before.y);
  view.x += after.x - before.x; view.y += after.y - before.y; apply();
}

// Input: drag or one finger pans, two fingers pinch, trackpad scroll pans,
// pinch / ctrl+wheel / cmd+wheel zooms at the pointer, Shift+1 fits the page.
viewport.addEventListener('pointerdown', e => {
  if (e.target.closest('iframe,a,button,input,textarea,select,.app-device')) return;
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
  viewport.setPointerCapture?.(e.pointerId); viewport.classList.add('panning');
  pointers.set(e.pointerId, position(e));
});
viewport.addEventListener('pointermove', e => movePointer(e.pointerId, position(e)));
for (const kind of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(kind, e => { pointers.delete(e.pointerId); if (!pointers.size) viewport.classList.remove('panning'); });
viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? dimensions().height : 1;
  const dx = (e.deltaX || 0) * unit, dy = (e.deltaY || 0) * unit;
  if (e.ctrlKey || e.metaKey) { const p = position(e); zoom(Math.exp(-Math.max(-60, Math.min(60, dy)) * .01), p.x, p.y); }
  else if (e.shiftKey && !dx) { view.x -= dy; apply(); }
  else { view.x -= dx; view.y -= dy; apply(); }
}, {passive: false});
function fitPage() { const d = dimensions(); view = fitAll(current.page, d.width, d.height); apply(); }
window.addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea,select')) return;
  if (e.shiftKey && (e.code === 'Digit1' || e.key === '!')) { e.preventDefault(); fitPage(); return; }
  const moves = {ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40]};
  if (moves[e.key] && !e.target.closest?.('a,button')) { e.preventDefault(); view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply(); }
  else if (['+', '=', '-'].includes(e.key) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); const d = dimensions(); zoom(e.key === '-' ? 1 / 1.25 : 1.25, d.width / 2, d.height / 2); }
});
document.querySelector('#zoom-in').addEventListener('click', () => { const d = dimensions(); zoom(1.25, d.width / 2, d.height / 2); });
document.querySelector('#zoom-out').addEventListener('click', () => { const d = dimensions(); zoom(1 / 1.25, d.width / 2, d.height / 2); });
zoomLevel.addEventListener('click', fitPage);
jump.addEventListener('change', () => { location.hash = jump.value; });

// Specimen painting -------------------------------------------------------
const axisName = axis => axis.$.split('.').pop();
const axisClass = axis => ({Horizontal: 'h', Vertical: 'v', Depth: 'd'})[axisName(axis)];
const caseName = x => x.$.split('.').pop();
// Screen frames carry thousands of boxes; typed lists elsewhere keep the default limit.
const BOXES = 50000, boxRows = xs => rows(xs, BOXES);
const paintShape = createShapePainter(App, {defaultScheme: () => scheme, tier: GLASS_TIER});
function specimenFrame(frame, host) {
  const s = frame.specimen, boxes = boxRows(s.boxes), layers = rows(s.layers);
  host.classList.add('specimen'); host.dataset.kind = s.section;
  const kicker = document.createElement('div'); kicker.className = 'kicker'; kicker.textContent = s.kicker;
  const title = document.createElement('h3'); title.textContent = s.title;
  const caption = document.createElement('p'); caption.className = 'caption'; caption.textContent = s.caption; caption.style.width = s.panel_width + 'px';
  // A component's declared state slice, set just above its panel (Bend measured both notes).
  const slice = document.createElement('p'); slice.className = 'slice'; slice.textContent = s.slice; slice.style.width = s.panel_width + 'px'; slice.style.bottom = (s.height - s.panel_y + 10) + 'px';
  // One panel in the toolbar's scheme, or one panel per declared Panel (each
  // with its own boxes and scheme), side by side.
  const declared = rows(s.panels);
  const panels = declared.length ? declared.map((p, i) => [p.scheme, i * (s.panel_width + 20), boxRows(p.boxes)]) : [[scheme, 0, boxes]];
  const overlay = document.createElement('div'); overlay.className = 'overlay'; overlay.setAttribute('aria-hidden', 'true');
  const made = [];
  for (const [sch, shift, own] of panels) {
    const flat = own.filter(b => b.mark.$.split('.').pop() !== 'Spacing');
    const panel = place(document.createElement('div'), {x: s.panel_x + shift, y: s.panel_y, width: s.panel_width, height: s.panel_height});
    panel.className = 'near-panel'; panel.dataset.scheme = sch.$.split('.').pop().toLowerCase(); panel.style.background = surfaceColor('Background', sch);
    const composite = document.createElement('div'); composite.className = 'composite';
    for (const b of own) {
      const kind = b.mark.$.split('.').pop();
      if (kind === 'Draw') composite.append(paintShape(b, s.panel_x, s.panel_y, sch));
      else {
        const el = place(document.createElement('div'), b, -shift, 0);
        el.className = (kind === 'Outline' ? 'outline ' : 'spacing ') + axisClass(b.mark.axis);
        el.dataset.name = b.name; el.dataset.axis = axisName(b.mark.axis); el.dataset.level = String(b.level);
        overlay.append(el);
      }
    }
    // Accessibility: every node named "role · label" gets a role tag.
    for (const b of flat) {
      const match = /^(button|textbox|list|listitem|status|img|group|banner|heading|text|dialog)(, disabled)? · (.*)$/.exec(b.name);
      if (!match) continue;
      const tag = document.createElement('div'); tag.className = 'role-tag' + (match[2] ? ' disabled' : '');
      tag.style.left = (b.x + shift) + 'px'; tag.style.top = (b.y + b.height) + 'px';
      tag.textContent = match[1] + (match[2] || '') + ': ' + (match[3].length > 28 ? match[3].slice(0, 27) + '…' : match[3]);
      tag.dataset.role = match[1]; tag.dataset.label = match[3];
      overlay.append(tag);
    }
    // Focus order (derived from Layout reading order) as numbered badges.
    boxRows(s.focus).forEach((index, i) => {
      const b = flat[index], badge = document.createElement('div'); badge.className = 'focus-badge';
      badge.style.left = (b.x + shift) + 'px'; badge.style.top = b.y + 'px'; badge.textContent = String(i + 1); badge.dataset.name = b.name;
      overlay.append(badge);
    });
    panel.append(composite);
    if (declared.length) { const tag = document.createElement('div'); tag.className = 'scheme-tag'; tag.textContent = panel.dataset.scheme === 'dark' ? 'Dark' : 'Light'; tag.style.color = textColor('Muted', sch); panel.append(tag); }
    made.push(panel);
  }
  // The size ranges and thresholds, under the slice.
  const sizes = document.createElement('p'); sizes.className = 'slice sizes'; sizes.textContent = s.sizes; sizes.style.width = s.panel_width + 'px';
  host.append(kicker, title, caption, ...(s.slice ? [slice] : []), ...(s.sizes ? [sizes] : []), ...made, overlay);
  if (s.slice && s.sizes) {
    // Stack the notes: the sizes note sits just above the panel, the slice above it.
    sizes.style.bottom = (s.height - s.panel_y + 10) + 'px';
    slice.style.bottom = (s.height - s.panel_y + 10 + 6 + 16 * noteLines(s.sizes, s.panel_width)) + 'px';
  }
  for (const player of rows(s.players)) mountPlayer(player, s, host, boxes);
  if (layers.length) {
    // Exploded Depth view: same boxes, grouped by the root Depth layer index.
    const exploded = document.createElement('div'); exploded.className = 'exploded'; exploded.setAttribute('aria-label', 'Depth layers, bottom to top');
    const base = boxes[0];
    for (const layer of layers) {
      const sheet = place(document.createElement('div'), {x: layer.cx - layer.width / 2, y: layer.cy - layer.height / 2, width: layer.width, height: layer.height});
      sheet.style.transform = 'rotateX(' + TILT + 'deg) rotateZ(-45deg) scale(' + layer.scale / 100 + ')';
      sheet.className = 'sheet' + (layer.index === 0 ? ' base' : ''); sheet.dataset.layer = String(layer.index); sheet.dataset.name = layer.name;
      if (layer.index === 0) sheet.style.background = surfaceColor('Background');
      for (const b of boxes) if (b.mark.$ === 'primitives.Draw' && b.layer === layer.index && b.level > 0) sheet.append(paintShape(b, base.x, base.y));
      exploded.append(sheet);
    }
    for (const layer of layers) {
      const label = document.createElement('div'); label.className = 'sheet-label';
      // Left corner of the tilted sheet: rotateZ(-45deg), then rotateX squashes y.
      const k = layer.scale / 100 / (2 * Math.SQRT2);
      label.style.left = (layer.cx - (layer.width + layer.height) * k) + 'px';
      label.style.top = (layer.cy + (layer.width - layer.height) * k * Math.cos(TILT * Math.PI / 180)) + 'px';
      label.innerHTML = '<b></b>'; label.firstChild.textContent = String(layer.index + 1); label.append(layer.name);
      exploded.append(label);
    }
    host.append(exploded);
  }
}

// Live stages ---------------------------------------------------------------
// Time and box size are state: the browser drives the clock or the drag and
// asks Bend for the frame (kit_canvas.stage_boxes / sized_boxes); it paints.
const noteLines = (text, width) => App['metrics.lines'] ? rows(App['metrics.lines'](text, width - 8, {$: 'primitives.TextType', name: 'Note', size: 11, weight: 500})).length : 1;
const players = [];
const stageCache = new Map();
const cached = (key, make) => { if (!stageCache.has(key)) { if (stageCache.size > 4000) stageCache.clear(); stageCache.set(key, make()); } return stageCache.get(key); };
// Component motion and resize stages come from the same compiled Bend specimen source.
const stageModule = () => 'kit_canvas';
const stageBoxes = (p, t, reduced) => cached('m|' + p.key + '|' + t + '|' + reduced, () => boxRows(App[stageModule(p.key) + '.stage_boxes'](p.key, t, reduced, p.width, p.height)));
const sizedBoxes = (key, w) => cached('s|' + key + '|' + w, () => boxRows(App[stageModule(key) + '.sized_boxes'](key, w, 0)));
function paintStage(el, boxes) {
  el.replaceChildren(...boxes.filter(b => b.mark.$ === 'primitives.Draw').map(b => paintShape(b, 0, 0, scheme, true)));
}
function outlineBox(boxes, name) { return boxes.find(b => b.name === name && b.mark.$ === 'primitives.Outline'); }
function stageEl(host, b, cls) {
  const el = place(document.createElement('div'), b); el.className = 'stage ' + cls; el.style.background = surfaceColor('Background'); host.append(el); return el;
}
function mountPlayer(p, s, host, boxes) {
  if (p.kind === 'resize') return mountResize(p, s, host, boxes);

  // Static samples (?samples=1): one stage per sample time.
  for (const b of boxes.filter(b => b.mark.$ === 'primitives.Outline' && b.name.startsWith('Stage:' + p.key + ':'))) {
    const mode = b.name.slice(('Stage:' + p.key + ':').length);
    if (mode === 'live' || mode === 'reduced') continue;
    const reduced = mode.startsWith('r'), pct = Number(reduced ? mode.slice(1) : mode), t = Math.floor(p.duration * pct / 100);
    const el = stageEl(host, b, 'sample'); el.dataset.key = p.key; el.dataset.t = String(t); el.dataset.reduced = String(reduced);
    paintStage(el, stageBoxes(p, t, reduced));
  }
  const live = outlineBox(boxes, 'Stage:' + p.key + ':live'); if (!live) return;
  const state = {p, t: 0, playing: true, loop: true, hold: 0, stages: [], host};
  for (const [mode, reduced] of [['live', false], ['reduced', true]]) {
    const b = outlineBox(boxes, 'Stage:' + p.key + ':' + mode);
    const el = stageEl(host, b, mode); el.dataset.key = p.key; el.dataset.reduced = String(reduced); state.stages.push([el, reduced]);
  }
  const bar = outlineBox(boxes, 'Controls:' + p.key);
  const controls = place(document.createElement('div'), bar); controls.className = 'controls'; controls.dataset.key = p.key;
  const play = document.createElement('button'); play.type = 'button'; play.className = 'play';
  const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = '1000'; range.step = '1'; range.setAttribute('aria-label', 'Time: ' + p.label);
  const time = document.createElement('span'); time.className = 'time';
  const loopLabel = document.createElement('label'); const loop = document.createElement('input'); loop.type = 'checkbox'; loop.checked = true; loopLabel.append(loop, ' loop');
  controls.append(play, range, time, loopLabel); host.append(controls);
  state.controls = {play, range, time, loop};
  play.addEventListener('click', () => { state.playing = !state.playing; if (state.playing && state.t >= p.duration) state.t = 0; render(state); });
  range.addEventListener('input', () => { state.playing = false; state.t = Math.round(p.duration * Number(range.value) / 1000); render(state); });
  loop.addEventListener('change', () => { state.loop = loop.checked; });
  players.push(state); render(state);
}
function render(state) {
  const {p, controls} = state, t = Math.max(0, Math.min(p.duration, Math.round(state.t)));
  for (const [el, reduced] of state.stages) { el.dataset.t = String(t); paintStage(el, stageBoxes(p, t, reduced)); }
  controls.range.value = String(p.duration ? Math.round(t * 1000 / p.duration) : 0);
  controls.time.textContent = t + ' / ' + p.duration + ' ms';
  controls.play.textContent = state.playing ? 'Pause' : 'Play'; controls.play.setAttribute('aria-pressed', String(state.playing));
}
function mountResize(p, s, host, boxes) {
  const b = outlineBox(boxes, 'Resize:' + p.key); if (!b) return;
  const el = stageEl(host, b, 'resize'); el.dataset.key = p.key;
  const handle = document.createElement('div'); handle.className = 'resize-handle'; handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', 'Box width'); handle.setAttribute('aria-valuemin', String(p.min)); handle.setAttribute('aria-valuemax', String(p.max)); handle.tabIndex = 0;
  host.append(handle);
  const state = {p, w: p.start};
  const draw = () => {
    state.w = Math.max(p.min, Math.min(p.max, Math.round(state.w)));
    el.dataset.width = String(state.w); paintStage(el, sizedBoxes(p.key, state.w));
    handle.style.left = (b.x + 12 + state.w) + 'px'; handle.style.top = (b.y + 12) + 'px'; handle.style.height = (b.height - 24) + 'px';
    handle.setAttribute('aria-valuenow', String(state.w));
  };
  // Content is laid out at the stage's origin; keep 12pt of room around it.
  el.style.padding = '0'; el.dataset.inset = '12';
  let drag = null;
  handle.addEventListener('pointerdown', e => { e.stopPropagation(); drag = {x: e.clientX, w: state.w}; handle.setPointerCapture?.(e.pointerId); });
  handle.addEventListener('pointermove', e => { if (!drag) return; state.w = drag.w + (e.clientX - drag.x) / view.scale; draw(); });
  handle.addEventListener('pointerup', () => { drag = null; });
  handle.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); state.w += (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1); draw(); } });
  state.draw = draw; state.el = el; state.handle = handle;
  resizers.push(state); draw();
}
const resizers = [];

// The interactive App -----------------------------------------------------------
const frameOverrides = {};
let last = 0;
function tick(now) {
  const dt = last ? Math.min(64, now - last) : 16; last = now;
  for (const st of players) {
    if (!st.playing || st.host.closest('.page')?.hidden) continue;
    if (st.t >= st.p.duration) { st.hold += dt; if (st.hold < 500) continue; if (st.loop) { st.t = 0; st.hold = 0; } else { st.playing = false; render(st); continue; } }
    st.t = Math.min(st.p.duration, st.t + dt); render(st);
  }
  requestAnimationFrame(tick);
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);

// Preview frames (existing Pages / App content) ------------------------------
function previewFrame() { throw Error('Only framework specimens are present in this canvas'); }

function edgeLayer(edges) {
  const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('class', 'edges'); svg.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS(SVG, 'defs'), marker = document.createElementNS(SVG, 'marker'), tip = document.createElementNS(SVG, 'path');
  marker.setAttribute('id', 'edge-arrow'); marker.setAttribute('viewBox', '0 0 10 10'); marker.setAttribute('refX', '9'); marker.setAttribute('refY', '5');
  marker.setAttribute('markerUnits', 'userSpaceOnUse'); marker.setAttribute('markerWidth', '14'); marker.setAttribute('markerHeight', '14'); marker.setAttribute('orient', 'auto');
  tip.setAttribute('d', 'M1 1L9 5L1 9z'); marker.append(tip); defs.append(marker); svg.append(defs);
  for (const e of edges) {
    const dx = Math.max(32, (e.x2 - e.x1) / 2), path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', 'M' + e.x1 + ' ' + e.y1 + 'C' + (e.x1 + dx) + ' ' + e.y1 + ' ' + (e.x2 - dx) + ' ' + e.y2 + ' ' + e.x2 + ' ' + e.y2);
    path.setAttribute('marker-end', 'url(#edge-arrow)'); path.dataset.from = e.from; path.dataset.to = e.to;
    svg.append(path);
  }
  return svg;
}
function link(id, label) { const a = document.createElement('a'); a.href = '#' + id; a.textContent = label; return a; }
function icon(kind) {
  const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('width', '12'); svg.setAttribute('height', '12'); svg.setAttribute('viewBox', '0 0 12 12'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.2');
  path.setAttribute('d', kind === 'section' ? 'M1.5 2.5h9v7h-9zM1.5 4.5h9' : 'M4 1v10M8 1v10M1 4h10M1 8h10');
  svg.append(path); return svg;
}
function layout() {
  m = model(workspace, layoutOn, samplesView, frameOverrides);
  for (const s of m.sections) { const el = world.querySelector('.section[data-section="' + s.id + '"]'); if (el) place(el, s); }
  for (const f of m.frames) { const el = world.querySelector('.node[data-node="' + f.id + '"]'); if (el) place(el, f); }
  if (current) current = route(m, location.hash || '#' + current.id);
}
function build(data) {
  workspace = data; m = model(workspace, layoutOn, samplesView, frameOverrides);
  for (const page of m.pages) {
    const a = link(page.id, ''); a.innerHTML = '<span class="check" aria-hidden="true">✓</span>'; a.append(page.label); pagesNav.append(a);
    const option = document.createElement('option'); option.value = page.id; option.textContent = page.label; jump.append(option);
    const group = document.createElement('optgroup'); group.label = page.label;
    const layer = document.createElement('div'); layer.className = 'page'; layer.dataset.page = page.id; world.append(layer);
    if (page.edges.length) layer.append(edgeLayer(page.edges));
    const addSection = (s, depth) => {
      if (!s.bare) {
        const section = place(document.createElement('section'), s); section.className = 'section' + (depth ? ' nested' : ''); section.dataset.section = s.id; section.setAttribute('aria-label', s.label);
        const title = link(s.id, s.label); title.className = 'section-title'; section.append(title); layer.append(section);
      }
      if (s.children.length) { for (const c of s.children) addSection(c, depth + 1); return; }
      const prefix = s.bare ? '' : (s.parent ? m.sections.find(p => p.id === s.parent).label + ' · ' : '') + s.label + ' · ';
      for (const f of s.frames) {
        const o = document.createElement('option'); o.value = f.id; o.textContent = prefix + f.label; group.append(o);
        const host = place(document.createElement('section'), f); host.className = 'node frame'; host.dataset.node = f.id; host.setAttribute('aria-label', f.label + ' frame');
        const label = link(f.id, f.label); label.className = 'frame-label';
        label.addEventListener('dblclick', () => { const iframe = host.querySelector('iframe'); if (iframe) iframe.src = iframe.src; });
        host.append(label);
        if (f.type === 'specimen') specimenFrame(f, host); else previewFrame(f, host);
        layer.append(host);
      }
    };
    for (const s of page.sections) addSection(s, 0);
    jump.append(group);
  }
  createSpritePlayer(App).startNearling(world);
  setScheme(scheme === LIGHT ? 'light' : 'dark', false);
  setLayout(layoutOn, false);
  focus();
  return {$: 'Unit'};
}
function sidebar() {
  for (const a of pagesNav.querySelectorAll('a')) { if (a.getAttribute('href') === '#' + current.page.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  layerList.replaceChildren();
  const selected = current.frame?.id || current.section?.id;
  const add = (s, depth) => {
    // A bare set lists its frames directly, one level up.
    if (s.bare) depth -= 1;
    else { const a = link(s.id, s.label); a.className = 'layer-section'; a.dataset.depth = String(depth); a.prepend(icon('section')); if (selected === s.id) a.setAttribute('aria-current', 'true'); layerList.append(a); }
    if (s.children.length) { for (const c of s.children) add(c, depth + 1); return; }
    for (const f of s.frames) { const b = link(f.id, f.label); b.className = 'layer-frame'; b.dataset.depth = String(depth + 1); b.prepend(icon('frame')); if (selected === f.id) b.setAttribute('aria-current', 'true'); layerList.append(b); }
  };
  for (const s of current.page.sections) add(s, 0);
  crumbs.replaceChildren();
  const path = breadcrumbs(current);
  path.forEach((item, i) => {
    if (i) { const divider = document.createElement('span'); divider.textContent = '/'; divider.setAttribute('aria-hidden', 'true'); crumbs.append(divider); }
    const a = link(item.id, item.label); if (i === path.length - 1) a.setAttribute('aria-current', 'page'); crumbs.append(a);
  });
  jump.value = current.id;
  toggle.hidden = current.page.id !== 'primitives';
}
function focus() {
  if (!m) return;
  current = route(m, location.hash);
  for (const layer of world.querySelectorAll('.page')) layer.hidden = layer.dataset.page !== current.page.id;
  for (const el of world.querySelectorAll('.node')) el.classList.toggle('selected', el.dataset.node === current.frame?.id);
  const d = dimensions();
  view = current.frame ? fit(current.frame, d.width, d.height, 48, 1, TITLE_PX) : current.section ? fit(current.section, d.width, d.height, 40, 1, TITLE_PX) : openingCamera(current.page, d.width, d.height);
  sidebar(); apply();
}
function setLayout(on, write = true) {
  layoutOn = on; root.dataset.layout = on ? 'on' : 'off'; toggle.setAttribute('aria-pressed', String(on));
  if (write && typeof history !== 'undefined' && history.replaceState) {
    const url = new URL(location.href); if (on) url.searchParams.set('layout', '1'); else url.searchParams.delete('layout');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  if (workspace) layout();
}
toggle.addEventListener('click', () => setLayout(!layoutOn));
// Dark | Light: re-render every specimen with the chosen token values.
const schemeButtons = [...document.querySelectorAll('#scheme button')];
function setScheme(next, write = true) {
  scheme = next === 'light' ? LIGHT : DARK;
  for (const b of schemeButtons) b.setAttribute('aria-pressed', String(b.dataset.scheme === next));
  if (write && typeof history !== 'undefined' && history.replaceState) {
    const url = new URL(location.href); if (next === 'light') url.searchParams.set('scheme', 'light'); else url.searchParams.delete('scheme');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  if (!m) return;
  for (const f of m.frames) if (f.type === 'specimen') {
    const host = world.querySelector('.node[data-node="' + f.id + '"]'); if (!host) continue;
    for (const child of [...host.children]) if (!child.classList.contains('frame-label')) child.remove();
    specimenFrame(f, host);
  }
}
for (const b of schemeButtons) b.addEventListener('click', () => setScheme(b.dataset.scheme));
window.addEventListener('hashchange', focus);
window.addEventListener('resize', focus);
drive(App.paint_workspace(), {workspace: build});
