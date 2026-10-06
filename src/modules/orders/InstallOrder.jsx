import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, MapPin, Phone, Plus, Printer, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Check, Field, IconButton, Input, Modal, PrintPortal, Select, Textarea, copyText, cx, printDocument } from '../../components/ui.jsx';
import Attachments from '../../components/Attachments.jsx';
import { INSTALL_STATUS, PERMIT_STATES, POWER_STATES, SCENARIOS, WALL_STATES, buildPackList, installBlockers, installFacts, mapsLink, newInstallation } from '../../lib/install.js';
import { fmtDateTime, num, uid } from '../../lib/format.js';
import { COMPANY, PRINT_ENABLED } from '../../config.js';

const EDIT_ROLES = ['admin', 'ventas', 'produccion', 'instalador'];
const nameOf = (list, id) => list.find((x) => x.id === id)?.name ?? '—';
const fmtSchedule = (s) => (s ? new Date(s).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Sin programar');

function Block({ n, title, hint, children, aside }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] text-ink-3">{n}</span>
          <span className="font-display text-lg font-semibold tracking-wide">{title}</span>
        </h3>
        {aside}
      </div>
      {hint && <p className="-mt-2 mb-3 text-[12.5px] text-ink-3">{hint}</p>}
      {children}
    </section>
  );
}

