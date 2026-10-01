import React, { useState } from 'react';
import { CheckCircle2, Circle, FileSignature, FileText, FolderCheck, Paperclip, Rocket, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore.jsx';
import { Button, Check, Field, IconButton, Input, cx } from '../../components/ui.jsx';
import { readFileForStorage, kb } from '../../lib/files.js';
import { orderMoney } from '../../lib/pricing.js';
import { mxn } from '../../lib/format.js';
import ContractModal from './ContractModal.jsx';

/** Candados para liberar la OT: (1) contrato firmado y (2) archivos en carpeta compartida. */
export function releaseLocks(order) {
  const r = order.release || {};
  const contract = !!(r.contractFile || (r.signedConfirmed && r.contractFolio?.trim()));
  const files = !!r.filesShared;
  return { contract, files, ok: contract && files };
}

const RELEASE_ROLES = ['admin', 'ventas'];

function Lock({ ok, n, title, children, icon: Icon }) {
  return (
    <div className={cx('rounded-lg border p-3.5', ok ? 'border-ok/40 bg-ok/5' : 'border-line bg-surface')}>
      <div className="mb-2.5 flex items-center gap-2">
        {ok ? <CheckCircle2 size={18} className="text-ok" /> : <Circle size={18} className="text-ink-3" />}
        <Icon size={16} className="text-ink-3" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Candado {n}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex flex-col gap-3 pl-1">{children}</div>
    </div>
  );
}

export default function ReleasePanel({ order }) {
  const { state, dispatch, role } = useApp();
  const [contract, setContract] = useState(false);
  const r = order.release || {};
  const locks = releaseLocks(order);
  const canEdit = RELEASE_ROLES.includes(role);
  const upd = (patch) => dispatch({ type: 'UPDATE_RELEASE', id: order.id, patch });
  const money = orderMoney(order, state.catalog.rules.params.iva);
  const missing = [!locks.contract && 'contrato firmado', !locks.files && 'confirmación de archivos en carpeta compartida'].filter(Boolean);

  const attach = async (files) => {
    const f = files?.[0];
    if (!f) return;
    const stored = await readFileForStorage(f);
    upd({ contractFile: { name: stored.name, size: stored.size, type: stored.type, data: stored.data, at: Date.now() } });
  };

  return (
    <section className="border-b border-line bg-warn/5 px-5 py-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold tracking-wide">Liberación de la orden de trabajo</h3>
        <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11.5px] font-medium text-warn-ink">OT · Sin liberar</span>
      </div>
      <p className="mb-3 text-[12.5px] text-ink-2">Esta OT no aparece en Diseño, Producción ni Instalación hasta que Ventas la libere. El semáforo arranca al liberar ({order.leadDays || 15} días hábiles).</p>

      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
        <Lock ok={locks.contract} n={1} title="Contrato de publicidad firmado" icon={FileSignature}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={FileText} onClick={() => setContract(true)}>
              Contrato de publicidad
            </Button>
            <span className="text-[12px] text-ink-3">Se genera con los datos de {order.quoteId}</span>
          </div>
          <Check id={`${order.id}-sent`} label="Contrato enviado al cliente" checked={r.contractSent} onChange={(v) => upd({ contractSent: v })} />
          {r.contractFile ? (
            <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2">
              {r.contractFile.data && r.contractFile.type?.startsWith('image/') ? (
                <img src={r.contractFile.data} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <Paperclip size={18} className="mx-3 text-ink-3" />
              )}
              <span className="min-w-0 flex-1 text-[12.5px]">
                <span className="block truncate font-medium">{r.contractFile.name}</span>
                <span className="text-ink-3">
                  Contrato firmado · {kb(r.contractFile.size)} {r.contractFile.data ? '' : '· solo referencia (archivo grande)'}
                </span>
              </span>
              {canEdit && <IconButton icon={Trash2} label="Quitar contrato" onClick={() => upd({ contractFile: null })} className="hover:text-bad" />}
            </div>
          ) : (
            <label htmlFor={`${order.id}-cfile`} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-3 text-[12.5px] text-ink-2 hover:border-accent/60">
              <Paperclip size={16} />
              Adjuntar contrato firmado (PDF o imagen)
              <input id={`${order.id}-cfile`} type="file" accept="application/pdf,image/*" className="sr-only" disabled={!canEdit} onChange={(e) => attach(e.target.files)} />
            </label>
          )}
          {!r.contractFile && (
            <div className="grid-cols-1 grid items-end gap-2 sm:grid-cols-[auto_1fr]">
              <Check id={`${order.id}-signed`} label="Firmado y archivado (sin adjuntar)" checked={r.signedConfirmed} onChange={(v) => upd({ signedConfirmed: v })} />
              {r.signedConfirmed && <Input id={`${order.id}-folio`} placeholder="Folio o ubicación del contrato firmado" value={r.contractFolio} onChange={(e) => upd({ contractFolio: e.target.value })} />}
            </div>
          )}
        </Lock>

        <Lock ok={locks.files} n={2} title="Archivos en carpeta compartida" icon={FolderCheck}>
          <Check
            id={`${order.id}-shared`}
            label="Confirmo que los archivos vectoriales, renders e insumos de diseño ya están guardados en la carpeta compartida interna."
            checked={r.filesShared}
            onChange={(v) => upd({ filesShared: v })}
          />
          <Field label="Ruta o enlace de la carpeta del proyecto (opcional)" htmlFor={`${order.id}-path`}>
            <Input id={`${order.id}-path`} placeholder="Google Drive, servidor local, Dropbox…" value={r.sharedPath} onChange={(e) => upd({ sharedPath: e.target.value })} />
          </Field>
        </Lock>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="text-[12.5px] text-ink-2">
          Anticipo requerido ({money.advancePct}%): <b className="tnum font-mono text-ink">{mxn(money.advance)}</b> · cobrado{' '}
          <b className={cx('tnum font-mono', money.paid >= money.advance ? 'text-ok' : 'text-warn-ink')}>{mxn(money.paid)}</b>
          {missing.length > 0 && <span className="block text-ink-3">Falta: {missing.join(' y ')}.</span>}
        </div>
        <Button variant="primary" icon={Rocket} disabled={!locks.ok || !canEdit} onClick={() => dispatch({ type: 'RELEASE_ORDER', id: order.id })} title={locks.ok ? '' : `Falta: ${missing.join(' y ')}`}>
          Liberar orden de trabajo
        </Button>
      </div>
      {!canEdit && <p className="mt-2 text-[12px] text-ink-3">Solo Ventas o el Administrador pueden liberar la OT.</p>}
      {contract && <ContractModal order={order} onClose={() => setContract(false)} />}
    </section>
  );
}
