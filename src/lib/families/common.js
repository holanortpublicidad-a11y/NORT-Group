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

export const INSTALL_EQUIPMENT = [
  { id: 'andamio', name: 'Andamios' },
  { id: 'grua', name: 'Grúa tipo boom' },
];

/** Equipo de altura sugerido y cantidades por defecto. */
export function installPlan(rules, install) {
  const r = rules.install;
  const h = n(install?.heightM);
  const ladder = h <= r.ladderUpTo;
  const equipment = ladder ? 'escalera' : install?.equipment === 'grua' ? 'grua' : 'andamio';
  const autoBodies = Math.max(1, Math.ceil(h / r.scaffoldBodyM));
  const bodies = install?.bodies == null || install.bodies === '' ? autoBodies : n(install.bodies);
  const days = Math.max(1, n(install?.days, 1));
  const hours = Math.max(r.craneMinHours, n(install?.hours, r.craneMinHours));
  return { h, ladder, equipment, bodies, autoBodies, days, hours };
}

/**
 * Instalación:
 *   m² × factor de superficie (escalera incluida hasta 6 m)
 *   > 6 m → + andamio (cuerpos × días) o + grúa boom (horas de maniobra)
 */
export function installRows(ctx, install, m2) {
  if (!install?.enabled || !(m2 > 0)) return { rows: [], spec: null };
  const r = ctx.rules.install;
  const surf = r.surfaces.find((s) => s.id === install.surfaceId) ?? r.surfaces[0];
  const plan = installPlan(ctx.rules, install);
  const base = Math.max(m2, r.minM2);
  const inst = ctx.pick('srv-inst', 'Servicios/Mano de Obra', (i) => /instal/i.test(i.name));
  const rows = [
    row(ctx, inst, base * surf.factor, 'Instalación', {
      waste: false,
      note: `${num(base, 2)} m² × ${num(surf.factor, 2)} ${surf.name}${plan.ladder ? ' · escalera incluida' : ''}`,
    }),
  ];
  let equipText = 'escalera';
  if (plan.equipment === 'andamio') {
    const sc = ctx.pick('srv-andamio', 'Servicios/Mano de Obra', (i) => /andamio/i.test(i.name));
    rows.push(row(ctx, sc, plan.bodies * plan.days, 'Equipo de altura', { waste: false, note: `${plan.bodies} cuerpos × ${plan.days} día(s)` }));
    equipText = `andamio ${plan.bodies} cuerpos × ${plan.days} día(s)`;
  } else if (plan.equipment === 'grua') {
    const crane = ctx.pick('srv-grua', 'Servicios/Mano de Obra', (i) => /gr[uú]a/i.test(i.name));
    rows.push(row(ctx, crane, plan.hours, 'Equipo de altura', { waste: false, note: `${num(plan.hours, 1)} h de maniobra` }));
    equipText = `grúa boom ${num(plan.hours, 1)} h`;
  }
  const anchor = (r.anchors || []).find((x) => x.id === (install.anchorId || surf.anchorId));
  return { rows, spec: { label: 'Instalación', value: `${surf.name}${anchor ? ` · anclaje: ${anchor.name.toLowerCase()}` : ''} · ${num(plan.h, 1)} m de altura · ${equipText}` } };
}

export const SPEC = (label, value) => ({ label, value });
