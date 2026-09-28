import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button, Field, Input, Modal } from './ui.jsx';

/** Alta rápida de prospecto sin salir del cotizador. */
export default function ProspectForm({ open, onClose, onSave }) {
  const [f, setF] = useState({ name: '', company: '', phone: '', whatsapp: '', email: '' });
  const [sameWa, setSameWa] = useState(true);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const valid = f.name.trim() && (f.phone.trim() || f.whatsapp.trim() || f.email.trim());
  const submit = () => {
    if (!valid) return;
    const company = f.company.trim() || f.name.trim();
    onSave({
      legalName: company,
      tradeName: company,
      rfc: '',
      contact: { name: f.name.trim(), phone: f.phone.trim(), whatsapp: (sameWa ? f.phone : f.whatsapp).trim(), email: f.email.trim() },
      fiscalAddress: '',
      installAddress: '',
    });
    setF({ name: '', company: '', phone: '', whatsapp: '', email: '' });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Nuevo prospecto"
      subtitle="Se asigna a esta cotización; pasa a cliente al aprobarla"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={UserPlus} disabled={!valid} onClick={submit}>
            Registrar prospecto
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Nombre del contacto" htmlFor="pr-name">
          <Input id="pr-name" autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Ramón Quiñónez" />
        </Field>
        <Field label="Empresa / razón social" htmlFor="pr-company" hint="Si lo dejas vacío se usa el nombre del contacto">
          <Input id="pr-company" value={f.company} onChange={(e) => set({ company: e.target.value })} placeholder="Ej. Pollo Sinaloa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono" htmlFor="pr-phone">
            <Input id="pr-phone" type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp" htmlFor="pr-wa">
            <Input id="pr-wa" type="tel" disabled={sameWa} value={sameWa ? f.phone : f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
          </Field>
        </div>
        <label htmlFor="pr-same" className="flex items-center gap-2 text-[12.5px] text-ink-2">
          <input id="pr-same" type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} />
          El WhatsApp es el mismo teléfono
        </label>
        <Field label="Correo" htmlFor="pr-mail">
          <Input id="pr-mail" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        {!valid && f.name && <p className="text-[12px] text-ink-3">Agrega al menos un teléfono, WhatsApp o correo.</p>}
      </form>
    </Modal>
  );
}
