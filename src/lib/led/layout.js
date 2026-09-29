/**
 * Distribución de módulos LED por el INTERIOR de letras 3D y cajas a contorno.
 *
 * Reglas de taller (todas en cm):
 *   módulo 7 × 1 · cable 7 · paso en cadena 14 · columnas a 4" (10.16) · margen a la pared 1.5
 *
 * Trabaja sobre una máscara raster de la silueta (1 = sólido, 0 = fuera o calado):
 *   1. Distancia de cada punto a la pared más cercana → zona útil (≥ margen + ½ ancho del módulo).
 *   2. Algoritmo A · Trazo central: esqueleto de la zona útil y módulos cada 14 cm a lo largo del eje,
 *      girados según la tangente.
 *   3. Algoritmo B · Retícula: columnas verticales a 10.16 cm recortadas a la zona útil y módulos cada 14 cm.
 *   Modo automático por pieza: si el trazo más grueso mide ≤ 2 columnas usa A; si es más ancho usa B
 *   y completa con A los tramos angostos que las columnas no alcanzan.
 * Los calados nunca son zona útil porque en la máscara valen 0.
 *
 * Todo es puro (sin DOM) para poder probarlo; la máscara se genera en ./mask.js.
 */

export const LED_RULES = { moduleL: 7, moduleW: 1, pitch: 14, colGap: 10.16, inset: 1.5 };

const DIRS8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Distancia (cm) desde el centro de cada píxel sólido a la pared más cercana. Chamfer 8-vecinos. */
export function distanceField(mask) {
  const { w, h, data, res } = mask;
  const INF = 1e9;
  const A = 1;
  const B = Math.SQRT2;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = data[i] ? INF : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      v = Math.min(v, x > 0 ? d[i - 1] + A : A);
      if (y > 0) {
        v = Math.min(v, d[i - w] + A);
        if (x > 0) v = Math.min(v, d[i - w - 1] + B);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + B);
      } else v = Math.min(v, A);
      d[i] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      v = Math.min(v, x < w - 1 ? d[i + 1] + A : A);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + A);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + B);
        if (x > 0) v = Math.min(v, d[i + w - 1] + B);
      } else v = Math.min(v, A);
      d[i] = v;
    }
  for (let i = 0; i < w * h; i++) d[i] = d[i] ? (d[i] - 0.5) * res : 0;
  return d;
}

/** Piezas sólidas conectadas (4-vecinos). */
export function labelComponents(mask, dist) {
  const { w, h, data } = mask;
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!data[s] || lab[s] >= 0) continue;
    const id = comps.length;
    const c = { id, x0: w, y0: h, x1: 0, y1: 0, px: 0, maxD: 0 };
    lab[s] = id;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = (i / w) | 0;
      c.px++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      if (dist[i] > c.maxD) c.maxD = dist[i];
      for (const [dx, dy] of DIRS8.slice(0, 4)) {
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const j = Y * w + X;
        if (data[j] && lab[j] < 0) {
          lab[j] = id;
          stack.push(j);
        }
      }
    }
    comps.push(c);
  }
  return { lab, comps };
}

/** Adelgazamiento de Zhang-Suen → esqueleto de 1 píxel. */
export function thin(bin, w, h) {
  const img = Uint8Array.from(bin);
  const del = [];
  let changed = true;
  const P = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      del.length = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!img[y * w + x]) continue;
          const p2 = P(x, y - 1);
          const p3 = P(x + 1, y - 1);
          const p4 = P(x + 1, y);
          const p5 = P(x + 1, y + 1);
          const p6 = P(x, y + 1);
          const p7 = P(x - 1, y + 1);
          const p8 = P(x - 1, y);
          const p9 = P(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
          if (a !== 1) continue;
          if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(y * w + x);
        }
      if (del.length) {
        changed = true;
        for (const i of del) img[i] = 0;
      }
    }
  }
  return img;
}

