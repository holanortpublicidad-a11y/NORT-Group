import React, { useMemo, useState } from 'react';
import { Building2, FilePlus2, Mail, MapPin, Pencil, Phone, Search, UserPlus } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, QUOTE_TONE, SearchInput, Textarea } from '../../components/ui.jsx';
import { calcQuote } from '../../lib/pricing.js';
import { fmtDate, mxn, uid } from '../../lib/format.js';
import { can } from '../../lib/permissions.js';
import { phaseName } from '../../lib/sla.js';

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const EMPTY = { legalName: '', tradeName: '', rfc: '', contact: { name: '', phone: '', email: '' }, fiscalAddress: '', installAddress: '' };

function ClientForm({ open, initial, onClose, onSave }) {
  const [f, setF] = useState(initial ?? EMPTY);
  const [tried, setTried] = useState(false);
  const rfcOk = RFC_RE.test(f.rfc);
  const valid = f.legalName.trim() && f.tradeName.trim() && rfcOk;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setC = (patch) => setF((x) => ({ ...x, contact: { ...x.contact, ...patch } }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTried(true);
              if (valid) onSave({ ...f, id: f.id ?? uid('c') });
            }}
          >
            Guardar cliente
          </Button>
        </>
      }
    >
      <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
        <Field label="Razón social" htmlFor="cf-legal" className="sm:col-span-2">
          <Input id="cf-legal" value={f.legalName} onChange={(e) => set({ legalName: e.target.value })} placeholder="Empresa S.A. de C.V." />
        </Field>
        <Field label="Nombre comercial" htmlFor="cf-trade">
          <Input id="cf-trade" value={f.tradeName} onChange={(e) => set({ tradeName: e.target.value })} />
        </Field>
        <Field label="RFC" htmlFor="cf-rfc" hint={tried && !rfcOk ? 'RFC no válido: 12 caracteres (moral) o 13 (física), p. ej. ABC010101XY9' : '12 o 13 caracteres'}>
          <Input id="cf-rfc" className="font-mono uppercase" value={f.rfc} onChange={(e) => set({ rfc: e.target.value.toUpperCase().trim() })} />
        </Field>
        <Field label="Contacto" htmlFor="cf-cname">
          <Input id="cf-cname" value={f.contact.name} onChange={(e) => setC({ name: e.target.value })} />
        </Field>
        <Field label="Teléfono" htmlFor="cf-phone">
          <Input id="cf-phone" type="tel" value={f.contact.phone} onChange={(e) => setC({ phone: e.target.value })} />
        </Field>
        <Field label="Correo" htmlFor="cf-mail" className="sm:col-span-2">
          <Input id="cf-mail" type="email" value={f.contact.email} onChange={(e) => setC({ email: e.target.value })} />
        </Field>
        <Field label="Domicilio fiscal" htmlFor="cf-fiscal" className="sm:col-span-2">
          <Textarea id="cf-fiscal" rows={2} className="min-h-[56px]" value={f.fiscalAddress} onChange={(e) => set({ fiscalAddress: e.target.value })} />
        </Field>
        <Field label="Dirección de entrega / instalación" htmlFor="cf-install" className="sm:col-span-2">
          <Textarea id="cf-install" rows={2} className="min-h-[56px]" value={f.installAddress} onChange={(e) => set({ installAddress: e.target.value })} />
        </Field>
      </div>
      {tried && !valid && <p className="mt-3 text-[13px] text-bad">Completa razón social, nombre comercial y un RFC válido.</p>}
    </Modal>
  );
}

