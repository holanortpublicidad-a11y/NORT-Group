import React from 'react';
import { num } from '../lib/format.js';

/** Croquis con cotas: rectángulo a escala con líneas de dimensión. */
export default function DimensionSketch({ w, h }) {
  const W = Number(w) || 0;
  const H = Number(h) || 0;
  const boxW = 170;
  const boxH = 86;
  const s = W && H ? Math.min(boxW / W, boxH / H) : 0;
  const rw = Math.max(W * s, 6);
  const rh = Math.max(H * s, 6);
  const x = 44 + (boxW - rw) / 2;
  const y = 10 + (boxH - rh) / 2;
  return (
    <svg viewBox="0 0 230 128" className="h-auto w-full max-w-[260px] text-ink-3" role="img" aria-label={`Croquis ${num(W)} por ${num(H)} metros`}>
      <rect x={x} y={y} width={rw} height={rh} fill="rgb(var(--accent) / 0.12)" stroke="rgb(var(--accent))" strokeWidth="1.5" />
      {/* cota horizontal */}
      <g stroke="currentColor" strokeWidth="1" fill="none">
        <path d={`M${x} ${y + rh + 4}v12M${x + rw} ${y + rh + 4}v12`} />
        <path d={`M${x} ${y + rh + 12}H${x + rw}`} />
        <path d={`M${x + 5} ${y + rh + 9}l-5 3 5 3M${x + rw - 5} ${y + rh + 9}l5 3-5 3`} />
        {/* cota vertical */}
        <path d={`M${x - 4} ${y}h-12M${x - 4} ${y + rh}h-12`} />
        <path d={`M${x - 12} ${y}V${y + rh}`} />
        <path d={`M${x - 15} ${y + 5}l3 -5 3 5M${x - 15} ${y + rh - 5}l3 5 3-5`} />
      </g>
      <text x={x + rw / 2} y={y + rh + 26} textAnchor="middle" fill="rgb(var(--ink-2))" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        {num(W)} m
      </text>
      <text
        x={x - 18}
        y={y + rh / 2}
        textAnchor="middle"
        fill="rgb(var(--ink-2))"
        fontSize="11"
        fontFamily="IBM Plex Mono, monospace"
        transform={`rotate(-90 ${x - 18} ${y + rh / 2})`}
      >
        {num(H)} m
      </text>
    </svg>
  );
}

