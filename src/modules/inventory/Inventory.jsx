import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Card, EmptyState, PageHeader, Segmented, cx } from '../../components/ui.jsx';
import { can } from '../../lib/permissions.js';
import { fmtDateTime, num } from '../../lib/format.js';
import { unitLabel } from '../../data/inventory.js';
import ItemsTab from './ItemsTab.jsx';
import { FamilyRules, GeneralRules, InstallRules } from './RulesTab.jsx';

const TABS = [
  { value: 'items', label: 'Inventario' },
  { value: 'families', label: 'Reglas del cotizador' },
  { value: 'install', label: 'Instalación' },
  { value: 'moves', label: 'Movimientos' },
  { value: 'general', label: 'Generales' },
];

export default function Inventory() {
  const { role } = useApp();
  const [tab, setTab] = useState('items');
  const editable = can(role, 'catalog', 'edit');
  return (
    <div>
      <PageHeader
        eyebrow="Inventario y catálogo de precios"
        title="Inventario y precios"
        subtitle={editable ? 'Costo, precio de venta, margen y existencias de cada insumo. Los cambios se reflejan al instante en las cotizaciones abiertas.' : 'Solo lectura para tu rol'}
      />
      <div className="scroll-x no-scrollbar -mx-4 mb-4 px-4 md:mx-0 md:px-0">
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </div>
      {tab === 'items' && <ItemsTab editable={editable} />}
      {tab === 'families' && <FamilyRules editable={editable} />}
      {tab === 'install' && <InstallRules editable={editable} />}
      {tab === 'moves' && <Movements />}
      {tab === 'general' && <GeneralRules editable={editable} />}
    </div>
  );
}

function Movements() {
  const { state, userById, nav } = useApp();
  const list = state.movements;
  if (!list.length)
    return (
      <Card>
        <EmptyState icon={History} title="Sin movimientos todavía">
          Se registran al aprobar cotizaciones (consumo de material), al dar entradas de material y al ajustar stock.
        </EmptyState>
      </Card>
    );
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {list.map((m) => {
          const out = m.qty < 0;
          const Icon = out ? ArrowDownRight : ArrowUpRight;
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <Icon size={16} className={out ? 'text-bad' : 'text-ok'} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.name}</div>
                <div className="text-[11.5px] text-ink-3">
                  {m.ref?.startsWith('OT-') ? (
                    <button type="button" className="font-mono text-accent hover:underline" onClick={() => nav({ name: 'orders', open: m.ref })}>{m.ref}</button>
                  ) : (
                    m.ref
                  )}{' '}
                  · {userById(m.by)?.name ?? '—'} · {fmtDateTime(m.at)}
                </div>
              </div>
              <span className={cx('tnum shrink-0 font-mono', out ? 'text-bad' : 'text-ok')}>
                {out ? '' : '+'}
                {num(m.qty, 2)} {unitLabel(m.unit)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
