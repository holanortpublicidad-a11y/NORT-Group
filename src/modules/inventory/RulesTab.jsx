import React, { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, Card, Field, IconButton, Input, NumberInput, Segmented } from '../../components/ui.jsx';
import { storageUsageKB } from '../../lib/storage.js';
import { DEFAULT_SETTINGS } from '../../data/legal.js';
import LegalText from '../../components/LegalText.jsx';
import { uid } from '../../lib/format.js';

const getIn = (obj, path) => path.reduce((o, k) => (o == null ? o : o[k]), obj);

function useRules() {
  const { state, dispatch } = useApp();
  const rules = state.catalog.rules;
  const set = (path, value) => dispatch({ type: 'RULES_SET', path, value });
  return { rules, set };
}

/** Campo numérico ligado a una ruta de las reglas. `scale` convierte (p. ej. 0.16 ↔ 16 %). */
function R({ path, label, unit, step = 'any', hint, scale = 1, editable }) {
  const { rules, set } = useRules();
  const v = getIn(rules, path);
  return (
    <Field label={label} htmlFor={`r-${path.join('-')}`} hint={hint}>
      <NumberInput id={`r-${path.join('-')}`} unit={unit} step={step} disabled={!editable} value={v == null ? '' : Math.round(v * scale * 1000) / 1000} onChange={(x) => set(path, (Number(x) || 0) / scale)} />
    </Field>
  );
}

function Block({ title, desc, children }) {
  return (
    <Card className="p-4">
      <h3 className="font-display text-lg font-semibold tracking-wide">{title}</h3>
      {desc && <p className="mb-3 text-[12.5px] text-ink-3">{desc}</p>}
      <div className={desc ? '' : 'mt-3'}>{children}</div>
    </Card>
  );
}

