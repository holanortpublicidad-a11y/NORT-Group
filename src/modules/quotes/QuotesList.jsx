import React, { useMemo, useState } from 'react';
import { ArrowUpRight, FilePlus2, FileText, Search } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Badge, Button, Card, EmptyState, PageHeader, QUOTE_TONE, SearchInput, Segmented } from '../../components/ui.jsx';
import { calcQuote } from '../../lib/pricing.js';
import { fmtDate, mxn } from '../../lib/format.js';
import { can } from '../../lib/permissions.js';

const STATUSES = ['Todas', 'Borrador', 'Enviada', 'Aprobada', 'Rechazada'];

export default function QuotesList() {
  const { state, dispatch, role, nav, clientById, userById } = useApp();
  const [status, setStatus] = useState('Todas');
  const [q, setQ] = useState('');
  const editable = can(role, 'quotes', 'edit');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.quotes
      .map((quote) => ({ quote, totals: calcQuote(quote, state.catalog), client: clientById(quote.clientId), seller: userById(quote.sellerId) }))
      .filter((r) => status === 'Todas' || r.quote.status === status)
      .filter((r) => !term || [r.quote.id, r.quote.title, r.client?.tradeName, r.client?.legalName].join(' ').toLowerCase().includes(term))
      .sort((a, b) => b.quote.createdAt - a.quote.createdAt);
  }, [state.quotes, state.catalog, status, q, clientById, userById]);

  const open = (id) => nav({ name: 'quote', id });

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 2"
        title="Cotizaciones"
        subtitle="Cotiza por m², por desarrollo de letra 3D o con módulos de precio fijo. Al aprobar se genera la OT."
        actions={editable && <Button variant="primary" icon={FilePlus2} onClick={() => dispatch({ type: 'NEW_QUOTE' })}>Nueva cotización</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput id="quotes-search" icon={Search} value={q} onChange={setQ} placeholder="Buscar folio, cliente o proyecto" />
        <div className="scroll-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <Segmented options={STATUSES.map((s) => ({ value: s, label: s }))} value={status} onChange={setStatus} />
        </div>
      </div>

      {!rows.length ? (
        <Card>
          <EmptyState icon={FileText} title="Sin cotizaciones con ese filtro" />
        </Card>
      ) : (
        <>
          {/* Tabla escritorio */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-line bg-surface-2/60 text-[12px] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Folio</th>
                  <th className="px-4 py-2.5 font-medium">Cliente · proyecto</th>
                  <th className="px-4 py-2.5 font-medium">Vendedor</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Estatus</th>
                  <th className="px-4 py-2.5 font-medium">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ quote, totals, client, seller }) => (
                  <tr key={quote.id} onClick={() => open(quote.id)} className="cursor-pointer transition hover:bg-surface-2/60">
                    <td className="px-4 py-3 font-mono text-[12.5px]">{quote.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{client?.tradeName}</div>
                      <div className="text-[12.5px] text-ink-3">{quote.title || 'Sin título'}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{seller?.name}</td>
                    <td className="tnum px-4 py-3 text-ink-2">{fmtDate(quote.createdAt)}</td>
                    <td className="tnum px-4 py-3 text-right font-medium">{mxn(totals.total)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={QUOTE_TONE[quote.status]}>{quote.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {quote.orderId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-mono text-[12.5px] text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            nav({ name: 'orders', open: quote.orderId });
                          }}
                        >
                          {quote.orderId}
                          <ArrowUpRight size={13} />
                        </button>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Tarjetas móvil */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {rows.map(({ quote, totals, client }) => (
              <li key={quote.id}>
                <Card className="p-4" onClick={() => open(quote.id)} role="button">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-ink-3">{quote.id}</div>
                      <div className="mt-0.5 font-medium">{client?.tradeName}</div>
                      <div className="text-[12.5px] text-ink-3">{quote.title || 'Sin título'}</div>
                    </div>
                    <Badge tone={QUOTE_TONE[quote.status]}>{quote.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-[12px] text-ink-3">{fmtDate(quote.createdAt)}</span>
                    <span className="tnum font-display text-xl font-semibold">{mxn(totals.total)}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
