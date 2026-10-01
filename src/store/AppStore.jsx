import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { CATALOG, CLIENTS, USERS, seed } from '../data/mockData.js';
import { DAY, addBusinessDays, uid } from '../lib/format.js';
import { DEFAULT_SETTINGS } from '../data/legal.js';
import { buildOrderFromQuote, quoteFolio } from '../lib/orders.js';
import { materialNeeds } from '../lib/pricing.js';
import { isClosed } from '../lib/sla.js';
import { clearState, loadState, saveState } from '../lib/storage.js';
import { DEFAULT_ITEMS, DEFAULT_RULES, priceFromMargin } from '../data/inventory.js';
import { migrateF1Params } from '../lib/families/f1-anuncios3d.js';

const AppCtx = createContext(null);

function freshData(clock) {
  const s = seed(clock);
  return {
    users: USERS,
    clients: CLIENTS,
    catalog: structuredClone(CATALOG),
    quotes: s.quotes,
    orders: s.orders,
    counters: { quote: s.nextQuote, order: s.nextOrder },
    movements: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** Mezcla profunda: valores guardados ganan; llaves nuevas vienen de los valores por defecto. */
function withDefaults(def, saved) {
  if (!isObj(def) || !isObj(saved)) return saved === undefined ? def : saved;
  const out = { ...def };
  for (const k of Object.keys(saved)) out[k] = withDefaults(def[k], saved[k]);
  return out;
}

/** Migra datos guardados por versiones anteriores de la app. */
function migrate(saved) {
  const rules = withDefaults(DEFAULT_RULES, saved.catalog?.rules ?? {});
  const known = new Set((saved.catalog?.items ?? []).map((i) => i.id));
  const def = (id) => DEFAULT_ITEMS.find((d) => d.id === id);
  const items = (saved.catalog?.items ?? []).map((i) => {
    if (i.id === 'srv-grua' && /\(d[ií]a\)/i.test(i.name)) return def('srv-grua');
    // herrajes y kit pasan a la categoría Consumibles
    if (/^her-/.test(i.id) && i.category === 'Perfiles y Canales') return { ...i, category: 'Consumibles', ...(i.id === 'her-kit' && /kit/.test(i.name) ? { name: def('her-kit').name } : {}) };
    if ((i.id === 'led-2' || i.id === 'led-3') && !/·/.test(i.name)) return { ...i, name: `${i.name} · blanco puro` };
    return i;
  });
  for (const d of DEFAULT_ITEMS) if (!known.has(d.id)) items.push(d);
  // superficies nuevas (concreto, lámina) y anclaje sugerido por superficie
  const savedSurf = rules.install.surfaces;
  rules.install = {
    ...rules.install,
    surfaces: [
      ...savedSurf.map((x) => ({ anchorId: DEFAULT_RULES.install.surfaces.find((d) => d.id === x.id)?.anchorId ?? 'taquete', ...x })),
      ...DEFAULT_RULES.install.surfaces.filter((d) => !savedSurf.some((x) => x.id === d.id)),
    ],
  };
  const quotes = (saved.quotes ?? []).map((q) => ({
    ...q,
    items: q.items.map((it) => ({
      ...it,
      params: it.family === 'f1' ? migrateF1Params(it.params, rules) : it.params,
      install: it.install ? { equipment: 'andamio', bodies: null, days: 1, hours: null, ...it.install } : it.install,
    })),
  }));
  const clients = (saved.clients ?? []).map((c) => ({
    ...c,
    type: c.type ?? 'cliente',
    contact: { whatsapp: c.contact?.phone ?? '', ...c.contact },
  }));
  // OT: fase "Ventas" anterior → "Sin liberar"; las demás se consideran liberadas
  const orders = (saved.orders ?? []).map((o) => {
    const q = quotes.find((x) => x.id === o.quoteId);
    const legacy = o.phase === 'ventas';
    return {
      ivaEnabled: q?.ivaEnabled !== false,
      advancePct: Number(q?.advancePct) || 50,
      leadDays: Number(q?.leadDays) || 15,
      payments: [],
      releasedAt: legacy ? null : o.createdAt,
      release: legacy
        ? { contractSent: false, contractFile: null, signedConfirmed: false, contractFolio: '', filesShared: false, sharedPath: '' }
        : { contractSent: true, contractFile: null, signedConfirmed: true, contractFolio: 'Previo al sistema', filesShared: true, sharedPath: '' },
      ...o,
      phase: legacy ? 'sin_liberar' : o.phase,
      history: (o.history || []).map((h) => (h.phase === 'ventas' ? { ...h, phase: 'sin_liberar' } : h)),
    };
  });
  return { ...saved, catalog: { items, rules }, quotes, clients, orders, settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) } };
}

