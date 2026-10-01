import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, IconButton, Input, NumberInput, Select, Switch, cx } from '../../components/ui.jsx';
import { orderMoney } from '../../lib/pricing.js';
import { fmtDate, mxn } from '../../lib/format.js';

const METHODS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Cheque', 'Depósito'];
const BILLING_ROLES = ['admin', 'ventas', 'contabilidad'];

/** Cobranza de la OT: IVA editable después de aprobada, pagos y saldo. */
export default function BillingPanel({ order }) {
  const { state, dispatch, role, userById } = useApp();
  const rate = state.catalog.rules.params.iva;
  const m = orderMoney(order, rate);
  const can = BILLING_ROLES.includes(role);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Transferencia');
  const [note, setNote] = useState('');

  return (
    <section className="border-b border-line px-5 py-4">
      <h3 className="eyebrow mb-3">Cobranza</h3>
      <div className="rounded-md border border-line bg-surface p-3">
        <Switch
          id={`${order.id}-iva`}
          label={`Desglosar IVA (${Math.round(rate * 100)}%)`}
          hint={can ? 'Puedes quitar o agregar IVA aunque la OT ya esté autorizada' : 'Solo Ventas, Contabilidad o Administración'}
          checked={m.ivaOn}
          disabled={!can}
          onChange={(v) => dispatch({ type: 'SET_IVA', orderId: order.id, value: v })}
        />
      </div>
      <dl className="tnum mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-ink-3">Subtotal</dt>
          <dd className="font-mono">{mxn(m.subtotal)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">IVA</dt>
          <dd className="font-mono">{m.ivaOn ? mxn(m.iva) : 'No aplica'}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{m.ivaOn ? 'Total' : 'Total sin IVA'}</dt>
          <dd className="font-mono font-semibold">{mxn(m.total)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Anticipo {m.advancePct}%</dt>
          <dd className="font-mono">{mxn(m.advance)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Cobrado</dt>
          <dd className="font-mono text-ok">{mxn(m.paid)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Saldo por cobrar</dt>
          <dd className={cx('font-mono font-semibold', m.balance > 0.005 ? 'text-bad' : 'text-ok')}>{mxn(Math.max(0, m.balance))}</dd>
        </div>
      </dl>
      {m.balance < -0.005 && <p className="mt-1 text-[12px] text-warn-ink">Saldo a favor del cliente: {mxn(-m.balance)} (por ejemplo, tras quitar el IVA).</p>}

      {(order.payments || []).length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-md border border-line text-[12.5px]">
          {order.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{p.note || 'Pago'}</span>
                <span className="block text-ink-3">
                  {fmtDate(p.at)} · {p.method} · {userById(p.by)?.name ?? '—'}
                </span>
              </span>
              <span className="tnum font-mono">{mxn(p.amount)}</span>
              {can && <IconButton icon={Trash2} label="Quitar pago" onClick={() => dispatch({ type: 'REMOVE_PAYMENT', id: order.id, paymentId: p.id })} className="hover:text-bad" />}
            </li>
          ))}
        </ul>
      )}

      {can && (
        <form
          className="mt-3 grid-cols-1 grid gap-2 sm:grid-cols-[140px_140px_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(Number(amount) > 0)) return;
            dispatch({ type: 'ADD_PAYMENT', id: order.id, payment: { amount: Number(amount), method, note: note.trim() || ((order.payments || []).length ? 'Abono' : 'Anticipo') } });
            setAmount('');
            setNote('');
          }}
        >
          <NumberInput id={`${order.id}-amt`} aria-label="Monto del pago" unit="MXN" step="0.01" placeholder={m.balance > 0 ? String(Math.round(m.balance * 100) / 100) : '0'} value={amount} onChange={setAmount} />
          <Select id={`${order.id}-met`} aria-label="Forma de pago" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Input id={`${order.id}-pnote`} placeholder="Concepto (anticipo, abono, liquidación…)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" icon={Plus} disabled={!(Number(amount) > 0)}>
            Registrar pago
          </Button>
        </form>
      )}
    </section>
  );
}
