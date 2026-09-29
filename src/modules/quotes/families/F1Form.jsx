import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, FileUp, ImagePlus, Lightbulb, Plus, Trash2, Wand2 } from 'lucide-react';
import { measureSvg, rasterizeSvg } from '../../../lib/svg/measure.js';
import { Button, Check, Field, IconButton, Input, NumberInput, Select, cx } from '../../../components/ui.jsx';
import { ItemSelect } from '../../../components/inventory-ui.jsx';
import { CANTO_COLORS, FRENTE_COLORS } from '../../../data/inventory.js';
import { makeCtx } from '../../../lib/families/index.js';
import { F1_LIGHTS, F1_MODALITIES, elementGeometry, newElement, psuCombo, signTotals, suggestLeds } from '../../../lib/families/f1-anuncios3d.js';
import { readFileForStorage } from '../../../lib/files.js';
import { mxn, num } from '../../../lib/format.js';
import { Choice, Num, Section, Stat } from './shared.jsx';
import LedMapModal from './LedMapModal.jsx';
import { modalityLabel } from '../../../lib/led/mask.js';

const SILVA_COLORS = ['Blanco', 'Negro', 'Rojo', 'Azul', 'Amarillo', 'Dorado', 'Plata', 'Aluminio natural'];

function ColorField({ id, label, options, value, custom, onChange }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex flex-col gap-1.5">
        <Select id={id} value={value} onChange={(e) => onChange({ color: e.target.value })}>
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {value === 'Color especial' && <Input id={`${id}-c`} value={custom} placeholder="Pantone / RAL / muestra" onChange={(e) => onChange({ custom: e.target.value })} />}
      </div>
    </Field>
  );
}

function ElementImage({ id, image, onChange }) {
  const [over, setOver] = useState(false);
  const pick = async (files) => {
    const f = [...files].find((x) => x.type.startsWith('image/'));
    if (!f) return;
    const r = await readFileForStorage(f);
    onChange(r.data ? { name: r.name, type: r.type, size: r.size, data: r.data } : null);
  };
  if (image?.data) {
    return (
      <div className="flex items-center gap-3">
        <img src={image.data} alt={`Referencia: ${image.name}`} className="h-20 w-28 rounded-md border border-line bg-[repeating-conic-gradient(rgb(var(--surface-2))_0_25%,transparent_0_50%)] bg-[length:12px_12px] object-contain" />
        <div className="min-w-0 text-[12px]">
          <div className="truncate font-medium">{image.name}</div>
          <div className="mt-1 flex gap-2">
            <label htmlFor={id} className="cursor-pointer text-accent hover:underline">
              Cambiar
            </label>
            <button type="button" className="text-bad hover:underline" onClick={() => onChange(null)}>
              Quitar
            </button>
          </div>
        </div>
        <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.length && pick(e.target.files)} />
      </div>
    );
  }
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      className={cx(
        'flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-[12.5px] transition',
        over ? 'border-accent bg-accent/5 text-accent' : 'border-line text-ink-2 hover:border-accent/60',
      )}
    >
      <ImagePlus size={17} />
      Logotipo o render de referencia (arrastra o toca)
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.length && pick(e.target.files)} />
    </label>
  );
}

const MEASURE_MODES = [
  { id: 'manual', name: 'Manual (base × altura)' },
  { id: 'svg', name: 'Desde archivo SVG' },
];

