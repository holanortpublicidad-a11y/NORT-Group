// Persistencia en localStorage. Todo acceso va en try/catch: el almacenamiento puede
// estar bloqueado (modo privado) o lleno (archivos adjuntos grandes).
const KEY = 'cota-erp:v2';
const PERSISTED = ['users', 'clients', 'catalog', 'quotes', 'orders', 'counters', 'movements', 'settings'];

export function loadState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) return null;
    return data.state;
  } catch {
    return null;
  }
}

/** Devuelve 'ok' | 'full' | 'unavailable' */
export function saveState(state) {
  try {
    const slice = Object.fromEntries(PERSISTED.map((k) => [k, state[k]]));
    window.localStorage.setItem(KEY, JSON.stringify({ version: 2, savedAt: Date.now(), state: slice }));
    return 'ok';
  } catch (e) {
    return e && (e.name === 'QuotaExceededError' || e.code === 22) ? 'full' : 'unavailable';
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export function storageUsageKB() {
  try {
    return Math.round(((window.localStorage.getItem(KEY) || '').length * 2) / 1024);
  } catch {
    return 0;
  }
}
