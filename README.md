# Cota ERP — Señalética, publicidad exterior y letras 3D

Frontend en **React 18 + Tailwind CSS 3 + Lucide Icons** con estado global (Context + useReducer) y datos de prueba.

## Arranque

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
```

## Estructura

```
src/
  config.js                   Datos de la empresa y bandera PRINT_ENABLED
  data/
    inventory.js              Inventario por defecto (54 insumos), categorías, unidades y reglas del cotizador
    mockData.js               Usuarios, clientes y semilla de cotizaciones/OTs
  lib/
    families/                 Una familia de producto por archivo (cálculo de la lista de materiales)
      f1-anuncios3d.js        Anuncio luminoso multi-elemento (letras + contorno + caja): canto 2"/4" y color,
                              frente y color, silvatrim, LED capturado a mano y combinación de fuentes (W = módulos × 1.2)
      f2-granformato.js       Rígidos y viniles impresos + laminado, refile, troquelado
      f3-lonas.js             Lonas con dobladillo/ojillos o bastidor de PTR (perímetro + travesaños)
      f4-vehicular.js         Rotulación vehicular por tipo de vehículo y stickers en planilla
      f5-senaletica.js        Placas de acrílico/ACM o vinil sobre muro; pernos, cinta o pegamento
      f6-promocionales.js     Impresos por millar y playeras con factor por volumen
      f7-servicio.js          Cualquier artículo del inventario por cantidad
      common.js               Renglón de BOM, merma e instalación (escalera ≤ 6 m; arriba: andamio por cuerpo/día o grúa boom por hora)
    pricing.js                Costo, precio, utilidad y margen por renglón y por cotización; faltantes de stock
    orders.js                 Cotización aprobada → OT con ficha técnica, BOM y archivos congelados
    storage.js                Persistencia en localStorage (la migración de datos anteriores vive en store/AppStore.jsx)
    files.js                  Lectura de archivos e imágenes reducidas para guardarlas
    sla.js · permissions.js · format.js
  store/AppStore.jsx          Estado global (useReducer) + guardado automático
  components/                 UI kit, selector de insumos, tabla BOM, adjuntos, croquis con cotas
  modules/
    inventory/                Inventario (costo, precio, margen, stock), reglas, instalación, movimientos
    quotes/                   Cotizador por familias (families/F1Form…F7Form), vista previa
    orders/ dashboard/ clients/ sellers/ users/
```

## Cómo se calcula un renglón

Cada familia genera una **lista de materiales** con insumos del inventario:

- `costo de producción = Σ cantidad × costo interno`
- `precio al cliente   = Σ cantidad × precio de venta`
- `margen              = (precio − costo) ÷ precio × 100`

A los materiales por m² y m.l. se les suma la merma configurada (10 % por defecto). Un insumo puede tener precio
manual o calculado por margen objetivo: `precio = costo ÷ (1 − margen)`.

Al aprobar una cotización se descuenta del stock el material de los insumos con inventario controlado y queda
registrado en *Movimientos* con el folio de la OT.

## Prospectos y clientes

Cada contacto tiene `type: 'prospecto' | 'cliente'`. Desde el cotizador se registra un prospecto sin salir del
formulario; al aprobar la cotización (y generar la OT) el contacto pasa a `cliente` automáticamente.

## Siguientes pasos sugeridos para producción

- Persistencia multiusuario: hoy todo vive en `localStorage` del navegador; sustituir `lib/storage.js` por API (p. ej. Supabase/PostgreSQL o NestJS) manteniendo las mismas acciones.
- Autenticación real y roles desde el backend (`permissions.js` ya centraliza las reglas).
- PDF del lado servidor o con `@react-pdf/renderer`; CFDI 4.0 vía PAC para la fase Facturado.
- Archivos grandes (AI, CDR, PDF pesados) en almacenamiento de objetos (S3/Supabase Storage); hoy solo se guarda la referencia.

`tools/build-artifact.mjs` solo se usa para generar la vista previa de un solo archivo HTML.
