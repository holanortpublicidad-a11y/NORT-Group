import { DAY } from './format.js';

// Flujo de la Orden de Trabajo. `owner` = roles que pueden avanzar la OT desde esa fase.
export const PHASES = [
  { id: 'ventas', name: 'Ventas', hint: 'Anticipo y datos finales', owner: ['ventas'] },
  { id: 'diseno', name: 'Diseño', hint: 'Arte, render y plano de fabricación', owner: ['diseno'] },
  { id: 'produccion', name: 'Producción', hint: 'Planeación y compra de material', owner: ['produccion', 'compras'] },
  { id: 'fabricacion', name: 'Fabricación', hint: 'Corte, armado, LED, pintura', owner: ['produccion'] },
  { id: 'instalacion', name: 'Instalación', hint: 'Montaje en sitio', owner: ['instalador', 'produccion'] },
  { id: 'concluido', name: 'Concluido', hint: 'Entregado, pendiente de factura', owner: ['contabilidad'] },
  { id: 'facturado', name: 'Facturado', hint: 'CFDI emitido', owner: [] },
];

export const phaseIndex = (id) => PHASES.findIndex((p) => p.id === id);
export const phaseName = (id) => PHASES.find((p) => p.id === id)?.name ?? id;
export const isClosed = (phase) => phase === 'concluido' || phase === 'facturado';

/**
 * Semaforización:
 *  verde    < 60 % del tiempo total consumido
 *  amarillo 60 % – 90 %
 *  rojo     > 90 % o fecha compromiso vencida
 */
export function computeSla(order, now) {
  const start = order.createdAt;
  const due = order.dueDate;
  const total = Math.max(due - start, 1);

  if (isClosed(order.phase)) {
    const end = order.closedAt ?? now;
    const late = end > due;
    return {
      level: late ? 'late' : 'done',
      pct: (end - start) / total,
      msLeft: due - end,
      overdue: false,
      text: late ? `Entregada ${humanSpan(end - due)} tarde` : 'Entregada a tiempo',
    };
  }

  const pct = (now - start) / total;
  const overdue = now > due;
  let level = pct < 0.6 ? 'green' : pct <= 0.9 ? 'yellow' : 'red';
  if (overdue) level = 'red';
  return {
    level,
    pct,
    msLeft: due - now,
    overdue,
    text: overdue ? `Vencida hace ${humanSpan(now - due)}` : `Vence en ${humanSpan(due - now)}`,
  };
}

export function humanSpan(ms) {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / 3_600_000);
  if (d >= 1) return h ? `${d} d ${h} h` : `${d} d`;
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.round(abs / 60_000))} min`;
}

export const SLA_META = {
  green: { label: 'En tiempo', tone: 'ok' },
  yellow: { label: 'En riesgo', tone: 'warn' },
  red: { label: 'Crítica', tone: 'bad' },
  done: { label: 'Cumplida', tone: 'neutral' },
  late: { label: 'Cerrada tarde', tone: 'neutral' },
};
