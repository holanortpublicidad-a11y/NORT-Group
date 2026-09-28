import { PHASES } from './sla.js';

export const ROLES = [
  { id: 'admin', name: 'Administrador' },
  { id: 'ventas', name: 'Vendedor / Cotizador' },
  { id: 'diseno', name: 'Diseñador' },
  { id: 'produccion', name: 'Jefe de Producción' },
  { id: 'instalador', name: 'Instalador' },
  { id: 'contabilidad', name: 'Contador / Facturación' },
  { id: 'compras', name: 'Compras' },
];
export const roleName = (id) => ROLES.find((r) => r.id === id)?.name ?? id;

export const MODULES = [
  { id: 'dashboard', name: 'Panel' },
  { id: 'quotes', name: 'Cotizaciones' },
  { id: 'orders', name: 'Órdenes de trabajo' },
  { id: 'clients', name: 'Clientes' },
  { id: 'sellers', name: 'Vendedores' },
  { id: 'catalog', name: 'Inventario y precios' },
  { id: 'users', name: 'Usuarios y roles' },
];

// 'edit' incluye 'view'. Ausente = sin acceso.
export const ACCESS = {
  admin: Object.fromEntries(MODULES.map((m) => [m.id, 'edit'])),
  ventas: { dashboard: 'view', quotes: 'edit', orders: 'edit', clients: 'edit', sellers: 'view', catalog: 'view' },
  diseno: { dashboard: 'view', orders: 'edit', clients: 'view' },
  produccion: { dashboard: 'view', orders: 'edit', clients: 'view', catalog: 'view' },
  instalador: { dashboard: 'view', orders: 'edit' },
  contabilidad: { dashboard: 'view', quotes: 'view', orders: 'edit', clients: 'edit', sellers: 'view' },
  compras: { dashboard: 'view', orders: 'view', catalog: 'edit' },
};

export function can(role, moduleId, level = 'view') {
  const a = ACCESS[role]?.[moduleId];
  if (!a) return false;
  return level === 'view' ? true : a === 'edit';
}

/** Roles que ven costo interno, utilidad y margen. */
export const canSeeCosts = (role) => ['admin', 'ventas', 'contabilidad', 'compras'].includes(role);

/** ¿Puede este rol mover una OT que está en `phaseId`? */
export function canMovePhase(role, phaseId) {
  if (role === 'admin') return true;
  return PHASES.find((p) => p.id === phaseId)?.owner.includes(role) ?? false;
}
