import {rows} from './schema.mjs';
import {paintGlass, glassTier} from './glass.mjs';

// Browser projection of Bend's positioned Shape values. No canvas, navigation,
// state mutation, or geometry decisions live here.
export function place(el, b, dx = 0, dy = 0) {
  el.style.left = (b.x - dx) + 'px'; el.style.top = (b.y - dy) + 'px';
  el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
  return el;
}

export function createShapePainter(App, {document = globalThis.document,
  defaultScheme = () => ({$: 'tokens.Scheme.Dark'}), tier = glassTier()} = {}) {
const SVG = 'http://www.w3.org/2000/svg', APPROVED_INK = '#f6f7f8';
const REST = {$: 'tokens.State.Rest'};
const caseName = x => x.$.split('.').pop();
const tokenCache = new Map();
const token = (kind, s, ...args) => { const k = kind + JSON.stringify(args) + s.$; if (!tokenCache.has(k)) tokenCache.set(k, App['tokens.' + kind](...args, s)); return tokenCache.get(k); };
const surfaceColor = (name, s) => token('surface', s, {$: 'tokens.SurfaceRole.' + name}, REST);
// A Shape instance: the geometry case decides the element, then the shared
// fill, stroke and effects fields are applied once.
function paintShape(b, dx = 0, dy = 0, s = defaultScheme(), frozen = false) {
  const text = fill => token('text', s, fill.color, fill.state), surface = fill => token('surface', s, fill.color, fill.state);
  const line = st => token('line', s, st.color, st.state), stop = x => token('stop', s, x);
  const {geometry, fill, stroke, effects} = b.mark.shape, el = place(document.createElement('div'), b, dx, dy);
  const g = caseName(geometry), f = caseName(fill);
  const glass = rows(effects).find(e => caseName(e) === 'Glass');
  el.dataset.name = b.name; el.dataset.geometry = g; el.dataset.fill = f;
  el.className = 'draw ' + g.toLowerCase() + ' fill-' + f.toLowerCase();
  switch (g) {
    case 'Text':
      el.textContent = geometry.string;
      el.style.fontSize = geometry.text_type.size + 'px'; el.style.fontWeight = String(geometry.text_type.weight);
      break;
    case 'Path':
      // Approved symbol geometry and stroke, rendered by symbols.bend. Its
      // stroke is the Ink role: Dark Ink is the approved colour, so Dark keeps
      // the approved markup byte for byte; another scheme recolours the stroke.
      el.innerHTML = App['symbols.svg_drawing'](geometry.drawing);
      if (caseName(stroke) === 'Stroke' && line(stroke) !== APPROVED_INK) el.firstChild.setAttribute('stroke', line(stroke));
      // A Path's own stroke width, when the shape sets one (the drawing's geometry is unchanged).
      if (caseName(stroke) === 'Stroke' && stroke.width !== geometry.drawing.width) el.firstChild.setAttribute('stroke-width', stroke.width);
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', geometry.drawing.name);
      break;
    case 'Rounded': {
      // The size is the geometry's own field; Full is half the shorter side.
      const r = caseName(geometry.radius);
      el.style.width = geometry.width + 'px'; el.style.height = geometry.height + 'px';
      // (A Glass circle stays a CSS box: backdrop-filter needs the element's own box.)
      if (r === 'Full' && geometry.width === geometry.height && ['None', 'Solid'].includes(f) && !glass) {
        // A square Full shape is a circle: one SVG circle carries the fill and
        // the stroke (inset by half the stroke so it stays inside the box), so
        // it renders as one clean curve at any zoom (a CSS border and background
        // are two rounded paths whose anti-aliased edges can show seams).
        const side = geometry.width, sw = caseName(stroke) === 'Stroke' ? Number(stroke.width) : 0;
        const svg = document.createElementNS(SVG, 'svg'), c = document.createElementNS(SVG, 'circle');
        svg.setAttribute('viewBox', '0 0 ' + side + ' ' + side); svg.setAttribute('aria-hidden', 'true');
        c.setAttribute('cx', String(side / 2)); c.setAttribute('cy', String(side / 2)); c.setAttribute('r', String(Math.max(0, side / 2 - sw / 2)));
        c.setAttribute('fill', f === 'Solid' ? surface(fill) : 'none');
        if (sw) { c.setAttribute('stroke', line(stroke)); c.setAttribute('stroke-width', String(sw)); }
        svg.append(c); el.append(svg); el.classList.add('circle'); el.dataset.circle = 'true';
        for (const e of rows(effects)) if (caseName(e) === 'Shadow') el.style.boxShadow = '0 ' + e.y + 'px ' + e.blur + 'px ' + App['tokens.shadow']();
        return el;
      }
      if (r === 'Full') el.style.borderRadius = Math.min(geometry.width, geometry.height) / 2 + 'px';
      else if (r === 'Corner') el.style.borderRadius = geometry.radius.length + 'px';
      else throw Error('Unknown Bend radius');
      break;
    }
    default: throw Error('Unknown Bend geometry');
  }
  const isText = g === 'Text', path = g === 'Path';
  switch (f) {
    case 'None': break;
    case 'Solid':
      if (isText) el.style.color = text(fill); else if (path) el.firstChild?.setAttribute('fill', surface(fill)); else el.style.background = surface(fill);
      break;
    case 'Gradient':
      el.style.background = 'linear-gradient(' + stop(fill.from) + ' ' + fill.hold + '%,' + stop(fill.to) + ')';
      break;
    case 'Image': {
      if (fill.bitmap.$ === 'primitives.Bitmap.Photo') {
        // A photo, cover-cropped to the shape's box.
        el.setAttribute('role', 'img'); el.setAttribute('aria-label', b.name);
        const img = document.createElement('img'); img.className = 'photo'; img.src = fill.bitmap.asset; img.alt = ''; img.draggable = false;
        img.width = fill.bitmap.width; img.height = fill.bitmap.height; el.append(img);
        break;
      }
      const frame = fill.bitmap.frame;
      if (!frame.asset) break;
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Near · ' + b.name);
      // A stage's pet is frozen at its Bend frame (time is the stage's state).
      if (!frozen) { el.dataset.nearling = JSON.stringify(frame.animation); el.dataset.petTime = String(fill.time); el.dataset.petReduced = JSON.stringify(frame.reduced_motion); }
      const vp = document.createElement('div'); vp.className = 'sprite-viewport';
      vp.style.width = frame.width + 'px'; vp.style.height = frame.height + 'px'; vp.style.transform = 'scale(' + (b.width / frame.width) + ')';
      const img = document.createElement('img'); img.className = 'sprite-sheet'; img.src = frame.asset; img.alt = ''; img.draggable = false;
      img.width = frame.sheet_width; img.height = frame.sheet_height; img.style.transform = 'translate(-' + frame.x + 'px,-' + frame.y + 'px)';
      vp.append(img); el.append(vp);
      break;
    }
    default: throw Error('Unknown Bend fill');
  }
  // Strokes under 1px (a hairline edge) are an inset shadow: browsers round thinner borders up to 1px.
  const hairline = caseName(stroke) === 'Stroke' && !isText && !path && Number(stroke.width) < 1;
  const shadows = [];
  if (hairline) shadows.push('inset 0 0 0 ' + stroke.width + 'px ' + line(stroke));
  else if (caseName(stroke) === 'Stroke' && !isText && !path) { el.style.borderWidth = stroke.width + 'px'; el.style.borderColor = line(stroke); }
  for (const e of rows(effects)) {
    const name = caseName(e);
    if (name === 'Blur') {
      el.style.backdropFilter = el.style.webkitBackdropFilter = 'blur(' + e.radius + 'px)';
      // A gradient-filled, blurred shape fades its blur with the same gradient.
      if (f === 'Gradient') el.style.maskImage = el.style.webkitMaskImage = 'linear-gradient(#000 ' + fill.hold + '%,transparent)';
    } else if (name === 'Shadow') shadows.unshift('0 ' + e.y + 'px ' + e.blur + 'px ' + App['tokens.shadow']());
    else if (name === 'Glass') {
      // The fill is the tint; the effect carries the material (tokens.glass()).
      const radius = caseName(geometry.radius) === 'Full' ? Math.min(geometry.width, geometry.height) / 2 : geometry.radius.length;
      shadows.push(...paintGlass(el, {blur: e.blur, saturation: e.saturation, refraction: e.refraction, highlight: e.highlight, tint: e.tint, over: caseName(e.over).toLowerCase(),
        tintColor: surface(fill), edgeColor: line({color: e.edge, state: REST}), background: surfaceColor('Background', s), width: geometry.width, height: geometry.height, radius}, tier));
    }
    else throw Error('Unknown Bend effect');
  }
  if (shadows.length) el.style.boxShadow = shadows.join(',');
  return el;
}
return paintShape;
}
