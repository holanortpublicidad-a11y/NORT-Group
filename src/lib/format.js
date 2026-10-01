export const DAY = 86_400_000;

const money2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export const mxn = (n) => money2.format(Number.isFinite(n) ? n : 0);
export const mxn0 = (n) => money0.format(Number.isFinite(n) ? n : 0);
export const num = (n, d = 2) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(Number.isFinite(n) ? n : 0);

export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDay = (ts) => (ts ? new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—');
export const fmtDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const toInputDate = (ts) => {
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
// La fecha compromiso se toma a las 18:00 (cierre de taller).
export const fromInputDate = (s) => new Date(`${s}T18:00:00`).getTime();

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/** Suma días hábiles (lunes a viernes) y deja la hora a las 18:00 (cierre de taller). */
export function addBusinessDays(ts, days) {
  const d = new Date(ts);
  let left = Math.max(0, Math.round(Number(days) || 0));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  d.setHours(18, 0, 0, 0);
  return d.getTime();
}
