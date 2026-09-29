import React, { useState } from 'react';
import { Car, ChevronDown, Copy, Frame, Lightbulb, Plus, Printer, Shirt, Signpost, Trash2, Wrench } from 'lucide-react';
import { Card, Check, Field, IconButton, Input, Modal, NumberInput, Segmented, Select, Textarea, cx } from '../../components/ui.jsx';
import { BomTable, MarginBadge } from '../../components/inventory-ui.jsx';
import { FAMILY_LIST, INSTALL_EQUIPMENT, installPlan } from '../../lib/families/index.js';
import { calcLine } from '../../lib/pricing.js';
import { mxn } from '../../lib/format.js';
import { FAMILY_FORMS } from './families/index.js';

export const FAMILY_ICONS = { Lightbulb, Printer, Frame, Car, Signpost, Shirt, Wrench };

/** Selector de familia de producto: primer paso de cada renglón. */
export function FamilyGrid({ onPick, compact }) {
  return (
    <ul className={cx('grid-cols-1 grid gap-2.5', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3')}>
      {FAMILY_LIST.map((f, i) => {
        const Icon = FAMILY_ICONS[f.icon] ?? Wrench;
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onPick(f.id)}
              className="flex h-full w-full items-start gap-3 rounded-lg border border-line bg-surface p-3.5 text-left transition hover:border-accent/60 hover:bg-accent/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{i < 6 ? `Familia ${i + 1}` : 'Extra'}</span>
                <span className="block font-medium leading-snug">{f.name}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{f.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function FamilyPicker({ open, onClose, onPick }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Agregar producto o servicio" subtitle="Elige la familia; los campos se adaptan a ella">
      <FamilyGrid onPick={onPick} />
    </Modal>
  );
}

export default function FamilyLineEditor({ index, item, catalog, onChange, onRemove, onDuplicate, readOnly, showCosts }) {
  const [open, setOpen] = useState(true);
  const c = calcLine(item, catalog);
  const fam = c.family;
  const Form = FAMILY_FORMS[item.family];
  const Icon = FAMILY_ICONS[fam?.icon] ?? Wrench;
  const set = (patch) => onChange({ ...item, ...patch });
  const setP = (patch) => onChange({ ...item, params: { ...item.params, ...patch } });
  const setI = (patch) => onChange({ ...item, install: { ...item.install, ...patch } });
  const fid = (k) => `${item.id}-${k}`;
  const R = catalog.rules;
  const plan = installPlan(R, item.install);
  const params = R.params;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-4 py-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-accent">
          <Icon size={18} />
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[10px] text-bg">{index + 1}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{fam?.name}</div>
          <div className="truncate font-medium">{item.label || c.summary}</div>
        </div>
        <div className="hidden text-right sm:block">
          <div className="tnum font-display text-lg font-semibold leading-none">{mxn(c.total)}</div>
          {showCosts && <MarginBadge margin={c.margin} params={params} className="mt-1" />}
        </div>
        {!readOnly && (
          <div className="flex">
            <IconButton icon={Copy} label="Duplicar renglón" onClick={onDuplicate} />
            <IconButton icon={Trash2} label="Eliminar renglón" onClick={onRemove} className="hover:text-bad" />
          </div>
        )}
        <IconButton icon={ChevronDown} label={open ? 'Contraer' : 'Expandir'} onClick={() => setOpen((o) => !o)} className={cx('transition', !open && '-rotate-90')} />
      </div>

      {open && fam && (
        <fieldset disabled={readOnly} className="flex flex-col gap-5 p-4">
          <div className="flex min-w-0 flex-col gap-5">
            <Field label="Descripción / ubicación del elemento" htmlFor={fid('label')}>
              <Input id={fid('label')} value={item.label} onChange={(e) => set({ label: e.target.value })} placeholder="Ej. Fachada principal, vitrina lateral, unidad 04…" />
            </Field>

            <Form p={item.params} set={setP} catalog={catalog} fid={fid} />

            {fam.supportsInstall && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">Instalación en sitio</span>
                  <Check id={fid('inst')} label="Incluir" checked={item.install?.enabled} onChange={(v) => setI({ enabled: v })} />
                </div>
                {item.install?.enabled && (
                  <div className="grid-cols-1 grid gap-3 sm:grid-cols-2">
                    <Field label="Superficie donde se instalará" htmlFor={fid('surf')}>
                      <Select id={fid('surf')} value={item.install.surfaceId} onChange={(e) => setI({ surfaceId: e.target.value, anchorId: null })}>
                        {R.install.surfaces.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (×{s.factor})
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Tipo de anclaje" htmlFor={fid('anchor')}>
                      <Select
                        id={fid('anchor')}
                        value={item.install.anchorId || R.install.surfaces.find((x) => x.id === item.install.surfaceId)?.anchorId || ''}
                        onChange={(e) => setI({ anchorId: e.target.value })}
                      >
                        {(R.install.anchors || []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Altura de instalación"
                      htmlFor={fid('ih')}
                      hint={plan.ladder ? `Hasta ${R.install.ladderUpTo} m: escalera, incluida en la tarifa` : `Más de ${R.install.ladderUpTo} m: elige el equipo`}
                    >
                      <NumberInput id={fid('ih')} unit="m" step="0.1" value={item.install.heightM} onChange={(v) => setI({ heightM: v })} />
                    </Field>
                    {!plan.ladder && (
                      <div className="flex flex-col gap-3 rounded-md border border-warn/40 bg-warn/5 p-3 sm:col-span-2">
                        <Field label="Equipo en campo" htmlFor={fid('eq')}>
                          <div className="scroll-x no-scrollbar">
                            <Segmented options={INSTALL_EQUIPMENT.map((e) => ({ value: e.id, label: e.name }))} value={plan.equipment} onChange={(v) => setI({ equipment: v })} />
                          </div>
                        </Field>
                        {plan.equipment === 'andamio' ? (
                          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                            <Field label="Cuerpos de andamio" htmlFor={fid('bodies')} hint={`Sugerido: ${plan.autoBodies} (${R.install.scaffoldBodyM} m c/u)`}>
                              <NumberInput id={fid('bodies')} step="1" min={1} value={item.install.bodies ?? plan.autoBodies} onChange={(v) => setI({ bodies: v === '' ? null : v })} />
                            </Field>
                            <Field label="Días de renta" htmlFor={fid('days')}>
                              <NumberInput id={fid('days')} unit="días" step="1" min={1} value={item.install.days ?? 1} onChange={(v) => setI({ days: v })} />
                            </Field>
                          </div>
                        ) : (
                          <div className="sm:max-w-[200px]">
                            <Field label="Horas de maniobra" htmlFor={fid('hours')} hint={`Mínimo ${R.install.craneMinHours} h`}>
                              <NumberInput id={fid('hours')} unit="h" step="0.5" value={item.install.hours ?? R.install.craneMinHours} onChange={(v) => setI({ hours: v })} />
                            </Field>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            <div className="grid-cols-1 grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label="Descuento" htmlFor={fid('disc')}>
                <NumberInput id={fid('disc')} unit="%" step="1" value={item.discountPct} onChange={(v) => set({ discountPct: v })} />
              </Field>
              <Field label="Notas técnicas para producción" htmlFor={fid('notes')}>
                <Textarea id={fid('notes')} rows={2} className="min-h-[42px]" value={item.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Pantone, tipografía, anclaje, horario de acceso…" />
              </Field>
            </div>
          </div>

          <aside className="grid-cols-1 grid gap-4 rounded-lg border border-line bg-surface-2/40 p-3.5 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0">
              <div className="eyebrow mb-2">Lista de materiales</div>
              <BomTable rows={c.rows} catalog={catalog} showCosts={showCosts} compact />
            </div>
            <div className="flex flex-col md:border-l md:border-line md:pl-4">
            <div className="eyebrow mb-2">Costo y precio</div>
            <dl className="flex flex-col gap-1 text-[13px]">
              {showCosts && (
                <div className="flex justify-between">
                  <dt className="text-ink-2">Costo de producción</dt>
                  <dd className="tnum font-mono">{mxn(c.cost)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-2">Precio de lista</dt>
                <dd className="tnum font-mono">{mxn(c.price)}</dd>
              </div>
              {c.discount > 0 && (
                <div className="flex justify-between text-bad">
                  <dt>Descuento {item.discountPct}%</dt>
                  <dd className="tnum font-mono">−{mxn(c.discount)}</dd>
                </div>
              )}
              {showCosts && (
                <div className="flex justify-between">
                  <dt className="text-ink-2">Utilidad</dt>
                  <dd className="tnum font-mono">{mxn(c.profit)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              {showCosts ? <MarginBadge margin={c.margin} params={params} /> : <span className="font-medium">Importe</span>}
              <span className="tnum font-display text-xl font-semibold">{mxn(c.total)}</span>
            </div>
            </div>
          </aside>
        </fieldset>
      )}
    </Card>
  );
}

export function AddLineButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-4 text-[14px] font-medium text-ink-2 transition hover:border-accent hover:bg-accent/5 hover:text-accent"
    >
      <Plus size={18} /> Agregar producto o servicio
    </button>
  );
}