/** Resumen en texto para mandar al instalador por WhatsApp. */
export function installAsText(order, inst, { client, rules, userById }) {
  const f = installFacts(order, rules);
  const crew = order.installerIds.map((id) => userById(id)?.name).filter(Boolean).join(', ');
  const groups = [...new Set(inst.pack.map((p) => p.group))];
  return [
    `*${COMPANY.name} · Orden de instalación ${order.id}*`,
    `${client?.tradeName ?? ''} — ${order.title}`,
    `📅 ${fmtSchedule(inst.schedule)}${inst.window ? ` · horario permitido: ${inst.window}` : ''}`,
    `📍 ${order.installAddress}`,
    mapsLink(order),
    `Contacto en sitio: ${inst.siteContact || client?.contact?.name || '—'} ${inst.sitePhone || client?.contact?.whatsapp || client?.contact?.phone || ''}`,
    crew ? `Cuadrilla: ${crew}` : '',
    '',
    '*Qué se instala*',
    ...f.lines.map((l, i) => `${i + 1}. ${l.label || l.summary}`),
    `Muro: ${f.surfaces.map((s) => s.name).join(', ') || '—'} · anclaje: ${f.anchors.map((a) => a.name).join(', ') || '—'} · altura ${num(f.maxH, 1)} m`,
    `Estado del muro: ${nameOf(WALL_STATES, inst.survey.wall)} · eléctrico: ${nameOf(POWER_STATES, inst.survey.power)} · permisos: ${nameOf(PERMIT_STATES, inst.survey.permits)}`,
    inst.survey.obstacles ? `Obstáculos: ${inst.survey.obstacles}` : '',
    inst.survey.removeOld ? 'Hay que retirar el anuncio anterior.' : '',
    '',
    '*Qué llevar*',
    ...groups.map((g) => `_${g}:_ ${inst.pack.filter((p) => p.group === g).map((p) => `${p.label}${p.qty ? ` (${p.qty})` : ''}`).join('; ')}`),
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export default function InstallOrder({ order }) {
  const { state, dispatch, role, now, clientById, userById, notify } = useApp();
  const rules = state.catalog.rules;
  const inst = order.installation ?? newInstallation(order, rules);
  const client = clientById(order.clientId);
  const f = installFacts(order, rules);
  const can = EDIT_ROLES.includes(role);
  const [sheet, setSheet] = useState(false);
  const [incident, setIncident] = useState({ type: SCENARIOS[0].id, note: '' });
  const [extra, setExtra] = useState('');

  const save = (patch) => dispatch({ type: 'UPDATE_ORDER', id: order.id, patch: { installation: { ...inst, ...patch } } });
  const setSurvey = (patch) => save({ survey: { ...inst.survey, ...patch } });
  const blockers = installBlockers(inst);
  const status = INSTALL_STATUS.find((s) => s.id === inst.status) ?? INSTALL_STATUS[0];
  const packDone = inst.pack.filter((p) => p.done).length;
  const stepsDone = inst.steps.filter((p) => p.done).length;
  const groups = [...new Set(inst.pack.map((p) => p.group))];
  const scenario = SCENARIOS.find((s) => s.id === incident.type);
  const text = installAsText(order, inst, { client, rules, userById });

  if (!f.hasInstall) {
    return (
      <section className="px-5 py-8 text-center text-[13.5px] text-ink-3">
        Esta orden no incluye instalación en sitio (entrega en taller). Si cambió el alcance, agrégala desde la cotización antes de aprobar un nuevo proyecto.
      </section>
    );
  }

  return (
    <fieldset disabled={!can} className="min-w-0">
      {/* Encabezado */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.name}</Badge>
          <span className="text-[13px] text-ink-2">{fmtSchedule(inst.schedule)}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={Copy} onClick={() => copyText(text, (ok) => notify(ok ? 'Orden de instalación copiada para WhatsApp' : 'No se pudo copiar', ok ? 'ok' : 'bad'))}>
            Copiar para WhatsApp
          </Button>
          <Button size="sm" icon={Printer} onClick={() => setSheet(true)}>
            Hoja de instalación
          </Button>
        </div>
      </section>

      {blockers.length > 0 && inst.status !== 'instalada' && (
        <section className="border-b border-warn/40 bg-warn/5 px-5 py-3">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-medium text-warn-ink">
            <AlertTriangle size={16} /> Antes de salir a instalar
          </div>
          <ul className="list-disc pl-5 text-[12.5px] text-ink-2">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <Block n="1" title="Lugar de instalación">
        <div className="flex flex-col gap-3">
          <Field label="Dirección" htmlFor={`${order.id}-addr`}>
            <Textarea id={`${order.id}-addr`} rows={2} className="min-h-[52px]" value={order.installAddress} onChange={(e) => dispatch({ type: 'UPDATE_ORDER', id: order.id, patch: { installAddress: e.target.value } })} />
          </Field>
          <Field label="Enlace de la ubicación en Google Maps" htmlFor={`${order.id}-maps`} hint="En Google Maps: Compartir → Copiar enlace, y pégalo aquí. Todos los involucrados abren el mismo punto.">
            <Input id={`${order.id}-maps`} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…" value={inst.mapsUrl} onChange={(e) => save({ mapsUrl: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <a href={mapsLink(order)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-accent-ink hover:brightness-110">
              <MapPin size={17} /> Abrir en Google Maps <ExternalLink size={14} />
            </a>
            <span className="text-[12px] text-ink-3">{/^https?:\/\//i.test(inst.mapsUrl || '') ? 'Ubicación exacta enlazada' : 'Sin enlace: se busca por la dirección escrita'}</span>
          </div>
          <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
            <Field label="Contacto en sitio" htmlFor={`${order.id}-sc`}>
              <Input id={`${order.id}-sc`} placeholder={client?.contact?.name} value={inst.siteContact} onChange={(e) => save({ siteContact: e.target.value })} />
            </Field>
            <Field label="Teléfono / WhatsApp del contacto" htmlFor={`${order.id}-sp`}>
              <Input id={`${order.id}-sp`} type="tel" placeholder={client?.contact?.whatsapp || client?.contact?.phone} value={inst.sitePhone} onChange={(e) => save({ sitePhone: e.target.value })} />
            </Field>
          </div>
          <p className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <Phone size={14} className="text-ink-3" />
            <span className="select-all font-mono">{inst.sitePhone || client?.contact?.whatsapp || client?.contact?.phone || 'Sin teléfono'}</span>
          </p>
        </div>
      </Block>

      <Block n="2" title="Programación">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Fecha y hora de instalación" htmlFor={`${order.id}-when`}>
            <Input id={`${order.id}-when`} type="datetime-local" value={inst.schedule} onChange={(e) => save({ schedule: e.target.value, status: e.target.value && inst.status === 'pendiente' ? 'programada' : inst.status })} />
          </Field>
          <Field label="Estado" htmlFor={`${order.id}-ist`}>
            <Select id={`${order.id}-ist`} value={inst.status} onChange={(e) => save({ status: e.target.value })}>
              {INSTALL_STATUS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Horario permitido en el sitio" htmlFor={`${order.id}-win`}>
            <Input id={`${order.id}-win`} placeholder="Ej. plaza: solo antes de 10 am" value={inst.window} onChange={(e) => save({ window: e.target.value })} />
          </Field>
          <Field label="Vehículo" htmlFor={`${order.id}-veh`}>
            <Input id={`${order.id}-veh`} placeholder="Ej. camioneta con rack" value={inst.vehicle} onChange={(e) => save({ vehicle: e.target.value })} />
          </Field>
        </div>
        <p className="mt-2 text-[12.5px] text-ink-3">
          Cuadrilla: {order.installerIds.map((id) => userById(id)?.name).filter(Boolean).join(', ') || 'sin asignar (asígnala en la pestaña Fabricación)'}
        </p>
      </Block>

      <Block n="3" title="Qué se instala">
        <ul className="flex flex-col gap-2">
          {f.lines.map((l, i) => {
            const ref = (l.images || []).filter((im) => (im.kind ?? 'ref') === 'ref' && !/mapa LED|\(SVG\)/.test(im.name || ''));
            return (
              <li key={l.lineId} className="rounded-lg border border-line bg-surface p-3">
                <div className="font-medium">
                  {i + 1}. {l.label || l.summary}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-2">{(l.specs.find((s) => s.label === 'Instalación') || {}).value}</div>
                {ref.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ref.map((im, k) => (
                      <img key={k} src={im.data} alt={`Montaje: ${im.name}`} className="h-32 max-w-full rounded-md border border-line object-contain" />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
          <div className="rounded-md bg-surface-2 px-3 py-2"><dt className="text-ink-3">Muro</dt><dd className="font-medium">{f.surfaces.map((s) => s.name).join(', ')}</dd></div>
          <div className="rounded-md bg-surface-2 px-3 py-2"><dt className="text-ink-3">Anclaje</dt><dd className="font-medium">{f.anchors.map((a) => a.name).join(', ') || '—'}</dd></div>
          <div className="rounded-md bg-surface-2 px-3 py-2"><dt className="text-ink-3">Altura de trabajo</dt><dd className="font-mono font-medium">{num(f.maxH, 1)} m</dd></div>
          <div className="rounded-md bg-surface-2 px-3 py-2"><dt className="text-ink-3">Equipo de altura</dt><dd className="font-medium">{!f.plan || f.plan.ladder ? 'Escalera' : f.plan.equipment === 'andamio' ? `Andamio · ${f.plan.bodies} cuerpos` : `Grúa boom · ${num(f.plan.hours, 1)} h`}</dd></div>
        </dl>
      </Block>

      <Block n="4" title="Cómo está el sitio" hint="Levantamiento antes de ir a instalar. Si algo no está listo, se resuelve desde la oficina y no en la banqueta.">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Estado del muro" htmlFor={`${order.id}-wall`}>
            <Select id={`${order.id}-wall`} value={inst.survey.wall} onChange={(e) => setSurvey({ wall: e.target.value })}>
              {WALL_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Preparación eléctrica" htmlFor={`${order.id}-pow`}>
            <Select id={`${order.id}-pow`} value={inst.survey.power} onChange={(e) => setSurvey({ power: e.target.value })}>
              {POWER_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Permisos y accesos (plaza, municipio, administración)" htmlFor={`${order.id}-perm`}>
            <Select id={`${order.id}-perm`} value={inst.survey.permits} onChange={(e) => setSurvey({ permits: e.target.value })}>
              {PERMIT_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Acceso y maniobra" htmlFor={`${order.id}-acc`}>
            <Input id={`${order.id}-acc`} placeholder="Estacionamiento, banqueta, por dónde subir…" value={inst.survey.access} onChange={(e) => setSurvey({ access: e.target.value })} />
          </Field>
          <Field label="Obstáculos" htmlFor={`${order.id}-obs`} className="sm:col-span-2">
            <Input id={`${order.id}-obs`} placeholder="Toldos, cables, árboles, luminarias, marquesina…" value={inst.survey.obstacles} onChange={(e) => setSurvey({ obstacles: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Check id={`${order.id}-surf`} label={`El muro sí es ${f.surfaces.map((s) => s.name.toLowerCase()).join(' / ')} como se cotizó`} checked={inst.survey.surfaceOk} onChange={(v) => setSurvey({ surfaceOk: v })} />
          <Check id={`${order.id}-old`} label="Hay que retirar un anuncio anterior" checked={inst.survey.removeOld} onChange={(v) => setSurvey({ removeOld: v })} />
          <Check id={`${order.id}-sdone`} label="Levantamiento del sitio completo" checked={inst.survey.done} onChange={(v) => setSurvey({ done: v })} />
        </div>
        <Field label="Notas del sitio" htmlFor={`${order.id}-sn`} className="mt-3">
          <Textarea id={`${order.id}-sn`} rows={2} className="min-h-[52px]" value={inst.survey.notes} onChange={(e) => setSurvey({ notes: e.target.value })} />
        </Field>
        <div className="mt-3">
          <Attachments idPrefix={`${order.id}-pb`} label="Fotos del muro y del área (antes)" hint="Toma de frente, de lado y del punto eléctrico" accept="image/*" files={inst.photosBefore} readOnly={!can} onChange={(files) => save({ photosBefore: files })} />
        </div>
      </Block>

      <Block n="5" title="Qué llevar" hint="Lista armada con el muro, el anclaje y la altura de esta orden. Palomea al cargar." aside={<span className="tnum font-mono text-[12px] text-ink-3">{packDone}/{inst.pack.length}</span>}>
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g}>
              <div className="eyebrow mb-1">{g}</div>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {inst.pack.filter((p) => p.group === g).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <Check id={`${order.id}-${p.id}`} label={p.label} hint={p.qty || undefined} checked={p.done} onChange={(v) => save({ pack: inst.pack.map((x) => (x.id === p.id ? { ...x, done: v } : x)) })} />
                    </div>
                    {can && <IconButton icon={Trash2} label={`Quitar ${p.label}`} onClick={() => save({ pack: inst.pack.filter((x) => x.id !== p.id) })} className="hover:text-bad" />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!extra.trim()) return;
            save({ pack: [...inst.pack, { id: uid('pk'), group: 'Adicional', label: extra.trim(), qty: '', done: false }] });
            setExtra('');
          }}
        >
          <Input id={`${order.id}-extra`} placeholder="Agregar algo más a la lista" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <Button type="submit" icon={Plus}>Agregar</Button>
          <Button variant="ghost" onClick={() => save({ pack: buildPackList(order, rules) })} title="Rehacer con los datos de la orden">Rehacer</Button>
        </form>
      </Block>

      <Block n="6" title="Pasos en sitio" aside={<span className="tnum font-mono text-[12px] text-ink-3">{stepsDone}/{inst.steps.length}</span>}>
        <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
          {inst.steps.map((st, i) => (
            <li key={st.id} className="px-3 py-2">
              <Check id={`${order.id}-${st.id}`} label={`${i + 1}. ${st.label}`} checked={st.done} onChange={(v) => save({ steps: inst.steps.map((x) => (x.id === st.id ? { ...x, done: v } : x)), status: v && inst.status === 'programada' ? 'en_sitio' : inst.status })} />
            </li>
          ))}
        </ol>
      </Block>

      <Block n="7" title="Si algo sale distinto" hint="Elige la situación: te dice qué hacer y queda registrada para Ventas y Producción.">
        <div className="flex flex-col gap-2">
          <Select id={`${order.id}-inc`} aria-label="Situación" value={incident.type} onChange={(e) => setIncident({ ...incident, type: e.target.value })}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="rounded-md border border-line bg-surface-2/60 p-3 text-[13px]">
            <b>Qué hacer:</b> {scenario.todo}
            {scenario.client && <span className="mt-1 block text-[12px] text-warn-ink">Causa atribuible al cliente: puede aplicar cargo por falsa salida (10% según contrato).</span>}
          </div>
          <Textarea id={`${order.id}-incn`} rows={2} className="min-h-[52px]" placeholder="Qué pasó, con quién hablaste, a qué hora…" value={incident.note} onChange={(e) => setIncident({ ...incident, note: e.target.value })} />
          <div>
            <Button
              variant="danger"
              icon={AlertTriangle}
              onClick={() => {
                save({ incidents: [...inst.incidents, { id: uid('inc'), type: scenario.id, name: scenario.name, client: scenario.client, note: incident.note.trim(), at: now, by: state.currentUserId }], status: 'reprogramar' });
                dispatch({ type: 'ORDER_NOTE', id: order.id, text: `Incidencia en instalación: ${scenario.name}${incident.note.trim() ? ` — ${incident.note.trim()}` : ''}` });
                setIncident({ type: SCENARIOS[0].id, note: '' });
                notify('Incidencia registrada; la instalación quedó por reprogramar', 'bad');
              }}
            >
              Registrar incidencia
            </Button>
          </div>
        </div>
        {inst.incidents.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-bad/30 text-[12.5px]">
            {inst.incidents.map((x) => (
              <li key={x.id} className="px-3 py-2">
                <div className="font-medium">{x.name}</div>
                {x.note && <div className="text-ink-2">{x.note}</div>}
                <div className="text-ink-3">
                  {fmtDateTime(x.at)} · {userById(x.by)?.name ?? '—'}
                  {x.client && ' · falsa salida atribuible al cliente'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block n="8" title="Entrega">
        <div className="flex flex-col gap-3">
          <Attachments idPrefix={`${order.id}-pa`} label="Fotos del anuncio instalado (después)" hint="De día y encendido; una general y una de detalle" accept="image/*" files={inst.photosAfter} readOnly={!can} onChange={(files) => save({ photosAfter: files })} />
          {f.lit && <Check id={`${order.id}-pt`} label="Encendido probado: todos los módulos prenden y no hay sombras" checked={inst.powerTested} onChange={(v) => save({ powerTested: v })} />}
          <Field label="Recibió de conformidad (nombre y cargo)" htmlFor={`${order.id}-rb`}>
            <Input id={`${order.id}-rb`} value={inst.receivedBy} onChange={(e) => save({ receivedBy: e.target.value })} />
          </Field>
          <div>
            <Button
              variant="ok"
              icon={CheckCircle2}
              disabled={inst.status === 'instalada' || !inst.receivedBy.trim() || (f.lit && !inst.powerTested)}
              onClick={() => {
                save({ status: 'instalada', finishedAt: now });
                dispatch({ type: 'ORDER_NOTE', id: order.id, text: `Instalación terminada. Recibió: ${inst.receivedBy.trim()}` });
                notify('Instalación terminada');
              }}
            >
              {inst.status === 'instalada' ? `Instalada ${fmtDateTime(inst.finishedAt)}` : 'Terminar instalación'}
            </Button>
            {inst.status !== 'instalada' && <p className="mt-1 text-[12px] text-ink-3">Requiere el nombre de quien recibe{f.lit ? ' y la prueba de encendido' : ''}.</p>}
          </div>
        </div>
      </Block>

      {sheet && <InstallSheet order={order} inst={inst} facts={f} client={client} onClose={() => setSheet(false)} />}
    </fieldset>
  );
}

/** Hoja imprimible: una página para la camioneta. */
function InstallSheet({ order, inst, facts: f, client, onClose }) {
  const { userById } = useApp();
  const groups = [...new Set(inst.pack.map((p) => p.group))];
  const crew = order.installerIds.map((id) => userById(id)?.name).filter(Boolean).join(', ');
  const box = <span className="mr-1.5 inline-block h-3 w-3 shrink-0 border border-[#9aa2b2] align-[-2px]" />;
  const doc = (
    <article className="mx-auto min-w-[560px] max-w-[820px] rounded-md bg-white p-8 text-[12px] leading-relaxed text-[#1a1f2b] shadow-[0_1px_0_#0001,0_8px_30px_#0000001a]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1a1f2b] pb-3">
        <div>
          <div className="font-display text-[24px] font-bold leading-none tracking-[0.12em]">{COMPANY.name.toUpperCase()}</div>
          <div className="mt-1 text-[13px] font-semibold uppercase tracking-[0.08em]">Orden de instalación</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[16px] font-medium">{order.id}</div>
          <div className="text-[11.5px]">{fmtSchedule(inst.schedule)}</div>
          {inst.window && <div className="text-[11px] text-[#5a6272]">Horario permitido: {inst.window}</div>}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-6 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Cliente y sitio</div>
          <div className="font-semibold">{client?.tradeName} · {order.title}</div>
          <div>{order.installAddress}</div>
          <div className="break-all font-mono text-[10.5px] text-[#5a6272]">{mapsLink(order)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Contacto en sitio</div>
          <div>{inst.siteContact || client?.contact?.name}</div>
          <div className="font-mono">{inst.sitePhone || client?.contact?.whatsapp || client?.contact?.phone}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Cuadrilla · vehículo</div>
          <div>{crew || '—'}{inst.vehicle ? ` · ${inst.vehicle}` : ''}</div>
        </div>
      </section>
      <section className="mb-3 rounded border border-[#dde1e8] p-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Qué se instala</div>
        {f.lines.map((l, i) => (
          <div key={l.lineId}>{i + 1}. <b>{l.label || l.summary}</b></div>
        ))}
        <div className="mt-1.5 grid grid-cols-4 gap-2 text-[11.5px]">
          <div><span className="text-[#5a6272]">Muro:</span> {f.surfaces.map((s) => s.name).join(', ')}</div>
          <div><span className="text-[#5a6272]">Anclaje:</span> {f.anchors.map((a) => a.name).join(', ') || '—'}</div>
          <div><span className="text-[#5a6272]">Altura:</span> {num(f.maxH, 1)} m</div>
          <div><span className="text-[#5a6272]">Equipo:</span> {!f.plan || f.plan.ladder ? 'Escalera' : f.plan.equipment === 'andamio' ? `Andamio ${f.plan.bodies} cuerpos` : `Grúa boom ${num(f.plan.hours, 1)} h`}</div>
        </div>
        <div className="mt-1.5 text-[11.5px]">
          <span className="text-[#5a6272]">Sitio:</span> muro {nameOf(WALL_STATES, inst.survey.wall).toLowerCase()} · eléctrico {nameOf(POWER_STATES, inst.survey.power).toLowerCase()} · permisos {nameOf(PERMIT_STATES, inst.survey.permits).toLowerCase()}
          {inst.survey.removeOld && ' · retirar anuncio anterior'}
          {inst.survey.obstacles && ` · obstáculos: ${inst.survey.obstacles}`}
          {inst.survey.access && ` · acceso: ${inst.survey.access}`}
        </div>
        {inst.survey.notes && <div className="mt-1 text-[11.5px]">{inst.survey.notes}</div>}
        <div className="mt-2 flex flex-wrap gap-2">
          {f.lines.flatMap((l) => (l.images || []).filter((im) => (im.kind ?? 'ref') === 'ref')).slice(0, 2).map((im, k) => (
            <img key={k} src={im.data} alt="" className="h-28 rounded border border-[#dde1e8] object-contain" />
          ))}
          {inst.photosBefore.filter((p) => p.data).slice(0, 2).map((p) => (
            <img key={p.id} src={p.data} alt="" className="h-28 rounded border border-[#dde1e8] object-contain" />
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-5">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Qué llevar</div>
          {groups.map((g) => (
            <div key={g} className="mb-1.5 break-inside-avoid">
              <div className="text-[10.5px] font-semibold">{g}</div>
              {inst.pack.filter((p) => p.group === g).map((p) => (
                <div key={p.id} className="text-[11px]">{box}{p.label}{p.qty && <span className="text-[#5a6272]"> · {p.qty}</span>}</div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Pasos en sitio</div>
          {inst.steps.map((st, i) => (
            <div key={st.id} className="text-[11px]">{box}{i + 1}. {st.label}</div>
          ))}
          <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Si algo sale distinto</div>
          {SCENARIOS.slice(0, 7).map((s) => (
            <div key={s.id} className="mb-1 text-[10.5px] leading-snug"><b>{s.name}:</b> {s.todo}</div>
          ))}
        </div>
      </section>
      <footer className="mt-8 grid grid-cols-2 gap-10 text-center text-[11px] text-[#5a6272]">
        <div className="border-t border-[#1a1f2b] pt-1">Instalador responsable</div>
        <div className="border-t border-[#1a1f2b] pt-1">Recibí de conformidad · nombre, firma y fecha</div>
      </footer>
    </article>
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Orden de instalación ${order.id}`}
      subtitle="Hoja para el instalador: sitio, qué llevar, pasos e imprevistos. Sin costos ni materiales de fabricación."
      footer={
        PRINT_ENABLED && (
          <Button variant="primary" icon={Printer} onClick={() => printDocument(`${order.id} orden de instalación`)}>
            Descargar PDF / imprimir
          </Button>
        )
      }
    >
      <div className="scroll-x">{doc}</div>
      {PRINT_ENABLED && <PrintPortal>{doc}</PrintPortal>}
    </Modal>
  );
}
