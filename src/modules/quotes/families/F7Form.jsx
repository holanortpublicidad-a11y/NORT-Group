import React from 'react';
import { Field } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { unitLabel } from '../../../data/inventory.js';
import { Num } from './shared.jsx';

export default function F7Form({ p, set, catalog, fid }) {
  const item = catalog.items.find((i) => i.id === p.itemId);
  return (
    <div className="grid-cols-1 grid gap-3 sm:grid-cols-[1fr_160px]">
      <Field label="Artículo del inventario" htmlFor={fid('item')}>
        <ItemSelect id={fid('item')} catalog={catalog} value={p.itemId} onChange={(v) => set({ itemId: v })} />
      </Field>
      <Num label="Cantidad" id={fid('q')} unit={unitLabel(item?.unit)} step="0.5" value={p.qty} onChange={(v) => set({ qty: v })} />
    </div>
  );
}
