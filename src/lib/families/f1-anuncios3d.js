import { SPEC, n, row } from './common.js';
import { num, uid } from '../format.js';
import { scaleMeasure } from '../svg/measure.js';

export const F1_MODALITIES = [
  { id: 'caja_rect', name: 'Caja de luz rectangular', short: 'Caja rectangular' },
  { id: 'caja_contorno', name: 'Caja a contorno', short: 'Caja contorno' },
  { id: 'letras', name: 'Letras 3D individuales', short: 'Letras 3D' },
];
export const F1_LIGHTS = [
  { id: 'directa', name: 'Luz directa' },
  { id: 'indirecta', name: 'Luz indirecta (halo)' },
  { id: 'sin', name: 'Sin luz' },
];

/** Elemento de un anuncio luminoso (letras, icono a contorno, caja…). */
export function newElement(patch = {}) {
  return {
    id: uid('el'),
    name: 'Elemento',
    modality: 'caja_rect',
    light: 'directa',
    width: 2.4,
    height: 1.2,
    qty: 1,
    text: '',
    letterCount: 6,
    cantoSize: '4',
    cantoColor: 'Negro',
    cantoColorCustom: '',
    frenteMat: 'acrilico',
    frenteColor: 'Blanco lechoso',
    frenteColorCustom: '',
    silvatrim: true,
    silvatrimColor: 'Blanco',
    rotId: 'vin-corte-tras',
    rotCoverage: 60,
    image: null,
    measureMode: 'manual', // 'manual' | 'svg'
    svg: null, // medición del archivo: { name, preview, w, h, perimeter, perimOuter, perimInner, area, pieces, holes, warnings }
    svgWidthCm: 120,
    silvaInner: true, // silvatrim también en calados interiores
    ...patch,
  };
}

export function elementGeometry(el, rules) {
  const q = Math.max(1, n(el.qty, 1));
  // Medidas leídas del SVG, escaladas al ancho deseado
  if (el.measureMode === 'svg' && el.svg?.ok) {
    const sm = scaleMeasure(el.svg, n(el.svgWidthCm), { silvaInner: el.silvaInner !== false });
    if (sm) {
      return {
        W: sm.widthM,
        H: sm.heightM,
        q,
        env: sm.widthM * sm.heightM * q,
        face: sm.areaM2 * q,
        edge: sm.cantoMl * q,
        silva: el.silvatrim ? sm.silvaMl * q : 0,
        fromSvg: true,
        pieces: el.svg.pieces,
        holes: el.svg.holes,
        outer: sm.outerMl * q,
        inner: sm.innerMl * q,
      };
    }
  }
  const W = n(el.width);
  const H = n(el.height);
  const R = rules.f1;
  const env = W * H;
  let face = env;
  let edge = 2 * (W + H);
  if (el.modality === 'caja_contorno') {
    face = env * R.fill.contorno;
    edge = 2 * (W + H) * R.contourPerim;
  } else if (el.modality === 'letras') {
    face = env * R.fill.letras;
    edge = n(el.letterCount) * H * R.kPerimLetras;
  }
  return { W, H, q, env: env * q, face: face * q, edge: edge * q, silva: el.silvatrim ? edge * q : 0 };
}

/** Totales geométricos de todo el anuncio. */
export function signTotals(p, rules) {
  const per = (p.elements || []).map((el) => ({ el, g: elementGeometry(el, rules) }));
  const sum = (k) => per.reduce((s, x) => s + x.g[k], 0);
  return { per, env: sum('env'), face: sum('face'), edge: sum('edge'), silva: sum('silva') };
}

/** Sugerencia de módulos LED (referencia; la cantidad final se captura a mano). */
export function suggestLeds(p, rules) {
  const R = rules.f1;
  return (p.elements || []).reduce((s, el) => {
    const g = elementGeometry(el, rules);
    if (el.light === 'directa') return s + Math.ceil(g.face * R.ledPerM2);
    if (el.light === 'indirecta') return s + Math.ceil(g.edge * R.ledPerMlHalo);
    return s;
  }, 0);
}

