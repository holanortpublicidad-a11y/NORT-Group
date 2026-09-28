import { SPEC, n, row } from './common.js';
import { num } from '../format.js';

export function volumeTiers(item, rules) {
  return item?.unit === 'millar' ? rules.f6.millar : rules.f6.pza;
}

export default {
  id: 'f6',
  name: 'Promocionales e impresos comerciales',
  short: 'Impresos',
  icon: 'Shirt',
  supportsInstall: false,
  description: 'Tarjetas, volantes, hojas membretadas, notas de remisión y playeras. Precio por volumen desde el inventario.',
  defaults: () => ({ productId: 'pro-tarjetas', volume: 1000, sides: 1 }),
  calc(p, ctx) {
    const item = ctx.pick(p.productId, 'Impresos/Promocionales');
    const tiers = volumeTiers(item, ctx.rules);
    const vol = n(p.volume) || tiers[0]?.qty || 0;
    // factor del escalón igual o inmediatamente menor al volumen
    const tier = [...tiers].sort((a, b) => a.qty - b.qty).filter((t) => t.qty <= vol).pop() ?? tiers[0];
    const printed = item?.unit === 'millar';
    const sides = printed && n(p.sides) === 2 ? ctx.rules.f6.twoSides : 1;
    const qty = printed ? vol / 1000 : vol;
    const factor = Math.round(tier.factor * sides * 1000) / 1000;
    const r = row(ctx, item, qty, 'Producto', { factor, waste: false, note: `escalón ${tier.qty}${sides > 1 ? ' · 2 caras' : ''}` });
    return {
      rows: r ? [r] : [],
      specs: [
        SPEC('Producto', item?.name),
        SPEC('Cantidad', `${num(vol, 0)} ${printed ? 'piezas' : 'pzas'}${printed ? ` (${num(qty, 2)} millar)` : ''}`),
        printed ? SPEC('Impresión', n(p.sides) === 2 ? 'Frente y vuelta' : 'Solo frente') : null,
      ].filter(Boolean),
      installM2: 0,
      m2: 0,
      summary: `${item?.name ?? 'Impreso'} · ${num(vol, 0)} pzas`,
    };
  },
};
