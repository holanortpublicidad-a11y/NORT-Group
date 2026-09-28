// Inventario y catálogo de precios por defecto (se carga la primera vez y luego vive en localStorage).
// Precios en MXN antes de IVA. Costo = costo de compra; Precio = venta sugerida.

export const CATEGORIES = [
  'Rígidos',
  'Viniles',
  'Lonas',
  'Perfiles y Canales',
  'Iluminación',
  'Vehicular',
  'Impresos/Promocionales',
  'Servicios/Mano de Obra',
];

export const UNITS = [
  { id: 'm2', label: 'm²', name: 'Metros cuadrados' },
  { id: 'ml', label: 'm.l.', name: 'Metros lineales' },
  { id: 'pza', label: 'pza', name: 'Pieza / Unidad' },
  { id: 'millar', label: 'millar', name: 'Millares / Paquete' },
  { id: 'tarifa', label: 'tarifa', name: 'Tarifa plana' },
];
export const unitLabel = (id) => UNITS.find((u) => u.id === id)?.label ?? id;

/** Margen sobre precio de venta: ((precio − costo) / precio) × 100 */
export const marginPct = (cost, price) => (price > 0 ? ((price - cost) / price) * 100 : 0);
/** Precio sugerido a partir de un margen objetivo */
export const priceFromMargin = (cost, target) => (target >= 100 ? cost : cost / (1 - target / 100));