export default function Clients() {
  const { state, dispatch, role, nav } = useApp();
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(state.clients[0]?.id);
  const [form, setForm] = useState(null); // null | 'new' | client
  const editable = can(role, 'clients', 'edit');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.clients.filter((c) => !t || [c.legalName, c.tradeName, c.rfc, c.contact.name].join(' ').toLowerCase().includes(t));
  }, [state.clients, q]);

  const sel = state.clients.find((c) => c.id === selId);
  const quotes = state.quotes.filter((x) => x.clientId === selId).sort((a, b) => b.createdAt - a.createdAt);
  const orders = state.orders.filter((x) => x.clientId === selId);
  const lifetime = quotes.filter((x) => x.status === 'Aprobada').reduce((s, x) => s + calcQuote(x, state.catalog).total, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 1"
        title="Clientes"
        subtitle="Razón social, RFC, contacto, dirección de instalación e historial de pedidos"
        actions={editable && <Button variant="primary" icon={UserPlus} onClick={() => setForm('new')}>Nuevo cliente</Button>}
      />
      <div className="grid-cols-1 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <SearchInput id="clients-search" icon={Search} value={q} onChange={setQ} placeholder="Buscar por nombre, RFC o contacto" />
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelId(c.id)}
                    className={`flex w-full flex-col px-4 py-3 text-left transition ${c.id === selId ? 'bg-accent/10' : 'hover:bg-surface-2/60'}`}
                  >
                    <span className="font-medium">{c.tradeName}</span>
                    <span className="truncate text-[12.5px] text-ink-3">{c.legalName}</span>
                    <span className="mt-0.5 font-mono text-[11.5px] text-ink-3">{c.rfc}</span>
                  </button>
                </li>
              ))}
              {!list.length && <EmptyState icon={Building2} title="Sin coincidencias" />}
            </ul>
          </Card>
        </div>

        {sel && (
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-semibold tracking-wide">{sel.tradeName}</h2>
                  <div className="text-[13.5px] text-ink-2">{sel.legalName}</div>
                  <div className="mt-0.5 font-mono text-[12.5px] text-ink-3">RFC {sel.rfc}</div>
                </div>
                <div className="flex gap-2">
                  {editable && <Button size="sm" icon={Pencil} onClick={() => setForm(sel)}>Editar</Button>}
                  {can(role, 'quotes', 'edit') && (
                    <Button size="sm" variant="primary" icon={FilePlus2} onClick={() => dispatch({ type: 'NEW_QUOTE', clientId: sel.id })}>
                      Cotizar
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid-cols-1 mt-4 grid gap-4 border-t border-line pt-4 text-[13.5px] sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <div className="eyebrow">Contacto</div>
                  <div>{sel.contact.name}</div>
                  <div className="flex items-center gap-2 text-ink-2"><Phone size={14} /> <span className="select-all font-mono">{sel.contact.phone}</span></div>
                  <div className="flex items-center gap-2 text-ink-2"><Mail size={14} /> <span className="select-all">{sel.contact.email}</span></div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="eyebrow">Instalación / entrega</div>
                  <div className="flex items-start gap-2 text-ink-2"><MapPin size={14} className="mt-0.5 shrink-0" /> {sel.installAddress}</div>
                  <div className="eyebrow mt-2">Domicilio fiscal</div>
                  <div className="text-ink-2">{sel.fiscalAddress}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                <div><div className="text-[12px] text-ink-3">Cotizaciones</div><div className="tnum font-display text-2xl font-semibold">{quotes.length}</div></div>
                <div><div className="text-[12px] text-ink-3">Órdenes</div><div className="tnum font-display text-2xl font-semibold">{orders.length}</div></div>
                <div><div className="text-[12px] text-ink-3">Comprado (c/IVA)</div><div className="tnum font-display text-2xl font-semibold">{mxn(lifetime).replace('.00', '')}</div></div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-line px-4 py-3 font-display text-lg font-semibold tracking-wide">Historial de pedidos</div>
              <ul className="divide-y divide-line">
                {quotes.map((x) => {
                  const o = orders.find((o) => o.id === x.orderId);
                  return (
                    <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <button type="button" className="min-w-0 text-left" onClick={() => nav({ name: 'quote', id: x.id })}>
                        <span className="font-mono text-[12px] text-accent">{x.id}</span>
                        <span className="block">{x.title || 'Sin título'}</span>
                        <span className="text-[12px] text-ink-3">{fmtDate(x.createdAt)} · {mxn(calcQuote(x, state.catalog).total)}</span>
                      </button>
                      <span className="flex items-center gap-2">
                        <Badge tone={QUOTE_TONE[x.status]}>{x.status}</Badge>
                        {o && (
                          <button type="button" onClick={() => nav({ name: 'orders', open: o.id })}>
                            <Badge tone="accent">{o.id} · {phaseName(o.phase)}</Badge>
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
                {!quotes.length && <li className="px-4 py-8 text-center text-ink-3">Este cliente aún no tiene cotizaciones.</li>}
              </ul>
            </Card>
          </div>
        )}
      </div>

      {form && (
        <ClientForm
          open
          initial={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSave={(c) => {
            dispatch({ type: 'SAVE_CLIENT', client: c });
            setSelId(c.id);
            setForm(null);
          }}
        />
      )}
    </div>
  );
}