/** Carga un SVG, lo mide y escala las medidas al ancho deseado. */
function SvgMeasure({ el, set, k, rules }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const g = elementGeometry(el, rules);
  const load = async (files) => {
    const file = [...files].find((f) => /svg/i.test(f.type) || /\.svg$/i.test(f.name));
    if (!file) return setError('Elige un archivo .svg (exportado desde Illustrator, CorelDRAW o Inkscape).');
    setBusy(true);
    setError('');
    const text = await file.text();
    const m = measureSvg(text);
    if (!m.ok) {
      setBusy(false);
      return setError(m.error);
    }
    const preview = await rasterizeSvg(text);
    set({ svg: { ...m, name: file.name, preview }, letterCount: el.modality === 'letras' ? m.pieces : el.letterCount });
    setBusy(false);
  };
  const s = el.svg;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2/40 p-3">
      <label
        htmlFor={k('svgf')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          load(e.dataTransfer.files);
        }}
        className={cx(
          'flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-[12.5px] transition',
          over ? 'border-accent bg-accent/5 text-accent' : 'border-line text-ink-2 hover:border-accent/60',
        )}
      >
        {s?.preview ? (
          <img src={s.preview} alt={`Vista previa de ${s.name}`} className="h-20 w-32 shrink-0 rounded border border-line bg-white object-contain" />
        ) : (
          <FileUp size={22} className="shrink-0" />
        )}
        <span className="min-w-0">
          <span className="block font-medium text-ink">{busy ? 'Leyendo vectores…' : s ? s.name : 'Subir logotipo o arte en SVG'}</span>
          <span className="block text-ink-3">{s ? 'Toca para reemplazar' : 'Textos convertidos a curvas · se miden contornos y calados'}</span>
        </span>
        <input id={k('svgf')} type="file" accept=".svg,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.length && load(e.target.files)} />
      </label>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
      {s?.ok && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Num label="Ancho total deseado" id={k('svgw')} unit="cm" step="1" value={el.svgWidthCm} onChange={(v) => set({ svgWidthCm: v })} />
            <Stat label="Alto resultante" value={num(g.H * 100, 1)} unit="cm" />
            <Num label="Cantidad" id={k('q')} unit="pza" step="1" min={1} value={el.qty} onChange={(v) => set({ qty: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Canto (ext. + calados)" value={num(g.edge, 2)} unit="m.l." />
            <Stat label="Área neta de cara" value={num(g.face, 3)} unit="m²" />
            <Stat label="Contornos exteriores" value={num(g.outer, 2)} unit="m.l." />
            <Stat label="Calados interiores" value={num(g.inner, 2)} unit="m.l." />
          </div>
          <p className="text-[12px] text-ink-3">
            {s.pieces} piezas · {s.holes} calados · {s.shapes} contornos leídos
          </p>
          {isLetters(el) && (
            <Field label="Texto (para la ficha)" htmlFor={k('stxt')}>
              <Input id={k('stxt')} className="font-display tracking-wider" value={el.text} placeholder="POLLO SINALOA" onChange={(e) => set({ text: e.target.value })} />
            </Field>
          )}
          {s.warnings?.length > 0 && (
            <ul className="flex flex-col gap-1 text-[12px] text-warn-ink">
              {s.warnings.map((w) => (
                <li key={w} className="flex gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
const isLetters = (el) => el.modality === 'letras';

function ElementCard({ el, index, rules, onChange, onRemove, canRemove, fid }) {
  const [open, setOpen] = useState(true);
  const set = (patch) => onChange({ ...el, ...patch });
  const g = elementGeometry(el, rules);
  const letters = el.modality === 'letras';
  const k = (s) => fid(`el${index}-${s}`);
  const mod = F1_MODALITIES.find((m) => m.id === el.modality);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/40 px-3 py-2">
        {el.image?.data ? (
          <img src={el.image.data} alt="" className="h-10 w-10 shrink-0 rounded border border-line object-contain" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line font-mono text-[12px] text-ink-3">{index + 1}</span>
        )}
        <div className="min-w-0 flex-1">
          <input
            id={k('name')}
            aria-label={`Nombre del elemento ${index + 1}`}
            value={el.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full rounded bg-transparent px-1 font-medium outline-none focus:bg-surface"
          />
          <div className="truncate px-1 text-[11.5px] text-ink-3">
            {mod?.short}{g.fromSvg ? ' · SVG' : ''} · cara {num(g.face, 2)} m² · canto {num(g.edge, 2)} m.l.
          </div>
        </div>
        {canRemove && <IconButton icon={Trash2} label={`Quitar ${el.name}`} onClick={onRemove} className="hover:text-bad" />}
        <IconButton icon={ChevronDown} label={open ? 'Contraer' : 'Expandir'} onClick={() => setOpen((o) => !o)} className={cx('transition', !open && '-rotate-90')} />
      </div>
      {open && (
        <div className="flex flex-col gap-4 p-3">
          <div className="grid-cols-1 grid gap-3">
            <Choice label="Modalidad" id={k('mod')} options={F1_MODALITIES} value={el.modality} onChange={(v) => set({ modality: v })} />
            <Choice label="Tipo de luz" id={k('light')} options={F1_LIGHTS} value={el.light} onChange={(v) => set({ light: v })} />
          </div>
          <Choice label="Medidas" id={k('mm')} options={MEASURE_MODES} value={el.measureMode ?? 'manual'} onChange={(v) => set({ measureMode: v })} />
          {el.measureMode === 'svg' ? (
            <SvgMeasure el={el} set={set} k={k} rules={rules} />
          ) : (
            <>
              {letters && (
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <Field label="Texto" htmlFor={k('txt')}>
                    <Input id={k('txt')} className="font-display text-lg tracking-wider" value={el.text} placeholder="POLLO SINALOA" onChange={(e) => set({ text: e.target.value, letterCount: e.target.value.replace(/\s/g, '').length || el.letterCount })} />
                  </Field>
                  <Num label="Nº de letras" id={k('n')} step="1" value={el.letterCount} onChange={(v) => set({ letterCount: v })} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Num label={letters ? 'Largo total' : 'Base'} id={k('w')} unit="m" step="0.01" value={el.width} onChange={(v) => set({ width: v })} />
                <Num label={letters ? 'Altura de letra' : 'Altura'} id={k('h')} unit="m" step="0.01" value={el.height} onChange={(v) => set({ height: v })} />
                <Num label="Cantidad" id={k('q')} unit="pza" step="1" min={1} value={el.qty} onChange={(v) => set({ qty: v })} />
              </div>
            </>
          )}

          <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
            <Choice label="Canto de aluminio · profundidad" id={k('cs')} options={rules.f1.cantoSizes} value={el.cantoSize} onChange={(v) => set({ cantoSize: v })} />
            <ColorField id={k('cc')} label="Color de canto" options={CANTO_COLORS} value={el.cantoColor} custom={el.cantoColorCustom} onChange={({ color, custom }) => set(color != null ? { cantoColor: color } : { cantoColorCustom: custom })} />
            <Field label="Material del frente" htmlFor={k('fm')}>
              <Select id={k('fm')} value={el.frenteMat} onChange={(e) => set({ frenteMat: e.target.value })}>
                {rules.f1.frenteMaterials.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <ColorField id={k('fc')} label="Color del frente / acrílico" options={FRENTE_COLORS} value={el.frenteColor} custom={el.frenteColorCustom} onChange={({ color, custom }) => set(color != null ? { frenteColor: color } : { frenteColorCustom: custom })} />
            <Field label='Silvatrim / cercha 1"' htmlFor={k('sv')}>
              <div className="flex flex-col gap-1.5">
                <Check id={k('sv')} label={`Incluir · ${num(el.silvatrim ? g.silva : elementGeometry({ ...el, silvatrim: true }, rules).silva, 2)} m.l.`} checked={el.silvatrim} onChange={(v) => set({ silvatrim: v })} />
                {el.silvatrim && el.measureMode === 'svg' && el.svg?.ok && (
                  <Check id={k('svin')} label="También en calados interiores" checked={el.silvaInner !== false} onChange={(v) => set({ silvaInner: v })} />
                )}
                {el.silvatrim && (
                  <Select id={k('svc')} aria-label="Color de silvatrim" value={el.silvatrimColor} onChange={(e) => set({ silvatrimColor: e.target.value })}>
                    {SILVA_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </Field>
            <Field label="Vinil del frente" htmlFor={k('rot')}>
              <div className="grid grid-cols-[1fr_96px] gap-1.5">
                <Select id={k('rot')} value={el.rotId ?? ''} onChange={(e) => set({ rotId: e.target.value || null })}>
                  <option value="">Sin vinil</option>
                  <option value="vin-corte-tras">Vinil de corte traslúcido</option>
                  <option value="vin-impreso-trans">Vinil impreso transparente</option>
                  {el.rotId && !['vin-corte-tras', 'vin-impreso-trans'].includes(el.rotId) && <option value={el.rotId}>Otro vinil (capturado antes)</option>}
                </Select>
                {el.rotId && <NumberInput id={k('cov')} aria-label="Cobertura" unit="%" step="5" value={el.rotCoverage} onChange={(v) => set({ rotCoverage: v })} />}
              </div>
            </Field>
          </div>
          <ElementImage id={k('img')} image={el.image} onChange={(image) => set({ image })} />
        </div>
      )}
    </div>
  );
}

export default function F1Form({ p, set, catalog, fid }) {
  const [mapOpen, setMapOpen] = useState(false);
  const rules = catalog.rules;
  const elements = p.elements || [];
  const T = signTotals(p, rules);
  const suggested = suggestLeds(p, rules);
  const ctx = makeCtx(catalog);
  const watts = Math.max(0, Math.round(Number(p.ledQty) || 0)) * rules.f1.ledWatts;
  const combo = psuCombo(ctx, watts);
  const led = catalog.items.find((i) => i.id === p.ledId);
  const setEl = (i, el) => set({ elements: elements.map((x, k) => (k === i ? el : x)) });
  const addEl = (modality, name) => {
    const last = elements[elements.length - 1];
    // eslint-disable-next-line no-unused-vars
    const { id, image, text, ...base } = last ?? {};
    const el = newElement({ ...base, modality, name, ...(modality === 'letras' ? { width: 3, height: 0.5, letterCount: 8 } : modality === 'caja_contorno' ? { width: 1, height: 1 } : {}) });
    set({ elements: [...elements, el] });
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title={`Elementos del anuncio (${elements.length})`}>
        <div className="flex flex-col gap-3">
          {elements.map((el, i) => (
            <ElementCard key={el.id} el={el} index={i} rules={rules} fid={fid} canRemove={elements.length > 1} onChange={(x) => setEl(i, x)} onRemove={() => set({ elements: elements.filter((_, k) => k !== i) })} />
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={Plus} onClick={() => addEl('letras', 'Letras 3D')}>Letras 3D</Button>
            <Button size="sm" icon={Plus} onClick={() => addEl('caja_contorno', 'Icono a contorno')}>Caja a contorno</Button>
            <Button size="sm" icon={Plus} onClick={() => addEl('caja_rect', 'Caja rectangular')}>Caja rectangular</Button>
          </div>
        </div>
      </Section>

      <Section title="Totales del anuncio">
        <div className="scroll-x">
          <table className="w-full min-w-[420px] text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.06em] text-ink-3">
              <tr className="border-b border-line">
                <th className="py-1.5 font-medium">Elemento</th>
                <th className="py-1.5 text-right font-medium">Cara / base</th>
                <th className="py-1.5 text-right font-medium">Canto</th>
                <th className="py-1.5 text-right font-medium">Silvatrim</th>
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-line/70 font-mono">
              {T.per.map(({ el, g }, i) => (
                <tr key={el.id}>
                  <td className="py-1.5 font-sans">
                    <span className="font-medium">{modalityLabel(el.modality)}</span>
                    {el.name && el.name !== modalityLabel(el.modality) && <span className="block text-[11px] text-ink-3">{el.name}</span>}
                  </td>
                  <td className="py-1.5 text-right">{num(g.face, 3)} m²</td>
                  <td className="py-1.5 text-right">{num(g.edge, 2)} m.l.</td>
                  <td className="py-1.5 text-right">{num(g.silva, 2)} m.l.</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line font-medium">
                <td className="py-1.5 font-sans">Total</td>
                <td className="py-1.5 text-right">{num(T.face, 3)} m²</td>
                <td className="py-1.5 text-right">{num(T.edge, 2)} m.l.</td>
                <td className="py-1.5 text-right">{num(T.silva, 2)} m.l.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 max-w-sm">
          <Field label="Base posterior (todos los elementos)" htmlFor={fid('base')}>
            <ItemSelect id={fid('base')} catalog={catalog} categories={['Rígidos']} value={p.baseId} onChange={(v) => set({ baseId: v })} />
          </Field>
        </div>
      </Section>

      <Section title="Módulos LED y fuentes de poder">
        <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
          <Field label="Módulo LED" htmlFor={fid('led')}>
            <ItemSelect id={fid('led')} catalog={catalog} categories={['Iluminación']} filter={(i) => Number(i.watts) > 0 && Number(i.watts) < 5} value={p.ledId} onChange={(v) => set({ ledId: v })} />
          </Field>
          <Field label="Cantidad de módulos LED" htmlFor={fid('ledq')} hint={p.ledFromMap ? 'Tomado del mapa LED' : `Referencia por medidas: ${suggested} pzas · o genera el mapa LED`}>
            <div className="flex gap-1.5">
              <NumberInput id={fid('ledq')} unit="pzas" step="1" className="flex-1" value={p.ledQty} onChange={(v) => set({ ledQty: v, ledFromMap: false })} />
              <Button icon={Wand2} onClick={() => set({ ledQty: suggested, ledFromMap: false })} title="Usar la cantidad de referencia">
                {suggested}
              </Button>
            </div>
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Costo LED (venta)" value={mxn((Number(p.ledQty) || 0) * (led?.price ?? 0))} />
          <Stat label={`Consumo (× ${rules.f1.ledWatts} W)`} value={num(watts, 1)} unit="W" />
          <Stat label="Capacidad instalada" value={combo.reduce((s, c) => s + c.count * c.item.watts, 0)} unit="W" />
          <Stat label="Fuentes (venta)" value={mxn(combo.reduce((s, c) => s + c.count * c.item.price, 0))} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-line p-3">
          <Button variant="primary" icon={Lightbulb} onClick={() => setMapOpen(true)}>
            Ver mapa LED
          </Button>
          <span className="text-[12.5px] text-ink-3">
            Coloca módulos de 7 × 1 cm dentro de cada letra o figura (cada 14 cm, columnas a 4″, 1.5 cm de margen) y cuenta el total.
          </span>
        </div>
        {mapOpen && <LedMapModal open onClose={() => setMapOpen(false)} p={p} set={set} catalog={catalog} />}
        {combo.length > 0 && (
          <p className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-2">
            <Lightbulb size={14} className="text-warn" />
            Fuentes sugeridas: <b className="font-mono">{combo.map((c) => `${c.count} × ${c.item.watts} W`).join(' + ')}</b>
          </p>
        )}
      </Section>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check id={fid('cnc')} label="Corte CNC (contornos y letras)" checked={p.cnc} onChange={(v) => set({ cnc: v })} />
        <Check id={fid('kit')} label="Tornillería y cableado" checked={p.kit} onChange={(v) => set({ kit: v })} />
        <Check id={fid('labor')} label="Mano de obra de armado" checked={p.labor} onChange={(v) => set({ labor: v })} />
      </div>
    </div>
  );
}
