import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Button, Modal, Segmented } from '../../../components/ui.jsx';
import { LED_RULES, layoutLeds } from '../../../lib/led/layout.js';
import { elementShape, modalityLabel, rasterize } from '../../../lib/led/mask.js';
import { psuCombo } from '../../../lib/families/f1-anuncios3d.js';
import { makeCtx } from '../../../lib/families/index.js';
import { mxn, num } from '../../../lib/format.js';

const MODES = [
  { value: 'auto', label: 'Automático' },
  { value: 'spine', label: 'Trazo central' },
  { value: 'grid', label: 'Columnas a 4"' },
];
const LED = '#f43f5e';
const INK = '#18181b';

/** Dibuja silueta (negro), calados (blanco), módulos 7×1 cm y cable en serie a escala real. */
function drawMap(canvas, shape, lay, cssW) {
  const pad = 6;
  const s = Math.min((cssW - 24) / (shape.W + 2 * pad), 420 / (shape.H + 2 * pad));
  const cw = Math.round((shape.W + 2 * pad) * s);
  const ch = Math.round((shape.H + 2 * pad) * s) + 26;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(pad, pad);
  ctx.fillStyle = INK;
  shape.draw(ctx);
  if (lay) {
    const lw = Math.max(0.35, 1.2 / s);
    ctx.strokeStyle = LED;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const w of lay.wires) {
      ctx.beginPath();
      ctx.moveTo(w[0][0], w[0][1]);
      for (const p of w.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    ctx.setLineDash([2, 1.5]);
    ctx.globalAlpha = 0.75;
    for (const [a, b] of lay.jumpers) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = LED;
    for (const m of lay.modules) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillRect(-LED_RULES.moduleL / 2, -LED_RULES.moduleW / 2, LED_RULES.moduleL, LED_RULES.moduleW);
      ctx.restore();
    }
  }
  ctx.restore();
  // Escala gráfica de 10 cm
  const y = ch - 12;
  ctx.strokeStyle = '#52525b';
  ctx.fillStyle = '#52525b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, y);
  ctx.lineTo(10 + 10 * s, y);
  ctx.moveTo(10, y - 4);
  ctx.lineTo(10, y + 4);
  ctx.moveTo(10 + 10 * s, y - 4);
  ctx.lineTo(10 + 10 * s, y + 4);
  ctx.stroke();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillText('10 cm', 16 + 10 * s, y + 4);
}

