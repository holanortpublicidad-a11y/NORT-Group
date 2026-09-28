import f1 from './f1-anuncios3d.js';
import f2 from './f2-granformato.js';
import f3 from './f3-lonas.js';
import f4 from './f4-vehicular.js';
import f5 from './f5-senaletica.js';
import f6 from './f6-promocionales.js';
import f7 from './f7-servicio.js';

/** Registro de familias de producto. Para agregar una familia: crea fN-*.js y regístrala aquí. */
export const FAMILY_LIST = [f1, f2, f3, f4, f5, f6, f7];
export const FAMILIES = Object.fromEntries(FAMILY_LIST.map((f) => [f.id, f]));
export { makeCtx, installRows, installPlan, INSTALL_EQUIPMENT } from './common.js';
