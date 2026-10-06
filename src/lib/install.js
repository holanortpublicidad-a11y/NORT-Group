import { installPlan } from './families/common.js';
import { num } from './format.js';

/** Orden de instalación: lo que le importa al instalador (sitio, pared, qué llevar, pasos, imprevistos). */

export const WALL_STATES = [
  { id: 'por_revisar', name: 'Por revisar' },
  { id: 'firme', name: 'Firme y pareja' },
  { id: 'irregular', name: 'Irregular / desplomada' },
  { id: 'fisuras', name: 'Con fisuras o suelta' },
  { id: 'humedad', name: 'Con humedad / salitre' },
];
export const POWER_STATES = [
  { id: 'por_revisar', name: 'Por revisar' },
  { id: 'lista', name: 'Lista a ≤ 1.20 m del punto' },
  { id: 'lejos', name: 'Hay, pero a más de 1.20 m' },
  { id: 'no_hay', name: 'No hay preparación eléctrica' },
  { id: 'no_aplica', name: 'No aplica (sin luz)' },
];
export const PERMIT_STATES = [
  { id: 'por_revisar', name: 'Por revisar' },
  { id: 'no_requiere', name: 'No requiere' },
  { id: 'tramitado', name: 'Tramitado / autorizado' },
  { id: 'pendiente', name: 'Pendiente (cliente)' },
];
export const INSTALL_STATUS = [
  { id: 'pendiente', name: 'Por programar', tone: 'neutral' },
  { id: 'programada', name: 'Programada', tone: 'accent' },
  { id: 'en_sitio', name: 'En sitio', tone: 'warn' },
  { id: 'reprogramar', name: 'Reprogramar', tone: 'bad' },
  { id: 'instalada', name: 'Instalada', tone: 'ok' },
];

export const DEFAULT_STEPS = [
  'Revisar la orden y cargar todo lo de la lista antes de salir',
  'Llegar, presentarse con el contacto y delimitar el área (conos y cinta)',
  'Tomar fotos del muro y del área ANTES de tocar nada',
  'Confirmar medidas, altura y posición con el cliente (presentar plantilla o pieza)',
  'Trazar a nivel y marcar barrenos',
  'Barrenar, colocar anclajes y fijar el anuncio',
  'Conectar a la preparación eléctrica y acomodar/ocultar cableado',
  'Probar encendido completo y revisar que no haya sombras ni módulos apagados',
  'Sellar perforaciones y cantos, limpiar el anuncio y el área',
  'Tomar fotos del resultado (de día y con luz encendida si aplica)',
  'Explicar cuidados y garantía; recabar firma de conformidad',
];

