import React, { useMemo } from 'react';
import { ArrowRight, FilePlus2, Kanban } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, PageHeader, SlaBar, SlaPill, cx } from '../../components/ui.jsx';
import { useOrderRows } from '../orders/OrdersView.jsx';
import { BOARD_PHASES as PHASES, isClosed, phaseName } from '../../lib/sla.js';
import { calcQuote } from '../../lib/pricing.js';
import { fmtDay, mxn0, num } from '../../lib/format.js';
import { isLow } from '../inventory/ItemsTab.jsx';
import { unitLabel } from '../../data/inventory.js';
import { can, canSeeCosts, roleName } from '../../lib/permissions.js';

function Kpi({ label, value, sub, tone }) {
  return (
    <Card className="p-4">
      <div className="text-[12.5px] text-ink-2">{label}</div>
      <div className={cx('tnum mt-1 font-display text-[30px] font-semibold leading-none', tone)}>{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-ink-3">{sub}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { state, dispatch, role, me, now, nav } = useApp();
  const rows = useOrderRows();
  const active = rows.filter((r) => !isClosed(r.order.phase) && r.order.phase !== 'sin_liberar');
  const pendingRelease = rows.filter((r) => r.order.phase === 'sin_liberar');
  const red = active.filter((r) => r.sla.level === 'red');
  const yellow = active.filter((r) => r.sla.level === 'yellow');

  const month = useMemo(() => {
    const d = new Date(now);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const qs = state.quotes.filter((q) => q.createdAt >= start);
    const approved = state.quotes.filter((q) => q.approvedAt && q.approvedAt >= start);
    const sum = (list) => list.reduce((s, q) => s + calcQuote(q, state.catalog).subtotal, 0);
    const cost = approved.reduce((s, q) => s + calcQuote(q, state.catalog).cost, 0);
    const decided = state.quotes.filter((q) => q.status === 'Aprobada' || q.status === 'Rechazada');
    return {
      quoted: sum(qs),
      sold: sum(approved),
      rate: decided.length ? state.quotes.filter((q) => q.status === 'Aprobada').length / decided.length : 0,
      margin: sum(approved) > 0 ? ((sum(approved) - cost) / sum(approved)) * 100 : 0,
      pending: state.quotes.filter((q) => q.status === 'Enviada' || q.status === 'Borrador').length,
      label: d.toLocaleDateString('es-MX', { month: 'long' }),
    };
  }, [state.quotes, state.catalog, now]);

  const attention = [...active].filter((r) => r.sla.level !== 'green').sort((a, b) => b.sla.pct - a.sla.pct);
  const myWork =
    role === 'instalador' || role === 'diseno'
      ? active.filter((r) => [r.order.designerId, ...r.order.installerIds].includes(me.id))
      : null;
  const lowItems = state.catalog.items.filter(isLow);
  const maxPhase = Math.max(1, ...PHASES.map((p) => rows.filter((r) => r.order.phase === p.id).length));

  return (
    <div>
      <PageHeader
        eyebrow={roleName(role)}
        title={`Hola, ${me?.name.split(' ')[0]}`}
        subtitle={`${active.length} órdenes activas · ${red.length} críticas · ${yellow.length} en riesgo`}
        actions={
          <>
            {can(role, 'quotes', 'edit') && (
              <Button variant="primary" icon={FilePlus2} onClick={() => dispatch({ type: 'NEW_QUOTE' })}>
                Nueva cotización
              </Button>
            )}
            <Button icon={Kanban} onClick={() => nav({ name: 'orders' })}>
              Tablero de OTs
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="OTs críticas" value={red.length} sub="> 90 % del tiempo o vencidas" tone={red.length ? 'text-bad' : ''} />
        <Kpi label="OTs en riesgo" value={yellow.length} sub="Entre 60 % y 90 %" tone={yellow.length ? 'text-warn-ink' : ''} />
        <Kpi label={`Vendido en ${month.label}`} value={mxn0(month.sold)} sub={canSeeCosts(role) ? `Margen ${num(month.margin, 1)}% · cotizado ${mxn0(month.quoted)}` : `Cotizado: ${mxn0(month.quoted)} (antes de IVA)`} />
        <Kpi label="Tasa de aprobación" value={`${Math.round(month.rate * 100)}%`} sub={`${month.pending} cotizaciones abiertas`} />
      </div>

      {pendingRelease.length > 0 && ['admin', 'ventas', 'contabilidad'].includes(role) && (
        <Card className="mt-5 border-warn/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold tracking-wide">OT pendientes de liberar</h2>
            <span className="text-[12px] text-ink-3">Contrato firmado + archivos en carpeta compartida</span>
          </div>
          <ul className="divide-y divide-line">
            {pendingRelease.map((r) => (
              <li key={r.order.id}>
                <button type="button" onClick={() => nav({ name: 'orders', open: r.order.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2/60">
                  <span className="min-w-0">
                    <span className="font-mono text-[12px] text-ink-3">{r.order.id}</span>
                    <span className="block truncate font-medium">{r.client?.tradeName} · {r.order.title}</span>
                  </span>
                  <Badge tone="warn">Sin liberar</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid-cols-1 mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold tracking-wide">{myWork ? 'Mis asignaciones' : 'Requieren atención'}</h2>
            <button type="button" onClick={() => nav({ name: 'orders' })} className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <ul className="divide-y divide-line">
            {(myWork ?? attention).map((r) => (
              <li key={r.order.id}>
                <button type="button" onClick={() => nav({ name: 'orders', open: r.order.id })} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition hover:bg-surface-2/60 sm:grid-cols-[1fr_160px_auto]">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-ink-3">{r.order.id}</span>
                      <Badge>{phaseName(r.order.phase)}</Badge>
                    </span>
                    <span className="mt-0.5 block truncate font-medium">{r.client?.tradeName} · {r.order.title}</span>
                  </span>
                  <span className="order-last col-span-2 sm:order-none sm:col-span-1">
                    <SlaBar sla={r.sla} />
                    <span className={cx('mt-1 block text-[11.5px]', r.sla.overdue ? 'text-bad' : 'text-ink-3')}>{r.sla.text}</span>
                  </span>
                  <SlaPill sla={r.sla} />
                </button>
              </li>
            ))}
            {!(myWork ?? attention).length && <li className="px-4 py-8 text-center text-ink-3">Todo en tiempo. Sin órdenes en riesgo.</li>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 font-display text-lg font-semibold tracking-wide">Carga por fase</h2>
          <p className="mb-4 text-[12px] text-ink-3">Número de OTs por fase, coloreadas por semáforo</p>
          <ul className="flex flex-col gap-2.5">
            {PHASES.map((p) => {
              const list = rows.filter((r) => r.order.phase === p.id);
              const seg = ['red', 'yellow', 'green', 'done', 'late'].map((lvl) => ({ lvl, n: list.filter((r) => r.sla.level === lvl).length }));
              return (
                <li key={p.id} className="grid grid-cols-[92px_1fr_24px] items-center gap-3 text-[13px]">
                  <span className="text-ink-2">{p.name}</span>
                  <span className="flex h-3.5 overflow-hidden rounded-sm bg-surface-2">
                    {seg.map(
                      (s) =>
                        s.n > 0 && (
                          <span
                            key={s.lvl}
                            className={{ red: 'bg-bad', yellow: 'bg-warn', green: 'bg-ok', done: 'bg-ink-3/50', late: 'bg-ink-3/50' }[s.lvl]}
                            style={{ width: `${(s.n / maxPhase) * 100}%` }}
                          />
                        ),
                    )}
                  </span>
                  <span className="tnum text-right font-mono text-ink-2">{list.length}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 text-[11.5px] text-ink-3">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" />En tiempo</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />En riesgo</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" />Crítica</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-3/50" />Cerrada</span>
          </div>
        </Card>
      </div>

      {can(role, 'catalog') && lowItems.length > 0 && (
        <Card className="mt-5 border-bad/30">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold tracking-wide">Inventario bajo mínimo</h2>
            <button type="button" onClick={() => nav({ name: 'catalog' })} className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
              Ir a inventario <ArrowRight size={14} />
            </button>
          </div>
          <ul className="grid-cols-1 grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {lowItems.slice(0, 8).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] sm:border-b sm:border-line">
                <span className="min-w-0 truncate">{i.name}</span>
                <span className="tnum shrink-0 font-mono text-bad">
                  {num(i.stock, 1)} / {num(i.minStock, 1)} {unitLabel(i.unit)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {can(role, 'quotes') && (
        <Card className="mt-5">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold tracking-wide">Últimas cotizaciones</h2>
          </div>
          <ul className="divide-y divide-line">
            {[...state.quotes]
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 4)
              .map((q) => (
                <li key={q.id}>
                  <button type="button" onClick={() => nav({ name: 'quote', id: q.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2/60">
                    <span className="min-w-0">
                      <span className="font-mono text-[12px] text-ink-3">{q.id}</span>
                      <span className="block truncate">{state.clients.find((c) => c.id === q.clientId)?.tradeName} · {q.title}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-[12px] text-ink-3 sm:inline">{fmtDay(q.createdAt)}</span>
                      <Badge tone={{ Borrador: 'neutral', Enviada: 'accent', Aprobada: 'ok', Rechazada: 'bad' }[q.status]}>{q.status}</Badge>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
