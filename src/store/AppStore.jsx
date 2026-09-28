import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { CATALOG, CLIENTS, USERS, seed } from '../data/mockData.js';
import { DAY, uid } from '../lib/format.js';
import { buildOrderFromQuote, quoteFolio } from '../lib/orders.js';
import { materialNeeds } from '../lib/pricing.js';
import { isClosed } from '../lib/sla.js';
import { clearState, loadState, saveState } from '../lib/storage.js';
import { priceFromMargin } from '../data/inventory.js';

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
  };
}

function init() {
  const clock = Date.now();
  const saved = loadState();
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
        leadDays: 10,
        advancePct: s.catalog.rules.params.advancePct,
        validityDays: s.catalog.rules.params.validityDays,
        status: 'Borrador',
        approvedAt: null,
        items: [],
        attachments: [],
        notes: 'Precios más IVA. Incluye traslado dentro de Cd. Juárez. Permisos municipales no incluidos.',
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
        counters: { ...s.counters, order: s.counters.order + 1 },
        route: { name: 'orders', open: order.id },
        toasts: toast(s, `Cotización aprobada · se generó ${order.id}`),
      };
    }

    // ── Órdenes de trabajo ──
    case 'UPDATE_ORDER':
      return { ...s, orders: replace(s.orders, a.id, (o) => ({ ...o, ...a.patch })) };
    case 'MOVE_ORDER': {
      const now = nowOf(s);
      return {
        ...s,
        orders: replace(s.orders, a.id, (o) => {
          if (o.phase === a.phase) return o;
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
  }, [state.users, state.clients, state.catalog, state.quotes, state.orders, state.counters, state.movements]);

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
