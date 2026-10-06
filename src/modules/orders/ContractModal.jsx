import React, { useRef } from 'react';
import { Copy, Download, Printer, Send } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, Modal, PrintPortal, copyText, printDocument } from '../../components/ui.jsx';
import LegalText from '../../components/LegalText.jsx';
import { DEFAULT_SETTINGS, fillTemplate, longDate } from '../../data/legal.js';
import { orderMoney } from '../../lib/pricing.js';
import { mxn } from '../../lib/format.js';
import { COMPANY, PRINT_ENABLED } from '../../config.js';

/** Llena la plantilla oficial con los datos de la OT / cotización aprobada. */
export function buildContract(order, { client, seller, settings, ivaRate, now }) {
  const st = settings || DEFAULT_SETTINGS;
  const m = orderMoney(order, ivaRate);
  const d = longDate(now);
  const objeto = order.lines.map((l) => (l.label ? `${l.label} (${l.summary})` : l.summary)).join('; ');
  return fillTemplate(st.contract, {
    cliente: client?.legalName || client?.tradeName,
    cotizacion: order.quoteId,
    ...d,
    asesor: seller?.name,
    objeto,
    monto: mxn(m.ivaOn ? m.subtotal : m.total),
    iva_texto: m.ivaOn ? '+ IVA' : '(precio sin IVA)',
    anticipo: mxn(m.advance),
    anticipo_pct: m.advancePct,
    tarifa_falsa_salida: st.falseTripFee ? mxn(Number(st.falseTripFee)) : '',
  });
}

export default function ContractModal({ order, onClose }) {
  const { state, dispatch, now, clientById, userById, notify } = useApp();
  const client = clientById(order.clientId);
  const seller = userById(order.sellerId);
  const settings = state.settings || DEFAULT_SETTINGS;
  const text = buildContract(order, { client, seller, settings, ivaRate: state.catalog.rules.params.iva, now });
  const d = longDate(now);
  const ref = useRef(null);

  const doc = (
    <article ref={ref} className="mx-auto min-w-[560px] max-w-[820px] rounded-md bg-white p-8 text-[#1a1f2b] shadow-[0_1px_0_#0001,0_8px_30px_#0000001a]">
      <div className="mb-4 flex items-baseline justify-between border-b-2 border-[#1a1f2b] pb-3">
        <span className="font-display text-[24px] font-bold tracking-[0.12em]">{COMPANY.name.toUpperCase()}</span>
        <span className="font-mono text-[11px] text-[#5a6272]">
          {order.id} · {order.quoteId}
        </span>
      </div>
      <LegalText text={text} />
      <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[11.5px]">
        <div>
          <div className="border-t border-[#1a1f2b] pt-1 font-semibold">FIRMA EL CLIENTE</div>
          <div className="text-[#5a6272]">{client?.legalName || client?.tradeName}</div>
        </div>
        <div>
          <div className="border-t border-[#1a1f2b] pt-1 font-semibold">FIRMA EL PRESTADOR</div>
          <div className="text-[#5a6272]">{COMPANY.name}</div>
        </div>
      </div>
      <p className="mt-6 text-center text-[11.5px] text-[#5a6272]">
        Ciudad Juárez, Chihuahua, a {d.dia} de {d.mes} de {d.anio}
      </p>
      <section className="print-break mt-8 border-t-2 border-[#1a1f2b] pt-4">
        <div className="mb-2 font-mono text-[11px] text-[#5a6272]">ANEXO · {order.quoteId}</div>
        <LegalText text={settings.terms} compact />
      </section>
    </article>
  );

  // Descarga como documento de Word (.doc con HTML). Solo en la app local: el visor embebido bloquea descargas.
  const download = () => {
    const html = `<html><head><meta charset="utf-8"><title>Contrato ${order.id}</title></head><body style="font-family:Arial,sans-serif;font-size:11pt">${ref.current?.innerHTML ?? ''}</body></html>`;
    const url = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato-${order.id}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Contrato de publicidad"
      subtitle={`Generado con los datos de ${order.quoteId}: cliente, trabajos, monto, anticipo, asesor y términos oficiales`}
      footer={
        <>
          <Button icon={Copy} onClick={() => copyText(text, (ok) => notify(ok ? 'Texto del contrato copiado' : 'No se pudo copiar', ok ? 'ok' : 'bad'))}>
            Copiar texto
          </Button>
          {!order.release?.contractSent && (
            <Button icon={Send} onClick={() => dispatch({ type: 'UPDATE_RELEASE', id: order.id, patch: { contractSent: true } })}>
              Marcar enviado al cliente
            </Button>
          )}
          {PRINT_ENABLED && (
            <>
              <Button icon={Download} onClick={download}>
                Descargar contrato (.doc)
              </Button>
              <Button variant="primary" icon={Printer} onClick={() => printDocument(`Contrato ${order.id}`)}>
                Imprimir / PDF
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="scroll-x">{doc}</div>
      {PRINT_ENABLED && <PrintPortal>{doc}</PrintPortal>}
    </Modal>
  );
}
