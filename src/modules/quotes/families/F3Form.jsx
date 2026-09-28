import React from 'react';
import { Field } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import DimensionSketch from '../../../components/DimensionSketch.jsx';
import { num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';

const STRUCT = [
  { id: 'sin', name: 'Sin bastidor (dobladillo y ojillos)' },
  { id: 'bastidor', name: 'Con bastidor de fierro' },
];

export default function F3Form({ p, set, catalog, fid }) {
  const W = Number(p.width) || 0;
  const H = Number(p.height) || 0;
  const R = catalog.rules.f3;
  const verticals = Math.max(0, Math.ceil(W / R.crossEvery) - 1);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid-cols-1 grid gap-3">
        <Field label="Tipo de lona" htmlFor={fid('lona')}>
          <ItemSelect id={fid('lona')} catalog={catalog} categories={['Lonas']} value={p.lonaId} onChange={(v) => set({ lonaId: v })} />
        </Field>
        <Choice label="Estructura" id={fid('st')} options={STRUCT} value={p.structure} onChange={(v) => set({ structure: v })} />
      </div>
      <Section title="Medidas">
        <div className="grid grid-cols-3 gap-3">
          <Num label="Base" id={fid('w')} unit="m" step="0.01" value={p.width} onChange={(v) => set({ width: v })} />
          <Num label="Altura" id={fid('h')} unit="m" step="0.01" value={p.height} onChange={(v) => set({ height: v })} />
          <Num label="Piezas" id={fid('q')} unit="pza" step="1" min={1} value={p.qty} onChange={(v) => set({ qty: v })} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <DimensionSketch w={p.width} h={p.height} />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Stat label="Superficie" value={num(W * H, 3)} unit="m²" />
            <Stat label="Perímetro" value={num(2 * (W + H), 2)} unit="m.l." />
            {p.structure === 'bastidor' && <Stat label="Perfil tubular" value={num(2 * (W + H) + verticals * H, 2)} unit="m.l." />}
            {p.structure === 'bastidor' && <Stat label="Travesaños" value={verticals} unit={`c/${num(R.crossEvery)} m`} />}
          </div>
        </div>
      </Section>
    </div>
  );
}
