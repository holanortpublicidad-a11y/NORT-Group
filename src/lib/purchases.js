import { isClosed } from './sla.js';

/** Compras: lo que hay que adquirir sale de la lista de materiales de cada OT abierta. */
export const purchaseKey = (orderId, itemId) => `${orderId}|${itemId}`;
const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Una fila por material y por proyecto. Los servicios y la mano de obra no se compran.
 * `purchases` guarda lo ya adquirido: esas filas dejan de sumar en lo pendiente.
 */
export function purchaseRows(orders, catalog, purchases = {}) {
  const out = [];
  for (const o of orders) {
    const map = new Map();
    for (const l of o.lines || []) {
      for (const b of l.bom || []) {
        const item = catalog.items.find((i) => i.id === b.itemId);
        const category = item?.category ?? (/^srv-/.test(b.itemId) ? 'Servicios/Mano de Obra' : 'Otros');
        if (category === 'Servicios/Mano de Obra') continue;
        const cur = map.get(b.itemId) ?? { itemId: b.itemId, name: item?.name ?? b.name, unit: b.unit, category, qty: 0, cost: 0, uses: [] };
        cur.qty += b.qty;
        cur.cost += b.cost || 0;
        if (!cur.uses.includes(b.role)) cur.uses.push(b.role);
        map.set(b.itemId, cur);
      }
    }
    for (const r of map.values()) {
      const key = purchaseKey(o.id, r.itemId);
      const bought = purchases[key] ?? null;
      // una OT cerrada ya no pide compras; solo se conserva lo que sí se compró para ella
      if (isClosed(o.phase) && !bought) continue;
      out.push({ ...r, qty: r3(r.qty), key, orderId: o.id, orderTitle: o.title, clientId: o.clientId, phase: o.phase, dueDate: o.dueDate, bought });
    }
  }
  return out;
}

/** Agrupa las filas por material, con el desglose por proyecto. */
export function groupByItem(rows, catalog) {
  const map = new Map();
  for (const r of rows) {
    const item = catalog.items.find((i) => i.id === r.itemId);
    const g = map.get(r.itemId) ?? { itemId: r.itemId, name: r.name, unit: r.unit, category: r.category, stock: item?.stock ?? null, pendingQty: 0, pendingCost: 0, boughtQty: 0, rows: [] };
    if (r.bought) g.boughtQty = r3(g.boughtQty + r.bought.qty);
    else {
      g.pendingQty = r3(g.pendingQty + r.qty);
      g.pendingCost += r.cost;
    }
    g.rows.push(r);
    map.set(r.itemId, g);
  }
  return [...map.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/** Agrupa las filas por proyecto (OT). */
export function groupByOrder(rows) {
  const map = new Map();
  for (const r of rows) {
    const g = map.get(r.orderId) ?? { orderId: r.orderId, title: r.orderTitle, clientId: r.clientId, phase: r.phase, dueDate: r.dueDate, pendingCost: 0, pending: 0, rows: [] };
    if (!r.bought) {
      g.pending += 1;
      g.pendingCost += r.cost;
    }
    g.rows.push(r);
    map.set(r.orderId, g);
  }
  return [...map.values()].sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
}
