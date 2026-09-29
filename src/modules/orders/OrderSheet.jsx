import React from 'react';
import { Copy, MessageCircle, Printer } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, Modal, PrintPortal, copyText } from '../../components/ui.jsx';
import { SLA_META, computeSla, phaseName } from '../../lib/sla.js';
import { fmtDate, fmtDateTime, num } from '../../lib/format.js';
import { unitLabel } from '../../data/inventory.js';
import { COMPANY, PRINT_ENABLED } from '../../config.js';

/** Resumen de la OT en texto plano con formato de WhatsApp (*negritas*). */
export function orderAsText(order, { client, now, userById }) {
  const sla = computeSla(order, now);
  const people = [userById(order.designerId)?.name && `Diseño: ${userById(order.designerId).name}`, order.installerIds.length && `Instalan: ${order.installerIds.map((id) => userById(id)?.name).join(', ')}`].filter(Boolean);
  const lines = order.lines.flatMap((l, i) => [
    `*${i + 1}. ${l.label || l.summary}*`,
    ...l.specs.map((s) => `  • ${s.label}: ${s.value}`),
  ]);
  return [
    `*${COMPANY.name} · ${order.id}*`,
    `${client?.tradeName ?? ''} — ${order.title}`,
    `Fase: ${phaseName(order.phase)} · ${SLA_META[sla.level].label} (${Math.round(sla.pct * 100)}%)`,
    `Compromiso: ${fmtDate(order.dueDate)} · ${sla.text}`,
    order.installAddress ? `Sitio: ${order.installAddress}` : '',
    client?.contact?.name ? `Contacto: ${client.contact.name} ${client.contact.whatsapp || client.contact.phone || ''}` : '',
    ...people,
    '',
    ...lines,
    order.teams.length ? `\nEquipos: ${order.teams.join(', ')}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export default function OrderSheet({ order, onClose }) {
  const { now, clientById, userById, notify } = useApp();
  const client = clientById(order.clientId);
  const sla = computeSla(order, now);
  const text = orderAsText(order, { client, now, userById });
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const designer = userById(order.designerId)?.name;
  const installers = order.installerIds.map((id) => userById(id)?.name).filter(Boolean);

  const doc = (
<article className="mx-auto min-w-[560px] max-w-[820px] rounded-md bg-white p-8 text-[12.5px] leading-relaxed text-[#1a1f2b] shadow-[0_1px_0_#0001,0_8px_30px_#0000001a]">
          <header className="flex items-start justify-between gap-6 border-b-2 border-[#1a1f2b] pb-4">
            <div>
              <div className="font-display text-[26px] font-bold leading-none tracking-[0.12em]">{COMPANY.name.toUpperCase()}</div>
              <div className="mt-1 text-[11px] text-[#5a6272]">Orden de trabajo · {COMPANY.address}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[18px] font-medium">{order.id}</div>
              <div className="text-[11px] text-[#5a6272]">
                Cotización {order.quoteId} · emitida {fmtDate(order.createdAt)}
                <br />
                Compromiso <b className="text-[#1a1f2b]">{fmtDate(order.dueDate)}</b> · {phaseName(order.phase)}
              </div>
              <div className="mt-1 inline-block rounded border border-[#dde1e8] px-2 py-0.5 text-[11px]">
                {SLA_META[sla.level].label} · {Math.round(sla.pct * 100)}% · {sla.text}
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Cliente</div>
              <div className="font-semibold">{client?.tradeName}</div>
              <div>{client?.contact?.name}</div>
              <div className="font-mono">{[client?.contact?.phone, client?.contact?.whatsapp && `WA ${client.contact.whatsapp}`].filter(Boolean).join(' · ')}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Sitio de instalación</div>
              <div>{order.installAddress || '—'}</div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Equipo</div>
              <div>
                {[designer && `Diseño: ${designer}`, order.teams.length && `Producción: ${order.teams.join(', ')}`, installers.length && `Instalación: ${installers.join(', ')}`].filter(Boolean).join(' · ') || 'Sin asignar'}
              </div>
            </div>
          </section>

          {order.lines.map((l, i) => (
            <section key={l.lineId} className="mb-4 break-inside-avoid rounded border border-[#dde1e8] p-3">
              <div className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-[#dde1e8] pb-1.5">
                <div className="font-semibold">
                  {i + 1}. {l.label || l.summary}
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#7a8292]">{l.familyName}</div>
              </div>
              <div className="flex gap-4">
                <dl className="min-w-0 flex-1">
                  {l.specs.map((s) => (
                    <div key={s.label} className="grid grid-cols-[120px_1fr] gap-2 py-0.5">
                      <dt className="text-[#5a6272]">{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                  {l.notes && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5">
                      <dt className="text-[#5a6272]">Notas</dt>
                      <dd>{l.notes}</dd>
                    </div>
                  )}
                </dl>
                {l.images?.length > 0 && (
                  <div className="flex w-[150px] shrink-0 flex-col gap-2">
                    {l.images.map((im, k) => (
                      <img key={k} src={im.data} alt={im.name} className="h-24 w-full rounded border border-[#dde1e8] object-contain" />
                    ))}
                  </div>
                )}
              </div>
              <table className="mt-2 w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-[#1a1f2b] text-left text-[10px] uppercase tracking-[0.08em] text-[#5a6272]">
                    <th className="py-1">Material / servicio</th>
                    <th className="py-1">Uso</th>
                    <th className="py-1 text-right">Cantidad</th>
                    <th className="w-10 py-1 text-center">✓</th>
                  </tr>
                </thead>
                <tbody>
                  {l.bom.map((b, k) => (
                    <tr key={k} className="border-b border-[#eef0f4]">
                      <td className="py-1">{b.name}</td>
                      <td className="py-1 text-[#5a6272]">{b.role}</td>
                      <td className="py-1 text-right font-mono">
                        {num(b.qty, 2)} {unitLabel(b.unit)}
                      </td>
                      <td className="py-1 text-center">
                        <span className="inline-block h-3 w-3 border border-[#9aa2b2]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {order.notes?.length > 0 && (
            <section className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Bitácora</div>
              <ul className="text-[11.5px]">
                {order.notes.map((n) => (
                  <li key={n.id}>
                    {fmtDateTime(n.at)} · {n.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-10 grid grid-cols-3 gap-6 text-center text-[11px] text-[#5a6272]">
            <div className="border-t border-[#1a1f2b] pt-1">Jefe de producción</div>
            <div className="border-t border-[#1a1f2b] pt-1">Instalador</div>
            <div className="border-t border-[#1a1f2b] pt-1">Conformidad del cliente</div>
          </footer>
        </article>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Ficha de ${order.id}`}
      subtitle="Hoja de producción e instalación, sin precios"
      footer={
        <>
          <Button icon={Copy} onClick={() => copyText(text, (ok) => notify(ok ? 'Resumen copiado: pégalo en WhatsApp' : 'No se pudo copiar; selecciona el texto', ok ? 'ok' : 'bad'))}>
            Copiar resumen para WhatsApp
          </Button>
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
            <MessageCircle size={17} /> Abrir WhatsApp
          </a>
          {PRINT_ENABLED && (
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Generar PDF / Imprimir
            </Button>
          )}
        </>
      }
    >
      <div className="scroll-x">{doc}</div>
      {PRINT_ENABLED && <PrintPortal>{doc}</PrintPortal>}
    </Modal>
  );
}
