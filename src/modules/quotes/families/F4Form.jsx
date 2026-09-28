import React from 'react';
import { Check, Field } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { F4_TYPES, stickerLayout } from '../../../lib/families/f4-vehicular.js';
import { num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';

const MODES = [
  { id: 'vehicular', name: 'A · Rotulación vehicular' },
  { id: 'stickers', name: 'B · Stickers en planilla' },
];

export default function F4Form({ p, set, catalog, fid }) {
  const R = catalog.rules.f4;
  return (
    <div className="flex flex-col gap-5">
      <Choice label="Modalidad" id={fid('mode')} options={MODES} value={p.mode} onChange={(v) => set({ mode: v })} />
      {p.mode === 'vehicular' ? <Vehicular p={p} set={set} catalog={catalog} fid={fid} R={R} /> : <Stickers p={p} set={set} catalog={catalog} fid={fid} />}
    </div>
  );
}

function Vehicular({ p, set, catalog, fid, R }) {
  const veh = R.vehicles.find((v) => v.id === p.vehicleId) ?? R.vehicles[0];
  const auto = (veh.m2 * (R.coverage[p.vtype] ?? 100)) / 100;
  return (
    <>
      <div className="grid-cols-1 grid gap-3">
        <Choice label="Tipo de rotulación" id={fid('vt')} options={F4_TYPES} value={p.vtype} onChange={(v) => set({ vtype: v })} />
        <Choice label="Vehículo (define m² y complejidad)" id={fid('veh')} options={R.vehicles} value={p.vehicleId} onChange={(v) => set({ vehicleId: v })} />
      </div>
      <Section title="Material">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Vinil" htmlFor={fid('vin')}>
            <ItemSelect id={fid('vin')} catalog={catalog} categories={['Viniles']} value={p.vinylId} onChange={(v) => set({ vinylId: v, laminate: /impreso/i.test(catalog.items.find((i) => i.id === v)?.name ?? '') ? true : p.laminate })} />
          </Field>
          <div className="flex items-end pb-2">
            <Check id={fid('lam')} label="Laminado de protección UV" hint="Recomendado para vinil impreso" checked={p.laminate} onChange={(v) => set({ laminate: v })} />
          </div>
        </div>
      </Section>
      <Section title="Superficie">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Num label="m² por unidad" id={fid('m2')} unit="m²" step="0.1" placeholder={num(auto, 2)} hint={`Automático: ${num(auto, 2)} m² (${R.coverage[p.vtype]}% de ${veh.m2} m²)`} value={p.m2Override} onChange={(v) => set({ m2Override: v })} />
          <Num label="Unidades" id={fid('q')} unit="veh" step="1" min={1} value={p.qty} onChange={(v) => set({ qty: v })} />
          <Stat label="Complejidad" value={`×${num(veh.factor, 2)}`} />
        </div>
      </Section>
    </>
  );
}

function Stickers({ p, set, catalog, fid }) {
  const L = stickerLayout(p, catalog.rules);
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Num label="Ancho" id={fid('sw')} unit="cm" step="0.5" value={p.wCm} onChange={(v) => set({ wCm: v })} />
        <Num label="Alto" id={fid('sh')} unit="cm" step="0.5" value={p.hCm} onChange={(v) => set({ hCm: v })} />
        <Num label="Piezas" id={fid('sp')} unit="pza" step="50" value={p.pieces} onChange={(v) => set({ pieces: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Por fila" value={L.perRow} unit="pzas" />
        <Stat label="Filas" value={L.rows} />
        <Stat label="Largo de planilla" value={num(L.lengthM, 2)} unit="m" />
        <Stat label="Material" value={num(L.m2, 2)} unit="m²" />
      </div>
      <Check id={fid('slam')} label="Laminado (mate o brillo)" checked={p.stickerLam} onChange={(v) => set({ stickerLam: v })} />
    </>
  );
}