/** Situaciones que pueden ocurrir en sitio y qué hacer en cada una. */
export const SCENARIOS = [
  { id: 'sin_luz', name: 'No hay preparación eléctrica o está a más de 1.20 m', client: true, todo: 'No improvisar la conexión. Instalar solo si el cliente lo autoriza por escrito dejando el anuncio sin conectar; si no, suspender. Foto del punto y avisar a Ventas: aplica cargo por falsa salida.' },
  { id: 'muro', name: 'El muro no es apto (suelto, hueco, húmedo o distinto a lo cotizado)', client: true, todo: 'No fijar. Fotos de cerca y de lejos, anotar qué material es en realidad y avisar a Producción para definir otro anclaje o refuerzo. Reprogramar.' },
  { id: 'acceso', name: 'No dan acceso, falta permiso de plaza o el horario no está autorizado', client: true, todo: 'Pedir el nombre de quien niega el acceso, tomar foto/evidencia de la hora de llegada y avisar a Ventas. Aplica cargo por falsa salida.' },
  { id: 'ausente', name: 'El cliente o el contacto no está en el sitio', client: true, todo: 'Llamar al contacto y al asesor. Esperar 20 minutos; si nadie puede recibir ni autorizar posición, reprogramar con evidencia de la llamada.' },
  { id: 'clima', name: 'Lluvia, viento fuerte o tormenta eléctrica', client: false, todo: 'No subir a escalera, andamio ni grúa. Resguardar el anuncio y reprogramar; no genera cargo para el cliente.' },
  { id: 'medidas', name: 'Las medidas o la posición no coinciden con el montaje', client: false, todo: 'No barrenar. Enviar foto con flexómetro a Diseño y al asesor; esperar confirmación por escrito de la nueva posición.' },
  { id: 'danio', name: 'Una pieza llegó dañada o falla al probar', client: false, todo: 'Foto del daño. Si es reparable en sitio sin que se note, reparar y anotarlo; si no, instalar lo demás y reportar la pieza a Producción para reposición.' },
  { id: 'faltante', name: 'Falta herramienta, anclaje o material', client: false, todo: 'Anotar exactamente qué faltó para corregir la lista de carga. Conseguirlo solo si no retrasa más de una hora; si no, reprogramar.' },
  { id: 'riesgo', name: 'Cables de CFE cerca, sin punto de anclaje para arnés u otro riesgo', client: false, todo: 'Detener el trabajo. La seguridad va primero: avisar a Producción y no continuar hasta tener el equipo o el libramiento adecuado.' },
  { id: 'otro', name: 'Otra situación', client: false, todo: 'Describir qué pasó, con fotos, y avisar al jefe de producción.' },
];

/** Datos de instalación tomados de la cotización aprobada. */
export function installFacts(order, rules) {
  const lines = (order.lines || []).filter((l) => l.install);
  const surfaces = [];
  const anchors = [];
  let maxH = 0;
  let plan = null;
  let m2 = 0;
  for (const l of lines) {
    const s = rules.install.surfaces.find((x) => x.id === l.install.surfaceId) ?? rules.install.surfaces[0];
    const a = (rules.install.anchors || []).find((x) => x.id === (l.install.anchorId || s.anchorId));
    if (!surfaces.some((x) => x.id === s.id)) surfaces.push(s);
    if (a && !anchors.some((x) => x.id === a.id)) anchors.push(a);
    const h = Number(l.install.heightM) || 0;
    if (h >= maxH) {
      maxH = h;
      plan = installPlan(rules, l.install);
    }
    m2 += (l.bom || []).filter((b) => b.role === 'Instalación').reduce((t, b) => t + b.qty, 0);
  }
  const bom = (order.lines || []).flatMap((l) => l.bom || []);
  const psu = bom.filter((b) => b.role === 'Fuentes de poder');
  const lit = bom.some((b) => b.role === 'Iluminación');
  return { lines, surfaces, anchors, maxH, plan, m2, psu, lit, hasInstall: lines.length > 0 };
}

