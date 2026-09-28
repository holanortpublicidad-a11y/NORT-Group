import React, { useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Plus, Search } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, Check, EmptyState, IconButton, NumberInput, SearchInput, cx } from '../../components/ui.jsx';
import { CATEGORIES, marginPct, unitLabel } from '../../data/inventory.js';
import { marginTone } from '../../lib/pricing.js';
import { mxn, mxn0, num } from '../../lib/format.js';
import ItemForm from './ItemForm.jsx';

export const isLow = (i) => i.stock != null && i.minStock != null && i.stock <= i.minStock;

export default function ItemsTab({ editable }) {
  const { state, dispatch } = useApp();
  const { items, rules } = state.catalog;
  const [cat, setCat] = useState('Todas');
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => (cat === 'Todas' || i.category === cat) && (!t || i.name.toLowerCase().includes(t)) && (!low || isLow(i)));
  }, [items, cat, q, low]);

  const lowCount = items.filter(isLow).length;
  const value = items.reduce((s, i) => s + (i.stock > 0 ? i.stock * i.cost : 0), 0);
  const avgMargin = items.length ? items.reduce((s, i) => s + marginPct(i.cost, i.price), 0) / items.length : 0;
  const patch = (it, p) => dispatch({ type: 'ITEM_SAVE', item: { ...it, ...p }, silent: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Insumos y servicios" value={items.length} />
        <Kpi label="Bajo stock mínimo" value={lowCount} tone={lowCount ? 'text-bad' : ''} onClick={() => setLow((x) => !x)} active={low} />
        <Kpi label="Valor del inventario (a costo)" value={mxn0(value)} />
        <Kpi label="Margen promedio del catálogo" value={`${num(avgMargin, 1)}%`} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput id="inv-search" icon={Search} value={q} onChange={setQ} placeholder="Buscar insumo o servicio" />
        <Check id="inv-low" label="Solo bajo mínimo" checked={low} onChange={setLow} />
        {editable && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nuevo insumo</Button>}
      </div>
      <div className="scroll-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1.5">
          {['Todas', ...CATEGORIES].map((c) => {
            const n = c === 'Todas' ? items.length : items.filter((i) => i.category === c).length;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={cx('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition', cat === c ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-ink-2 hover:bg-surface-2')}
              >
                {c}
                <span className="font-mono text-[11px] text-ink-3">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!list.length ? (
        <Card><EmptyState icon={Search} title="Sin insumos con ese filtro" /></Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="scroll-x">
              <table className="w-full min-w-[900px] text-left text-[13.5px]">
                <thead className="border-b border-line bg-surface-2/60 text-[12px] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Insumo / servicio</th>
                    <th className="px-3 py-2.5 font-medium">Unidad</th>
                    <th className="w-[150px] px-3 py-2.5 font-medium">Costo interno</th>
                    <th className="w-[150px] px-3 py-2.5 font-medium">Precio de venta</th>
                    <th className="px-3 py-2.5 font-medium">Margen</th>
                    <th className="px-3 py-2.5 font-medium">Stock / mínimo</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((i) => {
                    const m = marginPct(i.cost, i.price);
                    return (
                      <tr key={i.id} className={cx(isLow(i) && 'bg-bad/5')}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-[12px] text-ink-3">{i.category}{i.watts ? ` · ${i.watts} W` : ''}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[12.5px] text-ink-2">{unitLabel(i.unit)}</td>
                        <td className="px-3 py-2">
                          <NumberInput id={`c-${i.id}`} aria-label={`Costo de ${i.name}`} disabled={!editable} step="0.01" value={i.cost} onChange={(v) => patch(i, { cost: v || 0 })} />
                        </td>
                        <td className="px-3 py-2">
                          {i.pricing === 'margin' ? (
                            <div className="flex items-center gap-2">
                              <span className="tnum font-mono">{mxn(i.price)}</span>
                              <Badge tone="accent">auto {i.targetMargin}%</Badge>
                            </div>
                          ) : (
                            <NumberInput id={`p-${i.id}`} aria-label={`Precio de ${i.name}`} disabled={!editable} step="0.01" value={i.price} onChange={(v) => patch(i, { price: v || 0 })} />
                          )}
                        </td>
                        <td className="px-3 py-2"><Badge tone={marginTone(m, rules.params)}>{num(m, 1)}%</Badge></td>
                        <td className="px-3 py-2">
                          {i.stock == null ? (
                            <span className="text-ink-3">—</span>
                          ) : (
                            <span className={cx('tnum inline-flex items-center gap-1.5 font-mono text-[12.5px]', isLow(i) && 'font-medium text-bad')}>
                              {isLow(i) && <AlertTriangle size={13} />}
                              {num(i.stock, 2)} <span className="text-ink-3">/ {num(i.minStock, 2)}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <IconButton icon={Pencil} label={`Editar ${i.name}`} onClick={() => setEditing(i)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <ul className="flex flex-col gap-2 md:hidden">
            {list.map((i) => {
              const m = marginPct(i.cost, i.price);
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => setEditing(i)} className={cx('w-full rounded-lg border bg-surface p-3.5 text-left', isLow(i) ? 'border-bad/40' : 'border-line')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium leading-snug">{i.name}</div>
                        <div className="text-[12px] text-ink-3">{i.category}</div>
                      </div>
                      <Badge tone={marginTone(m, rules.params)}>{num(m, 1)}%</Badge>
                    </div>
                    <div className="tnum mt-2 grid grid-cols-3 gap-2 font-mono text-[12.5px]">
                      <span><span className="block font-sans text-[11px] text-ink-3">Costo</span>{mxn(i.cost)}</span>
                      <span><span className="block font-sans text-[11px] text-ink-3">Venta /{unitLabel(i.unit)}</span>{mxn(i.price)}</span>
                      <span className={cx(isLow(i) && 'text-bad')}><span className="block font-sans text-[11px] text-ink-3">Stock</span>{i.stock == null ? '—' : `${num(i.stock, 1)} / ${num(i.minStock, 1)}`}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {editing && <ItemForm item={editing === 'new' ? null : editing} editable={editable} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Kpi({ label, value, tone, onClick, active }) {
  const C = onClick ? 'button' : 'div';
  return (
    <C type={onClick ? 'button' : undefined} onClick={onClick} className={cx('rounded-lg border bg-surface p-3.5 text-left', active ? 'border-bad/50' : 'border-line', onClick && 'transition hover:bg-surface-2')}>
      <div className="text-[12px] text-ink-2">{label}</div>
      <div className={cx('tnum mt-1 font-display text-[26px] font-semibold leading-none', tone)}>{value}</div>
    </C>
  );
}
