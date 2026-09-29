import { F1_MODALITIES } from '../families/f1-anuncios3d.js';

/**
 * Silueta dibujable de un elemento del anuncio, en cm:
 *   - SVG medido  → contornos reales (con calados)
 *   - Caja de luz → rectángulo
 *   - Caja a contorno sin SVG → rectángulo redondeado (aproximado)
 *   - Letras 3D sin SVG → texto con tipografía gruesa genérica (aproximado)
 */
export function elementShape(el) {
  const svgOk = el.measureMode === 'svg' && el.svg?.ok;
  if (svgOk && el.svg.polys?.length) {
    const W = Number(el.svgWidthCm) || 0;
    const k = W / 1000;
    const H = (el.svg.h / el.svg.w) * W;
    return {
      W,
      H,
      exact: true,
      source: `contornos de ${el.svg.name}`,
      draw(ctx) {
        ctx.beginPath();
        for (const p of el.svg.polys) {
          const a = p.pts;
          ctx.moveTo(a[0] * k, a[1] * k);
          for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i] * k, a[i + 1] * k);
          ctx.closePath();
        }
        ctx.fill('evenodd');
      },
    };
  }
  if (svgOk) return { error: 'Vuelve a subir el SVG de este elemento para generar el mapa LED.' };
  const W = (Number(el.width) || 0) * 100;
  const H = (Number(el.height) || 0) * 100;
  if (!(W > 0 && H > 0)) return { error: 'Captura las medidas del elemento.' };
  if (el.modality === 'caja_rect') return { W, H, exact: true, source: 'rectángulo de la caja', draw: (ctx) => ctx.fillRect(0, 0, W, H) };
  if (el.modality === 'caja_contorno') {
    const r = Math.min(W, H) * 0.22;
    return {
      W,
      H,
      exact: false,
      source: 'silueta aproximada (sube el SVG para exactitud)',
      draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(W, 0, W, H, r);
        ctx.arcTo(W, H, 0, H, r);
        ctx.arcTo(0, H, 0, 0, r);
        ctx.arcTo(0, 0, W, 0, r);
        ctx.closePath();
        ctx.fill();
      },
    };
  }
  // Letras sin SVG: texto con tipografía de palo seco muy gruesa, ajustado a largo × altura de letra
  const text = (el.text || '').trim() || 'LETRAS';
  const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `900 100px ${FONT}`;
  const m = probe.measureText(text);
  const asc = m.actualBoundingBoxAscent || 72;
  const desc = m.actualBoundingBoxDescent || 0;
  const left = m.actualBoundingBoxLeft || 0;
  const tw = (m.actualBoundingBoxRight || m.width) + left;
  const fs = (100 * H) / (asc + desc);
  const sx = W / ((tw * fs) / 100);
  return {
    W,
    H,
    exact: false,
    source: `texto “${text}” con tipografía genérica (sube el SVG para exactitud)`,
    draw(ctx) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.font = `900 ${fs}px ${FONT}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, (left * fs) / 100, (asc * fs) / 100);
      ctx.restore();
    },
  };
}

/** Rasteriza la silueta a una máscara binaria (1 = sólido) con margen alrededor. */
export function rasterize(shape, { pad = 4 } = {}) {
  const maxDim = Math.max(shape.W, shape.H);
  const res = Math.min(2, Math.max(0.4, maxDim / 1400)); // cm por píxel
  const w = Math.ceil((shape.W + 2 * pad) / res);
  const h = Math.ceil((shape.H + 2 * pad) / res);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.scale(1 / res, 1 / res);
  ctx.translate(pad, pad);
  shape.draw(ctx);
  const img = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = img[i * 4 + 3] > 127 ? 1 : 0;
  return { w, h, res, data, originX: -pad, originY: -pad };
}

export const modalityLabel = (m) => F1_MODALITIES.find((x) => x.id === m)?.short ?? 'Elemento';
