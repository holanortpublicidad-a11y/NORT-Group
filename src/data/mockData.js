import { DAY } from '../lib/format.js';
import { newLineItem } from '../lib/pricing.js';
import { DEFAULT_ITEMS, DEFAULT_RULES } from './inventory.js';
import { migrateF1Params, newElement } from '../lib/families/f1-anuncios3d.js';
import { buildOrderFromQuote, quoteFolio } from '../lib/orders.js';
import { PHASES } from '../lib/sla.js';

// ── Usuarios (incluye vendedores con comisión y meta) ────────────────────────
export const USERS = [
  { id: 'u-admin', name: 'Ulises López', role: 'admin', email: 'direccion@cota.mx' },
  { id: 'u-mariana', name: 'Mariana Ortiz', role: 'ventas', email: 'mariana@cota.mx', commissionPct: 5, monthlyGoal: 350000 },
  { id: 'u-jorge', name: 'Jorge Salcedo', role: 'ventas', email: 'jorge@cota.mx', commissionPct: 4.5, monthlyGoal: 280000 },
  { id: 'u-daniela', name: 'Daniela Ruiz', role: 'diseno', email: 'daniela@cota.mx' },
  { id: 'u-ivan', name: 'Iván Chávez', role: 'diseno', email: 'ivan@cota.mx' },
  { id: 'u-roberto', name: 'Roberto Méndez', role: 'produccion', email: 'produccion@cota.mx' },
  { id: 'u-luis', name: 'Luis Arriaga', role: 'instalador', email: 'luis@cota.mx' },
  { id: 'u-pedro', name: 'Pedro Sáenz', role: 'instalador', email: 'pedro@cota.mx' },
  { id: 'u-karla', name: 'Karla Villalobos', role: 'contabilidad', email: 'facturacion@cota.mx' },
  { id: 'u-andres', name: 'Andrés Nava', role: 'compras', email: 'compras@cota.mx' },
];

export const TEAMS = ['Herrería', 'Acrílicos y router CNC', 'Impresión digital', 'Electricidad / LED', 'Pintura automotriz', 'Rotulación y vinil'];

