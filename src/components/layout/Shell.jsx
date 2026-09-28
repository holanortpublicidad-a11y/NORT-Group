import React, { useEffect, useState } from 'react';
import {
  BadgePercent,
  Building2,
  FileText,
  Kanban,
  LayoutDashboard,
  Package,
  Menu,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { MODULES, can, roleName } from '../../lib/permissions.js';
import { Avatar, IconButton, Select, cx } from '../ui.jsx';
import { COMPANY } from '../../config.js';

const ICONS = {
  dashboard: LayoutDashboard,
  quotes: FileText,
  orders: Kanban,
  clients: Building2,
  sellers: BadgePercent,
  catalog: Package,
  users: ShieldCheck,
};
const SHORT = { dashboard: 'Panel', quotes: 'Cotizar', orders: 'OTs', clients: 'Clientes', sellers: 'Vendedores', catalog: 'Inventario', users: 'Usuarios' };

// Qué módulo resalta cada ruta
const ROUTE_MODULE = { quote: 'quotes', dashboard: 'dashboard', quotes: 'quotes', orders: 'orders', clients: 'clients', sellers: 'sellers', catalog: 'catalog', users: 'users' };

function useTheme() {
  const [mode, setMode] = useState(() => document.documentElement.getAttribute('data-theme') || 'system');
  useEffect(() => {
    const el = document.documentElement;
    if (mode === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', mode);
  }, [mode]);
  const next = () => setMode((m) => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system'));
  return { mode, next };
}
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };
const THEME_LABEL = { system: 'Tema del sistema', light: 'Modo claro', dark: 'Modo oscuro' };

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Marca: una "cota" (línea de dimensión) */}
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="28" height="28" rx="6" fill="rgb(var(--accent))" />
        <path d="M7 11v8M23 11v8M7 15h16" stroke="rgb(var(--accent-ink))" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M10 13l-3 2 3 2M20 13l3 2-3 2" stroke="rgb(var(--accent-ink))" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-[20px] font-bold tracking-wide">COTA ERP</div>
        <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-3">Señalética · Letras 3D</div>
      </div>
    </div>
  );
}

function UserSwitcher({ compact }) {
  const { state, dispatch, me } = useApp();
  return (
    <div className={cx('flex items-center gap-2.5', compact && 'w-full')}>
      <Avatar name={me?.name} size={34} />
      <div className="min-w-0 flex-1">
        <label htmlFor={compact ? 'user-m' : 'user-d'} className="eyebrow block">
          Sesión (simular rol)
        </label>
        <Select
          id={compact ? 'user-m' : 'user-d'}
          value={state.currentUserId}
          onChange={(e) => dispatch({ type: 'SET_USER', id: e.target.value })}
          className="mt-0.5 h-8 border-0 bg-transparent px-0 py-0 text-[13px] font-medium focus:ring-0"
        >
          {state.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {roleName(u.role)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export default function Shell({ children }) {
  const { state, role, nav } = useApp();
  const theme = useTheme();
  const [drawer, setDrawer] = useState(false);
  const modules = MODULES.filter((m) => can(role, m.id));
  const activeModule = ROUTE_MODULE[state.route.name];
  const ThemeIcon = THEME_ICON[theme.mode];
  const primary = modules.slice(0, 4);
  const go = (id) => {
    nav({ name: id });
    setDrawer(false);
  };

  return (
    <div className="min-h-full md:flex">
      {/* ── Sidebar escritorio ── */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 pb-4 pt-5">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Módulos">
          <div className="eyebrow px-2 pb-2">Módulos</div>
          <ul className="flex flex-col gap-0.5">
            {modules.map((m) => {
              const Icon = ICONS[m.id];
              const active = activeModule === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => go(m.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[14px] transition',
                      active ? 'bg-accent/10 font-medium text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    {m.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
          <UserSwitcher />
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-ink-3">{COMPANY.name}</span>
            <IconButton icon={ThemeIcon} label={THEME_LABEL[theme.mode]} onClick={theme.next} />
          </div>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar móvil */}
        <header
          className="sticky z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden"
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
        >
          <Brand />
          <div className="flex items-center gap-1">
            <IconButton icon={ThemeIcon} label={THEME_LABEL[theme.mode]} onClick={theme.next} />
            <button type="button" onClick={() => setDrawer(true)} aria-label="Cambiar usuario">
              <Avatar name={state.users.find((u) => u.id === state.currentUserId)?.name} size={32} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-7">{children}</main>
      </div>

      {/* ── Bottom bar móvil ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navegación principal"
      >
        <ul className="grid-cols-1 grid" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map((m) => {
            const Icon = ICONS[m.id];
            const active = activeModule === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => go(m.id)}
                  className={cx('flex w-full flex-col items-center gap-0.5 py-2 text-[11px]', active ? 'text-accent' : 'text-ink-3')}
                >
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                  {SHORT[m.id]}
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] text-ink-3">
              <Menu size={21} strokeWidth={1.8} />
              Más
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Drawer móvil ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[rgb(8_10_15/0.5)]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Menú</span>
              <IconButton icon={X} label="Cerrar" onClick={() => setDrawer(false)} />
            </div>
            <div className="mb-4 rounded-lg border border-line p-3">
              <UserSwitcher compact />
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {modules.map((m) => {
                const Icon = ICONS[m.id];
                const active = activeModule === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => go(m.id)}
                      className={cx(
                        'flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-lg border text-[12px]',
                        active ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line text-ink-2',
                      )}
                    >
                      <Icon size={20} />
                      {SHORT[m.id]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function Toasts() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    if (!state.toasts.length) return;
    const t = setTimeout(() => dispatch({ type: 'DISMISS', id: state.toasts[0].id }), 3800);
    return () => clearTimeout(t);
  }, [state.toasts, dispatch]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
      {state.toasts.map((t) => {
        const Icon = t.tone === 'bad' ? AlertTriangle : CheckCircle2;
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[13.5px] shadow-xl">
            <Icon size={18} className={t.tone === 'bad' ? 'text-bad' : 'text-ok'} />
            {t.text}
          </div>
        );
      })}
    </div>
  );
}