/** Lista de carga sugerida: se arma con superficie, anclaje, altura y si lleva luz. */
export function buildPackList(order, rules) {
  const f = installFacts(order, rules);
  const out = [];
  const add = (group, label, qty = '') => out.push({ id: `${group}-${out.length}`, group, label, qty, done: false });
  const sIds = f.surfaces.map((s) => s.id);
  const aIds = f.anchors.map((a) => a.id);

  for (const l of order.lines || []) if (l.install) add('El anuncio', l.label || l.summary, '');
  if (f.lit) add('El anuncio', 'Fuentes de poder ya montadas / por conectar', f.psu.map((p) => `${num(p.qty, 0)} × ${p.name.replace(/Fuente de poder\s*/i, '')}`).join(', '));

  if (!f.plan || f.plan.ladder) add('Acceso y altura', `Escalera de extensión o tijera para ${num(f.maxH || 3, 1)} m`, '1');
  else if (f.plan.equipment === 'andamio') {
    add('Acceso y altura', 'Andamio (cuerpos)', `${f.plan.bodies}`);
    add('Acceso y altura', 'Tablones, crucetas, bases niveladoras y ruedas con freno', '');
  } else add('Acceso y altura', `Grúa boom contratada: confirmar hora de llegada y espacio de maniobra`, `${num(f.plan.hours, 1)} h`);

  add('Seguridad', 'Casco, guantes y lentes', '1 por persona');
  if (f.maxH > 1.8) add('Seguridad', 'Arnés con línea de vida', '1 por persona');
  add('Seguridad', 'Conos y cinta de precaución', '');

  add('Herramienta', 'Taladro / rotomartillo con baterías cargadas', '');
  if (sIds.some((x) => ['block', 'concreto'].includes(x))) add('Herramienta', 'Brocas para concreto (1/4" y 3/8")', '');
  if (sIds.some((x) => ['acm', 'lamina', 'metal'].includes(x))) add('Herramienta', 'Brocas para metal y avellanador', '');
  if (sIds.includes('tablaroca')) add('Herramienta', 'Detector de postes y broca para tablaroca', '');
  if (sIds.includes('vidrio')) add('Herramienta', 'Limpiador, alcohol isopropílico, espátula y plantilla de posición', '');
  if (aIds.includes('remache')) add('Herramienta', 'Remachadora', '');
  if (aIds.includes('soldadura')) add('Herramienta', 'Soldadora, careta y electrodos', '');
  add('Herramienta', 'Nivel (láser o de burbuja), flexómetro, lápiz y plomada', '');
  add('Herramienta', 'Plantilla de barrenos a escala real', '');
  add('Herramienta', 'Desarmadores, llaves, pinzas y martillo de goma', '');

  const nAnch = Math.max(4, Math.ceil(f.m2 * 6));
  for (const a of f.anchors) add('Fijación', a.name, `aprox. ${nAnch} + 20% extra`);
  if (!f.anchors.length) add('Fijación', 'Anclajes según el muro', '');
  add('Fijación', 'Silicón / sellador para exterior y pistola', '1');

  if (f.lit) {
    add('Eléctrico', 'Cable uso rudo y conectores / capuchones', '');
    add('Eléctrico', 'Cinta aislante, multímetro y extensión de 20 m', '');
  }
  add('Acabado', 'Trapos, limpiador y pintura de retoque', '');
  add('Documentos', 'Orden de instalación y acta de entrega para firma', '');
  return out;
}

export function newInstallation(order, rules) {
  return {
    status: 'pendiente',
    mapsUrl: '',
    schedule: '',
    window: '',
    siteContact: '',
    sitePhone: '',
    vehicle: '',
    survey: { done: false, wall: 'por_revisar', surfaceOk: false, power: installFacts(order, rules).lit ? 'por_revisar' : 'no_aplica', permits: 'por_revisar', obstacles: '', removeOld: false, access: '', notes: '' },
    photosBefore: [],
    pack: buildPackList(order, rules),
    steps: DEFAULT_STEPS.map((label, i) => ({ id: `s${i}`, label, done: false })),
    incidents: [],
    photosAfter: [],
    powerTested: false,
    receivedBy: '',
    finishedAt: null,
  };
}

/** Pendientes que impiden salir a instalar. */
export function installBlockers(inst) {
  const s = inst.survey || {};
  const b = [];
  if (!s.done) b.push('Falta el levantamiento del sitio');
  if (['irregular', 'fisuras', 'humedad'].includes(s.wall)) b.push('El muro necesita atención antes de fijar');
  if (s.wall === 'por_revisar') b.push('Confirmar estado del muro');
  if (['lejos', 'no_hay', 'por_revisar'].includes(s.power)) b.push('Preparación eléctrica no confirmada a ≤ 1.20 m');
  if (['pendiente', 'por_revisar'].includes(s.permits)) b.push('Permisos / accesos sin confirmar');
  if (!inst.schedule) b.push('Sin fecha y hora programadas');
  return b;
}

/** Enlace de Google Maps: el pegado por el usuario (solo http/https) o una búsqueda por la dirección. */
export const mapsLink = (order) => {
  const u = (order.installation?.mapsUrl || '').trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.installAddress || '')}`;
};