// ── Clientes ─────────────────────────────────────────────────────────────────
export const CLIENTS = [
  {
    id: 'c-fdvn',
    type: 'cliente',
    legalName: 'Farmacias Del Valle Norte S.A. de C.V.',
    tradeName: 'Farmacias Del Valle',
    rfc: 'FVN190312AB4',
    contact: { name: 'Lic. Sandra Pérez', phone: '656 214 3380', whatsapp: '656 214 3380', email: 'compras@delvallenorte.mx' },
    fiscalAddress: 'Av. de las Torres 2210, Col. Galeana, Cd. Juárez, Chih. C.P. 32575',
    installAddress: 'Blvd. Zaragoza 7780, Suc. 14, Cd. Juárez, Chih.',
  },
  {
    id: 'c-paso',
    type: 'cliente',
    legalName: 'Grupo Restaurantero Paso Real S. de R.L. de C.V.',
    tradeName: 'Paso Real Cocina Norteña',
    rfc: 'GRP170804H21',
    contact: { name: 'Arq. Fernando Loya', phone: '656 330 1212', whatsapp: '656 330 1212', email: 'fernando.loya@pasoreal.mx' },
    fiscalAddress: 'Av. Gómez Morín 9100, Col. Partido Senecú, Cd. Juárez, Chih. C.P. 32459',
    installAddress: 'Av. Gómez Morín 9100, fachada norte, Cd. Juárez, Chih.',
  },
  {
    id: 'c-sonrisa',
    type: 'cliente',
    legalName: 'Clínica Dental Sonrisa Juárez S.C.',
    tradeName: 'Sonrisa Juárez',
    rfc: 'CDS200115QW9',
    contact: { name: 'Dra. Paola Núñez', phone: '656 611 4040', whatsapp: '656 611 4040', email: 'contacto@sonrisajuarez.mx' },
    fiscalAddress: 'Calle Paseo Triunfo de la República 3530, Cd. Juárez, Chih. C.P. 32330',
    installAddress: 'Paseo Triunfo de la República 3530, local 5, Cd. Juárez, Chih.',
  },
  {
    id: 'c-lofi',
    type: 'cliente',
    legalName: 'Logística Fronteriza Integral S.A. de C.V.',
    tradeName: 'LOFI',
    rfc: 'LFI150923KP3',
    contact: { name: 'Ing. Héctor Robles', phone: '656 789 2201', whatsapp: '656 789 2201', email: 'hrobles@lofi.com.mx' },
    fiscalAddress: 'Parque Industrial Omega, Nave 7, Cd. Juárez, Chih. C.P. 32575',
    installAddress: 'Parque Industrial Omega, Nave 7, acceso principal, Cd. Juárez, Chih.',
  },
  {
    id: 'c-medanos',
    type: 'cliente',
    legalName: 'Ana Lucía Terrazas Olivas',
    tradeName: 'Café Médanos',
    rfc: 'TEOA880412MN5',
    contact: { name: 'Ana Lucía Terrazas', phone: '656 402 7788', whatsapp: '656 402 7788', email: 'hola@cafemedanos.mx' },
    fiscalAddress: 'Calle Ignacio Mejía 214, Centro, Cd. Juárez, Chih. C.P. 32000',
    installAddress: 'Calle Ignacio Mejía 214, Centro, Cd. Juárez, Chih.',
  },
  {
    id: 'c-pollo',
    type: 'prospecto',
    legalName: 'Pollo Sinaloa Las Torres',
    tradeName: 'Pollo Sinaloa',
    rfc: '',
    contact: { name: 'Ramón Quiñónez', phone: '656 120 4455', whatsapp: '656 120 4455', email: 'pollosinaloa.torres@gmail.com' },
    fiscalAddress: '',
    installAddress: 'Av. de las Torres 1880, Cd. Juárez, Chih.',
  },
  {
    id: 'c-titan',
    type: 'prospecto',
    legalName: 'Gimnasio Titán',
    tradeName: 'Gimnasio Titán',
    rfc: '',
    contact: { name: 'Karen Holguín', phone: '656 377 9012', whatsapp: '656 377 9012', email: 'karen@titangym.mx' },
    fiscalAddress: '',
    installAddress: 'Blvd. Tomás Fernández 7420, Cd. Juárez, Chih.',
  },
];

// ── Catálogo: inventario + reglas del cotizador ─────────────────────────────
export const CATALOG = { items: DEFAULT_ITEMS, rules: DEFAULT_RULES };

// ── Semilla: cotizaciones y OTs de ejemplo, relativas a "ahora" ─────────────
function line(family, params = {}, extra = {}) {
  const base = newLineItem(family, CATALOG);
  const merged = family === 'f1' && params.modality ? migrateF1Params({ ...params }, CATALOG.rules) : { ...base.params, ...params };
  return {
    ...base,
    ...extra,
    params: merged,
    install: { ...base.install, ...(extra.install || {}) },
  };
}