/** Recorre el esqueleto en cadenas de píxeles (prefiere seguir la misma dirección). */
export function traceChains(sk, w, h) {
  const vis = new Uint8Array(w * h);
  const nb = (i) => {
    const x = i % w;
    const y = (i / w) | 0;
    const out = [];
    for (const [dx, dy] of DIRS8) {
      const X = x + dx;
      const Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h && sk[Y * w + X]) out.push(Y * w + X);
    }
    return out;
  };
  const pix = [];
  for (let i = 0; i < w * h; i++) if (sk[i]) pix.push([i, nb(i).length]);
  pix.sort((a, b) => a[1] - b[1]); // extremos primero
  const chains = [];
  for (const [s] of pix) {
    if (vis[s]) continue;
    const chain = [s];
    vis[s] = 1;
    let cur = s;
    let dx0 = 0;
    let dy0 = 0;
    for (;;) {
      const cx = cur % w;
      const cy = (cur / w) | 0;
      let best = -1;
      let bs = -Infinity;
      for (const j of nb(cur)) {
        if (vis[j]) continue;
        const dx = (j % w) - cx;
        const dy = ((j / w) | 0) - cy;
        const sc = dx * dx0 + dy * dy0 + (dx === 0 || dy === 0 ? 0.3 : 0);
        if (sc > bs) {
          bs = sc;
          best = j;
        }
      }
      if (best < 0) break;
      vis[best] = 1;
      chain.push(best);
      const dx = (best % w) - cx;
      const dy = ((best / w) | 0) - cy;
      dx0 = dx0 * 0.6 + dx;
      dy0 = dy0 * 0.6 + dy;
      cur = best;
    }
    chains.push(chain);
  }
  return chains;
}

const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function smooth(pts, win = 2) {
  if (pts.length < 5) return pts;
  return pts.map((_, k) => {
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let t = Math.max(0, k - win); t <= Math.min(pts.length - 1, k + win); t++) {
      sx += pts[t][0];
      sy += pts[t][1];
      c++;
    }
    return [sx / c, sy / c];
  });
}

/** Coloca módulos a lo largo de una polilínea (cm). Centra el sobrante en ambos extremos. */
export function placeAlong(pts, R, clear) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist2(pts[k - 1], pts[k]));
  const L = cum[cum.length - 1];
  if (!(L >= R.moduleL)) return [];
  const at = (s) => {
    let k = 1;
    while (k < cum.length - 1 && cum[k] < s) k++;
    const t = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t];
  };
  const n = Math.floor((L - R.moduleL) / R.pitch) + 1;
  const start = (L - ((n - 1) * R.pitch + R.moduleL)) / 2;
  const mods = [];
  for (let i = 0; i < n; i++) {
    const s0 = start + i * R.pitch;
    const s1 = s0 + R.moduleL;
    const a = at(s0);
    const b = at(s1);
    const c = at((s0 + s1) / 2);
    if (clear && !(clear(a) && clear(b) && clear(c))) continue;
    mods.push({ x: c[0], y: c[1], angle: Math.atan2(b[1] - a[1], b[0] - a[0]), a, b, s0, s1 });
  }
  // Cable entre módulos consecutivos siguiendo la trayectoria
  const wires = [];
  for (let i = 0; i + 1 < mods.length; i++) {
    const w = [mods[i].b];
    for (let k = 0; k < pts.length; k++) if (cum[k] > mods[i].s1 && cum[k] < mods[i + 1].s0) w.push(pts[k]);
    w.push(mods[i + 1].a);
    wires.push(w);
  }
  return { mods, wires };
}

/**
 * Calcula la distribución para una máscara.
 * @param mask {w,h,res,data,originX,originY}  (cm de la esquina izquierda-superior del píxel 0 = origin)
 * @param mode 'auto' | 'spine' | 'grid'
 */
