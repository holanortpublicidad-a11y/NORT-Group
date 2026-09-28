import React, { useState } from 'react';
import { PackagePlus, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Check, Field, Input, Modal, NumberInput, Segmented, Select } from '../../components/ui.jsx';
import { CATEGORIES, UNITS, marginPct, priceFromMargin, unitLabel } from '../../data/inventory.js';
import { marginTone } from '../../lib/pricing.js';
import { mxn, num, uid } from '../../lib/format.js';

const EMPTY = { name: '', category: 'Rígidos', unit: 'm2', cost: 0, price: 0, pricing: 'manual', targetMargin: 55, stock: null, minStock: null };

export default function ItemForm({ item, onClose, editable }) {
  const { state, dispatch } = useApp();
  const isNew = !item;
  const [f, setF] = useState(() => ({ ...EMPTY, ...(item ?? {}) }));
  const [confirmDel, setConfirmDel] = useState(false);
  const [entry, setEntry] = useState('');
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const cost = Number(f.cost) || 0;
  const price = f.pricing === 'margin' ? priceFromMargin(cost, Number(f.targetMargin) || 0) : Number(f.price) || 0;
  const m = marginPct(cost, price);
  const tracked = f.stock != null;
  const valid = f.name.trim().length > 1 && price >= 0;
  const usedIn = state.quotes.filter((q) => q.status !== 'Aprobada' && JSON.stringify(q.items).includes(`"${item?.id}"`)).length;
  const current = state.catalog.items.find((i) => i.id === item?.id);

  const save = () => {
    dispatch({ type: 'ITEM_SAVE', item: { ...f, id: f.id ?? uid('ins'), name: f.name.trim(), price, cost, stock: tracked ? Number(f.stock) || 0 : null, minStock: tracked ? Number(f.minStock) || 0 : null } });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nuevo insumo o servicio' : f.name}
      subtitle={isNew ? 'Se agrega al catálogo y queda disponible en el cotizador' : `${f.category} · ${unitLabel(f.unit)}`}
      footer={
        editable && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {!isNew ? (
              confirmDel ? (
                <span className="flex items-center gap-2 text-[13px]">
                  {usedIn > 0 ? `Se usa en ${usedIn} cotización(es) abierta(s).` : '¿Eliminar definitivamente?'}
                  <Button size="sm" variant="danger" onClick={() => { dispatch({ type: 'ITEM_DELETE', id: item.id }); onClose(); }}>Sí, eliminar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>No</Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" icon={Trash2} className="text-bad" onClick={() => setConfirmDel(true)}>Eliminar</Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button onClick={onClose}>Cancelar</Button>
              <Button variant="primary" disabled={!valid} onClick={save}>{isNew ? 'Agregar al catálogo' : 'Guardar cambios'}</Button>
            </div>
          </div>
        )
      }
    >
      <fieldset disabled={!editable} className="flex flex-col gap-5">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del producto / insumo" htmlFor="it-name" className="sm:col-span-2">
            <Input id="it-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. ACM 3 mm, Módulo LED 3 diodos" />
          </Field>
          <Field label="Categoría" htmlFor="it-cat">
            <Select id="it-cat" value={f.category} onChange={(e) => set({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Unidad de medida" htmlFor="it-unit">
            <Select id="it-unit" value={f.unit} onChange={(e) => set({ unit: e.target.value })}>
              {UNITS.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.label})</option>)}
            </Select>
          </Field>
          {f.category === 'Iluminación' && (
            <Field label="Potencia" htmlFor="it-w" hint="Módulos LED: watts por pieza. Fuentes: capacidad (≥ 20 W se toman como fuente).">
              <NumberInput id="it-w" unit="W" step="0.01" value={f.watts ?? ''} onChange={(v) => set({ watts: v === '' ? undefined : v })} />
            </Field>
          )}
        </div>

        <section>
          <div className="eyebrow mb-2">Precio</div>
          <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
            <Field label="Costo interno (compra)" htmlFor="it-cost">
              <NumberInput id="it-cost" unit={`/${unitLabel(f.unit)}`} step="0.01" value={f.cost} onChange={(v) => set({ cost: v })} />
            </Field>
            <Field label="Precio de venta sugerido" htmlFor="it-mode">
              <Segmented
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'margin', label: 'Por margen objetivo' },
                ]}
                value={f.pricing}
                onChange={(v) => set({ pricing: v, ...(v === 'manual' ? { price: Math.round(price * 100) / 100 } : {}) })}
              />
            </Field>
            {f.pricing === 'manual' ? (
              <Field label="Precio de venta" htmlFor="it-price">
                <NumberInput id="it-price" unit={`/${unitLabel(f.unit)}`} step="0.01" value={f.price} onChange={(v) => set({ price: v })} />
              </Field>
            ) : (
              <Field label="Margen objetivo" htmlFor="it-tm" hint="Precio = costo ÷ (1 − margen)">
                <NumberInput id="it-tm" unit="%" step="1" value={f.targetMargin} onChange={(v) => set({ targetMargin: Math.min(95, v || 0) })} />
              </Field>
            )}
            <div className="flex flex-col justify-end gap-1 rounded-md bg-surface-2 px-3 py-2">
              <span className="text-[11px] text-ink-3">Venta {f.pricing === 'margin' ? 'calculada' : ''}</span>
              <span className="tnum font-mono text-[15px] font-medium">{mxn(price)} <span className="text-[11px] text-ink-3">/{unitLabel(f.unit)}</span></span>
              <span><Badge tone={marginTone(m, state.catalog.rules.params)}>Margen {num(m, 1)}%</Badge></span>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11.5px] text-ink-3">Margen = ((precio − costo) ÷ precio) × 100</p>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Inventario</span>
            <Check id="it-track" label="Controlar stock" checked={tracked} onChange={(v) => set(v ? { stock: 0, minStock: 0 } : { stock: null, minStock: null })} />
          </div>
          {tracked ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock actual" htmlFor="it-stock" hint={!isNew ? 'Un cambio aquí se registra como ajuste manual' : undefined}>
                <NumberInput id="it-stock" unit={unitLabel(f.unit)} step="0.01" min={-99999} value={f.stock} onChange={(v) => set({ stock: v })} />
              </Field>
              <Field label="Stock mínimo (alerta)" htmlFor="it-min">
                <NumberInput id="it-min" unit={unitLabel(f.unit)} step="0.01" value={f.minStock} onChange={(v) => set({ minStock: v })} />
              </Field>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-3">Sin control de existencias (servicios, mano de obra o compras sobre pedido).</p>
          )}
          {!isNew && current?.stock != null && editable && (
            <div className="mt-3 flex items-end gap-2 rounded-md border border-dashed border-line p-3">
              <Field label="Registrar entrada de material" htmlFor="it-entry" className="flex-1">
                <NumberInput id="it-entry" unit={unitLabel(f.unit)} step="0.01" value={entry} onChange={setEntry} placeholder="0" />
              </Field>
              <Button
                icon={PackagePlus}
                disabled={!(Number(entry) > 0)}
                onClick={() => {
                  dispatch({ type: 'STOCK_IN', id: item.id, qty: Number(entry) });
                  set({ stock: Math.round(((Number(current.stock) || 0) + Number(entry)) * 1000) / 1000 });
                  setEntry('');
                }}
              >
                Sumar
              </Button>
            </div>
          )}
        </section>
      </fieldset>
    </Modal>
  );
}