function ElementMap({ el, index, mode, onMode, result, canvasRef }) {
  const wrap = useRef(null);
  useEffect(() => {
    if (!result?.shape || !canvasRef.current || !wrap.current) return;
    drawMap(canvasRef.current, result.shape, result.lay, wrap.current.clientWidth);
  }, [result, canvasRef]);
  const q = Math.max(1, Number(el.qty) || 1);
  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            {index + 1}. {modalityLabel(el.modality)}
          </div>
          <div className="truncate font-medium">{el.name}</div>
        </div>
        <div className="scroll-x no-scrollbar">
          <Segmented options={MODES} value={mode} onChange={onMode} />
        </div>
      </header>
      <div ref={wrap} className="p-3">
        {result?.error ? (
          <p className="flex items-center gap-2 py-6 text-[13px] text-warn-ink">
            <AlertTriangle size={16} /> {result.error}
          </p>
        ) : (
          <>
            <div className="scroll-x rounded-md border border-line">
              <canvas ref={canvasRef} role="img" aria-label={`Mapa LED de ${el.name}: ${result?.lay?.count ?? 0} módulos`} className="block" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
              <span>
                <b className="tnum font-mono text-ink">{result?.lay?.count ?? 0}</b> módulos por pieza{q > 1 ? ` × ${q} = ${(result?.lay?.count ?? 0) * q}` : ''}
              </span>
              <span className="text-ink-3">
                {result?.lay?.pieces.length} contorno(s) ·{' '}
                {result?.lay?.pieces.filter((p) => p.method === 'spine').length ? 'trazo central' : ''}
                {result?.lay?.pieces.some((p) => p.method === 'spine') && result?.lay?.pieces.some((p) => p.method === 'grid') ? ' + ' : ''}
                {result?.lay?.pieces.some((p) => p.method === 'grid') ? 'columnas' : ''}
              </span>
              <span className={result?.shape?.exact ? 'text-ink-3' : 'text-warn-ink'}>Silueta: {result?.shape?.source}</span>
              {result?.lay?.pieces.some((p) => p.count === 0) && (
                <span className="text-warn-ink">{result.lay.pieces.filter((p) => p.count === 0).length} pieza(s) muy delgadas para un módulo de 7 × 1 cm con 1.5 cm de margen</span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function LedMapModal({ open, onClose, p, set, catalog }) {
  const elements = p.elements || [];
  const [modes, setModes] = useState(() => Object.fromEntries(elements.map((e) => [e.id, e.ledMode || 'auto'])));
  const refs = useRef({});
  const results = useMemo(() => {
    if (!open) return {};
    const out = {};
    for (const el of elements) {
      try {
        const shape = elementShape(el);
        if (shape.error) {
          out[el.id] = { error: shape.error };
          continue;
        }
        const lay = layoutLeds(rasterize(shape), modes[el.id] || 'auto');
        out[el.id] = { shape, lay };
      } catch (e) {
        out[el.id] = { error: `No se pudo calcular: ${e.message}` };
      }
    }
    return out;
  }, [open, elements, modes]);

  const total = elements.reduce((s, e) => s + (results[e.id]?.lay?.count ?? 0) * Math.max(1, Number(e.qty) || 1), 0);
  const R = catalog.rules.f1;
  const watts = total * R.ledWatts;
  const combo = psuCombo(makeCtx(catalog), watts);
  const led = catalog.items.find((i) => i.id === p.ledId);
  const ledCost = total * (led?.price ?? 0);
  const psuCost = combo.reduce((s, c) => s + c.count * c.item.price, 0);

  const apply = () => {
    const next = elements.map((e) => {
      const r = results[e.id];
      if (!r?.lay) return e;
      let preview = null;
      const c = refs.current[e.id]?.current;
      try {
        if (c) {
          const t = document.createElement('canvas');
          const k = Math.min(1, 900 / c.width);
          t.width = Math.round(c.width * k);
          t.height = Math.round(c.height * k);
          t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
          preview = t.toDataURL('image/webp', 0.8);
          if (!preview.startsWith('data:image/webp')) preview = t.toDataURL('image/png');
        }
      } catch {
        preview = null;
      }
      return { ...e, ledMode: modes[e.id] || 'auto', ledCount: r.lay.count, ledMapPreview: preview };
    });
    set({ elements: next, ledQty: total, ledFromMap: true });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Mapa LED"
      subtitle="Módulos de 7 × 1 cm cada 14 cm, columnas a 4″ y 1.5 cm de margen a la pared, solo dentro del área sólida"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="tnum flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
            <span>
              <b className="font-mono text-ink">{total}</b> módulos
            </span>
            <span>
              {num(watts, 1)} W ({total} × {R.ledWatts} W)
            </span>
            <span>Fuentes: {combo.length ? combo.map((c) => `${c.count} × ${c.item.watts} W`).join(' + ') : '—'}</span>
            <span>
              LED {mxn(ledCost)} · fuentes {mxn(psuCost)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cerrar</Button>
            <Button variant="primary" icon={Check} disabled={!total} onClick={apply}>
              Usar {total} módulos
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {elements.map((el, i) => {
          refs.current[el.id] ||= React.createRef();
          return (
            <ElementMap
              key={el.id}
              el={el}
              index={i}
              mode={modes[el.id] || 'auto'}
              onMode={(v) => setModes((m) => ({ ...m, [el.id]: v }))}
              result={results[el.id]}
              canvasRef={refs.current[el.id]}
            />
          );
        })}
      </div>
    </Modal>
  );
}
