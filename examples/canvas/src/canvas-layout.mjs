// Browser projection helpers. Page/section/frame structure, frame positions and
// specimen geometry come from Bend (canvas.bend, primitives.bend);
// this module only measures extents, resolves routes and computes cameras.
import {rows} from './schema.mjs';

export const SECTION_PADDING = 48;   // world units between a section edge and its frames
export const LABEL_PX = 14;          // screen height reserved for a frame name (11px text)
export const TITLE_PX = 24;          // screen height reserved for a section title
export const NEST_PADDING = 16;      // world units between a parent section and its nested sections
export const GROUP_TITLE = 56;       // extra world room above a nested section for its title
export const AXIS_COLORS = {Horizontal: '#f24822', Vertical: '#0d99ff', Depth: '#9747ff'};

export const framed = node => ['app', 'view', 'template'].includes(node.kind);
export function box(node) {
  return {x: Number(node.x), y: Number(node.y), width: framed(node) ? 482 : 402, height: framed(node) ? 942 : node.id === 'symbols' ? 322 : 312};
}
export function extent(items, padding = 0) {
  const x = Math.min(...items.map(b => b.x)) - padding, y = Math.min(...items.map(b => b.y)) - padding;
  return {x, y, width: Math.max(...items.map(b => b.x + b.width)) - x + padding, height: Math.max(...items.map(b => b.y + b.height)) - y + padding};
}

// Decodes the Bend Workspace into pages > sections (> nested sections) > frames.
// `wide` selects the width a specimen declares for the layout overlay (the
// exploded Depth view). A leaf section is the padded extent of its frames; a
// parent section is the extent of its children, padded by NEST_PADDING with
// GROUP_TITLE extra room on top for the first child's title.
// `samples` swaps the frames with players (components, screen live frames)
// for their static-sample twins (?samples=1: transitions as 0/33/66/100%
// frames, for screenshots and tests).
// `overrides` swaps a frame's specimen by id (the App's device frame, which
// the device picker replaces with Bend's frame for another device).
export function model(workspace, wide = false, samples = false, overrides = {}) {
  // Each frame with a static-sample twin is swapped for it, in place.
  const twins = samples && workspace.samples ? new Map(rows(workspace.samples).map(s => [s.id, s])) : new Map();
  const specimens = rows(workspace.specimens).map(s => overrides[s.id] || twins.get(s.id) || s);
  const frames = [
    ...specimens.map(s => ({id: s.id, label: s.label, type: 'specimen', key: s.section, x: s.x, y: s.y, width: wide ? s.wide : s.width, height: s.height, specimen: s})),
    ...rows(workspace.previews).map(p => ({id: p.id, label: p.label, type: 'preview', key: p.kind, parent: p.parent, ...box(p), preview: p})),
  ];
  // A section with an empty label is a bare set: it places frames but draws no
  // box or title and adds no level to the layers list or breadcrumbs.
  const all = rows(workspace.sections).map(s => ({id: s.id, page: s.page, label: s.label, kind: s.kind, parent: s.parent || null, bare: !s.label}));
  const leaf = s => !all.some(c => c.parent === s.id);
  const sections = [];
  for (const s of all.filter(leaf)) {
    const members = frames.filter(f => f.key === s.kind);
    if (members.length) sections.push({...s, children: [], frames: members, ...extent(members, SECTION_PADDING)});
  }
  for (const s of all.filter(s => !leaf(s))) {
    const children = sections.filter(c => c.parent === s.id);
    if (!children.length) continue;
    const box = extent(children, NEST_PADDING);
    sections.push({...s, children, frames: children.flatMap(c => c.frames), ...box, y: box.y - GROUP_TITLE, height: box.height + GROUP_TITLE});
  }
  // On a page with nested sections, top-level leaf sections get the same outer
  // padding as the parents, so section edges line up with the nested frames.
  for (const s of sections) if (!s.parent && !s.children.length && sections.some(o => o.page === s.page && o.children.length))
    Object.assign(s, {x: s.x - NEST_PADDING, y: s.y - NEST_PADDING, width: s.width + NEST_PADDING * 2, height: s.height + NEST_PADDING * 2});
  // Keep the Bend order: parents before their children, both in declaration order.
  const order = id => all.findIndex(s => s.id === id);
  sections.sort((a, b) => order(a.id) - order(b.id));
  for (const s of sections) if (!s.children.length) for (const f of s.frames) { f.section = s.id; f.page = s.page; }
  // Frames whose kind no section collects (e.g. the old component previews) are not placed.
  const placed = frames.filter(f => f.section);
  // Dependency edges (used -> user) are drawn on the page of the frame they leave.
  const edges = rows((samples && workspace.sample_edges) || workspace.edges || {$: 'Nil'}).map(e => ({...e, page: placed.find(f => f.id === e.from)?.page}));
  const pages = rows(workspace.pages).map(p => {
    const own = sections.filter(s => s.page === p.id && !s.parent);
    return {id: p.id, label: p.label, sections: own, frames: own.flatMap(s => s.frames), edges: edges.filter(e => e.page === p.id), ...extent(own)};
  });
  return {pages, sections, frames: placed, edges};
}

