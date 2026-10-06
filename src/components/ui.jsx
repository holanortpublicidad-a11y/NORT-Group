import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { initials } from '../lib/format.js';
import { SLA_META } from '../lib/sla.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-surface-2 hover:text-ink',
  danger: 'bg-surface text-bad border border-line hover:bg-bad/10',
  ok: 'bg-ok text-white border border-transparent hover:brightness-110',
};

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconR, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-10 px-3.5 text-sm',
        BTN[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} />}
      {children}
      {IconR && <IconR size={size === 'sm' ? 15 : 17} strokeWidth={2} />}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, size = 18, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition hover:bg-surface-2 hover:text-ink', className)}
      {...rest}
    >
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

const TONE = {
  neutral: 'bg-surface-2 text-ink-2 border-line',
  accent: 'bg-accent/10 text-accent border-accent/25',
  ok: 'bg-ok/10 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn-ink border-warn/35',
  bad: 'bg-bad/10 text-bad border-bad/30',
};

export function Badge({ tone = 'neutral', className, children, dot }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium', TONE[tone], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  );
}
const DOT = { neutral: 'bg-ink-3', accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' };

export const QUOTE_TONE = { Borrador: 'neutral', Enviada: 'accent', Aprobada: 'ok', Rechazada: 'bad' };

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('rounded-lg border border-line bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}

export function Field({ label, hint, htmlFor, className, children }) {
  return (
    <label htmlFor={htmlFor} className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cx('input', className)} {...rest} />;
}

/** Entrada numérica con unidad (m, cm, %, días). */
export function NumberInput({ value, onChange, unit, step = 'any', min = 0, className, id, ...rest }) {
  return (
    <div className={cx('relative', className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={cx('input tnum font-mono', unit && 'pr-10')}
        {...rest}
      />
      {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-ink-3">{unit}</span>}
    </div>
  );
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx('input appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: CHEVRON }} {...rest}>
      {children}
    </select>
  );
}
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Textarea({ className, ...rest }) {
  return <textarea className={cx('input min-h-[80px] resize-y', className)} {...rest} />;
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div role="tablist" className={cx('inline-flex rounded-md border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-[13px] font-medium transition',
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
            )}
          >
            {Icon && <Icon size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Diálogo: centrado en escritorio, hoja inferior en móvil. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'md:max-w-md', md: 'md:max-w-2xl', lg: 'md:max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgb(8_10_15/0.55)]" onClick={onClose} />
      <div className={cx('relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-line bg-surface shadow-2xl md:rounded-xl', w)}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight tracking-wide">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Cerrar" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Panel lateral (detalle). Pantalla completa en móvil. */
export function Sheet({ open, onClose, title, subtitle, headerExtra, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgb(8_10_15/0.45)]" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col border-l border-line bg-bg shadow-2xl md:max-w-[640px]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold leading-tight tracking-wide">{title}</h2>
            {subtitle && <div className="mt-1 text-[13px] text-ink-3">{subtitle}</div>}
            {headerExtra}
          </div>
          <IconButton icon={X} label="Cerrar" onClick={onClose} className="-mr-2" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="pb-safe flex flex-wrap gap-2 border-t border-line bg-surface px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 28, className }) {
  if (!name) return null;
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <span
      title={name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full border-2 border-surface font-mono font-medium text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 42% 44%)` }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 24 }) {
  const list = names.filter(Boolean);
  if (!list.length) return <span className="text-xs text-ink-3">Sin asignar</span>;
  return (
    <span className="flex -space-x-1.5">
      {list.slice(0, 4).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
    </span>
  );
}

export function SlaPill({ sla, compact }) {
  const meta = SLA_META[sla.level];
  return (
    <Badge tone={meta.tone} dot>
      {compact || sla.level === 'pending' ? (sla.level === 'pending' ? 'Semáforo detenido' : meta.label) : `${meta.label} · ${Math.round(sla.pct * 100)}%`}
    </Badge>
  );
}

const BAR = { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-bad', done: 'bg-ink-3', late: 'bg-ink-3' };
export function SlaBar({ sla, className }) {
  const pct = Math.min(100, Math.max(2, sla.pct * 100));
  return (
    <div className={cx('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className={cx('h-full rounded-full', BAR[sla.level])} style={{ width: `${pct}%` }} />
      <span className="absolute inset-y-0 w-px bg-ink-3/50" style={{ left: '60%' }} />
      <span className="absolute inset-y-0 w-px bg-ink-3/50" style={{ left: '90%' }} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-[28px] font-semibold leading-none tracking-wide md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon && <Icon size={28} className="text-ink-3" />}
      <div className="font-medium">{title}</div>
      {children && <div className="max-w-sm text-[13px] text-ink-3">{children}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, icon: Icon, id }) {
  return (
    <div className="relative min-w-0 flex-1">
      {Icon && <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />}
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx('input', Icon && 'pl-9')} />
    </div>
  );
}

export async function copyText(text, onDone) {
  try {
    await navigator.clipboard.writeText(text);
    onDone?.(true);
  } catch {
    onDone?.(false);
  }
}

/** Casilla con etiqueta. */
export function Check({ id, label, checked, onChange, disabled, hint }) {
  return (
    <label htmlFor={id} className={cx('flex items-start gap-2.5 text-[13px]', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <input id={id} type="checkbox" disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-ink">{label}</span>
        {hint && <span className="block text-[11.5px] text-ink-3">{hint}</span>}
      </span>
    </label>
  );
}

/** Copia del documento montada directo en <body> para imprimir sin la interfaz. */
export function PrintPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="print-only">{children}</div>, document.body);
}

/** Interruptor accesible (role="switch"). */
export function Switch({ id, checked, onChange, label, hint, disabled }) {
  return (
    <label htmlFor={id} className={cx('flex items-center justify-between gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {hint && <span className="block text-[11.5px] text-ink-3">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

/** Abre el diálogo de impresión con el nombre de archivo sugerido (el navegador lo usa al "Guardar como PDF"). */
export function printDocument(fileName) {
  const prev = document.title;
  const restore = () => {
    document.title = prev;
    window.removeEventListener('afterprint', restore);
  };
  if (fileName) document.title = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 60_000);
}
