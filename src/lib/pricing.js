import { FAMILIES, installRows, makeCtx } from './families/index.js';
import { uid } from './format.js';

/**
 * Motor de precios por familia de producto.
 * Cada renglón genera una lista de materiales (BOM) tomada del inventario:
 *   costo de producción = Σ cantidad × costo interno
 *   precio al cliente   = Σ cantidad × precio de venta
 *   margen              = (precio − costo) / precio
 */

export function newLineItem(familyId, catalog) {
  const fam = FAMILIES[familyId];
  return {
    id: uid('ln'),
    family: familyId,
    label: '',
    params: fam.defaults(catalog),
    install: { enabled: !!fam.supportsInstall, surfaceId: 'block', heightM: 3 },
    discountPct: 0,
    notes: '',
  };
}

const EMPTY = { family: null, rows: [], specs: [], m2: 0, summary: '—', cost: 0, price: 0, discount: 0, total: 0, profit: 0, margin: 0 };

export function calcLine(item, catalog) {
  const fam = FAMILIES[item.family];
  if (!fam) return EMPTY;
  const ctx = makeCtx(catalog);
  const out = fam.calc(item.params, ctx);
  const inst = fam.supportsInstall ? installRows(ctx, item.install, out.installM2) : { rows: [], spec: null };
  const rows = [...out.rows, ...inst.rows].filter(Boolean);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const price = rows.reduce((s, r) => s + r.price, 0);
  const discount = (price * (Number(item.discountPct) || 0)) / 100;
  const total = price - discount;
  const profit = total - cost;
  return {
    family: fam,
    rows,
    specs: [...out.specs, inst.spec].filter(Boolean),
    m2: out.m2,
    summary: out.summary,
    cost,
    price,
    discount,
    total,
    profit,
    margin: total > 0 ? (profit / total) * 100 : 0,
  };
}

export function calcQuote(quote, catalog) {
  const lines = quote.items.map((item) => ({ item, calc: calcLine(item, catalog) }));
  const subtotal = lines.reduce((s, l) => s + l.calc.total, 0);
  const cost = lines.reduce((s, l) => s + l.calc.cost, 0);
  const iva = subtotal * catalog.rules.params.iva;
  const total = subtotal + iva;
  const advance = (total * (Number(quote.advancePct) || 0)) / 100;
  const profit = subtotal - cost;
  return {
    lines,
    subtotal,
    cost,
    profit,
    margin: subtotal > 0 ? (profit / subtotal) * 100 : 0,
    iva,
    total,
    advance,
    balance: total - advance,
    m2: lines.reduce((s, l) => s + l.calc.m2, 0),
  };
}

export const itemSummary = (item, catalog) => calcLine(item, catalog).summary;

/** Material total requerido por la cotización, agrupado por insumo del inventario. */
export function materialNeeds(quote, catalog) {
  const map = new Map();
  for (const item of quote.items) {
    for (const r of calcLine(item, catalog).rows) {
      const cur = map.get(r.itemId) ?? { itemId: r.itemId, name: r.name, unit: r.unit, qty: 0 };
      cur.qty += r.qty;
      map.set(r.itemId, cur);
    }
  }
  return [...map.values()];
}

/** Insumos con inventario controlado cuyo stock no alcanza para la cotización. */
export function stockShortages(quote, catalog) {
  return materialNeeds(quote, catalog)
    .map((m) => ({ ...m, item: catalog.items.find((i) => i.id === m.itemId) }))
    .filter((m) => m.item && m.item.stock != null && m.qty > m.item.stock);
}

export const marginTone = (m, params) => (m < params.marginBad ? 'bad' : m < params.marginWarn ? 'warn' : 'ok');
