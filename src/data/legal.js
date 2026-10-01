// Textos legales oficiales de NORT Publicidad.
// Se incluyen por defecto en todas las cotizaciones y contratos. Solo el Administrador puede
// editarlos (Inventario y precios → Generales → Documentos legales); se guardan en localStorage.

export const DEFAULT_TERMS = `TÉRMINOS Y CONDICIONES.

CONDICIONES GENERALES
- Esquema de Pago y Anticipo: Se requiere un anticipo para iniciar el proyecto, el cual se define mediante acuerdo con el cliente. El porcentaje mínimo de anticipo es del 30% aplicable únicamente en casos específicos autorizados. El saldo restante deberá liquidarse estrictamente en los plazos establecidos.
- Plazo Obligatorio de Liquidación (3 Días Máximo): Es obligación estricta del cliente liquidar por completo el saldo acordado en un plazo no mayor a 3 días naturales posteriores a la instalación o entrega del proyecto (aplica para cualquier trabajo en general: rotulación, anuncios luminosos, señalética, entre otros). NORT Publicidad no tiene la obligación ni la responsabilidad de estar realizando gestiones de cobranza posterior a este periodo. En caso de incumplimiento, se aplicará una penalidad moratoria del 1% de recargo diario sobre el saldo insoluto por cada día de retraso en el pago.
- Propiedad de los Materiales: NORT Publicidad conserva la titularidad y propiedad legal de todos los materiales y productos hasta que el pago haya sido cubierto al 100%. El incumplimiento del saldo facultará a la empresa para disponer de los mismos.
- Garantía de Tiempo de Entrega: En anuncios luminosos, garantizamos la entrega o instalación en un plazo de 15 días hábiles. En caso de retraso imputable a la empresa, se aplicará un descuento del 5% diario sobre el valor del proyecto. Nota: Esta garantía aplica exclusivamente en condiciones normales de operación. El plazo podrá extenderse por desabasto de materiales, factores climatológicos, retrasos en la preparación eléctrica por parte del cliente o causas de fuerza mayor.
- Autorización: La validación del proyecto debe realizarse formalmente vía correo electrónico o WhatsApp.
- Requisitos Técnicos: El cliente deberá enviar los archivos en alta resolución oportunamente. En anuncios luminosos, la preparación eléctrica debe estar lista a una distancia máxima de 1.20 m del punto de instalación; de lo contrario, el servicio será reprogramado.
- Variación de Color: Los tonos pueden variar según el diseño y disponibilidad de materiales. Se recomienda consultar la paleta de colores con su asesor.

GARANTÍAS Y COMPROMISOS (PARA EL CLIENTE Y LA EMPRESA)
- Calidad de Materiales y Mano de Obra: Garantizamos que todos nuestros trabajos son realizados con materiales de primera calidad y especificaciones técnicas profesionales para exterior.
- Cobertura de Funcionamiento (Iluminación LED): 9 meses de garantía a partir de la instalación por defectos de fábrica o fallas en componentes eléctricos instalados.
- Cobertura de Materiales (Viniles Exterior): 15 meses de garantía a partir de la instalación contra decoloración prematura excesiva o desprendimiento por defecto de adhesivo.
- Aplicación de Garantías: Las garantías descritas aplican y se activan una vez que el servicio o anuncio esté totalmente liquidado.
- Pérdida Absoluta de Garantía por Manipulación Externa: Si el anuncio luminoso, la señalética, el vinil o cualquier elemento instalado sufre alteraciones, reparaciones, modificaciones o manipulación por parte de personal externo o ajeno a NORT Publicidad, el proyecto pierde por completo todas sus garantías.
- Vigencia de Cotización: 15 días a partir de su emisión.
- Abandono de Proyecto: No nos hacemos responsables por pedidos no reclamados tras 30 días de la notificación de término.
- Exclusiones Generales: NORT Publicidad no se responsabiliza por daños derivados de desastres naturales, clima extremo o vandalismo.`;

