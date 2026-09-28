import React from 'react';
import { Check, Field, Input } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import DimensionSketch from '../../../components/DimensionSketch.jsx';
import { F1_LIGHTS, F1_MODALITIES, f1Geometry } from '../../../lib/families/f1-anuncios3d.js';
import { num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';

export default function F1Form({ p, set, catalog, fid }) {
  const g = f1Geometry(p, catalog.rules);
  const letters = p.modality === 'letras';
  return (
    <div className="flex flex-col gap-5">
      <div className="grid-cols-1 grid gap-3">
        <Choice label="Modalidad" id={fid('mod')} options={F1_MODALITIES} value={p.modality} onChange={(v) => set({ modality: v })} />
        <Choice label="Tipo de luz" id={fid('light')} options={F1_LIGHTS} value={p.light} onChange={(v) => set({ light: v })} />
      </div>

      <Section title="Dimensiones">
        {letters && (
          <div className="mb-3 grid grid-cols-[1fr_120px] gap-3">
            <Field label="Texto" htmlFor={fid('txt')}>
              <Input id={fid('txt')} className="font-display text-lg tracking-wider" value={p.text} placeholder="NOMBRE" onChange={(e) => set({ text: e.target.value, letterCount: e.target.value.replace(/\s/g, '').length || p.letterCount })} />
            </Field>
            <Num label="Nº de letras" id={fid('n')} step="1" value={p.letterCount} onChange={(v) => set({ letterCount: v })} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Num label={letters ? 'Largo total' : 'Ancho'} id={fid('w')} unit="m" step="0.01" value={p.width} onChange={(v) => set({ width: v })} />
          <Num label={letters ? 'Altura de letra' : 'Alto'} id={fid('h')} unit="m" step="0.01" value={p.height} onChange={(v) => set({ height: v })} />
          <Num label="Cantidad" id={fid('q')} unit="pza" step="1" min={1} value={p.qty} onChange={(v) => set({ qty: v })} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <DimensionSketch w={p.width} h={p.height} />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Stat label="Envolvente" value={num(g.env, 3)} unit="m²" />
            <Stat label="Cara (frente/base)" value={num(g.face, 3)} unit="m²" />
            <Stat label={letters ? 'Desarrollo' : 'Perímetro'} value={num(g.edge, 2)} unit="m.l." />
            <Stat label="Perímetro rectangular" value={num(g.perimRect, 2)} unit="m.l." />
          </div>
        </div>
      </Section>

      <Section title="Componentes desde el catálogo">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Base posterior (m²)" htmlFor={fid('base')}>
            <ItemSelect id={fid('base')} catalog={catalog} categories={['Rígidos']} value={p.baseId} onChange={(v) => set({ baseId: v })} />
          </Field>
          <Field label="Canto lateral (m.l.)" htmlFor={fid('canto')}>
            <ItemSelect id={fid('canto')} catalog={catalog} categories={['Perfiles y Canales', 'Rígidos']} filter={(i) => i.unit === 'ml' || i.category === 'Rígidos'} value={p.cantoId} onChange={(v) => set({ cantoId: v })} />
          </Field>
          <Field label="Frente (m²)" htmlFor={fid('frente')}>
            <ItemSelect id={fid('frente')} catalog={catalog} categories={['Rígidos']} value={p.frenteId} onChange={(v) => set({ frenteId: v })} />
          </Field>
          <Field label="Rotulación del frente (m²)" htmlFor={fid('rot')}>
            <ItemSelect id={fid('rot')} catalog={catalog} categories={['Viniles']} noneLabel="Sin rotulación" value={p.rotId} onChange={(v) => set({ rotId: v })} />
          </Field>
          {p.rotId && <Num label="Cobertura de rotulación" id={fid('cov')} unit="%" step="5" value={p.rotCoverage} onChange={(v) => set({ rotCoverage: v })} />}
          {p.light === 'directa' && (
            <Field label="Remate del frente" htmlFor={fid('silva')}>
              <div className="flex flex-col gap-2">
                <Check id={fid('silva')} label="Silvatrim perimetral" checked={p.silvatrim} onChange={(v) => set({ silvatrim: v })} />
                {p.silvatrim && <ItemSelect id={fid('silvaId')} catalog={catalog} categories={['Perfiles y Canales']} filter={(i) => i.unit === 'ml'} value={p.silvatrimId} onChange={(v) => set({ silvatrimId: v })} />}
              </div>
            </Field>
          )}
          {p.light !== 'sin' && (
            <Field label="Módulo LED (la fuente se calcula por potencia)" htmlFor={fid('led')}>
              <ItemSelect id={fid('led')} catalog={catalog} categories={['Iluminación']} filter={(i) => Number(i.watts) > 0 && Number(i.watts) < 5} value={p.ledId} onChange={(v) => set({ ledId: v })} />
            </Field>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {p.modality !== 'caja_rect' && <Check id={fid('cnc')} label="Corte CNC router" checked={p.cnc} onChange={(v) => set({ cnc: v })} />}
          <Check id={fid('kit')} label="Tornillería y cableado" checked={p.kit} onChange={(v) => set({ kit: v })} />
          <Check id={fid('labor')} label="Mano de obra de armado" checked={p.labor} onChange={(v) => set({ labor: v })} />
        </div>
      </Section>
    </div>
  );
}
