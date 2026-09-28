import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export const F1_MODALITIES = [
  { id: 'caja_rect', name: 'Caja de luz rectangular' },
  { id: 'caja_contorno', name: 'Caja contorno' },
  { id: 'letras', name: 'Letras 3D individuales' },
];
export const F1_LIGHTS = [
  { id: 'directa', name: 'Luz directa' },
  { id: 'indirecta', name: 'Luz indirecta (halo)' },
  { id: 'sin', name: 'Sin luz' },
];

/** Elige la fuente de poder más chica que cubra la potencia; si no alcanza, varias de la mayor. */
function pickPsu(ctx, watts) {
  const psus = ctx.items.filter((i) => i.category === 'Iluminación' && n(i.watts) >= 20).sort((a, b) => a.watts - b.watts);
  if (!psus.length || !(watts > 0)) return null;
  const one = psus.find((x) => x.watts >= watts);
  if (one) return { item: one, count: 1 };
  const big = psus[psus.length - 1];
  return { item: big, count: Math.ceil(watts / big.watts) };
}

export function f1Geometry(p, rules) {
  const W = n(p.width);
  const H = n(p.height);
  const R = rules.f1;
  const env = W * H;
  let face = env;
  let edge = 2 * (W + H);
  if (p.modality === 'caja_contorno') {
    face = env * R.fill.contorno;
    edge = 2 * (W + H) * R.contourPerim;
  } else if (p.modality === 'letras') {
    face = env * R.fill.letras;
    edge = n(p.letterCount) * H * R.kPerimLetras;
  }
  return { W, H, env, face, edge, perimRect: 2 * (W + H) };
}

export default {
  id: 'f1',
  name: 'Anuncios 3D, cajas de luz y letras',
  short: 'Anuncios 3D',
  icon: 'Lightbulb',
  supportsInstall: true,
  description: 'Caja rectangular, caja contorno o letras individuales: base, canto, frente, rotulación, LED y fuentes.',
  defaults: () => ({
    modality: 'caja_rect',
    light: 'directa',
    width: 2.4,
    height: 1.2,
    qty: 1,
    text: '',
    letterCount: 6,
    baseId: 'rig-acm3',
    cantoId: 'per-canto4',
    frenteId: 'rig-acr-blanco',
    silvatrim: true,
    silvatrimId: 'per-silva',
    rotId: 'vin-corte-tras',
    rotCoverage: 60,
    ledId: 'led-3',
    cnc: true,
    kit: true,
    labor: true,
  }),
  calc(p, ctx) {
    const R = ctx.rules.f1;
    const g = f1Geometry(p, ctx.rules);
    const q = Math.max(1, n(p.qty, 1));
    const rows = [];
    const add = (r) => r && rows.push(r);
    const letters = p.modality === 'letras';
    const N = n(p.letterCount);

    add(row(ctx, ctx.pick(p.baseId, 'Rígidos'), g.face * q, 'Base posterior'));
    add(row(ctx, ctx.pick(p.cantoId, 'Perfiles y Canales'), g.edge * q, 'Canto lateral'));
    add(row(ctx, ctx.pick(p.frenteId, 'Rígidos'), g.face * q, 'Frente'));
    if (p.silvatrim && p.light === 'directa') add(row(ctx, ctx.pick(p.silvatrimId, 'Perfiles y Canales', (i) => /silva/i.test(i.name)), g.edge * q, 'Frente · Silvatrim'));
    if (p.rotId && n(p.rotCoverage) > 0) add(row(ctx, ctx.find(p.rotId), g.face * (n(p.rotCoverage) / 100) * q, 'Rotulación', { note: `${n(p.rotCoverage)}% de la cara` }));

    let leds = 0;
    let watts = 0;
    if (p.light !== 'sin') {
      const led = ctx.pick(p.ledId, 'Iluminación', (i) => n(i.watts) > 0 && n(i.watts) < 5);
      leds = p.light === 'directa' ? Math.ceil(g.face * R.ledPerM2) : Math.ceil(g.edge * R.ledPerMlHalo);
      watts = leds * n(led?.watts, 0.72) * R.psuSafety;
      add(row(ctx, led, leds * q, 'Iluminación', { note: p.light === 'directa' ? `${R.ledPerM2}/m² de cara` : `${R.ledPerMlHalo}/m.l. de canto` }));
      const psu = pickPsu(ctx, watts);
      if (psu) add(row(ctx, psu.item, psu.count * q, 'Iluminación', { note: `${num(watts, 0)} W con holgura ×${R.psuSafety}` }));
    }
    if (p.cnc && p.modality !== 'caja_rect') add(row(ctx, ctx.pick('srv-cnc', 'Servicios/Mano de Obra', (i) => /cnc/i.test(i.name)), g.edge * 2 * q, 'Maquinado', { note: 'frente y base' }));
    if (p.kit) add(row(ctx, ctx.pick('her-kit', 'Perfiles y Canales', (i) => /torniller/i.test(i.name)), (letters ? Math.max(1, Math.ceil(N / 4)) : 1) * q, 'Consumibles'));
    if (p.labor) add(row(ctx, ctx.pick('srv-armado', 'Servicios/Mano de Obra', (i) => /armado/i.test(i.name)), Math.max(g.face, 0.5) * q, 'Mano de obra'));

    const mod = F1_MODALITIES.find((m) => m.id === p.modality)?.name;
    const light = F1_LIGHTS.find((m) => m.id === p.light)?.name;
    const specs = [
      SPEC('Modalidad', mod),
      letters && p.text ? SPEC('Texto', `“${p.text}” · ${N} letras`) : letters ? SPEC('Letras', `${N}`) : null,
      SPEC('Medidas', `${num(g.W)} × ${num(g.H)} m${letters ? ' (largo × altura de letra)' : ''}${q > 1 ? ` · ${q} pzas` : ''}`),
      SPEC('Superficie', `${num(g.env, 2)} m² envolvente · ${num(g.face, 2)} m² de cara`),
      SPEC(letters ? 'Desarrollo' : 'Perímetro', `${num(g.edge, 2)} m.l.`),
      SPEC('Iluminación', p.light === 'sin' ? light : `${light} · ${leds} módulos · ${num(watts, 0)} W`),
      SPEC('Base / canto / frente', [ctx.find(p.baseId)?.name, ctx.find(p.cantoId)?.name, ctx.find(p.frenteId)?.name].filter(Boolean).join(' / ')),
    ].filter(Boolean);

    return {
      rows,
      specs,
      installM2: g.env * q,
      m2: g.env * q,
      summary: `${mod} · ${num(g.W)}×${num(g.H)} m · ${light}`,
    };
  },
};