/** Combinación de fuentes que cubre la potencia: una sola si alcanza; si no, varias de la mayor + la menor que cubra el resto. */
export function psuCombo(ctx, watts) {
  const psus = ctx.items.filter((i) => i.category === 'Iluminación' && n(i.watts) >= 20).sort((a, b) => a.watts - b.watts);
  if (!psus.length || !(watts > 0)) return [];
  const one = psus.find((x) => x.watts >= watts);
  if (one) return [{ item: one, count: 1 }];
  const big = psus[psus.length - 1];
  const res = [{ item: big, count: Math.floor(watts / big.watts) }];
  const rem = watts - res[0].count * big.watts;
  if (rem > 0) {
    const r = psus.find((x) => x.watts >= rem);
    if (r.id === big.id) res[0].count += 1;
    else res.push({ item: r, count: 1 });
  }
  return res;
}

/** Convierte parámetros del formato anterior (un solo elemento) al formato multi-elemento. */
export function migrateF1Params(p, rules) {
  if (!p || Array.isArray(p.elements)) return p;
  const frente = rules.f1.frenteMaterials.find((f) => f.itemId === p.frenteId)?.id ?? 'acrilico';
  const el = newElement({
    name: F1_MODALITIES.find((m) => m.id === p.modality)?.short ?? 'Elemento',
    modality: p.modality ?? 'caja_rect',
    light: p.light ?? 'directa',
    width: p.width ?? 1,
    height: p.height ?? 1,
    qty: p.qty ?? 1,
    text: p.text ?? '',
    letterCount: p.letterCount ?? 6,
    cantoSize: p.cantoId === 'per-canto2' ? '2' : '4',
    frenteMat: frente,
    frenteColor: frente === 'acrilico' ? 'Blanco lechoso' : 'Negro',
    silvatrim: p.silvatrim ?? true,
    rotId: p.rotId ?? null,
    rotCoverage: p.rotCoverage ?? 0,
  });
  const next = { baseId: p.baseId ?? 'rig-acm3', elements: [el], ledId: p.ledId ?? 'led-3', ledQty: 0, cnc: p.cnc ?? true, kit: p.kit ?? true, labor: p.labor ?? true };
  next.ledQty = suggestLeds(next, rules);
  return next;
}

export const colorOf = (base, custom) => (base === 'Color especial' && custom ? `especial: ${custom}` : base);

