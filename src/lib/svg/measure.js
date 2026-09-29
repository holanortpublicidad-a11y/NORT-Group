/**
 * Lector vectorial de SVG para cotizar anuncios luminosos.
 *
 * Aplana todas las figuras rellenas (path, rect, circle, ellipse, polygon, polyline, use)
 * con sus transformaciones y calcula, en unidades del SVG:
 *   - perímetro total  → metros lineales de canto (contornos exteriores + calados interiores)
 *   - perímetro exterior e interior por separado (silvatrim con o sin huecos)
 *   - área neta        → m² de cara/acrílico/vinil descontando huecos (O, A, B, P, R…)
 *   - piezas y huecos  → número de contornos exteriores e interiores
 * El resultado se escala después al ancho deseado en cm (ver scaleMeasure).
 *
 * No depende de librerías: la misma interfaz se puede reemplazar por Paper.js
 * (paper.project.importSVG + CompoundPath.length/area) si se prefiere.
 */

const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function parseTransform(str) {
  let m = IDENTITY;
  if (!str) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(str))) {
    const v = t[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let k = IDENTITY;
    switch (t[1]) {
      case 'matrix':
        k = v.slice(0, 6);
        break;
      case 'translate':
        k = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
        break;
      case 'scale':
        k = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
        break;
      case 'rotate': {
        const a = ((v[0] || 0) * Math.PI) / 180;
        const r = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        k = v.length >= 3 ? mul(mul([1, 0, 0, 1, v[1], v[2]], r), [1, 0, 0, 1, -v[1], -v[2]]) : r;
        break;
      }
      case 'skewX':
        k = [1, 0, Math.tan(((v[0] || 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewY':
        k = [1, Math.tan(((v[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
      default:
    }
    m = mul(m, k);
  }
  return m;
}

// ── Aplanado de curvas ───────────────────────────────────────────────────────
const CURVE_STEPS = 16;
function cubic(out, p0, p1, p2, p3) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}
function quad(out, p0, p1, p2) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
}
/** Arco elíptico SVG (parametrización de extremos → centro, SVG 1.1 F.6.5). */
function arc(out, p0, rx, ry, phiDeg, large, sweep, p1) {
  if (!rx || !ry) return out.push(p1);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2;
  const dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (co * rx * y1) / ry;
  const cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 36))); // cada 5°
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps;
    out.push([cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos]);
  }
  out[out.length - 1] = p1;
}

/** Interpreta el atributo `d` y devuelve subtrayectorias aplanadas: [{ pts, closed }] */
export function parsePathD(d) {
  const subs = [];
  const NUM = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/y;
  let i = 0;
  const n = d.length;
  const skip = () => {
    while (i < n && (d[i] === ',' || d[i] === ' ' || d[i] === '\n' || d[i] === '\t' || d[i] === '\r')) i++;
  };
  const num = () => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(d);
    if (!m) throw new Error(`Número esperado en la posición ${i}`);
    i = NUM.lastIndex;
    return parseFloat(m[0]);
  };
  const flag = () => {
    skip();
    const c = d[i++];
    if (c !== '0' && c !== '1') throw new Error('Bandera de arco inválida');
    return c === '1';
  };
  const hasNum = () => {
    skip();
    return i < n && /[-+.\d]/.test(d[i]);
  };

  let cur = [0, 0];
  let start = [0, 0];
  let lastC = null; // último control cúbico
  let lastQ = null; // último control cuadrático
  let sub = null;
  let cmd = null;
  const begin = (p) => {
    if (sub && sub.pts.length > 1) subs.push(sub);
    sub = { pts: [p], closed: false };
    start = p;
  };

  while (true) {
    skip();
    if (i >= n) break;
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    else if (!cmd) throw new Error('Trayectoria sin comando inicial');
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const P = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (C) {
      case 'M': {
        const p = P(num(), num());
        begin(p);
        cur = p;
        cmd = rel ? 'l' : 'L'; // pares siguientes son líneas
        lastC = lastQ = null;
        break;
      }
      case 'L': {
        const p = P(num(), num());
        if (!sub) begin(cur);
        sub.pts.push(p);
        cur = p;
        lastC = lastQ = null;
        break;
      }
      case 'H': {
        const x = num();
        const p = [rel ? cur[0] + x : x, cur[1]];
        if (!sub) begin(cur);
        sub.pts.push(p);
        cur = p;
        lastC = lastQ = null;
        break;
      }
      case 'V': {
        const y = num();
        const p = [cur[0], rel ? cur[1] + y : y];
        if (!sub) begin(cur);
        sub.pts.push(p);
        cur = p;
        lastC = lastQ = null;
        break;
      }
      case 'C': {
        const c1 = P(num(), num());
        const c2 = P(num(), num());
        const p = P(num(), num());
        if (!sub) begin(cur);
        cubic(sub.pts, cur, c1, c2, p);
        lastC = c2;
        lastQ = null;
        cur = p;
        break;
      }
      case 'S': {
        const c1 = lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur;
        const c2 = P(num(), num());
        const p = P(num(), num());
        if (!sub) begin(cur);
        cubic(sub.pts, cur, c1, c2, p);
        lastC = c2;
        lastQ = null;
        cur = p;
        break;
      }
      case 'Q': {
        const c = P(num(), num());
        const p = P(num(), num());
        if (!sub) begin(cur);
        quad(sub.pts, cur, c, p);
        lastQ = c;
        lastC = null;
        cur = p;
        break;
      }
      case 'T': {
        const c = lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur;
        const p = P(num(), num());
        if (!sub) begin(cur);
        quad(sub.pts, cur, c, p);
        lastQ = c;
        lastC = null;
        cur = p;
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = flag();
        const sweep = flag();
        const p = P(num(), num());
        if (!sub) begin(cur);
        arc(sub.pts, cur, rx, ry, rot, large, sweep, p);
        cur = p;
        lastC = lastQ = null;
        break;
      }
      case 'Z': {
        if (sub) {
          sub.closed = true;
          subs.push(sub);
          sub = null;
        }
        cur = start;
        lastC = lastQ = null;
        // Tras Z, un número suelto sería error; si sigue otro comando, continúa.
        if (hasNum()) throw new Error('Datos después de Z');
        cmd = null;
        break;
      }
      default:
        throw new Error(`Comando no soportado: ${cmd}`);
    }
  }
  if (sub && sub.pts.length > 1) subs.push(sub);
  return subs;
}

// ── Figuras básicas como trayectorias ────────────────────────────────────────
const f = (el, a, d = 0) => {
  const v = parseFloat(el.getAttribute(a));
  return Number.isFinite(v) ? v : d;
};
function shapeToD(el) {
  const tag = el.localName;
  if (tag === 'path') return el.getAttribute('d') || '';
  if (tag === 'rect') {
    const x = f(el, 'x');
    const y = f(el, 'y');
    const w = f(el, 'width');
    const h = f(el, 'height');
    let rx = el.hasAttribute('rx') ? f(el, 'rx') : el.hasAttribute('ry') ? f(el, 'ry') : 0;
    let ry = el.hasAttribute('ry') ? f(el, 'ry') : rx;
    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);
    if (!(w > 0 && h > 0)) return '';
    if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = f(el, 'cx');
    const cy = f(el, 'cy');
    const rx = tag === 'circle' ? f(el, 'r') : f(el, 'rx');
    const ry = tag === 'circle' ? rx : f(el, 'ry');
    if (!(rx > 0 && ry > 0)) return '';
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const v = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
    if (v.length < 4) return '';
    let d = `M${v[0]} ${v[1]}`;
    for (let k = 2; k + 1 < v.length; k += 2) d += `L${v[k]} ${v[k + 1]}`;
    return tag === 'polygon' ? `${d}Z` : d;
  }
  return '';
}

const SKIP = new Set(['defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker', 'title', 'desc', 'metadata', 'style', 'script', 'linearGradient', 'radialGradient', 'filter', 'foreignObject']);
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);

