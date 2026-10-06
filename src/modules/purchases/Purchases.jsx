import React, { useMemo, useState } from 'react';
import { CheckCircle2, Copy, ShoppingCart } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, EmptyState, PageHeader, SearchInput, Segmented, copyText, cx } from '../../components/ui.jsx';
import { groupByItem, groupByOrder, purchaseRows } from '../../lib/purchases.js';
import { can } from '../../lib/permissions.js';
import { phaseName } from '../../lib/sla.js';
import { fmtDate, fmtDateTime, mxn, num } from '../../lib/format.js';
import { unitLabel } from '../../data/inventory.js';
import { COMPANY } from '../../config.js';

const qtyU = (q, u) => `${num(q, 2)} ${unitLabel(u)}`;

function BuyCheck({ id, checked, onChange, disabled, label }) {
  return (
    <input
      id={id}
      type="checkbox"
      aria-label={label}
      className="h-5 w-5 shrink-0 accent-[rgb(var(--ok))]"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

export default function Purchases() {
  const { state, dispatch, role, clientById, userById, nav, notify } = useApp();
  const [view, setView] = useState('item');
  const [show, setShow] = useState('pending');
  const [q, setQ] = useState('');
  const editable = can(role, 'purchases', 'edit');

  const all = useMemo(() => purchaseRows(state.orders, state.catalog, state.purchases), [state.orders, state.catalog, state.purchases]);
  const pendingAll = all.filter((r) => !r.bought);
  const rows = all.filter((r) => {
    if (show === 'pending' && r.bought) return false;
    if (show === 'bought' && !r.bought) return false;
    const t = q.trim().toLowerCase();
    return !t || `${r.name} ${r.orderId} ${r.orderTitle} ${clientById(r.clientId)?.tradeName ?? ''} ${r.category}`.toLowerCase().includes(t);
  });
  const items = groupByItem(rows, state.catalog);
  const orders = groupByOrder(rows);
  const cats = [...new Set(items.map((g) => g.category))];
  const pendingCost = pendingAll.reduce((s, r) => s + r.cost, 0);
  const pendingOrders = new Set(pendingAll.map((r) => r.orderId)).size;
  const pendingItems = new Set(pendingAll.map((r) => r.itemId)).size;

  const set = (list, bought) => {
    dispatch({ type: 'PURCHASE_SET', rows: list.map((r) => ({ key: r.key, itemId: r.itemId, orderId: r.orderId, qty: r.qty })), bought });
    if (list.length > 1) notify(bought ? `${list.length} partidas marcadas como compradas` : 'Compras desmarcadas');
  };
  const proj = (r) => `${r.orderId} · ${clientById(r.clientId)?.tradeName ?? r.orderTitle}`;

  const listText = () => {
    const g = groupByItem(pendingAll, state.catalog);
    return [
      `*${COMPANY.name} · Lista de compras*`,
      `${g.length} materiales para ${pendingOrders} proyectos`,
      '',
      ...g.flatMap((x) => [`• ${x.name}: *${qtyU(x.pendingQty, x.unit)}*`, ...(x.rows.length > 1 ? x.rows.map((r) => `    ${proj(r)}: ${qtyU(r.qty, r.unit)}`) : [`    ${proj(x.rows[0])}`])]),
    ].join('\n');
  };

  const boughtInfo = (r) => r.bought && <span className="block text-[11px] text-ok">Comprado {fmtDateTime(r.bought.at)} · {userById(r.bought.by)?.name ?? ''}</span>;

  return (
    <div>
      <PageHeader
        eyebrow="Abastecimiento"
        title="Compras"
        subtitle="Todo lo que hay que comprar para las órdenes de trabajo abiertas, sumado por material y desglosado por proyecto. Lo que palomeas deja de sumar."
        actions={
          <Button icon={Copy} disabled={!pendingAll.length} onClick={() => copyText(listText(), (ok) => notify(ok ? 'Lista de compras copiada' : 'No se pudo copiar', ok ? 'ok' : 'bad'))}>
            Copiar lista pendiente
          </Button>
        }
      />

      <div className="grid-cols-1 mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="eyebrow">Por comprar</div>
          <div className="tnum mt-1 font-display text-3xl font-semibold">{pendingItems}</div>
          <div className="text-[12.5px] text-ink-3">materiales distintos</div>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Proyectos esperando material</div>
          <div className="tnum mt-1 font-display text-3xl font-semibold">{pendingOrders}</div>
          <div className="text-[12.5px] text-ink-3">órdenes de trabajo abiertas</div>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Costo estimado pendiente</div>
          <div className="tnum mt-1 font-display text-3xl font-semibold">{mxn(pendingCost)}</div>
          <div className="text-[12.5px] text-ink-3">a costo de inventario, sin IVA</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="scroll-x no-scrollbar max-w-full">
          <Segmented value={view} onChange={setView} options={[{ value: 'item', label: 'Por material' }, { value: 'order', label: 'Por proyecto' }]} />
        </div>
        <div className="scroll-x no-scrollbar max-w-full">
          <Segmented
            value={show}
            onChange={setShow}
            options={[
              { value: 'pending', label: `Pendiente (${pendingAll.length})` },
              { value: 'bought', label: `Comprado (${all.length - pendingAll.length})` },
              { value: 'all', label: 'Todo' },
            ]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <SearchInput id="buy-q" value={q} onChange={setQ} placeholder="Buscar material, OT o cliente" />
        </div>
      </div>

      {!editable && <p className="mb-3 text-[12.5px] text-ink-3">Solo lectura: el check de comprado lo marca Compras o Administración.</p>}

      {rows.length === 0 ? (
        <EmptyState icon={show === 'pending' ? CheckCircle2 : ShoppingCart} title={show === 'pending' ? 'No hay compras pendientes' : 'Sin partidas'}>
          {show === 'pending' ? 'Cuando se apruebe una cotización, sus materiales aparecerán aquí sumados a los de los demás proyectos.' : 'Cambia el filtro o la búsqueda.'}
        </EmptyState>
      ) : view === 'item' ? (
        <div className="flex flex-col gap-5">
          {cats.map((cat) => (
            <section key={cat}>
              <h2 className="eyebrow mb-2">{cat}</h2>
              <div className="flex flex-col gap-2">
                {items.filter((g) => g.category === cat).map((g) => {
                  const pend = g.rows.filter((r) => !r.bought);
                  const allBought = pend.length === 0;
                  return (
                    <Card key={g.itemId} className="overflow-hidden">
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <BuyCheck id={`bi-${g.itemId}`} label={`Marcar comprado todo: ${g.name}`} checked={allBought} disabled={!editable} onChange={(v) => set(v ? pend : g.rows, v)} />
                        <label htmlFor={`bi-${g.itemId}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className={cx('block font-medium leading-tight', allBought && 'text-ink-3 line-through')}>{g.name}</span>
                          <span className="text-[12px] text-ink-3">
                            {g.rows.length} {g.rows.length === 1 ? 'proyecto' : 'proyectos'}
                            {g.stock != null && (
                              <>
                                {' · almacén '}
                                <span className={cx('font-mono', g.stock < 0 && 'text-bad')}>{qtyU(g.stock, g.unit)}</span>
                              </>
                            )}
                          </span>
                        </label>
                        <div className="text-right">
                          <div className="tnum font-mono text-[17px] font-medium">{qtyU(allBought ? g.boughtQty : g.pendingQty, g.unit)}</div>
                          <div className="text-[11.5px] text-ink-3">{allBought ? 'comprado' : `por comprar · ${mxn(g.pendingCost)}`}</div>
                        </div>
                      </div>
                      <ul className="divide-y divide-line border-t border-line bg-surface-2/40 text-[13px]">
                        {g.rows.map((r) => (
                          <li key={r.key} className="flex items-center gap-3 py-2 pl-8 pr-4">
                            <BuyCheck id={`b-${r.key}`} label={`Comprado para ${r.orderId}: ${g.name}`} checked={!!r.bought} disabled={!editable} onChange={(v) => set([r], v)} />
                            <label htmlFor={`b-${r.key}`} className="min-w-0 flex-1 cursor-pointer">
                              <span className={cx('block truncate', r.bought && 'text-ink-3 line-through')}>
                                <span className="font-mono text-[12px]">{r.orderId}</span> · {clientById(r.clientId)?.tradeName} — {r.orderTitle}
                              </span>
                              <span className="block text-[11px] text-ink-3">{r.uses.join(', ')} · {phaseName(r.phase)} · entrega {fmtDate(r.dueDate)}</span>
                              {boughtInfo(r)}
                            </label>
                            <span className="tnum shrink-0 font-mono">{qtyU(r.bought ? r.bought.qty : r.qty, r.unit)}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((g) => {
            const pend = g.rows.filter((r) => !r.bought);
            return (
              <Card key={g.orderId} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <button type="button" className="font-mono text-[15px] font-medium text-accent hover:underline" onClick={() => nav({ name: 'orders', open: g.orderId })}>
                      {g.orderId}
                    </button>
                    <div className="truncate font-medium leading-tight">{clientById(g.clientId)?.tradeName} — {g.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                      <Badge tone={g.phase === 'sin_liberar' ? 'warn' : 'accent'}>{phaseName(g.phase)}</Badge>
                      entrega {fmtDate(g.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum font-mono text-[15px] font-medium">{pend.length ? mxn(g.pendingCost) : 'Completo'}</div>
                    <div className="text-[11.5px] text-ink-3">{pend.length ? `${pend.length} por comprar` : 'todo comprado'}</div>
                  </div>
                  {editable && pend.length > 0 && (
                    <Button size="sm" icon={CheckCircle2} onClick={() => set(pend, true)}>
                      Todo comprado
                    </Button>
                  )}
                </div>
                <ul className="divide-y divide-line border-t border-line text-[13px]">
                  {g.rows.map((r) => (
                    <li key={r.key} className="flex items-center gap-3 px-4 py-2">
                      <BuyCheck id={`o-${r.key}`} label={`Comprado: ${r.name}`} checked={!!r.bought} disabled={!editable} onChange={(v) => set([r], v)} />
                      <label htmlFor={`o-${r.key}`} className="min-w-0 flex-1 cursor-pointer">
                        <span className={cx('block', r.bought && 'text-ink-3 line-through')}>{r.name}</span>
                        <span className="block text-[11px] text-ink-3">{r.category} · {r.uses.join(', ')}</span>
                        {boughtInfo(r)}
                      </label>
                      <span className="shrink-0 text-right">
                        <span className="tnum block font-mono">{qtyU(r.bought ? r.bought.qty : r.qty, r.unit)}</span>
                        {!r.bought && <span className="tnum block font-mono text-[11px] text-ink-3">{mxn(r.cost)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