export default {
  id: 'f1',
  name: 'Anuncios 3D, cajas de luz y letras',
  short: 'Anuncios 3D',
  icon: 'Lightbulb',
  supportsInstall: true,
  description: 'Uno o varios elementos por anuncio (letras + icono a contorno + caja). Canto, frente, silvatrim, colores, LED y fuentes.',
  defaults: (catalog) => {
    const p = { baseId: 'rig-acm3', elements: [newElement({ name: 'Caja de luz' })], ledId: 'led-3', ledQty: 0, cnc: true, kit: true, labor: true };
    if (catalog) p.ledQty = suggestLeds(p, catalog.rules);
    return p;
  },
  calc(p, ctx) {
    const R = ctx.rules.f1;
    const T = signTotals(p, ctx.rules);
    const acc = new Map(); // agrupa por insumo
    const put = (item, qty, role, note) => {
      if (!item || !(qty > 0)) return;
      const k = `${role}|${item.id}`;
      const cur = acc.get(k) ?? { item, qty: 0, role, notes: [] };
      cur.qty += qty;
      if (note) cur.notes.push(note);
      acc.set(k, cur);
    };

    put(ctx.pick(p.baseId, 'Rígidos'), T.face, 'Base posterior');
    for (const { el, g } of T.per) {
      const label = el.name || F1_MODALITIES.find((m) => m.id === el.modality)?.short;
      const size = R.cantoSizes.find((c) => c.id === el.cantoSize) ?? R.cantoSizes[R.cantoSizes.length - 1];
      put(ctx.pick(size.itemId, 'Perfiles y Canales', (i) => /canto/i.test(i.name)), g.edge, `Canto ${size.name}`, `${label}: ${colorOf(el.cantoColor, el.cantoColorCustom).toLowerCase()}`);
      const fm = R.frenteMaterials.find((f) => f.id === el.frenteMat) ?? R.frenteMaterials[0];
      put(ctx.pick(fm.itemId, 'Rígidos'), g.face, 'Frente', `${label}: ${colorOf(el.frenteColor, el.frenteColorCustom).toLowerCase()}`);
      if (el.silvatrim) put(ctx.pick('per-silva', 'Perfiles y Canales', (i) => /silva|cercha/i.test(i.name)), g.silva, 'Silvatrim / cercha 1"', `${label}: ${String(el.silvatrimColor).toLowerCase()}`);
      if (el.rotId && n(el.rotCoverage) > 0) put(ctx.find(el.rotId), g.face * (n(el.rotCoverage) / 100), 'Rotulación', `${label}: ${n(el.rotCoverage)}%`);
      if (p.cnc && el.modality !== 'caja_rect') put(ctx.pick('srv-cnc', 'Servicios/Mano de Obra', (i) => /cnc/i.test(i.name)), g.edge * 2, 'Maquinado', label);
      if (p.kit) put(ctx.pick('her-kit', 'Consumibles', (i) => /consumible|torniller/i.test(i.name)), (el.modality === 'letras' ? Math.max(1, Math.ceil((g.fromSvg ? g.pieces : n(el.letterCount)) / 4)) : 1) * g.q, 'Consumibles');
    }

    const rows = [];
    for (const a of acc.values()) {
      const waste = !['Maquinado', 'Consumibles'].includes(a.role);
      rows.push(row(ctx, a.item, a.qty, a.role, { note: [...new Set(a.notes)].join(' · '), waste }));
    }

    // LED: cantidad capturada a mano · fuentes por consumo (módulos × 1.2 W)
    const ledQty = Math.max(0, Math.round(n(p.ledQty)));
    const watts = ledQty * R.ledWatts;
    const combo = psuCombo(ctx, watts);
    if (ledQty > 0) {
      const led = ctx.pick(p.ledId, 'Iluminación', (i) => n(i.watts) > 0 && n(i.watts) < 5);
      rows.push(row(ctx, led, ledQty, 'Iluminación', { note: 'cantidad capturada', waste: false }));
      for (const c of combo) rows.push(row(ctx, c.item, c.count, 'Fuentes de poder', { note: `${num(watts, 1)} W = ${ledQty} × ${R.ledWatts} W`, waste: false }));
    }
    if (p.labor) rows.push(row(ctx, ctx.pick('srv-armado', 'Servicios/Mano de Obra', (i) => /armado/i.test(i.name)), Math.max(T.face, 0.5), 'Mano de obra', { waste: false }));

    const comboText = combo.map((c) => `${c.count} × ${c.item.watts} W`).join(' + ');
    const specs = T.per.map(({ el, g }, i) => {
      const mod = F1_MODALITIES.find((m) => m.id === el.modality)?.short;
      const fm = R.frenteMaterials.find((f) => f.id === el.frenteMat)?.name;
      const size = R.cantoSizes.find((c) => c.id === el.cantoSize)?.name;
      return SPEC(
        `${i + 1}. ${el.name || mod}`,
        [
          el.modality === 'letras' && el.text ? `“${el.text}” · ${g.fromSvg ? g.pieces : n(el.letterCount)} letras` : mod,
          `${num(g.W)} × ${num(g.H)} m${g.q > 1 ? ` × ${g.q}` : ''}`,
          g.fromSvg ? `medido de ${el.svg.name} (${g.pieces} piezas, ${g.holes} calados)` : null,
          F1_LIGHTS.find((l) => l.id === el.light)?.name.toLowerCase(),
          `canto ${size} ${colorOf(el.cantoColor, el.cantoColorCustom).toLowerCase()}`,
          `frente ${fm?.toLowerCase()} ${colorOf(el.frenteColor, el.frenteColorCustom).toLowerCase()}`,
          el.silvatrim ? `silvatrim ${String(el.silvatrimColor).toLowerCase()}` : 'sin silvatrim',
        ]
          .filter(Boolean)
          .join(' · '),
      );
    });
    specs.push(SPEC('Totales', `cara ${num(T.face, 2)} m² · canto ${num(T.edge, 2)} m.l. · silvatrim ${num(T.silva, 2)} m.l.`));
    specs.push(SPEC('Iluminación', ledQty ? `${ledQty} módulos · ${num(watts, 1)} W · fuentes ${comboText}` : 'Sin módulos LED'));

    return {
      rows,
      specs,
      installM2: T.env,
      m2: T.env,
      summary: `${(p.elements || []).map((e) => e.name || F1_MODALITIES.find((m) => m.id === e.modality)?.short).join(' + ') || 'Anuncio'} · ${num(T.face, 2)} m² de cara`,
      images: (p.elements || [])
        .map((e) => (e.image?.data ? { name: e.name, ...e.image } : e.measureMode === 'svg' && e.svg?.preview ? { name: `${e.name} (SVG)`, data: e.svg.preview } : null))
        .filter(Boolean),
    };
  },
};