export function layoutLeds(mask, mode = 'auto', R = LED_RULES) {
  const { w, h, res } = mask;
  const ox = mask.originX ?? 0;
  const oy = mask.originY ?? 0;
  const toCm = (i) => [(i % w + 0.5) * res + ox, (((i / w) | 0) + 0.5) * res + oy];
  const dist = distanceField(mask);
  const { lab, comps } = labelComponents(mask, dist);
  const centerClear = R.inset + R.moduleW / 2; // el eje del módulo debe quedar a ≥ 2 cm de la pared
  const Dat = ([x, y]) => {
    const X = Math.floor((x - ox) / res);
    const Y = Math.floor((y - oy) / res);
    if (X < 0 || Y < 0 || X >= w || Y >= h) return 0;
    return dist[Y * w + X];
  };
  const clearEnd = (p) => Dat(p) >= R.inset + R.moduleW / 2 - res * 0.75;

  // Zona útil y esqueleto
  const usable = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) usable[i] = dist[i] >= centerClear ? 1 : 0;
  const sk = thin(usable, w, h);
  const rawChains = traceChains(sk, w, h).filter((c) => c.length * res >= 2);
  const chainsByComp = new Map();
  for (const c of rawChains) {
    const id = lab[c[0]];
    if (id < 0) continue;
    if (!chainsByComp.has(id)) chainsByComp.set(id, []);
    chainsByComp.get(id).push(smooth(c.map(toCm)));
  }

  const out = [];
  for (const comp of comps) {
    const strokeW = 2 * comp.maxD;
    const useGrid = mode === 'grid' || (mode === 'auto' && strokeW > 2 * R.colGap);
    const seqs = []; // secuencias de módulos cableados
    const placed = [];
    const chains = chainsByComp.get(comp.id) || [];
    if (useGrid) {
      const x0 = (comp.x0 + 0.5) * res + ox;
      const x1 = (comp.x1 + 0.5) * res + ox;
      const span = x1 - x0;
      const ncol = Math.max(1, Math.floor(span / R.colGap) + 1);
      const first = x0 + (span - (ncol - 1) * R.colGap) / 2;
      for (let k = 0; k < ncol; k++) {
        const xc = first + k * R.colGap;
        const X = Math.min(w - 1, Math.max(0, Math.floor((xc - ox) / res)));
        let y = comp.y0;
        const runs = [];
        while (y <= comp.y1) {
          while (y <= comp.y1 && !(lab[y * w + X] === comp.id && usable[y * w + X])) y++;
          const ys = y;
          while (y <= comp.y1 && lab[y * w + X] === comp.id && usable[y * w + X]) y++;
          if (y > ys) runs.push([ys, y - 1]);
        }
        if (k % 2) runs.reverse();
        for (const [ya, yb] of runs) {
          const A = [xc, (ya + 0.5) * res + oy];
          const B = [xc, (yb + 0.5) * res + oy];
          const pts = k % 2 ? [B, A] : [A, B];
          const r = placeAlong(pts, R, clearEnd);
          if (r.mods?.length) {
            seqs.push(r);
            placed.push(...r.mods);
          }
        }
      }
      // Completar con trazo central los tramos que las columnas no cubren
      for (const ch of chains) {
        let cur = [];
        const flush = () => {
          if (cur.length > 1) {
            const r = placeAlong(cur, R, clearEnd);
            const ok = (r.mods || []).filter((m) => placed.every((q) => Math.hypot(q.x - m.x, q.y - m.y) > R.moduleL));
            if (ok.length) {
              seqs.push({ mods: ok, wires: ok.length === r.mods.length ? r.wires : [] });
              placed.push(...ok);
            }
          }
          cur = [];
        };
        for (const p of ch) {
          const near = placed.some((q) => Math.hypot(q.x - p[0], q.y - p[1]) < R.colGap * 0.8);
          if (near) flush();
          else cur.push(p);
        }
        flush();
      }
    } else {
      for (const ch of chains) {
        const r = placeAlong(ch, R, clearEnd);
        if (r.mods?.length) {
          seqs.push(r);
          placed.push(...r.mods);
        }
      }
    }
    out.push({ comp, strokeW, method: useGrid ? 'grid' : 'spine', seqs, count: placed.length });
  }

  // Orden de cableado: piezas de izquierda a derecha; dentro, secuencia más cercana (puentes)
  out.sort((a, b) => a.comp.x0 - b.comp.x0);
  const modules = [];
  const wires = [];
  const jumpers = [];
  let last = null;
  for (const c of out) {
    const pool = [...c.seqs];
    while (pool.length) {
      let bi = 0;
      let rev = false;
      if (last) {
        let bd = Infinity;
        pool.forEach((s, i) => {
          const d0 = dist2(last, s.mods[0].a);
          const d1 = dist2(last, s.mods[s.mods.length - 1].b);
          if (d0 < bd) [bd, bi, rev] = [d0, i, false];
          if (d1 < bd) [bd, bi, rev] = [d1, i, true];
        });
      }
      const s = pool.splice(bi, 1)[0];
      const mods = rev ? [...s.mods].reverse().map((m) => ({ ...m, a: m.b, b: m.a })) : s.mods;
      if (last) jumpers.push([last, mods[0].a]);
      modules.push(...mods.map((m) => ({ x: m.x, y: m.y, angle: m.angle, a: m.a, b: m.b, comp: c.comp.id })));
      wires.push(...s.wires);
      last = mods[mods.length - 1].b;
    }
  }
  return {
    count: modules.length,
    modules,
    wires,
    jumpers,
    pieces: out.map((c) => ({ id: c.comp.id, method: c.method, strokeW: c.strokeW, count: c.count })),
  };
}