/** Tabla editable para listas dentro de las reglas (vehículos, escalones, superficies…). */
function RuleList({ path, cols, editable, newRow }) {
  const { rules, set } = useRules();
  const list = getIn(rules, path) || [];
  const upd = (i, k, v) => set([...path, i, k], v);
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[360px] text-[13px]">
        <thead className="text-left text-[11.5px] text-ink-3">
          <tr>
            {cols.map((c) => <th key={c.key} className="pb-1.5 pr-2 font-medium">{c.label}</th>)}
            {editable && newRow && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {list.map((row, i) => (
            <tr key={row.id ?? i}>
              {cols.map((c) => (
                <td key={c.key} className="py-1 pr-2">
                  {c.type === 'text' ? (
                    <Input id={`rl-${path.join('-')}-${i}-${c.key}`} disabled={!editable} value={row[c.key]} onChange={(e) => upd(i, c.key, e.target.value)} />
                  ) : (
                    <NumberInput id={`rl-${path.join('-')}-${i}-${c.key}`} unit={c.unit} step={c.step ?? 'any'} disabled={!editable} value={row[c.key]} onChange={(v) => upd(i, c.key, Number(v) || 0)} />
                  )}
                </td>
              ))}
              {editable && newRow && (
                <td>
                  <IconButton icon={Trash2} label="Quitar" onClick={() => set(path, list.filter((_, k) => k !== i))} className="hover:text-bad" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && newRow && (
        <Button size="sm" variant="ghost" icon={Plus} className="mt-1" onClick={() => set(path, [...list, newRow()])}>
          Agregar
        </Button>
      )}
    </div>
  );
}

const G = 'grid-cols-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-3';

export function GeneralRules({ editable }) {
  return (
    <div className="grid-cols-1 grid gap-4 lg:grid-cols-2">
      <Block title="Generales" desc="Aplican a todas las cotizaciones nuevas">
        <div className={G}>
          <R editable={editable} path={['params', 'iva']} scale={100} unit="%" label="IVA" />
          <R editable={editable} path={['params', 'advancePct']} unit="%" label="Anticipo por defecto" />
          <R editable={editable} path={['params', 'validityDays']} unit="días" label="Vigencia" />
          <R editable={editable} path={['params', 'wastePct']} unit="%" label="Merma de material" hint="Se suma a m² y m.l. de rígidos, viniles, lonas y perfiles" />
          <R editable={editable} path={['params', 'marginWarn']} unit="%" label="Margen en amarillo bajo" />
          <R editable={editable} path={['params', 'marginBad']} unit="%" label="Margen en rojo bajo" />
        </div>
      </Block>
      <DataBlock />
      <div className="lg:col-span-2">
        <LegalBlock />
      </div>
    </div>
  );
}

/** Términos y condiciones + plantilla de contrato. Solo el Administrador edita. */
function LegalBlock() {
  const { state, dispatch, role } = useApp();
  const admin = role === 'admin';
  const st = state.settings || DEFAULT_SETTINGS;
  const [tab, setTab] = useState('terms');
  const [confirm, setConfirm] = useState(false);
  const key = tab === 'terms' ? 'terms' : 'contract';
  return (
    <Block
      title="Documentos legales"
      desc={admin ? 'Se incluyen por defecto en todas las cotizaciones y contratos. Solo el Administrador puede editarlos.' : 'Solo lectura: únicamente el Administrador puede editar estos textos.'}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="scroll-x no-scrollbar">
          <Segmented
            options={[
              { value: 'terms', label: 'Términos y condiciones' },
              { value: 'contract', label: 'Contrato de publicidad' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {admin &&
          (confirm ? (
            <span className="flex items-center gap-2 text-[12.5px]">
              ¿Volver al texto oficial?
              <Button size="sm" variant="danger" onClick={() => { dispatch({ type: 'SETTINGS_SET', patch: { [key]: DEFAULT_SETTINGS[key] } }); setConfirm(false); }}>Restablecer</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button>
            </span>
          ) : (
            <Button size="sm" icon={RotateCcw} onClick={() => setConfirm(true)}>Texto oficial</Button>
          ))}
      </div>
      {admin ? (
        <>
          <textarea
            id={`legal-${key}`}
            aria-label={tab === 'terms' ? 'Términos y condiciones' : 'Plantilla del contrato'}
            className="input min-h-[360px] font-mono text-[12px] leading-relaxed"
            value={st[key]}
            onChange={(e) => dispatch({ type: 'SETTINGS_SET', patch: { [key]: e.target.value } })}
          />
          {tab === 'contract' && (
            <div className="mt-3 grid-cols-1 grid gap-3 sm:grid-cols-[220px_1fr]">
              <Field label="Tarifa operativa por falsa salida" htmlFor="legal-fee" hint="Se escribe en el contrato; vacío deja la línea en blanco">
                <NumberInput id="legal-fee" unit="MXN" step="100" value={st.falseTripFee} onChange={(v) => dispatch({ type: 'SETTINGS_SET', patch: { falseTripFee: v } })} />
              </Field>
              <p className="self-end text-[12px] text-ink-3">
                Marcadores: {'{{cliente}} {{cotizacion}} {{fecha}} {{dia}} {{mes}} {{anio}} {{asesor}} {{objeto}} {{monto}} {{iva_texto}} {{anticipo}} {{anticipo_pct}} {{tarifa_falsa_salida}}'}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="max-h-[420px] overflow-y-auto rounded-md border border-line bg-surface-2/40 p-3">
          <LegalText text={st[key]} tone="ui" />
        </div>
      )}
    </Block>
  );
}

function DataBlock() {
  const { dispatch, storage } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <Block title="Datos guardados en este navegador" desc="Inventario, precios, cotizaciones, OTs y clientes se guardan en localStorage.">
      <p className="text-[13px] text-ink-2">
        Uso actual: <b className="font-mono">{storageUsageKB()} KB</b> de ~5 000 KB ·{' '}
        {storage === 'ok' ? 'guardado al día' : storage === 'full' ? <span className="text-bad">almacenamiento lleno: quita archivos adjuntos grandes</span> : <span className="text-bad">el navegador no permite guardar (modo privado)</span>}
      </p>
      <div className="mt-3">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            Se borrarán tus cambios y volverán los datos de ejemplo.
            <Button size="sm" variant="danger" onClick={() => { dispatch({ type: 'RESET' }); setConfirm(false); }}>Restablecer</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button size="sm" icon={RotateCcw} onClick={() => setConfirm(true)}>Restablecer datos de ejemplo</Button>
        )}
      </div>
    </Block>
  );
}

export function FamilyRules({ editable }) {
  return (
    <div className="flex flex-col gap-4">
      <Block title="Familia 1 · Anuncios 3D, cajas de luz y letras" desc="Geometría e iluminación para calcular la lista de materiales">
        <div className={G}>
          <R editable={editable} path={['f1', 'fill', 'contorno']} step="0.05" label="Llenado caja contorno" hint="Área de cara ÷ (ancho × alto)" />
          <R editable={editable} path={['f1', 'fill', 'letras']} step="0.05" label="Llenado letras 3D" hint="Área de letras ÷ (largo × altura)" />
          <R editable={editable} path={['f1', 'contourPerim']} step="0.05" label="Factor de perímetro contorno" />
          <R editable={editable} path={['f1', 'kPerimLetras']} step="0.1" label="Desarrollo por letra" hint="Perímetro de una letra ÷ su altura" />
          <R editable={editable} path={['f1', 'ledPerM2']} unit="/m²" step="1" label="Referencia LED luz directa" hint="Solo para sugerir; la cantidad se captura" />
          <R editable={editable} path={['f1', 'ledPerMlHalo']} unit="/m.l." step="1" label="Referencia LED halo" />
          <R editable={editable} path={['f1', 'ledWatts']} unit="W" step="0.1" label="Consumo por módulo LED" hint="Fuentes: W = módulos × este valor" />
          <R editable={editable} path={['f1', 'rotCoverage']} unit="%" label="Cobertura de rotulación sugerida" />
        </div>
      </Block>
      <div className="grid-cols-1 grid gap-4 lg:grid-cols-2">
        <Block title="Familia 3 · Lonas y bastidores">
          <div className="grid grid-cols-2 gap-3">
            <R editable={editable} path={['f3', 'crossEvery']} unit="m" step="0.1" label="Travesaño cada" />
            <R editable={editable} path={['f3', 'bleed']} unit="m" step="0.01" label="Sobrante por lado" hint="Para tensar en bastidor" />
          </div>
        </Block>
        <Block title="Familia 5 · Señalética de interior" desc="Montaje">
          <div className="grid grid-cols-2 gap-3">
            <R editable={editable} path={['f5', 'pernosBase']} unit="pza" step="1" label="Pernos base por pieza" />
            <R editable={editable} path={['f5', 'pernosPerM2']} unit="/m²" step="1" label="Pernos extra por m²" />
            <R editable={editable} path={['f5', 'cintaFactor']} step="0.1" label="Cinta (× perímetro)" />
            <R editable={editable} path={['f5', 'pegaM2PerTube']} unit="m²" step="0.1" label="Cobertura por cartucho" />
          </div>
        </Block>
      </div>
      <Block title="Familia 4 · Rotulación vehicular y stickers" desc="Superficie rotulable por tipo de vehículo y factor de complejidad para mano de obra">
        <RuleList
          path={['f4', 'vehicles']}
          editable={editable}
          newRow={() => ({ id: uid('veh'), name: 'Nuevo vehículo', m2: 18, factor: 1 })}
          cols={[
            { key: 'name', label: 'Vehículo', type: 'text' },
            { key: 'm2', label: 'Superficie total', unit: 'm²' },
            { key: 'factor', label: 'Complejidad', step: '0.05' },
          ]}
        />
        <div className={`${G} mt-4`}>
          <R editable={editable} path={['f4', 'coverage', 'logos']} unit="%" label="Cobertura logotipos" />
          <R editable={editable} path={['f4', 'coverage', 'parcial']} unit="%" label="Cobertura parcial" />
          <R editable={editable} path={['f4', 'coverage', 'wrap']} unit="%" label="Cobertura wrap" />
          <R editable={editable} path={['f4', 'wrapWaste']} unit="%" label="Merma de vinil vehicular" />
          <R editable={editable} path={['f4', 'rollWidth']} unit="m" step="0.01" label="Ancho de rollo (stickers)" />
          <R editable={editable} path={['f4', 'gapCm']} unit="cm" step="0.1" label="Separación entre stickers" />
        </div>
      </Block>
      <Block title="Familia 6 · Promocionales e impresos" desc="Factor de precio por volumen: 1 = precio del inventario; 2 = el doble por pieza en tirajes cortos">
        <div className="grid-cols-1 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="eyebrow mb-1">Productos por millar</div>
            <RuleList path={['f6', 'millar']} editable={editable} newRow={() => ({ qty: 5000, factor: 0.85 })} cols={[{ key: 'qty', label: 'Piezas', step: '100' }, { key: 'factor', label: 'Factor', step: '0.05' }]} />
          </div>
          <div>
            <div className="eyebrow mb-1">Productos por pieza (playeras)</div>
            <RuleList path={['f6', 'pza']} editable={editable} newRow={() => ({ qty: 1000, factor: 0.85 })} cols={[{ key: 'qty', label: 'Piezas', step: '1' }, { key: 'factor', label: 'Factor', step: '0.05' }]} />
          </div>
        </div>
        <div className="mt-4 max-w-[220px]">
          <R editable={editable} path={['f6', 'twoSides']} step="0.05" label="Factor frente y vuelta" />
        </div>
      </Block>
    </div>
  );
}

export function InstallRules({ editable }) {
  return (
    <div className="grid-cols-1 grid gap-4 lg:grid-cols-2">
      <Block title="Superficies de instalación" desc="Multiplica los m² de instalación según el sustrato">
        <RuleList
          path={['install', 'surfaces']}
          editable={editable}
          newRow={() => ({ id: uid('sf'), name: 'Nueva superficie', factor: 1 })}
          cols={[
            { key: 'name', label: 'Superficie', type: 'text' },
            { key: 'factor', label: 'Factor', step: '0.05' },
          ]}
        />
      </Block>
      <div className="flex flex-col gap-4">
        <Block title="Altura y equipo en campo" desc="Tarifas de andamio y grúa boom: en Inventario → Servicios/Mano de Obra">
          <div className="grid grid-cols-2 gap-3">
            <R editable={editable} path={['install', 'ladderUpTo']} unit="m" step="0.5" label="Escalera incluida hasta" />
            <R editable={editable} path={['install', 'minM2']} unit="m²" step="0.5" label="Instalación mínima" />
            <R editable={editable} path={['install', 'scaffoldBodyM']} unit="m" step="0.5" label="Altura por cuerpo de andamio" />
            <R editable={editable} path={['install', 'craneMinHours']} unit="h" step="0.5" label="Mínimo de horas de grúa" />
          </div>
        </Block>
      </div>
    </div>
  );
}
