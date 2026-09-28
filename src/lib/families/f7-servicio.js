import { SPEC, n, row } from './common.js';
import { unitLabel } from '../../data/inventory.js';
import { num } from '../format.js';

export default {
  id: 'f7',
  name: 'Servicio o insumo suelto',
  short: 'Servicio',
  icon: 'Wrench',
  supportsInstall: false,
  description: 'Cualquier artículo del inventario por cantidad: diseño, levantamiento, renta de grúa, material sin procesar.',
  defaults: () => ({ itemId: 'srv-diseno', qty: 1 }),
  calc(p, ctx) {
    const item = ctx.pick(p.itemId, 'Servicios/Mano de Obra');
    const q = n(p.qty);
    const r = row(ctx, item, q, 'Servicio', { waste: false });
    return {
      rows: r ? [r] : [],
      specs: [SPEC('Concepto', `${item?.name ?? '—'} · ${num(q, 2)} ${unitLabel(item?.unit)}`)],
      installM2: 0,
      m2: 0,
      summary: `${item?.name ?? 'Servicio'} · ${num(q, 2)} ${unitLabel(item?.unit)}`,
    };
  },
};
