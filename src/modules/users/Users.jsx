import React, { useState } from 'react';
import { Check, Eye, UserPlus } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Avatar, Button, Card, Field, Input, Modal, PageHeader, Select } from '../../components/ui.jsx';
import { ACCESS, MODULES, ROLES, can } from '../../lib/permissions.js';
import { PHASES } from '../../lib/sla.js';
import { uid } from '../../lib/format.js';

export default function Users() {
  const { state, dispatch, role } = useApp();
  const editable = can(role, 'users', 'edit');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', role: 'ventas' });

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 1"
        title="Usuarios y roles"
        subtitle="Siete roles con acceso por módulo y control de quién avanza cada fase de la OT"
        actions={editable && <Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>Nuevo usuario</Button>}
      />

      <div className="grid-cols-1 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {state.users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-[12px] text-ink-3">{u.email}</div>
                </div>
                <Select
                  id={`role-${u.id}`}
                  aria-label={`Rol de ${u.name}`}
                  disabled={!editable || u.id === 'u-admin'}
                  value={u.role}
                  onChange={(e) => dispatch({ type: 'SAVE_USER', user: { ...u, role: e.target.value, ...(e.target.value === 'ventas' && !u.commissionPct ? { commissionPct: 4, monthlyGoal: 250000 } : {}) } })}
                  className="w-[190px] text-[13px]"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h3 className="font-display text-lg font-semibold tracking-wide">Matriz de acceso</h3>
              <p className="text-[12.5px] text-ink-3">Palomita: edita · Ojo: solo consulta</p>
            </div>
            <div className="scroll-x">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead className="bg-surface-2/60 text-ink-3">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Rol</th>
                    {MODULES.map((m) => <th key={m.id} className="px-2 py-2 font-medium">{m.name.split(' ')[0]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ROLES.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      {MODULES.map((m) => {
                        const a = ACCESS[r.id][m.id];
                        return (
                          <td key={m.id} className="px-2 py-2 text-center">
                            {a === 'edit' ? <Check size={15} className="mx-auto text-ok" aria-label="Edita" /> : a === 'view' ? <Eye size={15} className="mx-auto text-ink-3" aria-label="Consulta" /> : <span className="text-line">·</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-display text-lg font-semibold tracking-wide">Quién avanza cada fase</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
              {PHASES.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span>{p.name}</span>
                  <span className="text-right text-ink-2">{['Administrador', ...p.owner.map((o) => ROLES.find((r) => r.id === o)?.name)].join(', ')}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        size="sm"
        title="Nuevo usuario"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!draft.name.trim()}
              onClick={() => {
                dispatch({ type: 'SAVE_USER', user: { id: uid('u'), ...draft, ...(draft.role === 'ventas' ? { commissionPct: 4, monthlyGoal: 250000 } : {}) } });
                dispatch({ type: 'TOAST', text: `${draft.name} agregado` });
                setDraft({ name: '', email: '', role: 'ventas' });
                setAdding(false);
              }}
            >
              Crear usuario
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Nombre completo" htmlFor="nu-name"><Input id="nu-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Correo" htmlFor="nu-mail"><Input id="nu-mail" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          <Field label="Rol" htmlFor="nu-role">
            <Select id="nu-role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