function styleProp(el, prop) {
  const st = el.getAttribute('style');
  if (st) {
    const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(st);
    if (m) return m[1].trim();
  }
  return el.getAttribute(prop);
}

// ── Geometría de polígonos ───────────────────────────────────────────────────
function polyMetrics(pts) {
  let len = 0;
  let a = 0;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % pts.length];
    len += Math.hypot(q[0] - p[0], q[1] - p[1]);
    a += p[0] * q[1] - q[0] * p[1];
  }
  return { len, area: Math.abs(a) / 2 };
}
function inside(pt, pts) {
  let c = false;
  for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
    const [xi, yi] = pts[k];
    const [xj, yj] = pts[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * Mide un SVG (texto). Requiere DOMParser (navegador).
 * @returns {{ok:boolean,error?:string,w:number,h:number,perimeter:number,perimOuter:number,perimInner:number,area:number,pieces:number,holes:number,shapes:number,warnings:string[]}}
 */
export function measureSvg(text) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo.' };
  }
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return { ok: false, error: 'El archivo no es un SVG válido.' };

  const warnings = new Set();
  const filled = [];
  const unfilled = [];

  const walk = (el, m, fill, depth = 0) => {
    if (depth > 40) return;
    const tag = el.localName;
    if (SKIP.has(tag)) return;
    if (styleProp(el, 'display') === 'none' || styleProp(el, 'visibility') === 'hidden') return;
    if (tag === 'text' || tag === 'tspan') {
      warnings.add('El SVG tiene textos sin convertir a curvas; no se midieron. Conviértelos a contornos en tu programa de diseño.');
      return;
    }
    if (tag === 'image') {
      warnings.add('El SVG contiene imágenes de mapa de bits incrustadas; solo se miden los vectores.');
      return;
    }
    const mm = mul(m, parseTransform(el.getAttribute('transform')));
    const fa = styleProp(el, 'fill');
    const myFill = fa == null || fa === 'inherit' ? fill : fa;

    if (tag === 'use') {
      const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      const ref = href && href.startsWith('#') ? doc.querySelector(`[id="${CSS.escape ? CSS.escape(href.slice(1)) : href.slice(1)}"]`) : null;
      if (ref) {
        const tm = mul(mm, [1, 0, 0, 1, f(el, 'x'), f(el, 'y')]);
        if (ref.localName === 'symbol') [...ref.children].forEach((c) => walk(c, tm, myFill, depth + 1));
        else walk(ref, tm, myFill, depth + 1);
      }
      return;
    }
    if (SHAPES.has(tag)) {
      const d = shapeToD(el);
      if (!d) return;
      let subs;
      try {
        subs = parsePathD(d);
      } catch (e) {
        warnings.add(`Una trayectoria no se pudo interpretar (${e.message}).`);
        return;
      }
      for (const s of subs) {
        const pts = s.pts.map((p) => apply(mm, p));
        // quitar punto final duplicado
        const a = pts[0];
        const b = pts[pts.length - 1];
        if (pts.length > 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) pts.pop();
        if (pts.length < 3) continue;
        (myFill === 'none' || myFill === 'transparent' ? unfilled : filled).push(pts);
      }
      return;
    }
    [...el.children].forEach((c) => walk(c, mm, myFill, depth + 1));
  };
  walk(root, IDENTITY, '#000');

  let polys = filled;
  if (!polys.length && unfilled.length) {
    polys = unfilled;
    warnings.add('Las figuras no tienen relleno (solo contorno); se midieron como si estuvieran rellenas.');
  }
  if (!polys.length) return { ok: false, error: 'No se encontraron figuras vectoriales para medir.' };

  const items = polys.map((pts) => ({ pts, ...polyMetrics(pts) })).filter((p) => p.area > 1e-9);
  // Profundidad de anidamiento: par = sólido, impar = hueco
  for (const it of items) {
    const probe = it.pts[0];
    it.depth = items.filter((o) => o !== it && o.area > it.area && inside(probe, o.pts)).length;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items)
    for (const [x, y] of it.pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  const solid = items.filter((it) => it.depth % 2 === 0);
  const holes = items.filter((it) => it.depth % 2 === 1);
  const sum = (list, k) => list.reduce((s, x) => s + x[k], 0);
  // Contornos normalizados (ancho = 1000) y simplificados para el mapa LED
  const k = 1000 / (maxX - minX || 1);
  const outline = items.map((it) => {
    const flat = [];
    let px = null;
    let py = null;
    for (const [x, y] of it.pts) {
      const X = Math.round((x - minX) * k * 10) / 10;
      const Y = Math.round((y - minY) * k * 10) / 10;
      if (px != null && Math.abs(X - px) + Math.abs(Y - py) < 0.6) continue;
      flat.push(X, Y);
      px = X;
      py = Y;
    }
    return { hole: it.depth % 2 === 1, pts: flat };
  });
  return {
    ok: true,
    polys: outline,
    w: maxX - minX,
    h: maxY - minY,
    perimOuter: sum(solid, 'len'),
    perimInner: sum(holes, 'len'),
    perimeter: sum(items, 'len'),
    area: sum(solid, 'area') - sum(holes, 'area'),
    pieces: solid.length,
    holes: holes.length,
    shapes: items.length,
    warnings: [...warnings],
  };
}

/** Escala una medición a un ancho real en cm. Devuelve metros y m². */
export function scaleMeasure(m, widthCm, { silvaInner = true } = {}) {
  if (!m?.ok || !(m.w > 0) || !(widthCm > 0)) return null;
  const s = widthCm / 100 / m.w; // metros por unidad SVG
  return {
    widthM: widthCm / 100,
    heightM: m.h * s,
    cantoMl: m.perimeter * s,
    outerMl: m.perimOuter * s,
    innerMl: m.perimInner * s,
    silvaMl: (silvaInner ? m.perimeter : m.perimOuter) * s,
    areaM2: m.area * s * s,
  };
}

/** Vista previa rasterizada del SVG (WebP/PNG) para guardarla en localStorage. */
export async function rasterizeSvg(text, maxSide = 900) {
  try {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    let w = parseFloat(svg.getAttribute('width')) || vb[2] || 300;
    let h = parseFloat(svg.getAttribute('height')) || vb[3] || 150;
    const k = maxSide / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${parseFloat(svg.getAttribute('width')) || 300} ${parseFloat(svg.getAttribute('height')) || 150}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    let out = c.toDataURL('image/webp', 0.9);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
    return out;
  } catch {
    return text.length < 300_000 ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : null;
  }
}
