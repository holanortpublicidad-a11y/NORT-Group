import React from 'react';
import { Field, cx } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { volumeTiers } from '../../../lib/families/f6-promocionales.js';
import { mxn, mxn0, num } from '../../../lib/format.js';
import { Choice, Section } from './shared.jsx';

const SIDES = [
  { id: 1, name: 'Solo frente' },
  { id: 2, name: 'Frente y vuelta' },
];

export default function F6Form({ p, set, catalog, fid }) {
  const item = catalog.items.find((i) => i.id === p.productId);
  const tiers = [...volumeTiers(item, catalog.rules)].sort((a, b) => a.qty - b.qty);
  const printed = item?.unit === 'millar';
  const sideF = printed && Number(p.sides) === 2 ? catalog.rules.f6.twoSides : 1;
  const priceFor = (t) => (item ? (printed ? t.qty / 1000 : t.qty) * item.price * t.factor * sideF : 0);
  return (
    <div className="flex flex-col gap-5">
      <Field label="Producto" htmlFor={fid('prod')}>
        <ItemSelect
          id={fid('prod')}
          catalog={catalog}
          categories={['Impresos/Promocionales']}
          value={p.productId}
          onChange={(v) => {
            const it = catalog.items.find((i) => i.id === v);
            const t = volumeTiers(it, catalog.rules);
            set({ productId: v, volume: t.some((x) => x.qty === Number(p.volume)) ? p.volume : t[Math.min(2, t.length - 1)]?.qty });
          }}
        />
      </Field>
      {printed && <Choice label="Impresión" id={fid('sides')} options={SIDES} value={Number(p.sides) || 1} onChange={(v) => set({ sides: v })} />}
      <Section title="Volumen · precio por paquete">
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tiers.map((t) => {
            const active = Number(p.volume) === t.qty;
            return (
              <button
                key={t.qty}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ volume: t.qty })}
                className={cx('rounded-lg border px-3 py-2.5 text-left transition', active ? 'border-accent bg-accent/10' : 'border-line hover:bg-surface-2')}
              >
                <div className={cx('font-display text-xl font-semibold leading-none', active && 'text-accent')}>{num(t.qty, 0)}</div>
                <div className="text-[11px] text-ink-3">piezas · ×{num(t.factor, 2)}</div>
                <div className="tnum mt-1 font-mono text-[13px]">{mxn0(priceFor(t))}</div>
                <div className="tnum font-mono text-[10.5px] text-ink-3">{mxn(priceFor(t) / t.qty)} c/u</div>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
