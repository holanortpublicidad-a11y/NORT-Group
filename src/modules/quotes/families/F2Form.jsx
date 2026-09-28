import React from 'react';
import { Check, Field } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { F2_GRAPHICS, F2_LAMINATES } from '../../../lib/families/f2-granformato.js';
import { num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';

const BASES = [
  { id: 'rigido', name: 'Rígido' },
  { id: 'flexible', name: 'Sustrato flexible' },
];

export default function F2Form({ p, set, catalog, fid }) {
  const rigid = p.baseType === 'rigido';
  const area = (Number(p.width) || 0) * (Number(p.height) || 0) * (Number(p.qty) || 0);
  return (
    <div className="flex flex-col gap-5">
      <Section title="Material base">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Choice label="Tipo" id={fid('base')} options={BASES} value={p.baseType} onChange={(v) => set({ baseType: v, materialId: v === 'rigido' ? 'rig-coro4' : 'vin-micro' })} />
          <Field label={rigid ? 'Rígido (Coroplast, PVC, ACM, acrílico…)' : 'Vinil (microperforado, impreso, esmerilado…)'} htmlFor={fid('mat')}>
            <ItemSelect id={fid('mat')} catalog={catalog} categories={[rigid ? 'Rígidos' : 'Viniles']} value={p.materialId} onChange={(v) => set({ materialId: v })} />
          </Field>
          {rigid && <Choice label="Gráfico sobre el rígido" id={fid('gr')} options={F2_GRAPHICS} value={p.graphic} onChange={(v) => set({ graphic: v })} />}
        </div>
      </Section>
      <Section title="Medidas">
        <div className="grid grid-cols-3 gap-3">
          <Num label="Base" id={fid('w')} unit="m" step="0.01" value={p.width} onChange={(v) => set({ width: v })} />
          <Num label="Altura" id={fid('h')} unit="m" step="0.01" value={p.height} onChange={(v) => set({ height: v })} />
          <Num label="Piezas" id={fid('q')} unit="pza" step="1" min={1} value={p.qty} onChange={(v) => set({ qty: v })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
          <Stat label="Superficie total" value={num(area, 3)} unit="m²" />
          <Stat label="Por pieza" value={num((Number(p.width) || 0) * (Number(p.height) || 0), 3)} unit="m²" />
        </div>
      </Section>
      <Section title="Acabados especiales">
        <div className="flex flex-col gap-3">
          <Choice label="Plastificado / laminado" id={fid('lam')} options={F2_LAMINATES} value={p.laminado} onChange={(v) => set({ laminado: v })} />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Check id={fid('ref')} label="Corte a pliego / refile" checked={p.refile} onChange={(v) => set({ refile: v })} />
            <Check id={fid('tro')} label="Troquelado / corte de forma en plotter" checked={p.troquel} onChange={(v) => set({ troquel: v })} />
          </div>
        </div>
      </Section>
    </div>
  );
}
