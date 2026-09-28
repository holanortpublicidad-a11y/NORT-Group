import { uid } from './format.js';

// Los archivos se guardan en localStorage (~5 MB por navegador): las imágenes se reducen
// a 1000 px y se comprimen; otros archivos se incrustan solo si pesan ≤ 350 KB.
export const MAX_EMBED = 350 * 1024;
const MAX_SIDE = 1000;

function readAsDataURL(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

async function scaleImage(file) {
  try {
    const src = await readAsDataURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    // WebP conserva transparencia (logotipos); si el navegador no la soporta, PNG.
    let out = c.toDataURL('image/webp', 0.85);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
    return out.length * 0.75 <= MAX_EMBED * 2 ? out : null;
  } catch {
    return null;
  }
}

/** Lee un archivo para guardarlo: { id, name, type, size, at, data|null } */
export async function readFileForStorage(file) {
  const base = { id: uid('f'), name: file.name, type: file.type, size: file.size, at: Date.now() };
  if (file.type?.startsWith('image/') && !/svg/.test(file.type)) {
    const data = await scaleImage(file);
    return { ...base, data, type: data ? data.slice(5, data.indexOf(';')) : file.type };
  }
  if (file.size > MAX_EMBED) return { ...base, data: null };
  return { ...base, data: await readAsDataURL(file) };
}

export const kb = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