export function seed(now) {
  const year = new Date(now).getFullYear();
  const NOTE = 'Precios más IVA. Incluye traslado dentro de Cd. Juárez. Permisos municipales no incluidos.';
  const Q = [
    {
      n: 126, clientId: 'c-paso', sellerId: 'u-jorge', title: 'Vitrinas con microperforado', ago: 34, lead: 8,
      items: [line('f2', { baseType: 'flexible', materialId: 'vin-micro', width: 2.4, height: 1.2, qty: 2, laminado: 'sin', refile: true }, { install: { surfaceId: 'vidrio', heightM: 2 } })],
      order: { phase: 'facturado', closedAfter: 7, designerId: 'u-ivan', teams: ['Impresión digital'], installerIds: ['u-pedro'] },
    },
    {
      n: 129, clientId: 'c-fdvn', sellerId: 'u-mariana', title: 'Rótulo ACM sucursal 14', ago: 22, lead: 15,
      items: [line('f2', { baseType: 'rigido', materialId: 'rig-acm3', graphic: 'vinil', width: 6, height: 1.5, qty: 1, laminado: 'mate' }, { install: { surfaceId: 'block', heightM: 4 } })],
      order: { phase: 'concluido', closedAfter: 13, designerId: 'u-daniela', teams: ['Herrería', 'Rotulación y vinil'], installerIds: ['u-luis'] },
    },
    {
      n: 133, clientId: 'c-paso', sellerId: 'u-jorge', title: 'Letras halo fachada norte', ago: 19, lead: 20,
      items: [
        line('f1', { modality: 'letras', light: 'indirecta', text: 'PASO REAL', letterCount: 8, width: 3.6, height: 0.45, frenteId: 'rig-alu', rotCoverage: 0, silvatrim: false }, { label: 'Fachada norte', install: { surfaceId: 'block', heightM: 7 } }),
      ],
      order: { phase: 'instalacion', designerId: 'u-ivan', teams: ['Acrílicos y router CNC', 'Electricidad / LED'], installerIds: ['u-luis', 'u-pedro'] },
    },
    {
      n: 131, clientId: 'c-fdvn', sellerId: 'u-mariana', title: 'Caja de luz Blvd. Zaragoza', ago: 9, lead: 14,
      items: [line('f1', { modality: 'caja_rect', light: 'directa', width: 4.8, height: 1.2 }, { label: 'Marquesina', install: { surfaceId: 'acm', heightM: 5 } })],
      order: { phase: 'fabricacion', designerId: 'u-daniela', teams: ['Herrería', 'Electricidad / LED'], installerIds: ['u-luis'] },
    },
    {
      n: 137, clientId: 'c-lofi', sellerId: 'u-mariana', title: 'Letras corporativas nave 7', ago: 16, lead: 12,
      items: [line('f1', { modality: 'letras', light: 'indirecta', text: 'LOFI', letterCount: 4, width: 3.2, height: 0.9, frenteId: 'rig-acm3', rotCoverage: 0, silvatrim: false }, { install: { surfaceId: 'metal', heightM: 8 } })],
      order: { phase: 'fabricacion', designerId: 'u-ivan', teams: ['Acrílicos y router CNC', 'Pintura automotriz'], installerIds: ['u-pedro'] },
    },
    {
      n: 136, clientId: 'c-lofi', sellerId: 'u-jorge', title: 'Lona perimetral de patio', ago: 5, lead: 7,
      items: [line('f3', { lonaId: 'lona-mesh', width: 12, height: 3, structure: 'bastidor' }, { install: { surfaceId: 'metal', heightM: 9 } })],
      order: { phase: 'produccion', designerId: 'u-daniela', teams: ['Impresión digital', 'Herrería'], installerIds: [] },
    },
    {
      n: 135, clientId: 'c-sonrisa', sellerId: 'u-mariana', title: 'Vitrinas esmeriladas y horario', ago: 1, lead: 10,
      items: [
        line('f2', { baseType: 'flexible', materialId: 'vin-esmerilado', width: 3.2, height: 1.1, qty: 2, refile: false, troquel: true }, { install: { surfaceId: 'vidrio', heightM: 2.2 } }),
        line('f7', { itemId: 'srv-diseno', qty: 1 }),
      ],
      order: { phase: 'diseno', designerId: 'u-daniela', teams: [], installerIds: [] },
    },
    {
      n: 138, clientId: 'c-medanos', sellerId: 'u-jorge', title: 'Letrero principal y señalética', ago: 0.2, lead: 12,
      items: [
        line('f1', { modality: 'letras', light: 'directa', text: 'MÉDANOS', letterCount: 7, width: 2.1, height: 0.3, rotId: 'vin-corte-tras', rotCoverage: 100 }, { install: { surfaceId: 'block', heightM: 3.5 } }),
        line('f5', { substrate: 'rigido', materialId: 'rig-acr-cristal', width: 0.3, height: 0.4, qty: 2, graphic: 'impreso', mounting: 'pernos' }, { label: 'Baños y horario', install: { surfaceId: 'tablaroca', heightM: 1.6 } }),
      ],
      order: { phase: 'ventas', teams: [], installerIds: [] },
    },
    {
      n: 139, clientId: 'c-sonrisa', sellerId: 'u-mariana', title: 'Caja contorno y papelería', ago: 2, lead: 12, status: 'Enviada',
      items: [
        line('f1', { modality: 'caja_contorno', light: 'directa', width: 1.2, height: 0.9 }, { label: 'Bandera en acceso', install: { surfaceId: 'block', heightM: 4 } }),
        line('f6', { productId: 'pro-tarjetas', volume: 1000, sides: 2 }),
      ],
    },
    {
      n: 140, clientId: 'c-medanos', sellerId: 'u-jorge', title: 'Inauguración', ago: 0.5, lead: 4, status: 'Borrador',
      items: [
        line('f3', { lonaId: 'lona-front', width: 3, height: 1.5, structure: 'sin' }, { install: { surfaceId: 'block', heightM: 3 } }),
        line('f4', { mode: 'stickers', wCm: 5, hCm: 5, pieces: 500 }),
      ],
    },
    {
      n: 142, clientId: 'c-pollo', sellerId: 'u-jorge', title: 'Anuncio luminoso fachada', ago: 0.3, lead: 12, status: 'Borrador',
      items: [
        line('f1', {
          baseId: 'rig-acm3',
          elements: [
            newElement({ name: 'Letras “POLLO SINALOA”', modality: 'letras', light: 'directa', text: 'POLLO SINALOA', letterCount: 12, width: 3.8, height: 0.45, cantoSize: '4', cantoColor: 'Rojo', frenteMat: 'acrilico', frenteColor: 'Blanco lechoso', silvatrim: true, silvatrimColor: 'Rojo', rotId: 'vin-corte-tras', rotCoverage: 100 }),
            newElement({ name: 'Icono pollo a contorno', modality: 'caja_contorno', light: 'directa', width: 1.1, height: 1.1, cantoSize: '4', cantoColor: 'Amarillo', frenteMat: 'acrilico', frenteColor: 'Traslúcido impreso', silvatrim: true, silvatrimColor: 'Amarillo', rotId: 'vin-impreso', rotCoverage: 100 }),
          ],
          ledId: 'led-3',
          ledQty: 120,
          cnc: true,
          kit: true,
          labor: true,
        }, { label: 'Fachada principal', install: { surfaceId: 'block', heightM: 7.5, equipment: 'grua', hours: 4 } }),
      ],
    },
    {
      n: 141, clientId: 'c-lofi', sellerId: 'u-mariana', title: 'Flotilla pick-up', ago: 1, lead: 6, status: 'Enviada',
      items: [line('f4', { mode: 'vehicular', vtype: 'parcial', vehicleId: 'pickup', vinylId: 'vin-impreso', laminate: true, qty: 3 })],
    },
  ];

  const quotes = [];
  const withOrders = [];
  for (const q of Q) {
    const createdAt = now - (q.ago + 1.5) * DAY;
    const quote = {
      id: quoteFolio(q.n, year),
      title: q.title,
      clientId: q.clientId,
      sellerId: q.sellerId,
      createdAt,
      leadDays: q.lead,
      advancePct: 50,
      validityDays: 15,
      status: q.order ? 'Aprobada' : q.status,
      approvedAt: q.order ? now - q.ago * DAY : null,
      items: q.items,
      attachments: [],
      notes: NOTE,
      orderId: null,
    };
    quotes.push(quote);
    if (q.order) withOrders.push({ quote, spec: q.order });
  }

  withOrders.sort((a, b) => a.quote.approvedAt - b.quote.approvedAt);
  const orders = withOrders.map(({ quote, spec }, i) => {
    const client = CLIENTS.find((c) => c.id === quote.clientId);
    const o = buildOrderFromQuote({ quote, client, catalog: CATALOG, seq: i + 1, now: quote.approvedAt, byUserId: quote.sellerId });
    quote.orderId = o.id;
    const target = PHASES.findIndex((p) => p.id === spec.phase);
    const spanDays = spec.closedAfter ?? (Math.min(o.dueDate, now) - o.createdAt) / DAY;
    const history = [o.history[0]];
    for (let k = 1; k <= target; k++) {
      const at = o.createdAt + ((spanDays * k) / target) * DAY;
      history.push({ phase: PHASES[k].id, at: Math.min(at, now - 3_600_000), by: 'u-admin' });
    }
    return {
      ...o,
      phase: spec.phase,
      designerId: spec.designerId ?? null,
      teams: spec.teams,
      installerIds: spec.installerIds,
      closedAt: spec.closedAfter ? o.createdAt + spec.closedAfter * DAY : null,
      history,
    };
  });

  return { quotes, orders, nextQuote: 143, nextOrder: orders.length + 1 };
}
