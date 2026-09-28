import React from 'react';
import { Check, Field } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { F5_GRAPHICS, F5_MOUNTS } from '../../../lib/families/f5-senaletica.js';
import { num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';

const SUBSTRATES = [
  { id: 'rigido', name: 'Placa (acrílico / ACM)' },
  { id: 'vinil_muro', name: 'Vinil de corte sobre muro' },
];

export default function F5Form({ p, set, catalog, fid }) {
  const wall = p.substrate === 'vinil_muro';
  const W = Number(p.width) || 0;
  const H = Number(p.height) || 0;
  return (
    <div className="flex flex-col gap-5">
      <Section title="Sustrato">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Choice label="Tipo" id={fid('sub')} options={SUBSTRATES} value={p.substrate} onChange={(v) => set({ substrate: v, materialId: v === 'rigido' ? 'rig-acr-cristal' : 'vin-corte' })} />
          <Field label="Material" htmlFor={fid('mat')}>
            <ItemSelect id={fid('mat')} catalog={catalog} categories={[wall ? 'Viniles' : 'Rígidos']} value={p.materialId} onChange={(v) => set({ materialId: v })} />
          </Field>
          {!wall && <Choice label="Gráfico" id={fid('gr')} options={F5_GRAPHICS} value={p.graphic} onChange={(v) => set({ graphic: v })} />}
          {(wall || p.graphic === 'corte') && <Num label="Cobertura del vinil" id={fid('cov')} unit="%" step="5" value={p.coverage} onChange={(v) => set({ coverage: v })} />}
        </div>
      </Section>
      <Section title="Medidas">
        <div className="grid grid-cols-3 gap-3">
          <Num label="Ancho" id={fid('w')} unit="m" step="0.01" value={p.width} onChange={(v) => set({ width: v })} />
          <Num label="Alto" id={fid('h')} unit="m" step="0.01" value={p.height} onChange={(v) => set({ height: v })} />
          <Num label="Piezas" id={fid('q')} unit="pza" step="1" min={1} value={p.qty} onChange={(v) => set({ qty: v })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
          <Stat label="Área por pieza" value={num(W * H, 3)} unit="m²" />
          <Stat label="Medida" value={`${num(W * 100, 0)}×${num(H * 100, 0)}`} unit="cm" />
        </div>
      </Section>
      {!wall && (
        <Section title="Montaje">
          <div className="flex flex-col gap-3">
            <Choice label="Tipo de montaje" id={fid('mnt')} options={F5_MOUNTS} value={p.mounting} onChange={(v) => set({ mounting: v })} />
            <Check id={fid('cnc')} label="Corte CNC de contorno" checked={p.cnc} onChange={(v) => set({ cnc: v })} />
          </div>
        </Section>
      )}
    </div>
  );
}
