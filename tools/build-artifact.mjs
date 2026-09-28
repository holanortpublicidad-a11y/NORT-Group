// Compila la app a un único HTML autocontenido (para vista previa/artefacto).
// No se necesita para desarrollo normal: usa `npm run dev`.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = process.env.GLOBAL_NODE_MODULES || '/home/claude/.npm-global/lib/node_modules';
const require = createRequire(import.meta.url);
const esbuild = require(path.join(G, 'tsx/node_modules/esbuild'));
const OUT = path.join(ROOT, 'dist-artifact');
fs.mkdirSync(OUT, { recursive: true });

// 1) Shim de lucide-react → set Lucide de react-icons (mismo dibujo de iconos)
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const names = new Set();
for (const f of walk(path.join(ROOT, 'src')).filter((f) => /\.(jsx?|mjs)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) {
    m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => names.add(n));
  }
}
const luSrc = fs.readFileSync(path.join(G, 'react-icons/lu/index.mjs'), 'utf8');
const has = (n) => luSrc.includes(`function Lu${n} (`) || luSrc.includes(`function Lu${n}(`);
const ALIAS = { CheckCircle2: 'CircleCheck', XCircle: 'CircleX', Table2: 'Table', Building2: 'Building', FilePlus2: 'FilePlus', MessageCircle: 'MessageSquare', AlertTriangle: 'TriangleAlert', Wand2: 'WandSparkles' };
const lines = ["import React from 'react';"];
const exports = [];
for (const n of names) {
  const target = has(n) ? n : ALIAS[n] && has(ALIAS[n]) ? ALIAS[n] : null;
  if (!target) throw new Error(`Icono sin equivalente: ${n}`);
  lines.push(`import { Lu${target} as _${n} } from 'react-icons/lu';`);
  exports.push(`export const ${n} = ({ size = 24, strokeWidth = 2, ...p }) => React.createElement(_${n}, { size, strokeWidth, ...p });`);
}
const shimPath = path.join(OUT, 'lucide-shim.mjs');
fs.writeFileSync(shimPath, [...lines, ...exports].join('\n'));

// 2) Bundle JS
const js = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.jsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  jsx: 'automatic',
  target: 'es2020',
  nodePaths: [G],
  alias: { 'lucide-react': shimPath },
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.VITE_PRINT': '"false"' },
  logLevel: 'warning',
});
const code = js.outputFiles[0].text;

// 3) CSS con Tailwind
const cssOut = path.join(OUT, 'app.css');
execFileSync('node', [path.join(G, '@mermaid-js/mermaid-cli/node_modules/tailwindcss/lib/cli.js'), '-c', path.join(ROOT, 'tailwind.config.cjs'), '-i', path.join(ROOT, 'src/index.css'), '-o', cssOut, '--minify'], {
  cwd: ROOT,
  stdio: 'inherit',
});
const css = fs.readFileSync(cssOut, 'utf8');

// 4) HTML único
const html = `<title>Cota ERP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${code.replace(/<\/script/gi, '<\\/script')}</script>
`;
fs.writeFileSync(path.join(OUT, 'cota-erp.html'), html);
console.log(`OK · ${(html.length / 1024).toFixed(0)} KB · ${names.size} iconos`);