/**
 * Plantilla del contrato. Marcadores que se llenan con la cotización aprobada:
 * {{cliente}} {{cotizacion}} {{fecha}} {{dia}} {{mes}} {{anio}} {{asesor}} {{objeto}}
 * {{monto}} {{iva_texto}} {{anticipo}} {{anticipo_pct}} {{tarifa_falsa_salida}}
 */
export const DEFAULT_CONTRACT = `CONTRATO DE PRESTACIÓN DE SERVICIOS DE PUBLICIDAD
PRESTADOR: NORT Publicidad
CLIENTE: {{cliente}}
COTIZACIÓN DE REFERENCIA: N° {{cotizacion}}
FECHA: {{fecha}}
ASESOR A CARGO: {{asesor}}

1. OBJETO DEL SERVICIO
El PRESTADOR se obliga a realizar el diseño, fabricación e instalación de {{objeto}}, conforme a las especificaciones técnicas y dimensiones detalladas en la Cotización antes presentada y aprobada por el CLIENTE.

2. PROCESO DE TRABAJO
1. Diseño: El CLIENTE entrega logotipos, artes vectoriales y/o textos necesarios. El PRESTADOR entrega la propuesta final de diseño y renderizado.
2. Aprobación: La firma del presente contrato o la autorización formal vía medios digitales (WhatsApp/Correo) formaliza la aprobación del diseño y el inicio de la fabricación.
3. Fabricación: Ejecución del proyecto conforme a las especificaciones técnicas de la cotización.
4. Entrega e Instalación: Montaje, pruebas de funcionamiento y firma del Acta de Entrega y Conformidad.

3. PLAZOS Y REQUISITOS DEL SITIO DE INSTALACIÓN
- Tiempo de Ejecución: De 15 a 20 días hábiles a partir de la firma del presente contrato, recepción del anticipo y aprobación final del diseño.
- Requisitos y Obligaciones Previas del Cliente en el Sitio: Para llevar a cabo la instalación en la fecha programada, el CLIENTE deberá garantizar previamente:
  * Acometida Eléctrica: Preparación eléctrica regulada y lista a una distancia no mayor a 1.20 metros del punto exacto de instalación.
  * Condiciones del Inmueble/Muro: La superficie, fachada o muro debe estar libre de obstáculos, limpia, estructuralmente firme y apta para recibir la fijación y anclaje del anuncio.
  * Permisos y Accesos: Gestión y pago de licencias municipales, permisos de plaza comercial/inmueble y autorización de accesos, maniobras u horarios especiales.
- Impedimentos de Instalación y Cargo por Falsa Salida / Reprogramación: Si al acudirse al sitio en la fecha y hora pactadas, la instalación no pueda ejecutarse por causas imputables al CLIENTE (ej. falta de acometida eléctrica, muro no apto/inestable, falta de accesos o permisos, suspensión por la administración del inmueble):
  * La instalación se suspenderá y reprogramará conforme a la disponibilidad de agenda del PRESTADOR.
  * Se aplicará un Cargo por Falsa Salida y Re-logística equivalente al 10% del valor total del proyecto (o una tarifa operativa de {{tarifa_falsa_salida}} MXN), para cubrir los costos de traslado, maniobras, equipo/escaleras y horas-hombre perdidas.
  * Dicho cargo deberá liquidarse antes de agendar la nueva fecha de instalación.

4. PRECIO, FORMA DE PAGO Y RESERVA DE DOMINIO
- Monto Total: {{monto}} MXN {{iva_texto}}.
- Anticipo: {{anticipo}} MXN (correspondiente al {{anticipo_pct}}% al firmar/autorizar el proyecto).
- Pago Final: Restante contra entrega e instalación del servicio. El CLIENTE cuenta con un plazo máximo de 3 días naturales posteriores a la entrega para liquidar el saldo.
- Reserva de Dominio: NORT Publicidad conserva la propiedad legal de todos los productos y materiales hasta su liquidación total al 100%. El incumplimiento del pago faculta a la empresa para desinstalar o retirar los materiales instalados.

5. ALCANCE DE LA MEMORIA TÉCNICA Y DELIMITACIÓN PERICIAL
1. Memoria Técnica Descriptiva del Producto: A solicitud del CLIENTE, NORT Publicidad entregará una Memoria Técnica Descriptiva de Fabricación, la cual incluye exclusivamente:
  * Ficha de especificación de materiales (aluminio, acrílico, viniles, módulos LED, fuentes de poder, etc.).
  * Descripción de la estructura interna y tipo de anclajes o herrajes utilizados en el ensamble.
2. Exclusión de Peritaje y Cálculo Estructural (D.R.O.):
  * La Memoria Técnica entregada es únicamente descriptiva del producto fabricado.
  * NO incluye cálculo de resistencia eólica o mecánica, dictamen estructural, ni firma o sello de Perito Certificado o Director Responsable de Obra (D.R.O.). Si las autoridades o la plaza comercial exigen un dictamen estructural pericial, dicho trámite y su costo económico serán responsabilidad exclusiva del CLIENTE.

6. GARANTÍAS Y COMPROMISOS
- Calidad: Materiales de primera calidad y especificaciones profesionales para exterior.
- Cobertura LED y Componentes Eléctricos: 8 meses de garantía a partir de la instalación por defectos de fábrica o fallas en componentes eléctricos instalados.
- Cobertura de Materiales (Viniles Exterior): 6 meses de garantía a partir de la instalación contra decoloración prematura excesiva o desprendimiento de adhesivo.
- Activación: Las garantías entran en vigor exclusivamente cuando el proyecto esté liquidado al 100%.
- Pérdida de Garantía por Manipulación Externa: Si el anuncio o instalación sufre alteraciones, modificaciones o manipulación por personal ajeno a NORT Publicidad, el proyecto perderá de forma automática todas sus garantías.
- Abandono de Proyecto: NORT Publicidad no se hace responsable por pedidos no reclamados o no recibidos tras 30 días de la notificación de término.
- Exclusiones: No nos responsabilizamos por daños derivados de desastres naturales, clima extremo, vandalismo o variaciones drásticas de voltaje en la red eléctrica del cliente.

7. PENALIZACIONES
- Rescisión del Cliente: En caso de cancelación por parte del CLIENTE una vez iniciada la fabricación, se retendrá el total del anticipo.
- Retraso de Pagos (Cliente): 1% diario sobre el saldo insoluto tras vencer el plazo de pago.
- Retraso de Entrega (Prestador): 5% diario sobre el valor del contrato en caso de retraso injustificado imputable 100% a NORT Publicidad (excluyendo retrasos por clima, falta de energía o causas de fuerza mayor).

8. CONFIDENCIALIDAD Y PROPIEDAD INTELECTUAL
- Confidencialidad: Secreto profesional durante la vigencia del contrato + 1 año.
- Propiedad Intelectual: La marca y logotipos son del CLIENTE. El diseño mecánico, estructura y planos de fabricación son propiedad del PRESTADOR.
- Uso de Imagen: El PRESTADOR podrá fotografiar o filmar el anuncio instalado para uso en su portafolio y promoción comercial.`;

export const DEFAULT_SETTINGS = {
  terms: DEFAULT_TERMS,
  contract: DEFAULT_CONTRACT,
  falseTripFee: '', // tarifa operativa de falsa salida (MXN); vacío = línea en blanco en el contrato
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const longDate = (ts) => {
  const d = new Date(ts);
  return { dia: String(d.getDate()), mes: MONTHS[d.getMonth()], anio: String(d.getFullYear()), fecha: `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}` };
};

/** Reemplaza {{marcadores}}; los no definidos quedan como línea para llenar a mano. */
export const fillTemplate = (tpl, values) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (values[k] != null && values[k] !== '' ? String(values[k]) : '________'));
