import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge, Select, cx } from './ui.jsx';
import { unitLabel } from '../data/inventory.js';
import { marginTone } from '../lib/pricing.js';
import { mxn, num } from '../lib/format.js';

/** Selector de insumos del inventario, filtrado por categoría. */
export function ItemSelect({ id, value, onChange, catalog, categories, filter, noneLabel, className }) {
  const list = catalog.items.filter((i) => (!categories || categories.includes(i.category)) && (!filter || filter(i)));
  const groups = list.reduce((acc, i) => ((acc[i.category] ||= []).push(i), acc), {});
  const multi = Object.keys(groups).length > 1;
  const opt = (i) => (
    <option key={i.id} value={i.id}>
      {i.name} — {mxn(i.price)}/{unitLabel(i.unit)}
    </option>
  );
  return (
    <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={className}>
      {noneLabel && <option value="">{noneLabel}</option>}
      {multi
        ? Object.entries(groups).map(([cat, items]) => (
            <optgroup key={cat} label={cat}>
              {items.map(opt)}
            </optgroup>
          ))
        : list.map(opt)}
      {value && !list.some((i) => i.id === value) && <option value={value}>(insumo eliminado)</option>}
    </Select>
  );
}

export function MarginBadge({ margin, params, className }) {
  return (
    <Badge tone={marginTone(margin, params)} className={className}>
      Margen {num(margin, 1)}%
    </Badge>
  );
}

/** Tabla de lista de materiales (BOM). */
export function BomTable({ rows, catalog, showCosts, compact }) {
  if (!rows.length) return <p className="py-4 text-center text-[12.5px] text-ink-3">Sin materiales todavía.</p>;
  const stockOf = (id) => catalog?.items.find((i) => i.id === id)?.stock;
  return (
    <div className="scroll-x">
      <table className={cx('w-full text-left', compact ? 'text-[12px]' : 'text-[12.5px]')}>
        <thead className="text-[11px] uppercase tracking-[0.06em] text-ink-3">
          <tr className="border-b border-line">
            <th className="py-1.5 pr-2 font-medium">Material / servicio</th>
            <th className="py-1.5 pr-2 text-right font-medium">Cant.</th>
            {showCosts && <th className="py-1.5 pr-2 text-right font-medium">Costo</th>}
            <th className="py-1.5 text-right font-medium">Precio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((r, i) => {
            const stock = stockOf(r.itemId);
            const short = stock != null && r.qty > stock;
            return (
              <tr key={i} className="align-top">
                <td className="py-1.5 pr-2">
                  <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{r.role}</div>
                  <div className="flex items-center gap-1 leading-snug">
                    {short && <AlertTriangle size={12} className="shrink-0 text-bad" aria-label="Stock insuficiente" />}
                    {r.name}
                  </div>
                  {r.note && <div className="font-mono text-[10.5px] text-ink-3">{r.note}</div>}
                  {short && <div className="text-[10.5px] text-bad">Stock: {num(stock, 2)} {unitLabel(r.unit)}</div>}
                </td>
                <td className="tnum whitespace-nowrap py-1.5 pr-2 text-right font-mono">
                  {num(r.qty, 2)} <span className="text-ink-3">{unitLabel(r.unit)}</span>
                </td>
                {showCosts && <td className="tnum whitespace-nowrap py-1.5 pr-2 text-right font-mono text-ink-2">{mxn(r.cost)}</td>}
                <td className="tnum whitespace-nowrap py-1.5 text-right font-mono">{mxn(r.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
