import React from 'react';
import { Field, NumberInput, Segmented } from '../../../components/ui.jsx';

export function Section({ title, children, aside }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow">{title}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, unit }) {
  return (
    <div className="rounded-md bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="tnum font-mono text-[14px] font-medium">
        {value}
        {unit && <span className="ml-1 text-[11px] text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}

export function Choice({ label, id, options, value, onChange }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="scroll-x no-scrollbar">
        <Segmented options={options.map((o) => ({ value: o.id, label: o.name }))} value={value} onChange={onChange} />
      </div>
    </Field>
  );
}

export function Num({ label, id, unit, value, onChange, step = 'any', hint, min = 0, placeholder }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <NumberInput id={id} unit={unit} step={step} min={min} value={value} onChange={onChange} placeholder={placeholder} />
    </Field>
  );
}