// [id, nombre, categoría, unidad, costo, precio, stock, mínimo, extra]
const R = [
  // Rígidos (m²)
  ['rig-acm3', 'ACM 3 mm', 'Rígidos', 'm2', 380, 850, 17.9, 9],
  ['rig-acr-blanco', 'Acrílico traslúcido / blanco 3 mm', 'Rígidos', 'm2', 620, 1350, 8.9, 6],
  ['rig-acr-cristal', 'Acrílico cristal 3 mm', 'Rígidos', 'm2', 580, 1280, 5.9, 3],
  ['rig-coro4', 'Coroplast 4 mm', 'Rígidos', 'm2', 95, 240, 26.8, 10],
  ['rig-pvc3', 'Comatex / PVC espumado 3 mm', 'Rígidos', 'm2', 210, 480, 11.9, 6],
  ['rig-pvc5', 'Comatex / PVC espumado 5 mm', 'Rígidos', 'm2', 320, 690, 6, 6],
  ['rig-foam', 'Foam board 5 mm', 'Rígidos', 'm2', 150, 360, 4.5, 3],
  ['rig-galva', 'Lámina galvanizada cal. 24', 'Rígidos', 'm2', 190, 420, 14.6, 6],
  ['rig-alu', 'Aluminio natural 1 mm', 'Rígidos', 'm2', 540, 1150, 2.9, 3],
  // Viniles (m²)
  ['vin-corte', 'Vinil de corte estándar', 'Viniles', 'm2', 95, 320, 45, 15],
  ['vin-corte-tras', 'Vinil de corte traslúcido', 'Viniles', 'm2', 180, 480, 12, 8],
  ['vin-impreso', 'Vinil impreso full color', 'Viniles', 'm2', 120, 360, 60, 20],
  ['vin-micro', 'Vinil microperforado', 'Viniles', 'm2', 145, 420, 25, 10],
  ['vin-esmerilado', 'Vinil esmerilado / arenado', 'Viniles', 'm2', 160, 450, 9, 10],
  ['vin-wrap', 'Vinil automotriz (wrap premium)', 'Viniles', 'm2', 520, 1150, 30, 15],
  // Lonas (m²)
  ['lona-front', 'Lona frontlit 13 oz', 'Lonas', 'm2', 38, 150, 150, 50],
  ['lona-back', 'Lona backlit', 'Lonas', 'm2', 95, 290, 40, 20],
  ['lona-mesh', 'Lona mesh', 'Lonas', 'm2', 70, 230, 35, 20],
  // Perfiles y canales (m.l.) + herrajes
  ['per-canto4', 'Canto de aluminio 4"', 'Perfiles y Canales', 'ml', 145, 340, 60, 30],
  ['per-silva', 'Silvatrim 1"', 'Perfiles y Canales', 'ml', 38, 95, 90, 40],
  ['per-ptr', 'Perfil tubular de fierro 1" × 1" (bastidores)', 'Perfiles y Canales', 'ml', 42, 110, 120, 60],
  ['her-perno', 'Perno separador acero inoxidable', 'Perfiles y Canales', 'pza', 38, 95, 140, 40],
  ['her-cinta', 'Cinta doble cara industrial', 'Perfiles y Canales', 'ml', 14, 40, 150, 50],
  ['her-pega', 'Pegamento especial (cartucho)', 'Perfiles y Canales', 'pza', 120, 260, 12, 6],
  ['her-kit', 'Tornillería y cableado (kit)', 'Perfiles y Canales', 'pza', 90, 220, 25, 10],
  // Iluminación (pza)
  ['led-2', 'Módulo LED 2 diodos 12 V', 'Iluminación', 'pza', 7.5, 18, 800, 300, { watts: 0.48 }],
  ['led-3', 'Módulo LED 3 diodos 12 V', 'Iluminación', 'pza', 9, 22, 1200, 400, { watts: 0.72 }],
  ['psu-60', 'Fuente de poder 12 V 60 W', 'Iluminación', 'pza', 260, 520, 10, 4, { watts: 60, psu: true }],
  ['psu-100', 'Fuente de poder 12 V 100 W', 'Iluminación', 'pza', 330, 680, 12, 4, { watts: 100, psu: true }],
  ['psu-150', 'Fuente de poder 12 V 150 W', 'Iluminación', 'pza', 420, 850, 6, 3, { watts: 150, psu: true }],
  ['psu-200', 'Fuente de poder 12 V 200 W', 'Iluminación', 'pza', 520, 1050, 5, 3, { watts: 200, psu: true }],
  ['psu-300', 'Fuente de poder 12 V 300 W', 'Iluminación', 'pza', 720, 1450, 2, 2, { watts: 300, psu: true }],
  // Vehicular
  ['veh-lamuv', 'Laminado de protección UV automotriz', 'Vehicular', 'm2', 160, 380, 30, 10],
  ['veh-mo', 'Mano de obra rotulación vehicular', 'Vehicular', 'm2', 90, 280, null, null],
  // Impresos / promocionales
  ['pro-tarjetas', 'Tarjetas de presentación couché 300 g', 'Impresos/Promocionales', 'millar', 280, 650, null, null, { printed: true }],
  ['pro-volantes', 'Volantes / flyers media carta', 'Impresos/Promocionales', 'millar', 520, 1100, null, null, { printed: true }],
  ['pro-membretadas', 'Hojas membretadas carta', 'Impresos/Promocionales', 'millar', 650, 1350, null, null, { printed: true }],
  ['pro-remision', 'Notas de remisión (juegos)', 'Impresos/Promocionales', 'millar', 900, 1900, null, null, { printed: true }],
  ['pro-playera-imp', 'Playera impresa (serigrafía / DTF)', 'Impresos/Promocionales', 'pza', 85, 180, 60, 24],
  ['pro-camisa-bord', 'Camisa bordada', 'Impresos/Promocionales', 'pza', 180, 380, 24, 12],
  // Servicios / mano de obra
  ['srv-cnc', 'Corte CNC router', 'Servicios/Mano de Obra', 'ml', 18, 45, null, null],
  ['srv-stickers', 'Impresión de stickers en planilla', 'Servicios/Mano de Obra', 'm2', 150, 420, null, null],
  ['srv-suaje', 'Suaje / corte de stickers', 'Servicios/Mano de Obra', 'm2', 40, 120, null, null],
  ['srv-grua', 'Renta de grúa (día)', 'Servicios/Mano de Obra', 'tarifa', 1800, 3200, null, null],
  ['srv-inst', 'Instalación en pared / altura', 'Servicios/Mano de Obra', 'm2', 110, 260, null, null],
  ['srv-armado', 'Mano de obra armado de anuncio', 'Servicios/Mano de Obra', 'm2', 350, 900, null, null],
  ['srv-lam', 'Laminado / plastificado mate o brillo', 'Servicios/Mano de Obra', 'm2', 45, 120, null, null],
  ['srv-refile', 'Corte a pliego / refile', 'Servicios/Mano de Obra', 'm2', 10, 30, null, null],
  ['srv-troquel', 'Troquelado / corte de forma en plotter', 'Servicios/Mano de Obra', 'm2', 25, 80, null, null],
  ['srv-uv', 'Impresión directa UV sobre rígido', 'Servicios/Mano de Obra', 'm2', 160, 420, null, null],
  ['srv-dobladillo', 'Dobladillo y ojillos', 'Servicios/Mano de Obra', 'ml', 6, 18, null, null],
  ['srv-soldadura', 'Soldadura y pintura de bastidor', 'Servicios/Mano de Obra', 'ml', 35, 90, null, null],
  ['srv-diseno', 'Diseño gráfico (hasta 3 propuestas)', 'Servicios/Mano de Obra', 'tarifa', 400, 1200, null, null],
  ['srv-levantamiento', 'Visita de levantamiento y medidas', 'Servicios/Mano de Obra', 'tarifa', 150, 450, null, null],
];

