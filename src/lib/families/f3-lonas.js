import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export default {
  id: 'f3',
  name: 'Lonas y bastidores estructurales',
  short: 'Lonas',
  icon: 'Frame',
  supportsInstall: true,
  description: 'Frontlit, backlit o mesh. Con dobladillo y ojillos o tensada en bastidor de fierro soldado y pintado.',
  defaults: () => ({ lonaId: 'lona-front', width: 3, height: 1.5, qty: 1, structure: 'sin' }),
  calc(p, ctx) {
    const R = ctx.rules.f3;
    const W = n(p.width);
    const H = n(p.height);
    const q = Math.max(1, n(p.qty, 1));
    const lona = ctx.pick(p.lonaId, 'Lonas');
    const perim = 2 * (W + H);
    const rows = [];
    const add = (r) => r && rows.push(r);
    let frameMl = 0;
    if (p.structure === 'bastidor') {
      const b = R.bleed;
      add(row(ctx, lona, (W + 2 * b) * (H + 2 * b) * q, 'Lona', { note: `+${num(b * 100, 0)} cm por lado para tensar` }));
      const verticals = Math.max(0, Math.ceil(W / R.crossEvery) - 1);
      frameMl = perim + verticals * H;
      add(row(ctx, ctx.pick('per-ptr', 'Perfiles y Canales', (i) => /tubular|ptr/i.test(i.name)), frameMl * q, 'Bastidor', { note: `perímetro + ${verticals} travesaños` }));
      add(row(ctx, ctx.pick('srv-soldadura', 'Servicios/Mano de Obra', (i) => /soldad/i.test(i.name)), frameMl * q, 'Bastidor', { waste: false }));
    } else {
      add(row(ctx, lona, W * H * q, 'Lona'));
      add(row(ctx, ctx.pick('srv-dobladillo', 'Servicios/Mano de Obra', (i) => /dobladillo|ojillo/i.test(i.name)), perim * q, 'Acabado', { waste: false }));
    }
    return {
      rows,
      specs: [
        SPEC('Lona', lona?.name),
        SPEC('Medidas', `${num(W)} × ${num(H)} m${q > 1 ? ` × ${q}` : ''} = ${num(W * H * q, 2)} m²`),
        SPEC('Estructura', p.structure === 'bastidor' ? `Bastidor de fierro 1"×1" · ${num(frameMl, 2)} m.l. por pieza` : 'Sin bastidor: dobladillo y ojillos'),
      ],
      installM2: W * H * q,
      m2: W * H * q,
      summary: `${lona?.name ?? 'Lona'} · ${num(W)}×${num(H)} m${p.structure === 'bastidor' ? ' con bastidor' : ''}`,
    };
  },
};