// Pages win over sections, sections over frames; anything else opens Primitives.
// A nested section (or a frame in one) also carries its parent section.
export function route(m, hash) {
  const id = String(hash || '').replace(/^#/, '');
  const page = m.pages.find(p => p.id === id);
  if (page) return {id, page};
  const parentOf = s => s.parent ? m.sections.find(p => p.id === s.parent) : undefined;
  const section = m.sections.find(s => s.id === id);
  if (section) return {id, section, parent: parentOf(section), page: m.pages.find(p => p.id === section.page)};
  const frame = m.frames.find(f => f.id === id);
  if (frame) { const own = m.sections.find(s => s.id === frame.section); return {id, frame, section: own, parent: parentOf(own), page: m.pages.find(p => p.id === frame.page)}; }
  return {id: m.pages[0].id, page: m.pages[0]};
}
export function breadcrumbs(current) {
  const path = [{id: current.page.id, label: current.page.label}];
  if (current.parent) path.push({id: current.parent.id, label: current.parent.label});
  if (current.section && !current.section.bare) path.push({id: current.section.id, label: current.section.label});
  if (current.frame) path.push({id: current.frame.id, label: current.frame.label});
  return path;
}

export function fit(bounds, width, height, padding = 40, maxScale = 1, top = 0) {
  const scale = Math.max(.02, Math.min(maxScale, (width - padding * 2) / bounds.width, (height - padding * 2 - top) / bounds.height));
  return {scale, x: (width - bounds.width * scale) / 2 - bounds.x * scale, y: top + (height - top - bounds.height * scale) / 2 - bounds.y * scale};
}
export function zoomAt(view, ratio, x, y) {
  const scale = Math.max(.02, Math.min(8, view.scale * ratio)), factor = scale / view.scale;
  return {x: x + (view.x - x) * factor, y: y + (view.y - y) * factor, scale};
}
export function gesture(points) {
  const pts = [...points];
  if (!pts.length) return null;
  if (pts.length === 1) return {...pts[0], distance: 0};
  const [a, b] = pts;
  return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y)};
}

// Frame names and section titles keep a constant screen size, so they are only
// shown while the world gap reserved for them is tall enough on screen.
export function labels(scale) {
  return {frames: scale * SECTION_PADDING >= LABEL_PX, titles: scale * SECTION_PADDING * 2.5 >= TITLE_PX};
}
export function dotStep(scale) {
  let step = 24;
  while (step * scale < 14) step *= 2;
  while (step * scale > 56) step /= 2;
  return step * scale;
}

// Zoom to fit the page. On narrow screens fitting everything makes frames
// unreadable, so the camera fits the page's first frame instead (with its
// section padding, nested sections included); the next column starts off
// screen. On desktop the page always opens fitted: a page too large for
// readable frame names (the Components dependency graph) opens as an
// overview and names appear as you zoom in.
// Shift+1 / the zoom % button: every frame of the page in view.
export const fitAll = (page, width, height) => fit(page, width, height, 40, 1, TITLE_PX);
// A two-scheme frame opens on its Dark panel; a very wide frame on its first
// 440 units (its title, caption and first column).
export const openingWidth = frame => frame.specimen && rows(frame.specimen.panels).length ? frame.specimen.panel_width + 40 : Math.min(frame.width, 440);
export function openingCamera(page, width, height) {
  // The App page opens on the device frame, fitted (the reachability frame is below it).
  if (page.id === 'app' && page.frames[0]) return fit(page.frames[0], width, height, 40, 1, TITLE_PX);
  const all = fitAll(page, width, height);
  if (width >= 700 || labels(all.scale).frames) return all;
  const first = page.sections[0], column = page.frames[0], left = column.x;
  // The frame keeps the same section padding (nested sections included) on both
  // sides. A two-scheme frame opens on its Dark panel; Light is one pan away.
  const margin = 12, scale = Math.min(1, (width - margin * 2) / (openingWidth(column) + (left - first.x) * 2));
  return {scale, x: margin - first.x * scale, y: TITLE_PX + 12 - first.y * scale};
}
