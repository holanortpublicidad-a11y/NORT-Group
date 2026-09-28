import React from 'react';
import { useApp } from '../../store/AppStore.jsx';
import { Avatar, Card, Field, NumberInput, PageHeader } from '../../components/ui.jsx';
import { calcQuote } from '../../lib/pricing.js';
import { mxn0 } from '../../lib/format.js';
import { can } from '../../lib/permissions.js';

export default function Sellers() {
  const { state, dispatch, role, now } = useApp();
  const editable = can(role, 'sellers', 'edit');
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const monthName = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const sellers = state.users.filter((u) => u.role === 'ventas');

  const stats = sellers.map((u) => {
    const mine = state.quotes.filter((q) => q.sellerId === u.id);
    const sub = (q) => calcQuote(q, state.catalog).subtotal;
    const sold = mine.filter((q) => q.approvedAt && q.approvedAt >= start).reduce((s, q) => s + sub(q), 0);
    const pipeline = mine.filter((q) => q.status === 'Enviada' || q.status === 'Borrador').reduce((s, q) => s + sub(q), 0);
    const decided = mine.filter((q) => q.status === 'Aprobada' || q.status === 'Rechazada');
    const approved = mine.filter((q) => q.status === 'Aprobada').length;
    return { u, sold, pipeline, count: mine.length, rate: decided.length ? approved / decided.length : 0, commission: (sold * (u.commissionPct || 0)) / 100 };
  });

  return (
    <div>
      <PageHeader eyebrow="Módulo 1" title="Vendedores" subtitle={`Comisiones y metas · ${monthName} · montos antes de IVA sobre cotizaciones aprobadas`} />
      <div className="grid-cols-1 grid gap-4 md:grid-cols-2">
        {stats.map(({ u, sold, pipeline, count, rate, commission }) => {
          const pct = u.monthlyGoal ? sold / u.monthlyGoal : 0;
          return (
            <Card key={u.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} size={42} />
                <div>
                  <div className="font-display text-xl font-semibold tracking-wide">{u.name}</div>
                  <div className="text-[12.5px] text-ink-3">{u.email}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[12px] text-ink-3">Vendido este mes</div>
                    <div className="tnum font-display text-[28px] font-semibold leading-none">{mxn0(sold)}</div>
                  </div>
                  <div className="text-right text-[12.5px] text-ink-2">
                    Meta {mxn0(u.monthlyGoal)}
                    <div className="tnum font-mono">{Math.round(pct * 100)}%</div>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, pct * 100)}%` }} />
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
                <div><dt className="text-ink-3">Comisión</dt><dd className="tnum font-mono">{mxn0(commission)}</dd></div>
                <div><dt className="text-ink-3">En negociación</dt><dd className="tnum font-mono">{mxn0(pipeline)}</dd></div>
                <div><dt className="text-ink-3">Cotizaciones</dt><dd className="tnum font-mono">{count}</dd></div>
                <div><dt className="text-ink-3">Aprobación</dt><dd className="tnum font-mono">{Math.round(rate * 100)}%</dd></div>
              </dl>
              <fieldset disabled={!editable} className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <Field label="Comisión" htmlFor={`${u.id}-com`}>
                  <NumberInput id={`${u.id}-com`} unit="%" step="0.5" value={u.commissionPct} onChange={(v) => dispatch({ type: 'SAVE_USER', user: { ...u, commissionPct: v } })} />
                </Field>
                <Field label="Meta mensual" htmlFor={`${u.id}-goal`}>
                  <NumberInput id={`${u.id}-goal`} unit="MXN" step="10000" value={u.monthlyGoal} onChange={(v) => dispatch({ type: 'SAVE_USER', user: { ...u, monthlyGoal: v } })} />
                </Field>
              </fieldset>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] text-ink-3">Para dar de alta un vendedor, asigna el rol “Vendedor / Cotizador” en Usuarios y roles. La tasa de aprobación considera solo cotizaciones aprobadas o rechazadas.</p>
    </div>
  );
}
