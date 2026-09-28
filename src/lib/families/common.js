import { num } from '../format.js';

export const round = (n, d = 3) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;
export const n = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback);

/** Contexto de cálculo: acceso rápido a inventario y reglas. */
export function makeCtx(catalog) {
  const byId = new Map(catalog.items.map((i) => [i.id, i]));
  const find = (id) => byId.get(id);
  const firstOf = (cat, pred) => catalog.items.find((i) => i.category === cat && (!pred || pred(i)));
  // Busca por id; si el insumo fue borrado, usa el primero de la categoría que cumpla el filtro.
  const pick = (id, cat, pred) => find(id) ?? (cat ? firstOf(cat, pred) : undefined);
  return { catalog, rules: catalog.rules, items: catalog.items, find, firstOf, pick };
}

const WASTE_CATS = new Set(['Rígidos', 'Viniles', 'Lonas', 'Perfiles y Canales', 'Vehicular']);

/**
 * Renglón de la lista de materiales (BOM).
 * qty neta → se le suma merma a materiales por m² o m.l.
 */
export function row(ctx, item, qty, role, { note, waste = true, factor = 1 } = {}) {
  if (!item || !(qty > 0)) return null;
  const w = waste && WASTE_CATS.has(item.category) && (item.unit === 'm2' || item.unit === 'ml') ? ctx.rules.params.wastePct / 100 : 0;
  const q = round(qty * (1 + w), 3);
  return {
    itemId: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    role,
    qty: q,
    factor,
    unitCost: item.cost,
    unitPrice: item.price,
    cost: q * item.cost * factor,
    price: q * item.price * factor,
    note: [note, w ? `+${Math.round(w * 100)}% merma` : null, factor !== 1 ? `factor ×${num(factor, 2)}` : null].filter(Boolean).join(' · '),
  };
}

export function heightBand(rules, h) {
  const bands = rules.install.heightBands;
  return bands.find((b) => n(h) <= b.upTo) ?? bands[bands.length - 1];
}

/** Instalación: m² × factor de superficie × recargo por altura (+ grúa si aplica). */
export function installRows(ctx, install, m2) {
  if (!install?.enabled || !(m2 > 0)) return { rows: [], spec: null };
  const r = ctx.rules.install;
  const surf = r.surfaces.find((s) => s.id === install.surfaceId) ?? r.surfaces[0];
  const h = n(install.heightM);
  const band = heightBand(ctx.rules, h);
  const base = Math.max(m2, r.minM2);
  const qty = base * surf.factor * (1 + band.pct / 100);
  const inst = ctx.pick('srv-inst', 'Servicios/Mano de Obra', (i) => /instal/i.test(i.name));
  const rows = [
    row(ctx, inst, qty, 'Instalación', {
      waste: false,
      note: `${num(base, 2)} m² × ${num(surf.factor, 2)} ${surf.name}${band.pct ? ` · ${band.label} +${band.pct}%` : ''}`,
    }),
  ];
  if (h >= r.craneFrom) {
    const crane = ctx.pick('srv-grua', 'Servicios/Mano de Obra', (i) => /gr[uú]a/i.test(i.name));
    rows.push(row(ctx, crane, 1, 'Instalación', { note: `altura ${num(h, 1)} m`, waste: false }));
  }
  return { rows, spec: { label: 'Instalación', value: `${surf.name} · ${num(h, 1)} m de altura (${band.label})` } };
}

export const SPEC = (label, value) => ({ label, value });
