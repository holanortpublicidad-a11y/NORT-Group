// Configuración de la empresa y banderas de entorno.
export const COMPANY = {
  name: 'NORT Publicidad',
  // Completa con los datos fiscales reales; los campos vacíos no se imprimen.
  legal: '',
  rfc: '',
  address: 'Cd. Juárez, Chihuahua',
  phone: '',
  whatsapp: '',
};

// En la versión embebida (artefacto) la impresión del navegador no está disponible.
// Ejecuta con VITE_PRINT=false para ocultar el botón "Imprimir / PDF".
export const PRINT_ENABLED = import.meta.env.VITE_PRINT !== 'false';
