// Liquid Glass renderer: paints the Glass effect case that Bend computed
// (primitives.bend: Glass{blur, saturation, refraction, highlight, tint, edge,
// over}; the values are the tokens.glass() material). Progressive tiers:
//   0  solid: prefers-reduced-transparency (or ?glass=0). The tint composited
//      over the Background, opaque; no backdrop.
//   1  CSS baseline (Safari, Firefox, Chromium): backdrop-filter blur +
//      saturate, the tint at its opacity, a specular gradient along the top
//      edge, an inner rim light and the edge tint.
//   2  tier 1 + refraction (Chromium only: backdrop-filter accepts an SVG
//      filter url()): an feDisplacementMap whose map bends the backdrop near
//      the rim like a lens. Feature-detected; anything else falls back to 1.
// ?glass=0|1|2 forces a tier (tests, comparisons). Nothing here moves, so
// reduced motion needs no change.
const SVG = 'http://www.w3.org/2000/svg';

export function refractionSupported(nav = globalThis.navigator, css = globalThis.CSS) {
  try {
    // Chromium is the only engine that renders url() in backdrop-filter;
    // Safari parses it but paints nothing, so the check also needs the
    // Chromium-only userAgentData brands.
    const chromium = !!nav?.userAgentData?.brands?.some(b => /Chrom/.test(b.brand));
    return chromium && !!css?.supports?.('backdrop-filter', 'url(#near-glass) blur(1px)');
  } catch { return false; }
}
export function glassTier(search = globalThis.location?.search || '', nav = globalThis.navigator, css = globalThis.CSS) {
  const forced = new URLSearchParams(search).get('glass');
  if (forced !== null && /^[012]$/.test(forced)) return Number(forced);
  return refractionSupported(nav, css) ? 2 : 1;
}

const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (hex, a) => 'rgba(' + hexRgb(hex).join(',') + ',' + a + ')';
// The tint over the Background at the tint's opacity (sRGB, as browsers composite).
export function solidOf(tint, background, pct) {
  const t = hexRgb(tint), b = hexRgb(background);
  return '#' + t.map((c, i) => Math.round((c * pct + b[i] * (100 - pct)) / 100).toString(16).padStart(2, '0')).join('');
}

// The displacement map of a rounded box: neutral (128,128) inside, and
// within a band along the edge a vector pointing inward that grows towards
// the rim, so the backdrop is sampled from inside: the rim bends like a
// lens without reading outside the box (which would be transparent).
export function lensMap(w, h, r, band = Math.max(4, Math.min(w, h) * 0.25)) {
  const data = new Uint8ClampedArray(w * h * 4), hw = w / 2, hh = h / 2, rr = Math.min(r, hw, hh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x + 0.5 - hw, dy = y + 0.5 - hh, px = Math.abs(dx) - (hw - rr), py = Math.abs(dy) - (hh - rr);
    const dist = Math.min(Math.max(px, py), 0) + Math.hypot(Math.max(px, 0), Math.max(py, 0)) - rr;
    const depth = -dist, t = Math.max(0, Math.min(1, 1 - depth / band)), mag = t * t;
    let nx, ny;
    if (px > 0 && py > 0) { const l = Math.hypot(px, py) || 1; nx = Math.sign(dx) * px / l; ny = Math.sign(dy) * py / l; }
    else if (px > py) { nx = Math.sign(dx); ny = 0; } else { nx = 0; ny = Math.sign(dy); }
    const i = (y * w + x) * 4;
    data[i] = 128 - nx * mag * 127; data[i + 1] = 128 - ny * mag * 127; data[i + 2] = 128; data[i + 3] = 255;
  }
  return data;
}

const filters = new Map();
let defs = null;
function refractionFilter(w, h, r, strength) {
  const key = [w, h, r, strength].join('-');
  if (filters.has(key)) return filters.get(key);
  const id = 'near-glass-' + key;
  if (!defs) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    defs = document.createElementNS(SVG, 'defs'); svg.append(defs); document.body.append(svg);
  }
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) { filters.set(key, null); return null; }
  ctx.putImageData(new ImageData(lensMap(w, h, r), w, h), 0, 0);
  const filter = document.createElementNS(SVG, 'filter');
  for (const [k, v] of Object.entries({id, x: '0', y: '0', width: String(w), height: String(h), filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB'})) filter.setAttribute(k, v);
  const image = document.createElementNS(SVG, 'feImage');
  for (const [k, v] of Object.entries({href: canvas.toDataURL(), x: '0', y: '0', width: String(w), height: String(h), preserveAspectRatio: 'none', result: 'map'})) image.setAttribute(k, v);
  const move = document.createElementNS(SVG, 'feDisplacementMap');
  for (const [k, v] of Object.entries({in: 'SourceGraphic', in2: 'map', scale: String(strength * 2), xChannelSelector: 'R', yChannelSelector: 'G'})) move.setAttribute(k, v);
  filter.append(image, move); defs.append(filter);
  filters.set(key, id);
  return id;
}

// Paint the Glass effect on a shape's element. `g` is the Bend effect with
// resolved colours: {blur, saturation, refraction, highlight, tint, over,
// tintColor, edgeColor, background, width, height, radius}. Returns the
// box shadows it adds (the caller joins them with the shape's own).
export function paintGlass(el, g, tier = glassTier()) {
  el.classList.add('glass');
  el.dataset.glass = g.over; el.dataset.glassTier = String(tier);
  const solid = solidOf(g.tintColor, g.background, g.tint);
  el.style.setProperty('--glass-solid', solid);
  if (tier === 0) { el.style.backgroundColor = solid; return ['inset 0 0 0 0.5px ' + g.edgeColor]; }
  el.style.backgroundColor = rgba(g.tintColor, g.tint / 100);
  el.style.backgroundImage = 'linear-gradient(180deg,rgba(255,255,255,' + g.highlight / 100 + ') 0%,rgba(255,255,255,0) 50%)';
  const css = 'blur(' + g.blur + 'px) saturate(' + g.saturation + '%)';
  const id = tier >= 2 && g.refraction > 0 ? refractionFilter(Math.round(g.width), Math.round(g.height), Math.round(g.radius), g.refraction) : null;
  // -webkit-backdrop-filter is an alias in Chromium: set it first, so the
  // unprefixed value (with the refraction) wins there; Safari reads it.
  el.style.webkitBackdropFilter = css;
  el.style.backdropFilter = id ? css + ' url(#' + id + ')' : css;
  if (id) el.dataset.refraction = id;
  return ['inset 0 0 0 0.5px ' + g.edgeColor, 'inset 0 1px 1px rgba(255,255,255,' + Math.min(1, g.highlight * 2.5 / 100) + ')', 'inset 0 -1px 1px rgba(0,0,0,0.18)'];
}
