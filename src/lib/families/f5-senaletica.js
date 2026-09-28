import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export const F5_MOUNTS = [
  { id: 'pernos', name: 'Perno separador inox' },
  { id: 'cinta', name: 'Cinta doble cara industrial' },
  { id: 'pegamento', name: 'Pegamento especial' },
];
export const F5_GRAPHICS = [
  { id: 'impreso', name: 'Vinil impreso' },
  { id: 'corte', name: 'Vinil de corte' },
  { id: 'sin', name: 'Sin gráfico' },
];

export default {
  id: 'f5',
  name: 'Señalética y logotipos de interior',
  short: 'Señalética',
  icon: 'Signpost',
  supportsInstall: true,
  description: 'Placas de acrílico o ACM, o vinil de corte directo sobre muro. Montaje con pernos, cinta o pegamento.',
  defaults: () => ({ substrate: 'rigido', materialId: 'rig-acr-cristal', width: 0.3, height: 0.4, qty: 4, graphic: 'impreso', coverage: 60, mounting: 'pernos', cnc: false }),
  calc(p, ctx) {
    const R = ctx.rules.f5;
    const W = n(p.width);
    const H = n(p.height);
    const q = Math.max(1, n(p.qty, 1));
    const a = W * H;
    const perim = 2 * (W + H);
    const rows = [];
    const add = (r) => r && rows.push(r);
    const wall = p.substrate === 'vinil_muro';
    const mat = ctx.pick(p.materialId, wall ? 'Viniles' : 'Rígidos');
    let mountText = '—';
    if (wall) {
      add(row(ctx, mat, a * (n(p.coverage) / 100) * q, 'Vinil sobre muro', { note: `${n(p.coverage)}% del área` }));
      mountText = 'Aplicado directo sobre muro';
    } else {
      add(row(ctx, mat, a * q, 'Sustrato'));
      if (p.graphic === 'impreso') add(row(ctx, ctx.pick('vin-impreso', 'Viniles', (i) => /impreso/i.test(i.name)), a * q, 'Gráfico'));
      if (p.graphic === 'corte') add(row(ctx, ctx.pick('vin-corte', 'Viniles', (i) => /corte/i.test(i.name)), a * (n(p.coverage) / 100) * q, 'Gráfico', { note: `${n(p.coverage)}% de la cara` }));
      if (p.cnc) add(row(ctx, ctx.pick('srv-cnc', 'Servicios/Mano de Obra', (i) => /cnc/i.test(i.name)), perim * q, 'Maquinado', { waste: false }));
      if (p.mounting === 'pernos') {
        const per = R.pernosBase + Math.floor(a * R.pernosPerM2);
        add(row(ctx, ctx.pick('her-perno', 'Perfiles y Canales', (i) => /perno/i.test(i.name)), per * q, 'Montaje', { note: `${per} por pieza` }));
        mountText = `Perno separador inox · ${per} por pieza`;
      } else if (p.mounting === 'cinta') {
        add(row(ctx, ctx.pick('her-cinta', 'Perfiles y Canales', (i) => /cinta/i.test(i.name)), perim * R.cintaFactor * q, 'Montaje', { waste: false }));
        mountText = 'Cinta doble cara industrial';
      } else {
        add(row(ctx, ctx.pick('her-pega', 'Perfiles y Canales', (i) => /pegamento/i.test(i.name)), Math.max(1, Math.ceil((a * q) / R.pegaM2PerTube)), 'Montaje'));
        mountText = 'Pegamento especial';
      }
    }
    return {
      rows,
      specs: [
        SPEC('Material', mat?.name),
        !wall ? SPEC('Gráfico', F5_GRAPHICS.find((g) => g.id === p.graphic)?.name) : null,
        SPEC('Medidas', `${num(W)} × ${num(H)} m × ${q} pzas`),
        SPEC('Montaje', mountText),
      ].filter(Boolean),
      installM2: a * q,
      m2: a * q,
      summary: `${wall ? 'Vinil sobre muro' : mat?.name ?? 'Placa'} · ${num(W * 100, 0)}×${num(H * 100, 0)} cm ×${q}`,
    };
  },
};
