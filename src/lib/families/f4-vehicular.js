import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export const F4_TYPES = [
  { id: 'logos', name: 'Logotipos / vinil de corte' },
  { id: 'parcial', name: 'Rotulación parcial' },
  { id: 'wrap', name: 'Wrap completo' },
];

/** Acomodo de stickers en planilla sobre rollo. */
export function stickerLayout(p, rules) {
  const R = rules.f4;
  const w = n(p.wCm);
  const h = n(p.hCm);
  const usable = R.rollWidth * 100 - 2; // 1 cm de margen por lado
  const perRow = w > 0 ? Math.max(1, Math.floor(usable / (w + R.gapCm))) : 1;
  const rowsN = Math.ceil(n(p.pieces) / perRow);
  const lengthM = (rowsN * (h + R.gapCm)) / 100;
  const m2 = Math.max(0.25, R.rollWidth * lengthM);
  return { perRow, rows: rowsN, lengthM, m2 };
}

export default {
  id: 'f4',
  name: 'Rotulación vehicular y stickers',
  short: 'Vehicular / stickers',
  icon: 'Car',
  supportsInstall: false,
  description: 'Logos, parcial o wrap completo según tipo de vehículo; o stickers en planilla con cálculo de m² y suaje.',
  defaults: () => ({ mode: 'vehicular', vtype: 'parcial', vinylId: 'vin-impreso', laminate: true, vehicleId: 'pickup', m2Override: '', qty: 1, wCm: 5, hCm: 5, pieces: 500, stickerLam: false }),
  calc(p, ctx) {
    const R = ctx.rules.f4;
    const rows = [];
    const add = (r) => r && rows.push(r);
    if (p.mode === 'stickers') {
      const L = stickerLayout(p, ctx.rules);
      add(row(ctx, ctx.pick('srv-stickers', 'Servicios/Mano de Obra', (i) => /sticker/i.test(i.name)), L.m2, 'Impresión', { note: `${L.perRow} por fila × ${L.rows} filas`, waste: false }));
      add(row(ctx, ctx.pick('srv-suaje', 'Servicios/Mano de Obra', (i) => /suaje/i.test(i.name)), L.m2, 'Corte', { waste: false }));
      if (p.stickerLam) add(row(ctx, ctx.pick('srv-lam', 'Servicios/Mano de Obra', (i) => /lamin/i.test(i.name)), L.m2, 'Acabado', { waste: false }));
      return {
        rows,
        specs: [
          SPEC('Sticker', `${num(p.wCm, 1)} × ${num(p.hCm, 1)} cm · ${n(p.pieces)} piezas`),
          SPEC('Planilla', `Rollo ${num(R.rollWidth)} m · ${L.perRow} por fila · ${num(L.lengthM, 2)} m de largo = ${num(L.m2, 2)} m²`),
          SPEC('Acabado', p.stickerLam ? 'Laminado + suaje' : 'Suaje / corte'),
        ],
        installM2: 0,
        m2: L.m2,
        summary: `Stickers ${num(p.wCm, 1)}×${num(p.hCm, 1)} cm · ${n(p.pieces)} pzas`,
      };
    }
    const veh = R.vehicles.find((v) => v.id === p.vehicleId) ?? R.vehicles[0];
    const q = Math.max(1, n(p.qty, 1));
    const cover = R.coverage[p.vtype] ?? 100;
    const m2 = p.m2Override !== '' && n(p.m2Override) > 0 ? n(p.m2Override) : (veh.m2 * cover) / 100;
    const vinyl = ctx.pick(p.vinylId, 'Viniles');
    const waste = 1 + R.wrapWaste / 100;
    add(row(ctx, vinyl, m2 * waste * q, 'Vinil', { note: `+${R.wrapWaste}% merma de wrap`, waste: false }));
    if (p.laminate) add(row(ctx, ctx.pick('veh-lamuv', 'Vehicular', (i) => /lamin/i.test(i.name)), m2 * waste * q, 'Protección UV', { waste: false }));
    add(row(ctx, ctx.pick('veh-mo', 'Vehicular', (i) => /mano de obra/i.test(i.name)), m2 * veh.factor * q, 'Mano de obra', { note: `complejidad ×${veh.factor} (${veh.name})`, waste: false }));
    const type = F4_TYPES.find((t) => t.id === p.vtype)?.name;
    return {
      rows,
      specs: [
        SPEC('Tipo', type),
        SPEC('Vehículo', `${veh.name}${q > 1 ? ` · ${q} unidades` : ''}`),
        SPEC('Superficie', `${num(m2, 2)} m² por unidad${p.m2Override !== '' && n(p.m2Override) > 0 ? ' (medida manual)' : ` (${cover}% de ${veh.m2} m²)`}`),
        SPEC('Vinil', `${vinyl?.name ?? '—'}${p.laminate ? ' + laminado UV' : ''}`),
      ],
      installM2: 0,
      m2: m2 * q,
      summary: `${type} · ${veh.name}${q > 1 ? ` ×${q}` : ''}`,
    };
  },
};
