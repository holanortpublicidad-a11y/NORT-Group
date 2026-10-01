import React from 'react';
import { cx } from './ui.jsx';

const isUpper = (s) => /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase();

/** Bloque "Etiqueta: texto" con la etiqueta en negritas. */
function Labeled({ text }) {
  const i = text.indexOf(':');
  if (i > 0 && i < 90) {
    return (
      <>
        <b>{text.slice(0, i + 1)}</b>
        {text.slice(i + 1)}
      </>
    );
  }
  return text;
}

/**
 * Renderiza texto legal plano con formato:
 *   LÍNEAS EN MAYÚSCULAS → títulos · "- Etiqueta: texto" → viñeta · "  * texto" → sub-viñeta · "1. Etiqueta: …" → numeral
 * `tone="paper"` para documentos impresos (colores fijos), `tone="ui"` para la interfaz.
 */
export default function LegalText({ text, tone = 'paper', className, compact }) {
  const lines = String(text || '').split('\n');
  const head = tone === 'paper' ? 'text-[#1a1f2b]' : 'text-ink';
  const body = tone === 'paper' ? 'text-[#3a4150]' : 'text-ink-2';
  return (
    <div className={cx(compact ? 'text-[10.5px] leading-[1.45]' : 'text-[12px] leading-relaxed', body, className)}>
      {lines.map((raw, k) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={k} className={compact ? 'h-1.5' : 'h-2'} />;
        const t = line.trim();
        if (/^\*/.test(t)) return <p key={k} className="pl-6 -indent-3">• <Labeled text={t.replace(/^\*\s*/, '')} /></p>;
        if (/^-\s/.test(t)) return <p key={k} className="pl-4 -indent-3">– <Labeled text={t.slice(2)} /></p>;
        const num = /^(\d+)\.\s+(.*)$/.exec(t);
        if (num && isUpper(num[2])) return <h4 key={k} className={cx('mt-2 font-semibold uppercase tracking-[0.04em]', head)}>{t}</h4>;
        if (num) return <p key={k} className="pl-4 -indent-3">{num[1]}. <Labeled text={num[2]} /></p>;
        if (isUpper(t) && !/^(PRESTADOR|CLIENTE|COTIZACIÓN|FECHA|ASESOR)/.test(t)) return <h4 key={k} className={cx('mt-2 font-semibold uppercase tracking-[0.04em]', head)}>{t}</h4>;
        return <p key={k}><Labeled text={t} /></p>;
      })}
    </div>
  );
}
