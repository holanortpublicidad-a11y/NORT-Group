import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Rocket, Check, ClipboardList, Copy, ExternalLink, FileText, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Avatar, Badge, Button, Field, Input, Select, Sheet, SlaBar, SlaPill, copyText, cx } from '../../components/ui.jsx';
import { PHASES, computeSla, phaseIndex, phaseName } from '../../lib/sla.js';
import { fmtDate, fmtDateTime, fromInputDate, mxn, num, toInputDate } from '../../lib/format.js';
import { canMovePhase, canSeeCosts, roleName } from '../../lib/permissions.js';
import Attachments from '../../components/Attachments.jsx';
import OrderSheet, { orderAsText } from './OrderSheet.jsx';
import ReleasePanel, { releaseLocks } from './ReleasePanel.jsx';
import BillingPanel from './BillingPanel.jsx';
import { unitLabel } from '../../data/inventory.js';
import { TEAMS } from '../../data/mockData.js';

const ASSIGN_ROLES = ['admin', 'produccion', 'ventas'];

function Section({ title, children, aside }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition disabled:cursor-default',
        active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-ink-2 hover:bg-surface-2',
      )}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}

function Spec({ label, value }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex justify-between gap-3 py-1">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export default function OrderDetail({ id, onClose }) {
  const { state, dispatch, role, now, nav, clientById, userById, notify } = useApp();
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const order = state.orders.find((o) => o.id === id);
  if (!order) return null;

  const sla = computeSla(order, now);
  const client = clientById(order.clientId);
  const idx = phaseIndex(order.phase);
  const prev = PHASES[idx - 1];
  const next = PHASES[idx + 1];
  const movable = canMovePhase(role, order.phase);
  const canAssign = ASSIGN_ROLES.includes(role);
  const canAttach = ['admin', 'ventas', 'diseno', 'produccion'].includes(role);
  const showCosts = canSeeCosts(role);
  const upd = (patch) => dispatch({ type: 'UPDATE_ORDER', id: order.id, patch });
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const move = (phase) => {
    dispatch({ type: 'MOVE_ORDER', id: order.id, phase });
    notify(`${order.id} → ${phaseName(phase)}`);
  };
  const designers = state.users.filter((u) => u.role === 'diseno');
  const installers = state.users.filter((u) => u.role === 'instalador');
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.installAddress)}`;

  return (
    <Sheet
      open
      onClose={onClose}
      title={<span className="font-mono text-[22px] font-medium">{order.id}</span>}
      subtitle={
        <span>
          {client?.tradeName} · {order.title}
        </span>
      }
      headerExtra={
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{phaseName(order.phase)}</Badge>
          <SlaPill sla={sla} />
          <span className="flex basis-full gap-2 pt-1 sm:basis-auto sm:pt-0">
            <Button size="sm" icon={MessageCircle} onClick={() => copyText(orderAsText(order, { client, now, userById, ivaRate: state.catalog.rules.params.iva }), (ok) => notify(ok ? 'Resumen copiado para WhatsApp' : 'No se pudo copiar', ok ? 'ok' : 'bad'))}>
              Copiar resumen
            </Button>
            <Button size="sm" icon={ClipboardList} onClick={() => setSheet(true)}>
              Ficha / PDF
            </Button>
          </span>
        </div>
      }
      footer={
        order.phase === 'sin_liberar' ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-[12.5px] text-ink-3">{releaseLocks(order).ok ? 'Candados completos' : 'Completa los dos candados para liberar'}</span>
            <Button variant="primary" icon={Rocket} disabled={!releaseLocks(order).ok || !['admin', 'ventas'].includes(role)} onClick={() => dispatch({ type: 'RELEASE_ORDER', id: order.id })}>
              Liberar orden de trabajo
            </Button>
          </div>
        ) : (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {prev && prev.id !== 'sin_liberar' ? (
            <Button size="sm" variant="ghost" icon={ArrowLeft} disabled={!movable} onClick={() => move(prev.id)}>
              Regresar a {prev.name}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button variant="primary" iconRight={ArrowRight} disabled={!movable} onClick={() => move(next.id)} title={movable ? '' : 'Tu rol no puede avanzar esta fase'}>
              {order.phase === 'instalacion' ? 'Marcar instalado' : order.phase === 'concluido' ? 'Marcar facturado' : `Avanzar a ${next.name}`}
            </Button>
          )}
        </div>
        )
      }
    >
      {/* Flujo de fases */}
      <div className="scroll-x no-scrollbar border-b border-line bg-surface px-5 py-3">
        <ol className="flex min-w-max items-center gap-1.5">
          {PHASES.map((p, i) => (
            <li key={p.id} className="flex items-center gap-1.5">
              <span
                className={cx(
                  'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium',
                  i < idx && 'bg-ok/10 text-ok',
                  i === idx && 'bg-accent text-accent-ink',
                  i > idx && 'bg-surface-2 text-ink-3',
                )}
              >
                {i < idx && <Check size={12} />}
                {p.name}
              </span>
              {i < PHASES.length - 1 && <span className="h-px w-3 bg-line" />}
            </li>
          ))}
        </ol>
      </div>

      {order.phase === 'sin_liberar' && <ReleasePanel order={order} />}
      {['admin', 'ventas', 'contabilidad'].includes(role) && <BillingPanel order={order} />}

      <Section title="Tiempo de entrega (SLA)">
        <div className="grid grid-cols-3 gap-3 text-[13px]">
          <div>
            <div className="text-ink-3">{order.releasedAt ? 'Liberada' : 'Aprobada'}</div>
            <div className="tnum">{fmtDate(order.releasedAt ?? order.createdAt)}</div>
          </div>
          <div>
            <div className="text-ink-3">Compromiso</div>
            <div className="tnum font-medium">{fmtDate(order.dueDate)}</div>
          </div>
          <div>
            <div className="text-ink-3">Consumido</div>
            <div className="tnum font-mono">{Math.round(sla.pct * 100)}%</div>
          </div>
        </div>
        <SlaBar sla={sla} className="mt-3 h-2" />
        <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-3">
          <span className={cx(sla.overdue && 'font-medium text-bad')}>{sla.text}</span>
          <span>umbrales 60% · 90%</span>
        </div>
      </Section>

      <Section title="Asignación" aside={!canAssign && <span className="text-[11.5px] text-ink-3">Solo lectura para {roleName(role)}</span>}>
        <fieldset disabled={!canAssign} className="flex flex-col gap-4">
          <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
            <Field label="Fecha compromiso de entrega" htmlFor="ot-due">
              <Input id="ot-due" type="date" value={toInputDate(order.dueDate)} onChange={(e) => e.target.value && upd({ dueDate: fromInputDate(e.target.value) })} />
            </Field>
            <Field label="Diseñador a cargo" htmlFor="ot-designer">
              <Select id="ot-designer" value={order.designerId ?? ''} onChange={(e) => upd({ designerId: e.target.value || null })}>
                <option value="">Sin asignar</option>
                {designers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Equipo de producción</div>
            <div className="flex flex-wrap gap-1.5">
              {TEAMS.map((t) => (
                <Chip key={t} active={order.teams.includes(t)} disabled={!canAssign} onClick={() => upd({ teams: toggle(order.teams, t) })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Instaladores</div>
            <div className="flex flex-wrap gap-1.5">
              {installers.map((u) => (
                <Chip key={u.id} active={order.installerIds.includes(u.id)} disabled={!canAssign} onClick={() => upd({ installerIds: toggle(order.installerIds, u.id) })}>
                  {u.name}
                </Chip>
              ))}
            </div>
          </div>
        </fieldset>
      </Section>

      <Section title={`Ficha técnica (heredada de ${order.quoteId})`}>
        <div className="flex flex-col gap-3">
          {order.lines.map((l, i) => (
            <div key={l.lineId} className="rounded-lg border border-line bg-surface p-3.5">
              <div className="mb-2 flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line font-mono text-[11px]">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{l.familyName}</div>
                  <div className="font-medium leading-tight">{l.label || l.summary}</div>
                </div>
              </div>
              {l.images?.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {l.images.map((im, k) => (
                    <figure key={k} className="w-[132px]">
                      <img src={im.data} alt={im.name} className="h-24 w-full rounded-md border border-line bg-surface-2 object-contain" />
                      <figcaption className="mt-0.5 truncate text-[11px] text-ink-3">{im.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <dl className="divide-y divide-line text-[13px]">
                {l.specs.map((sp) => (
                  <Spec key={sp.label} label={sp.label} value={sp.value} />
                ))}
                {l.notes && <Spec label="Notas" value={l.notes} />}
              </dl>
              <details className="group mt-2">
                <summary className="cursor-pointer select-none text-[12.5px] font-medium text-accent">Lista de materiales ({l.bom.length})</summary>
                <ul className="mt-2 divide-y divide-line/70 text-[12.5px]">
                  {l.bom.map((b, k) => (
                    <li key={k} className="flex items-start justify-between gap-3 py-1.5">
                      <span className="min-w-0">
                        <span className="block text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{b.role}</span>
                        {b.name}
                        {b.note && <span className="block font-mono text-[10.5px] text-ink-3">{b.note}</span>}
                      </span>
                      <span className="tnum shrink-0 text-right font-mono">
                        {num(b.qty, 2)} {unitLabel(b.unit)}
                        {showCosts && <span className="block text-[11px] text-ink-3">{mxn(b.cost)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
          {showCosts && order.economics && (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-[12.5px]">
              <div>
                <div className="text-ink-3">Costo aprobado</div>
                <div className="tnum font-mono">{mxn(order.economics.cost)}</div>
              </div>
              <div>
                <div className="text-ink-3">Venta sin IVA</div>
                <div className="tnum font-mono">{mxn(order.economics.subtotal)}</div>
              </div>
              <div>
                <div className="text-ink-3">Margen</div>
                <div className="tnum font-mono">{num(order.economics.margin, 1)}%</div>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Archivos de diseño">
        <Attachments idPrefix={`ot-${order.id}`} files={order.attachments || []} readOnly={!canAttach} onChange={(files) => upd({ attachments: files })} />
      </Section>

      <Section title="Sitio de instalación">
        <p className="flex items-start gap-2 text-[13.5px]">
          <MapPin size={16} className="mt-0.5 shrink-0 text-ink-3" />
          {order.installAddress}
        </p>
        {client && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px]">
            <Phone size={16} className="text-ink-3" />
            <span>{client.contact.name}</span>
            <span className="select-all font-mono">{client.contact.phone}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
              onClick={() => copyText(client.contact.phone, (ok) => notify(ok ? 'Teléfono copiado' : 'Selecciona el número para copiarlo', ok ? 'ok' : 'bad'))}
            >
              <Copy size={12} /> Copiar
            </button>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={maps} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] hover:bg-surface-2">
            <ExternalLink size={14} /> Abrir en Google Maps
          </a>
          <Button size="sm" icon={FileText} onClick={() => nav({ name: 'quote', id: order.quoteId })}>
            Ver cotización {order.quoteId}
          </Button>
        </div>
      </Section>

      <Section title="Bitácora">
        <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
          {[...order.history.map((h) => ({ ...h, kind: 'phase' })), ...order.notes.map((n) => ({ ...n, kind: 'note' }))]
            .sort((a, b) => a.at - b.at)
            .map((h, i) => {
              const u = userById(h.by);
              return (
                <li key={i} className="relative text-[13px]">
                  <span className={cx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-bg', h.kind === 'phase' ? 'bg-accent' : 'bg-ink-3')} />
                  <div className="flex flex-wrap items-center gap-x-2">
                    {h.kind === 'phase' ? <span className="font-medium">Fase: {phaseName(h.phase)}</span> : <span className="text-ink">{h.text}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                    {u && <Avatar name={u.name} size={16} className="border-0" />}
                    {u?.name ?? 'Sistema'} · {fmtDateTime(h.at)}
                    {h.note && <span>· {h.note}</span>}
                  </div>
                </li>
              );
            })}
        </ol>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            dispatch({ type: 'ORDER_NOTE', id: order.id, text: note.trim() });
            setNote('');
          }}
        >
          <Input id="ot-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota (ej. material recibido, fotos de instalación…)" />
          <Button type="submit" icon={Send} aria-label="Agregar nota" />
        </form>
      </Section>
      {sheet && <OrderSheet order={order} onClose={() => setSheet(false)} />}
    </Sheet>
  );
}
