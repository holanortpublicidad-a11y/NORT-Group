// Configuración de la empresa y banderas de entorno.
export const COMPANY = {
  name: 'Cota Señalética',
  legal: 'Cota Señalética y Publicidad S.A. de C.V.',
  rfc: 'CSP180522KT7',
  address: 'Av. Tecnológico 1540, Col. Partido Escobedo, Cd. Juárez, Chih.',
  phone: '656 000 0000',
};

// En la versión embebida (artefacto) la impresión del navegador no está disponible.
// Ejecuta con VITE_PRINT=false para ocultar el botón "Imprimir / PDF".
export const PRINT_ENABLED = import.meta.env.VITE_PRINT !== 'false';
