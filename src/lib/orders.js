import { DAY } from './format.js';
import { calcLine, calcQuote } from './pricing.js';

export const quoteFolio = (n, year) => `COT-${year}-${String(n).padStart(4, '0')}`;
export const orderFolio = (n, year) => `OT-${year}-${String(n).padStart(3, '0')}`;

/**
 * Convierte una cotización aprobada en Orden de Trabajo.
 * La OT guarda una copia congelada de la ficha técnica: especificaciones, lista de
 * materiales (BOM), instalación, archivos de diseño y el costo/precio aprobados.
 */
export function buildOrderFromQuote({ quote, client, catalog, seq, now, byUserId }) {
  const totals = calcQuote(quote, catalog);
  const lines = quote.items.map((item) => {
    const c = calcLine(item, catalog);
    return {
      lineId: item.id,
      family: item.family,
      familyName: c.family?.name ?? '—',
      summary: c.summary,
      label: item.label,
      specs: c.specs,
      bom: c.rows.map((r) => ({ itemId: r.itemId, name: r.name, unit: r.unit, qty: r.qty, role: r.role, note: r.note, cost: r.cost })),
      install: item.install?.enabled && c.family?.supportsInstall ? { ...item.install } : null,
      notes: item.notes,
      cost: c.cost,
      total: c.total,
    };
  });

  return {
    id: orderFolio(seq, new Date(now).getFullYear()),
    quoteId: quote.id,
    clientId: quote.clientId,
    sellerId: quote.sellerId,
    title: quote.title || lines[0]?.summary || 'Orden de trabajo',
    createdAt: now,
    dueDate: now + (Number(quote.leadDays) || 10) * DAY,
    phase: 'ventas',
    designerId: null,
    teams: [],
    installerIds: [],
    installAddress: client?.installAddress ?? '',
    lines,
    attachments: [...(quote.attachments || [])],
    economics: { cost: totals.cost, subtotal: totals.subtotal, margin: totals.margin },
    closedAt: null,
    history: [{ phase: 'ventas', at: now, by: byUserId, note: `Generada al aprobar ${quote.id}` }],
    notes: [],
  };
}
