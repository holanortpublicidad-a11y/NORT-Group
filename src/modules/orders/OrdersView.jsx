import React, { useMemo, useState } from 'react';
import { Clock, Kanban as KanbanIcon, Minus, Plus, RotateCcw, Search, Table2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { PageHeader, SearchInput, Segmented, cx } from '../../components/ui.jsx';
import Kanban from './Kanban.jsx';
import OrdersTable from './OrdersTable.jsx';
import OrderDetail from './OrderDetail.jsx';
import { computeSla, isClosed, phaseName } from '../../lib/sla.js';
import { canMovePhase } from '../../lib/permissions.js';
import { fmtDate } from '../../lib/format.js';

/** Construye filas enriquecidas (SLA, cliente, personas) para vistas de OTs. */
export function useOrderRows() {
  const { state, now, clientById, userById } = useApp();
  return useMemo(
    () =>
      state.orders.map((order) => ({
        order,
        sla: computeSla(order, now),
        client: clientById(order.clientId),
        people: [order.designerId, ...order.installerIds].map((id) => userById(id)?.name).filter(Boolean),
      })),
    [state.orders, now, clientById, userById],
  );
}

const LIGHTS = [
  { id: 'green', label: 'En tiempo', hint: '< 60 %', dot: 'bg-ok', ring: 'border-ok/50 bg-ok/10' },
  { id: 'yellow', label: 'En riesgo', hint: '60–90 %', dot: 'bg-warn', ring: 'border-warn/60 bg-warn/10' },
  { id: 'red', label: 'Críticas', hint: '> 90 % o vencidas', dot: 'bg-bad', ring: 'border-bad/50 bg-bad/10' },
];

export default function OrdersView({ route }) {
  const { state, dispatch, role, me, now, notify } = useApp();
  const [view, setView] = useState('kanban');
  const [q, setQ] = useState('');
  const [light, setLight] = useState(null);
  const [mine, setMine] = useState(role === 'instalador' || role === 'diseno');
  const [openId, setOpenId] = useState(route.open ?? null);
  const all = useOrderRows();

  const rows = all.filter((r) => {
    const term = q.trim().toLowerCase();
    if (term && ![r.order.id, r.order.title, r.client?.tradeName].join(' ').toLowerCase().includes(term)) return false;
    if (light && r.sla.level !== light) return false;
    if (mine && me && ![r.order.designerId, ...r.order.installerIds].includes(me.id)) return false;
    return true;
  });
  const active = all.filter((r) => !isClosed(r.order.phase));
  const count = (lvl) => active.filter((r) => r.sla.level === lvl).length;

  const move = (id, phase) => {
    const o = state.orders.find((x) => x.id === id);
    if (!o || o.phase === phase) return;
    if (!canMovePhase(role, o.phase)) {
      notify(`Tu rol no puede mover OTs desde ${phaseName(o.phase)}`, 'bad');
      return;
    }
    dispatch({ type: 'MOVE_ORDER', id, phase });
    notify(`${id} → ${phaseName(phase)}`);
  };

  const off = state.offsetDays;

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 3"
        title="Órdenes de trabajo"
        subtitle="Ventas → Diseño → Producción → Fabricación → Instalación → Concluido → Facturado"
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', label: 'Kanban', icon: KanbanIcon },
              { value: 'table', label: 'Tabla', icon: Table2 },
            ]}
          />
        }
      />

      {/* Semáforo + simulador */}
      <div className="grid-cols-1 mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 gap-2">
          {LIGHTS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={light === l.id}
              onClick={() => setLight((x) => (x === l.id ? null : l.id))}
              className={cx('flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition', light === l.id ? l.ring : 'border-line bg-surface hover:bg-surface-2')}
            >
              <span className={cx('h-3 w-3 shrink-0 rounded-full', l.dot)} />
              <span className="min-w-0">
                <span className="tnum block font-display text-2xl font-semibold leading-none">{count(l.id)}</span>
                <span className="block truncate text-[12px] text-ink-2">{l.label}</span>
                <span className="hidden text-[11px] text-ink-3 sm:block">{l.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line px-3 py-2">
          <div className="flex items-center gap-2 text-[12.5px]">
            <Clock size={16} className="text-ink-3" />
            <div>
              <div className="font-medium">Simular reloj</div>
              <div className="tnum text-ink-3">
                {fmtDate(now)} {off ? `(${off > 0 ? '+' : ''}${off} d)` : '(hoy)'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Retroceder un día" onClick={() => dispatch({ type: 'SET_OFFSET', days: off - 1 })} className="flex h-8 w-8 items-center justify-center rounded-md border border-line hover:bg-surface-2">
              <Minus size={15} />
            </button>
            <button type="button" aria-label="Avanzar un día" onClick={() => dispatch({ type: 'SET_OFFSET', days: off + 1 })} className="flex h-8 w-8 items-center justify-center rounded-md border border-line hover:bg-surface-2">
              <Plus size={15} />
            </button>
            {off !== 0 && (
              <button type="button" aria-label="Volver a hoy" onClick={() => dispatch({ type: 'SET_OFFSET', days: 0 })} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2">
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput id="orders-search" icon={Search} value={q} onChange={setQ} placeholder="Buscar OT, cliente o proyecto" />
        <label className="flex items-center gap-2 text-[13px] text-ink-2" htmlFor="orders-mine">
          <input id="orders-mine" type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Solo mis asignaciones
        </label>
      </div>

      {view === 'kanban' ? (
        <Kanban rows={rows} role={role} onOpen={setOpenId} onMove={move} />
      ) : (
        <OrdersTable rows={rows} role={role} onOpen={setOpenId} onMove={move} />
      )}

      {openId && <OrderDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