export const DEFAULT_ITEMS = R.map(([id, name, category, unit, cost, price, stock, minStock, extra]) => ({
  id,
  name,
  category,
  unit,
  cost,
  price,
  pricing: 'manual', // 'manual' | 'margin'
  targetMargin: 55,
  stock, // null = no se controla inventario (servicios)
  minStock,
  ...(extra || {}),
}));

// Reglas del cotizador (editables en Inventario → Reglas)
export const DEFAULT_RULES = {
  params: { iva: 0.16, advancePct: 50, validityDays: 15, wastePct: 10, marginWarn: 45, marginBad: 30 },
  f1: {
    fill: { rect: 1, contorno: 0.8, letras: 0.45 }, // área de cara ÷ (ancho × alto)
    contourPerim: 1.35, // perímetro de caja contorno ÷ perímetro rectangular
    kPerimLetras: 3.2, // desarrollo por letra ÷ altura de letra
    ledPerM2: 50, // módulos por m² en luz directa
    ledPerMlHalo: 8, // módulos por m.l. de canto en luz indirecta (halo)
    psuSafety: 1.2, // holgura de potencia en fuentes
    rotCoverage: 60, // % de la cara que se rotula por defecto
  },
  f3: { crossEvery: 1.0, bleed: 0.1 }, // travesaño cada X m; sobrante por lado al tensar en bastidor
  f4: {
    vehicles: [
      { id: 'compacto', name: 'Compacto', m2: 14, factor: 1 },
      { id: 'sedan', name: 'Sedán', m2: 17, factor: 1 },
      { id: 'pickup', name: 'Pick-up', m2: 20, factor: 1.1 },
      { id: 'van', name: 'Panel / Van', m2: 26, factor: 1.15 },
      { id: 'camion', name: 'Camión (caja seca)', m2: 45, factor: 1.25 },
    ],
    coverage: { logos: 8, parcial: 45, wrap: 100 }, // % de la superficie del vehículo
    wrapWaste: 15,
    rollWidth: 1.22,
    gapCm: 0.3,
  },
  f5: { pernosBase: 4, pernosPerM2: 4, cintaFactor: 0.5, pegaM2PerTube: 0.8 },
  f6: {
    millar: [
      { qty: 100, factor: 2 },
      { qty: 500, factor: 1.2 },
      { qty: 1000, factor: 1 },
      { qty: 2000, factor: 0.9 },
    ],
    pza: [
      { qty: 12, factor: 1.15 },
      { qty: 24, factor: 1.05 },
      { qty: 50, factor: 1 },
      { qty: 100, factor: 0.95 },
      { qty: 500, factor: 0.88 },
    ],
    twoSides: 1.35,
  },
  install: {
    surfaces: [
      { id: 'block', name: 'Muro de block', factor: 1 },
      { id: 'acm', name: 'Fachada de ACM', factor: 1.15 },
      { id: 'tablaroca', name: 'Tablaroca (con refuerzo)', factor: 1.3 },
      { id: 'vidrio', name: 'Vidrio / cristal', factor: 0.85 },
      { id: 'metal', name: 'Estructura metálica existente', factor: 1.1 },
    ],
    heightBands: [
      { upTo: 3, pct: 0, label: 'Escalera' },
      { upTo: 6, pct: 15, label: 'Andamio' },
      { upTo: 12, pct: 35, label: 'Canastilla / grúa' },
      { upTo: 999, pct: 60, label: 'Grúa alta' },
    ],
    minM2: 2,
    craneFrom: 6, // a partir de esta altura se agrega renta de grúa
  },
};
