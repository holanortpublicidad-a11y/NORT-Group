import React from 'react';
import { Copy, MessageCircle, Printer } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, Modal, PrintPortal, copyText } from '../../components/ui.jsx';
import { calcQuote } from '../../lib/pricing.js';
import { DAY, fmtDate, mxn, num } from '../../lib/format.js';
import { COMPANY, PRINT_ENABLED } from '../../config.js';
import LegalText from '../../components/LegalText.jsx';

// Especificaciones legibles para el cliente (sin costos internos).
const qtyOf = (it) => (it.family === 'f4' && it.params.mode === 'stickers' ? it.params.pieces : it.family === 'f6' ? it.params.volume : it.params.qty ?? 1);
const specLines = (calc) => calc.specs.map((sp) => `${sp.label}: ${sp.value}`);

export function quoteAsText(quote, client, seller, catalog) {
  const t = calcQuote(quote, catalog);
  const lines = t.lines.map(({ item, calc }, i) => `${i + 1}. ${item.label || calc.summary}: ${mxn(calc.total)}`);
  return [
    `*${COMPANY.name}* · Cotización ${quote.id}`,
    `${client?.legalName}`,
    quote.title ? `Proyecto: ${quote.title}` : '',
    '',
    ...lines,
    '',
    `Subtotal: ${mxn(t.subtotal)}`,
    t.ivaOn ? `IVA ${Math.round(catalog.rules.params.iva * 100)}%: ${mxn(t.iva)}` : 'IVA: no aplica (precio sin IVA)',
    `*Total${t.ivaOn ? '' : ' sin IVA'}: ${mxn(t.total)}*`,
    `Anticipo requerido (${quote.advancePct}%): ${mxn(t.advance)}`,
    `Entrega estimada: ${quote.leadDays} días hábiles a partir del anticipo y la aprobación del diseño`,
    'Aplican los términos y condiciones de NORT Publicidad incluidos en la cotización.',
    `Vigencia: ${quote.validityDays} días · Atiende: ${seller?.name ?? ''}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export default function QuotePreview({ open, onClose, quote }) {
  const { state, clientById, userById, notify } = useApp();
  const { catalog } = state;
  const client = clientById(quote.clientId);
  const seller = userById(quote.sellerId);
  const t = calcQuote(quote, catalog);
  const terms = state.settings?.terms;
  const text = quoteAsText(quote, client, seller, catalog);
  const phone = (client?.contact.whatsapp || client?.contact.phone || '').replace(/\D/g, '').slice(-10);
  const wa = `https://wa.me/52${phone}?text=${encodeURIComponent(text)}`;

  const doc = (
<article className="mx-auto min-w-[560px] max-w-[820px] rounded-md bg-white p-8 text-[12.5px] leading-relaxed text-[#1a1f2b] shadow-[0_1px_0_#0001,0_8px_30px_#0000001a]">
          <header className="flex items-start justify-between gap-6 border-b-2 border-[#1a1f2b] pb-4">
            <div>
              <div className="font-display text-[26px] font-bold leading-none tracking-wide">{COMPANY.name.toUpperCase()}</div>
              <div className="mt-1 text-[11px] text-[#5a6272]">
                {[COMPANY.legal, COMPANY.rfc && `RFC ${COMPANY.rfc}`].filter(Boolean).join(' · ')}
                {(COMPANY.legal || COMPANY.rfc) && <br />}
                {[COMPANY.address, COMPANY.phone].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[18px] font-semibold tracking-[0.12em]">COTIZACIÓN</div>
              <div className="font-mono text-[13px]">{quote.id}</div>
              <div className="mt-1 text-[11px] text-[#5a6272]">
                Fecha: {fmtDate(quote.createdAt)}
                <br />
                Vigente hasta: {fmtDate(quote.createdAt + quote.validityDays * DAY)}
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Cliente</div>
              <div className="font-semibold">{client?.legalName}</div>
              {client?.rfc && <div>RFC {client.rfc}</div>}
              <div>
                {client?.contact.name} · {client?.contact.phone}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Lugar de instalación</div>
              <div>{client?.installAddress}</div>
              {quote.title && (
                <>
                  <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8292]">Proyecto</div>
                  <div className="font-semibold">{quote.title}</div>
                </>
              )}
            </div>
          </section>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y border-[#1a1f2b] text-left text-[10.5px] uppercase tracking-[0.08em]">
                <th className="w-8 py-2">#</th>
                <th className="py-2">Concepto y especificaciones</th>
                <th className="w-14 py-2 text-right">Cant.</th>
                <th className="w-28 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {t.lines.map(({ item, calc }, i) => (
                <tr key={item.id} className="border-b border-[#dde1e8] align-top">
                  <td className="py-2.5 font-mono">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold">
                      {calc.family?.name}
                      {item.label && <span className="font-normal text-[#5a6272]"> — {item.label}</span>}
                    </div>
                    <ul className="mt-0.5 text-[11.5px] text-[#4a5261]">
                      {specLines(calc).map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                    {calc.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {calc.images.map((im, k) => (
                          <figure key={k} className="w-[120px]">
                            <img src={im.data} alt={im.name} className="h-20 w-full rounded border border-[#dde1e8] object-contain" />
                            <figcaption className="mt-0.5 truncate text-[10px] text-[#7a8292]">{im.name}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono">{qtyOf(item)}</td>
                  <td className="py-2.5 text-right font-mono">{mxn(calc.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="mt-4 flex justify-between gap-6">
            <div className="max-w-[330px] rounded border border-[#dde1e8] p-3 text-[11.5px]">
              <div className="font-semibold">Condiciones</div>
              <p>
                Anticipo del <b>{quote.advancePct}%</b> para iniciar. Entrega estimada: <b>{quote.leadDays} días hábiles</b> a partir del anticipo y la
                aprobación del diseño.
              </p>
              <p className="mt-1 text-[#5a6272]">{quote.notes}</p>
            </div>
            <dl className="w-[250px] font-mono text-[12.5px]">
              <div className="flex justify-between py-0.5">
                <dt>Subtotal</dt>
                <dd>{mxn(t.subtotal)}</dd>
              </div>
              <div className="flex justify-between py-0.5">
                <dt>IVA {t.ivaOn ? `${Math.round(catalog.rules.params.iva * 100)}%` : ''}</dt>
                <dd>{t.ivaOn ? mxn(t.iva) : 'No aplica'}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t-2 border-[#1a1f2b] py-1 text-[14px] font-semibold">
                <dt>{t.ivaOn ? 'Total' : 'Total sin IVA'}</dt>
                <dd>{mxn(t.total)}</dd>
              </div>
              <div className="mt-1 flex justify-between rounded bg-[#eef2ff] px-2 py-1 text-[#1f3fb0]">
                <dt>Anticipo {quote.advancePct}%</dt>
                <dd>{mxn(t.advance)}</dd>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-[#5a6272]">
                <dt>Saldo contra entrega</dt>
                <dd>{mxn(t.balance)}</dd>
              </div>
            </dl>
          </section>

          <footer className="mt-10 flex items-end justify-between text-[11px] text-[#5a6272]">
            <div>
              <div className="w-48 border-t border-[#1a1f2b] pt-1 text-[#1a1f2b]">{seller?.name}</div>
              Asesor comercial · {seller?.email}
            </div>
            <div className="w-48 border-t border-[#1a1f2b] pt-1 text-center text-[#1a1f2b]">Acepto · firma del cliente</div>
          </footer>

          {/* Términos y condiciones oficiales: segunda hoja al imprimir */}
          <section className="print-break mt-8 border-t-2 border-[#1a1f2b] pt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-[15px] font-bold tracking-[0.12em]">{COMPANY.name.toUpperCase()}</span>
              <span className="font-mono text-[11px] text-[#5a6272]">{quote.id} · anexo</span>
            </div>
            <LegalText text={terms} compact />
          </section>
        </article>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Vista previa para el cliente"
      subtitle="Así se verá el documento que recibe el cliente"
      footer={
        <>
          <Button icon={Copy} onClick={() => copyText(text, (ok) => notify(ok ? 'Resumen copiado' : 'No se pudo copiar; selecciona el texto manualmente', ok ? 'ok' : 'bad'))}>
            Copiar resumen
          </Button>
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
            <MessageCircle size={17} /> Enviar por WhatsApp
          </a>
          {PRINT_ENABLED && (
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
          )}
        </>
      }
    >
      {/* Documento: papel siempre claro */}
      <div className="scroll-x">{doc}</div>
      {PRINT_ENABLED && <PrintPortal>{doc}</PrintPortal>}
    </Modal>
  );
}
