import React, { useState } from 'react';
import { AlertTriangle, Lock, ArrowLeft, ArrowUpRight, CheckCircle2, Eye, Send, UserPlus, Wrench, XCircle } from 'lucide-react';
import ProspectForm from '../../components/ProspectForm.jsx';
import LegalText from '../../components/LegalText.jsx';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, Field, Input, Modal, NumberInput, QUOTE_TONE, Select, Switch, Textarea } from '../../components/ui.jsx';
import FamilyLineEditor, { AddLineButton, FamilyGrid, FamilyPicker } from './FamilyLineEditor.jsx';
import Attachments from '../../components/Attachments.jsx';
import { MarginBadge } from '../../components/inventory-ui.jsx';
import { unitLabel } from '../../data/inventory.js';
import QuotePreview from './QuotePreview.jsx';
import { calcQuote, newLineItem, stockShortages } from '../../lib/pricing.js';
import { DAY, fmtDate, mxn, num, uid } from '../../lib/format.js';
import { orderFolio } from '../../lib/orders.js';
import { can, canSeeCosts } from '../../lib/permissions.js';

export default function QuoteEditor({ route }) {
  const { state, dispatch, role, nav, now, clientById } = useApp();
  const quote = state.quotes.find((q) => q.id === route.id);
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [prospect, setProspect] = useState(false);

  if (!quote) {
    return (
      <div className="py-10 text-center text-ink-3">
        No se encontró la cotización. <button className="text-accent underline" onClick={() => nav({ name: 'quotes' })}>Volver</button>
      </div>
    );
  }

  const { catalog } = state;
  const readOnly = quote.status === 'Aprobada' || !can(role, 'quotes', 'edit');
  const t = calcQuote(quote, catalog);
  const client = clientById(quote.clientId);
  const sellers = state.users.filter((u) => u.role === 'ventas');
  const save = (patch) => dispatch({ type: 'SAVE_QUOTE', quote: { ...quote, ...patch } });
  const setItem = (i, item) => save({ items: quote.items.map((x, k) => (k === i ? item : x)) });
  const nextOt = orderFolio(state.counters.order, new Date(now).getFullYear());
  const canApprove = !readOnly && quote.items.length > 0 && t.total > 0 && quote.status !== 'Rechazada';
  const showCosts = canSeeCosts(role);
  const canIva = ['admin', 'ventas', 'contabilidad'].includes(role);
  const shortages = quote.status === 'Aprobada' ? [] : stockShortages(quote, catalog);
  const addLine = (fid) => {
    save({ items: [...quote.items, newLineItem(fid, catalog)] });
    setPicker(false);
  };

  const actions = (
    <>
      <Button icon={Eye} onClick={() => setPreview(true)}>
        Vista previa
      </Button>
      {!readOnly && quote.status === 'Borrador' && (
        <Button icon={Send} onClick={() => dispatch({ type: 'QUOTE_STATUS', id: quote.id, status: 'Enviada' })}>
          Marcar enviada
        </Button>
      )}
      {!readOnly && quote.status !== 'Rechazada' && (
        <Button variant="danger" icon={XCircle} onClick={() => dispatch({ type: 'QUOTE_STATUS', id: quote.id, status: 'Rechazada' })}>
          Rechazada
        </Button>
      )}
      {!readOnly && quote.status === 'Rechazada' && (
        <Button onClick={() => dispatch({ type: 'QUOTE_STATUS', id: quote.id, status: 'Borrador' })}>Reabrir</Button>
      )}
      {canApprove && (
        <Button variant="ok" icon={CheckCircle2} onClick={() => setConfirm(true)}>
          Aprobar y convertir en OT
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-16 lg:pb-0">
      {/* Encabezado */}
      <div className="mb-5 flex flex-col gap-3">
        <button type="button" onClick={() => nav({ name: 'quotes' })} className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft size={15} /> Cotizaciones
        </button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-[22px] font-medium tracking-tight md:text-[26px]">{quote.id}</h1>
              <Badge tone={QUOTE_TONE[quote.status]}>{quote.status}</Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              Creada {fmtDate(quote.createdAt)} · vigente hasta {fmtDate(quote.createdAt + quote.validityDays * DAY)}
              {!readOnly && ' · se guarda automáticamente'}
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 md:flex">{actions}</div>
        </div>
        {quote.orderId && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-ok/40 bg-ok/5 px-4 py-3">
            <span className="min-w-0 flex-1 text-[13.5px]">
              <Wrench size={16} className="mr-1.5 inline-block align-[-3px] text-ok" />
              Aprobada el {fmtDate(quote.approvedAt)}. Se convirtió en <b className="font-mono">{quote.orderId}</b>; las especificaciones quedaron congeladas en la OT.
            </span>
            <Button size="sm" iconRight={ArrowUpRight} onClick={() => nav({ name: 'orders', open: quote.orderId })}>
              Abrir OT
            </Button>
          </Card>
        )}
      </div>

      <div className="grid-cols-1 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Datos generales */}
          <Card className="p-4">
            <fieldset disabled={readOnly} className="grid-cols-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Cliente o prospecto" htmlFor="q-client" className="sm:col-span-2">
                <div className="flex gap-1.5">
                  <Select id="q-client" value={quote.clientId} onChange={(e) => save({ clientId: e.target.value })} className="min-w-0 flex-1">
                    {[
                      ['Clientes', state.clients.filter((c) => c.type !== 'prospecto')],
                      ['Prospectos', state.clients.filter((c) => c.type === 'prospecto')],
                    ].map(([label, list]) =>
                      list.length ? (
                        <optgroup key={label} label={label}>
                          {list.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.tradeName}
                              {c.rfc ? ` — ${c.rfc}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ) : null,
                    )}
                  </Select>
                  {!readOnly && (
                    <Button icon={UserPlus} onClick={() => setProspect(true)} title="Registrar un prospecto nuevo">
                      <span className="hidden sm:inline">Nuevo prospecto</span>
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Vendedor" htmlFor="q-seller">
                <Select id="q-seller" value={quote.sellerId} onChange={(e) => save({ sellerId: e.target.value })}>
                  {sellers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Proyecto" htmlFor="q-title" className="sm:col-span-2 xl:col-span-1">
                <Input id="q-title" value={quote.title} onChange={(e) => save({ title: e.target.value })} placeholder="Ej. Anuncio luminoso fachada" />
              </Field>
              <Field label="Tiempo de entrega" htmlFor="q-lead" hint="Días hábiles; el semáforo arranca al liberar la OT">
                <NumberInput id="q-lead" unit="días háb." step="1" min={1} value={quote.leadDays} onChange={(v) => save({ leadDays: v })} />
              </Field>
              <Field label="Anticipo requerido" htmlFor="q-adv">
                <NumberInput id="q-adv" unit="%" step="5" value={quote.advancePct} onChange={(v) => save({ advancePct: v })} />
              </Field>
              <Field label="Vigencia" htmlFor="q-valid">
                <NumberInput id="q-valid" unit="días" step="1" value={quote.validityDays} onChange={(v) => save({ validityDays: v })} />
              </Field>
            </fieldset>
            {client && (
              <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-3">
                <Badge tone={client.type === 'prospecto' ? 'warn' : 'ok'} className="mr-2">
                  {client.type === 'prospecto' ? 'Prospecto' : 'Cliente'}
                </Badge>
                <span className="text-ink-2">{client.legalName}</span>
                {client.contact?.whatsapp && <> · WhatsApp {client.contact.whatsapp}</>}
                {client.installAddress && <> · Instalación: {client.installAddress}</>}
                {client.type === 'prospecto' && ' · pasará a cliente al aprobar'}
              </p>
            )}
          </Card>

          {/* Renglones */}
          {quote.items.length === 0 && !readOnly && (
            <Card className="p-4">
              <div className="eyebrow mb-1">Paso 1</div>
              <h2 className="mb-3 font-display text-xl font-semibold tracking-wide">Elige la familia de producto</h2>
              <FamilyGrid onPick={addLine} />
            </Card>
          )}
          {quote.items.map((item, i) => (
            <FamilyLineEditor
              key={item.id}
              index={i}
              item={item}
              catalog={catalog}
              readOnly={readOnly}
              showCosts={showCosts}
              onChange={(it) => setItem(i, it)}
              onRemove={() => save({ items: quote.items.filter((_, k) => k !== i) })}
              onDuplicate={() => save({ items: [...quote.items.slice(0, i + 1), { ...structuredClone(item), id: uid('ln') }, ...quote.items.slice(i + 1)] })}
            />
          ))}
          {!readOnly && quote.items.length > 0 && <AddLineButton onClick={() => setPicker(true)} />}

          {shortages.length > 0 && (
            <Card className="border-bad/40 bg-bad/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-bad">
                <AlertTriangle size={17} /> Stock insuficiente para esta cotización
              </div>
              <ul className="flex flex-col gap-1 text-[13px] text-ink-2">
                {shortages.map((m) => (
                  <li key={m.itemId} className="flex justify-between gap-3">
                    <span>{m.name}</span>
                    <span className="tnum font-mono">
                      requiere {num(m.qty, 2)} · hay {num(m.item.stock, 2)} {unitLabel(m.unit)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-ink-3">Puedes aprobarla; Compras verá el faltante en Inventario.</p>
            </Card>
          )}

          <Card className="p-4">
            <div className="eyebrow mb-3">Archivos de diseño</div>
            <Attachments idPrefix={`q-${quote.id}`} files={quote.attachments || []} readOnly={readOnly} onChange={(files) => save({ attachments: files })} />
          </Card>

          <Card className="p-4">
            <Field label="Notas adicionales para el cliente" htmlFor="q-notes">
              <Textarea id="q-notes" disabled={readOnly} value={quote.notes} onChange={(e) => save({ notes: e.target.value })} />
            </Field>
          </Card>

          <Card className="p-4">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Lock size={15} className="text-ink-3" />
                  <span className="font-medium">Términos y condiciones oficiales</span>
                </span>
                <span className="text-[12px] text-ink-3">Se incluyen en todas las cotizaciones · {role === 'admin' ? 'edítalos en Inventario → Generales' : 'solo lectura'}</span>
              </summary>
              <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-line bg-surface-2/40 p-3">
                <LegalText text={state.settings?.terms} tone="ui" />
              </div>
            </details>
          </Card>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <Card className="p-4">
            <div className="eyebrow mb-3">Resumen</div>
            <div className="mb-3 rounded-md border border-line bg-surface-2/40 px-3 py-2.5">
              <Switch
                id="q-iva"
                label={`Desglosar IVA (${Math.round(catalog.rules.params.iva * 100)}%)`}
                hint={t.ivaOn ? 'Con IVA: total = subtotal + IVA' : 'Sin IVA: total = subtotal'}
                checked={t.ivaOn}
                disabled={!canIva}
                onChange={(v) => dispatch({ type: 'SET_IVA', quoteId: quote.id, value: v })}
              />
              {quote.orderId && <p className="mt-1.5 text-[11.5px] text-ink-3">Cotización aprobada: el cambio también actualiza {quote.orderId} y su saldo.</p>}
            </div>
            <ul className="mb-3 flex flex-col gap-1.5 text-[12.5px] text-ink-2">
              {t.lines.map(({ item, calc }) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="truncate">{item.label || calc.summary}</span>
                  <span className="tnum shrink-0 font-mono">{mxn(calc.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13.5px]">
              {showCosts && <Line label="Costo de producción" value={mxn(t.cost)} />}
              <Line label="Subtotal (precio al cliente)" value={mxn(t.subtotal)} />
              {showCosts && <Line label="Utilidad del proyecto" value={mxn(t.profit)} />}
              <Line label={t.ivaOn ? `IVA ${Math.round(catalog.rules.params.iva * 100)}%` : 'IVA'} value={t.ivaOn ? mxn(t.iva) : 'No aplica'} />
            </dl>
            {showCosts && quote.items.length > 0 && (
              <div className="mt-2">
                <MarginBadge margin={t.margin} params={catalog.rules.params} />
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-medium">Total</span>
              <span className="tnum font-display text-[28px] font-semibold leading-none">{mxn(t.total)}</span>
            </div>
            <div className="mt-3 rounded-md bg-accent/10 px-3 py-2.5 text-[13px]">
              <div className="flex justify-between font-medium text-accent">
                <span>Anticipo {quote.advancePct}%</span>
                <span className="tnum font-mono">{mxn(t.advance)}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-ink-2">
                <span>Saldo contra entrega</span>
                <span className="tnum font-mono">{mxn(t.balance)}</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-ink-3">Entrega estimada: {quote.leadDays} días hábiles a partir de la liberación de la OT.</p>
            <div className="mt-4 hidden flex-col gap-2 lg:flex">
              <Button icon={Eye} onClick={() => setPreview(true)}>
                Vista previa / enviar
              </Button>
              {canApprove && (
                <Button variant="ok" icon={CheckCircle2} onClick={() => setConfirm(true)}>
                  Aprobar y convertir en {nextOt}
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Barra de acciones móvil */}
      <div
        className="fixed inset-x-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden"
        style={{ bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div>
          <div className="text-[11px] text-ink-3">{t.ivaOn ? 'Total c/IVA' : 'Total sin IVA'}</div>
          <div className="tnum font-display text-xl font-semibold leading-none">{mxn(t.total)}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={Eye} onClick={() => setPreview(true)}>
            Ver
          </Button>
          {canApprove && (
            <Button size="sm" variant="ok" icon={CheckCircle2} onClick={() => setConfirm(true)}>
              Aprobar
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 md:hidden">{actions}</div>

      <FamilyPicker open={picker} onClose={() => setPicker(false)} onPick={addLine} />
      <ProspectForm
        open={prospect}
        onClose={() => setProspect(false)}
        onSave={(p) => {
          dispatch({ type: 'NEW_PROSPECT', prospect: p, quoteId: quote.id });
          setProspect(false);
        }}
      />
      <QuotePreview open={preview} onClose={() => setPreview(false)} quote={quote} />

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={`Aprobar ${quote.id}`}
        subtitle={`Se generará la orden ${nextOt}`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button
              variant="ok"
              icon={CheckCircle2}
              onClick={() => {
                setConfirm(false);
                dispatch({ type: 'APPROVE_QUOTE', id: quote.id });
              }}
            >
              Aprobar y convertir en OT
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2 text-[13.5px] text-ink-2">
          <li>
            La OT hereda {quote.items.length} renglón(es) con su ficha técnica, lista de materiales, instalación y {(quote.attachments || []).length} archivo(s) de diseño.
          </li>
          <li>
            La OT queda <b className="text-ink">Sin liberar</b>: no pasa a Diseño ni Producción hasta subir el contrato firmado y confirmar los archivos en la carpeta compartida.
          </li>
          <li>
            Al liberarla arranca el semáforo: <b className="text-ink">{quote.leadDays} días hábiles</b>. Anticipo requerido: <b className="text-ink">{mxn(t.advance)}</b> ({t.ivaOn ? 'con IVA' : 'sin IVA'}).
          </li>
          <li>Se descuenta del inventario el material de insumos con stock controlado{shortages.length ? ` (${shortages.length} con faltante)` : ''}.</li>
          {client?.type === 'prospecto' && (
            <li>
              <b className="text-ink">{client.tradeName}</b> pasará de prospecto a cliente.
            </li>
          )}
          <li>La cotización queda bloqueada para edición.</li>
        </ul>
      </Modal>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tnum font-mono">{value}</dd>
    </div>
  );
}