function init() {
  const clock = Date.now();
  const stored = loadState();
  const saved = stored ? migrate(stored) : null;
  return {
    clock,
    offsetDays: 0, // simulador de reloj para probar la semaforización
    currentUserId: 'u-admin',
    route: { name: 'dashboard' },
    toasts: [],
    ...(saved ?? freshData(clock)),
    restored: !!saved,
  };
}

const nowOf = (s) => s.clock + s.offsetDays * DAY;
const replace = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));
const upsert = (list, item) => (list.some((x) => x.id === item.id) ? replace(list, item.id, () => item) : [...list, item]);
const toast = (s, text, tone = 'ok') => [...s.toasts, { id: uid('t'), text, tone }];

/** Asigna un valor dentro de un objeto anidado siguiendo una ruta ['f1','fill','letras']. */
function setIn(obj, path, value) {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[k] = setIn(obj?.[k], rest, value);
  return copy;
}

function normalizeItem(it) {
  const cost = Number(it.cost) || 0;
  const price = it.pricing === 'margin' ? Math.round(priceFromMargin(cost, Number(it.targetMargin) || 0) * 100) / 100 : Number(it.price) || 0;
  return { ...it, cost, price };
}

function reducer(s, a) {
  switch (a.type) {
    case 'TICK':
      return { ...s, clock: Date.now() };
    case 'SET_OFFSET':
      return { ...s, offsetDays: a.days };
    case 'SET_USER':
      return { ...s, currentUserId: a.id, route: { name: 'dashboard' } };
    case 'NAV':
      return { ...s, route: a.route };
    case 'TOAST':
      return { ...s, toasts: toast(s, a.text, a.tone) };
    case 'DISMISS':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'RESET': {
      clearState();
      return { ...s, ...freshData(Date.now()), offsetDays: 0, route: { name: 'dashboard' }, toasts: toast(s, 'Datos de ejemplo restablecidos') };
    }

    // ── Clientes / usuarios ──
    case 'SAVE_CLIENT':
      return { ...s, clients: upsert(s.clients, a.client), toasts: toast(s, 'Cliente guardado') };
    case 'NEW_PROSPECT': {
      const c = { ...a.prospect, id: uid('c'), type: 'prospecto', createdAt: nowOf(s) };
      return {
        ...s,
        clients: [...s.clients, c],
        quotes: a.quoteId ? replace(s.quotes, a.quoteId, (q) => ({ ...q, clientId: c.id })) : s.quotes,
        toasts: toast(s, `Prospecto ${c.tradeName} registrado`),
      };
    }
    case 'SET_CLIENT_TYPE':
      return {
        ...s,
        clients: replace(s.clients, a.id, (c) => ({ ...c, type: a.clientType })),
        toasts: toast(s, a.clientType === 'cliente' ? 'Marcado como cliente activo' : 'Marcado como prospecto'),
      };
    case 'SAVE_USER':
      return { ...s, users: upsert(s.users, a.user) };

    // ── Inventario ──
    case 'ITEM_SAVE': {
      const item = normalizeItem(a.item);
      const prev = s.catalog.items.find((i) => i.id === item.id);
      const moves = [...s.movements];
      const delta = (Number(item.stock) || 0) - (Number(prev?.stock) || 0);
      if (item.stock != null && (prev ? delta !== 0 : item.stock > 0)) {
        moves.unshift({ id: uid('mv'), at: nowOf(s), itemId: item.id, name: item.name, unit: item.unit, qty: prev ? delta : item.stock, ref: prev ? 'Ajuste manual' : 'Alta de insumo', by: s.currentUserId });
      }
      return {
        ...s,
        catalog: { ...s.catalog, items: upsert(s.catalog.items, item) },
        movements: moves.slice(0, 300),
        toasts: a.silent ? s.toasts : toast(s, `${item.name} guardado`),
      };
    }
    case 'ITEM_DELETE':
      return { ...s, catalog: { ...s.catalog, items: s.catalog.items.filter((i) => i.id !== a.id) }, toasts: toast(s, 'Insumo eliminado') };
    case 'STOCK_IN': {
      const it = s.catalog.items.find((i) => i.id === a.id);
      if (!it) return s;
      const stock = Math.round(((Number(it.stock) || 0) + a.qty) * 1000) / 1000;
      return {
        ...s,
        catalog: { ...s.catalog, items: replace(s.catalog.items, a.id, (x) => ({ ...x, stock })) },
        movements: [{ id: uid('mv'), at: nowOf(s), itemId: it.id, name: it.name, unit: it.unit, qty: a.qty, ref: a.note || 'Entrada de material', by: s.currentUserId }, ...s.movements].slice(0, 300),
        toasts: toast(s, `Entrada registrada: ${it.name}`),
      };
    }
    case 'RULES_SET':
      return { ...s, catalog: { ...s.catalog, rules: setIn(s.catalog.rules, a.path, a.value) } };

    // ── Cotizaciones ──
    case 'NEW_QUOTE': {
      const now = nowOf(s);
      const me = s.users.find((u) => u.id === s.currentUserId);
      const q = {
        id: quoteFolio(s.counters.quote, new Date(now).getFullYear()),
        title: '',
        clientId: a.clientId ?? s.clients[0]?.id,
        sellerId: me?.role === 'ventas' ? me.id : s.users.find((u) => u.role === 'ventas')?.id,
        createdAt: now,
        leadDays: 15,
        ivaEnabled: true,
        advancePct: s.catalog.rules.params.advancePct,
        validityDays: s.catalog.rules.params.validityDays,
        status: 'Borrador',
        approvedAt: null,
        items: [],
        attachments: [],
        notes: 'Incluye traslado dentro de Cd. Juárez. Permisos municipales no incluidos.',
        orderId: null,
      };
      return { ...s, quotes: [q, ...s.quotes], counters: { ...s.counters, quote: s.counters.quote + 1 }, route: { name: 'quote', id: q.id } };
    }
    case 'SAVE_QUOTE':
      return { ...s, quotes: replace(s.quotes, a.quote.id, () => a.quote) };
    case 'QUOTE_STATUS':
      return {
        ...s,
        quotes: replace(s.quotes, a.id, (q) => ({ ...q, status: a.status })),
        toasts: toast(s, `${a.id} marcada como ${a.status.toLowerCase()}`, a.status === 'Rechazada' ? 'bad' : 'ok'),
      };
    case 'APPROVE_QUOTE': {
      const q = s.quotes.find((x) => x.id === a.id);
      if (!q || q.orderId) return s;
      const now = nowOf(s);
      const client = s.clients.find((c) => c.id === q.clientId);
      const order = buildOrderFromQuote({ quote: q, client, catalog: s.catalog, seq: s.counters.order, now, byUserId: s.currentUserId });
      // Consumo de inventario: se descuenta el material de insumos con stock controlado.
      const needs = materialNeeds(q, s.catalog);
      const moves = [];
      const items = s.catalog.items.map((it) => {
        const need = needs.find((n) => n.itemId === it.id);
        if (!need || it.stock == null) return it;
        moves.push({ id: uid('mv'), at: now, itemId: it.id, name: it.name, unit: it.unit, qty: -Math.round(need.qty * 1000) / 1000, ref: order.id, by: s.currentUserId });
        return { ...it, stock: Math.round((it.stock - need.qty) * 1000) / 1000 };
      });
      return {
        ...s,
        catalog: { ...s.catalog, items },
        movements: [...moves, ...s.movements].slice(0, 300),
        quotes: replace(s.quotes, q.id, (x) => ({ ...x, status: 'Aprobada', approvedAt: now, orderId: order.id })),
        orders: [order, ...s.orders],
        // Conversión automática: el prospecto pasa a cliente al aprobar / generar OT
        clients: replace(s.clients, q.clientId, (c) => (c.type === 'prospecto' ? { ...c, type: 'cliente', convertedAt: now } : c)),
        counters: { ...s.counters, order: s.counters.order + 1 },
        route: { name: 'orders', open: order.id },
        toasts: toast(
          s,
          client?.type === 'prospecto' ? `Cotización aprobada · ${order.id} · ${client.tradeName} ahora es cliente` : `Cotización aprobada · se generó ${order.id}`,
        ),
      };
    }

    // ── IVA: se puede cambiar en la cotización y también después de aprobada (OT) ──
    case 'SET_IVA': {
      const order = s.orders.find((o) => o.id === a.orderId || (a.quoteId && o.quoteId === a.quoteId));
      const quoteId = a.quoteId ?? order?.quoteId;
      return {
        ...s,
        quotes: quoteId ? replace(s.quotes, quoteId, (q) => ({ ...q, ivaEnabled: a.value })) : s.quotes,
        orders: order ? replace(s.orders, order.id, (o) => ({ ...o, ivaEnabled: a.value, history: [...o.history, { phase: o.phase, at: nowOf(s), by: s.currentUserId, note: a.value ? 'Se agregó IVA' : 'Se quitó IVA' }] })) : s.orders,
        toasts: toast(s, a.value ? 'IVA 16% agregado; totales y saldo recalculados' : 'Sin IVA; totales y saldo recalculados'),
      };
    }
    case 'ADD_PAYMENT':
      return {
        ...s,
        orders: replace(s.orders, a.id, (o) => ({ ...o, payments: [...(o.payments || []), { id: uid('pay'), at: nowOf(s), by: s.currentUserId, ...a.payment }] })),
        toasts: toast(s, 'Pago registrado'),
      };
    case 'REMOVE_PAYMENT':
      return { ...s, orders: replace(s.orders, a.id, (o) => ({ ...o, payments: (o.payments || []).filter((p) => p.id !== a.paymentId) })) };

    // ── Liberación de OT ──
    case 'UPDATE_RELEASE':
      return { ...s, orders: replace(s.orders, a.id, (o) => ({ ...o, release: { ...o.release, ...a.patch } })) };
    case 'RELEASE_ORDER': {
      const now = nowOf(s);
      return {
        ...s,
        orders: replace(s.orders, a.id, (o) => {
          const r = o.release || {};
          const ok = (r.contractFile || (r.signedConfirmed && r.contractFolio?.trim())) && r.filesShared;
          if (o.phase !== 'sin_liberar' || !ok) return o;
          return {
            ...o,
            phase: 'diseno',
            releasedAt: now,
            dueDate: addBusinessDays(now, o.leadDays || 15), // SLA en días hábiles desde la liberación
            history: [...o.history, { phase: 'diseno', at: now, by: s.currentUserId, note: 'OT liberada · inicia el semáforo' }],
          };
        }),
        toasts: toast(s, `${a.id} liberada: ya aparece en Diseño, Producción e Instalación`),
      };
    }
    case 'SETTINGS_SET':
      return { ...s, settings: { ...s.settings, ...a.patch } };

    // ── Órdenes de trabajo ──
    case 'UPDATE_ORDER':
      return { ...s, orders: replace(s.orders, a.id, (o) => ({ ...o, ...a.patch })) };
    case 'MOVE_ORDER': {
      const now = nowOf(s);
      return {
        ...s,
        orders: replace(s.orders, a.id, (o) => {
          if (o.phase === a.phase) return o;
          if (o.phase === 'sin_liberar') return o; // solo sale de aquí con RELEASE_ORDER
          const closing = isClosed(a.phase);
          return {
            ...o,
            phase: a.phase,
            closedAt: closing ? (o.closedAt ?? now) : null,
            history: [...o.history, { phase: a.phase, at: now, by: s.currentUserId, note: a.note }],
          };
        }),
      };
    }
    case 'ORDER_NOTE': {
      const now = nowOf(s);
      return {
        ...s,
        orders: replace(s.orders, a.id, (o) => ({ ...o, notes: [...o.notes, { id: uid('n'), at: now, by: s.currentUserId, text: a.text }] })),
      };
    }
    default:
      return s;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [storage, setStorage] = useState('ok');

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'TICK' }), 30_000);
    return () => clearInterval(t);
  }, []);

  // Persistencia en localStorage (con retardo para no escribir en cada tecla)
  useEffect(() => {
    const t = setTimeout(() => setStorage(saveState(state)), 400);
    return () => clearTimeout(t);
  }, [state.users, state.clients, state.catalog, state.quotes, state.orders, state.counters, state.movements, state.settings]);

  const value = useMemo(() => {
    const me = state.users.find((u) => u.id === state.currentUserId);
    return {
      state,
      dispatch,
      me,
      role: me?.role,
      now: nowOf(state),
      storage,
      nav: (route) => dispatch({ type: 'NAV', route }),
      notify: (text, tone) => dispatch({ type: 'TOAST', text, tone }),
      userById: (id) => state.users.find((u) => u.id === id),
      clientById: (id) => state.clients.find((c) => c.id === id),
    };
  }, [state, storage]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
