import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export const F2_GRAPHICS = [
  { id: 'vinil', name: 'Vinil impreso aplicado' },
  { id: 'uv', name: 'Impresión directa UV' },
  { id: 'sin', name: 'Sin impresión' },
];
export const F2_LAMINATES = [
  { id: 'sin', name: 'Sin laminado' },
  { id: 'mate', name: 'Mate' },
  { id: 'brillo', name: 'Brillo' },
];

export default {
  id: 'f2',
  name: 'Impresión gran formato, viniles y rígidos',
  short: 'Gran formato',
  icon: 'Printer',
  supportsInstall: true,
  description: 'Coroplast, PVC, ACM o acrílico impresos, o viniles microperforado, impreso y esmerilado. Con acabados.',
  defaults: () => ({ baseType: 'rigido', materialId: 'rig-coro4', graphic: 'vinil', width: 0.9, height: 0.6, qty: 10, laminado: 'sin', refile: true, troquel: false }),
  calc(p, ctx) {
    const W = n(p.width);
    const H = n(p.height);
    const q = Math.max(1, n(p.qty, 1));
    const area = W * H * q;
    const rigid = p.baseType === 'rigido';
    const mat = ctx.pick(p.materialId, rigid ? 'Rígidos' : 'Viniles');
    const rows = [];
    const add = (r) => r && rows.push(r);
    add(row(ctx, mat, area, rigid ? 'Sustrato rígido' : 'Sustrato flexible'));
    if (rigid && p.graphic === 'vinil') add(row(ctx, ctx.pick('vin-impreso', 'Viniles', (i) => /impreso/i.test(i.name)), area, 'Gráfico'));
    if (rigid && p.graphic === 'uv') add(row(ctx, ctx.pick('srv-uv', 'Servicios/Mano de Obra', (i) => /uv/i.test(i.name)), area, 'Gráfico', { waste: false }));
    if (p.laminado !== 'sin') add(row(ctx, ctx.pick('srv-lam', 'Servicios/Mano de Obra', (i) => /lamin/i.test(i.name)), area, 'Acabado', { note: `laminado ${p.laminado}`, waste: false }));
    if (p.refile) add(row(ctx, ctx.pick('srv-refile', 'Servicios/Mano de Obra', (i) => /refile/i.test(i.name)), area, 'Acabado', { waste: false }));
    if (p.troquel) add(row(ctx, ctx.pick('srv-troquel', 'Servicios/Mano de Obra', (i) => /troquel/i.test(i.name)), area, 'Acabado', { waste: false }));

    const finishes = [p.laminado !== 'sin' && `laminado ${p.laminado}`, p.refile && 'refile', p.troquel && 'troquelado'].filter(Boolean);
    return {
      rows,
      specs: [
        SPEC('Material', mat?.name),
        rigid ? SPEC('Gráfico', F2_GRAPHICS.find((g) => g.id === p.graphic)?.name) : null,
        SPEC('Medidas', `${num(W)} × ${num(H)} m × ${q} pzas = ${num(area, 2)} m²`),
        SPEC('Acabados', finishes.length ? finishes.join(', ') : 'Ninguno'),
      ].filter(Boolean),
      installM2: area,
      m2: area,
      summary: `${mat?.name ?? 'Material'} · ${num(W)}×${num(H)} m ×${q}`,
    };
  },
};
