import React, { useState } from 'react';
import { ArrowRight, CalendarClock, Lock, Paperclip, Package } from 'lucide-react';
import { AvatarStack, SlaBar, SlaPill, cx } from '../../components/ui.jsx';
import { PHASES, phaseIndex } from '../../lib/sla.js';
import { fmtDay, num } from '../../lib/format.js';
import { canMovePhase } from '../../lib/permissions.js';

const STRIPE = { green: 'before:bg-ok', yellow: 'before:bg-warn', red: 'before:bg-bad', done: 'before:bg-ink-3/40', late: 'before:bg-ink-3/40' };

export function OrderCard({ row, role, onOpen, onAdvance, draggable, onDragStart }) {
  const { order, sla, client, people } = row;
  const next = PHASES[phaseIndex(order.phase) + 1];
  const movable = canMovePhase(role, order.phase);
  const lines = order.lines?.length ?? 0;
  const files = order.attachments?.length ?? 0;
  return (
    <article
      draggable={draggable && movable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cx(
        'relative cursor-pointer overflow-hidden rounded-lg border border-line bg-surface p-3 pl-4 transition hover:border-ink-3/60 hover:shadow-md',
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        STRIPE[sla.level],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12px] text-ink-2">{order.id}</span>
        <SlaPill sla={sla} compact />
      </div>
      <div className="mt-1.5 font-medium leading-snug">{client?.tradeName}</div>
      <div className="text-[12.5px] leading-snug text-ink-3">{order.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1">
          <CalendarClock size={13} className="text-ink-3" />
          {fmtDay(order.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Package size={13} className="text-ink-3" />
          {lines} {lines === 1 ? 'renglón' : 'renglones'}
        </span>
        {files > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip size={13} className="text-ink-3" />
            {files}
          </span>
        )}
      </div>
      <SlaBar sla={sla} className="mt-2.5" />
      <div className="mt-1 text-[11.5px] text-ink-3">{sla.text}</div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <AvatarStack names={people} />
        {next && (
          <button
            type="button"
            disabled={!movable}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(next.id);
            }}
            title={movable ? `Mover a ${next.name}` : 'Tu rol no puede mover esta fase'}
            className={cx(
              'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition',
              movable ? 'bg-accent/10 text-accent hover:bg-accent/20' : 'text-ink-3',
            )}
          >
            {movable ? (
              <>
                {next.name} <ArrowRight size={13} />
              </>
            ) : (
              <Lock size={13} />
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default function Kanban({ rows, role, onOpen, onMove }) {
  const [over, setOver] = useState(null);
  return (
    <div className="scroll-x -mx-4 snap-x snap-mandatory px-4 pb-2 md:mx-0 md:snap-none md:px-0">
      <div className="flex gap-3">
        {PHASES.map((ph) => {
          const list = rows.filter((r) => r.order.phase === ph.id);
          return (
            <section
              key={ph.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(ph.id);
              }}
              onDragLeave={() => setOver((o) => (o === ph.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) onMove(id, ph.id);
              }}
              className={cx(
                'flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-xl border bg-surface-2/50 md:w-[272px]',
                over === ph.id ? 'border-accent bg-accent/5' : 'border-line',
              )}
            >
              <header className="flex items-center justify-between px-3 pb-2 pt-3">
                <div className="min-w-0">
                  <h3 className="font-display text-[17px] font-semibold uppercase tracking-wider">{ph.name}</h3>
                  <p className="truncate text-[11.5px] text-ink-3">{ph.hint}</p>
                </div>
                <span className="tnum rounded-full bg-surface px-2 py-0.5 font-mono text-[12px] text-ink-2">{list.length}</span>
              </header>
              <div className="flex min-h-[120px] flex-col gap-2 px-2 pb-2">
                {list.map((r) => (
                  <OrderCard
                    key={r.order.id}
                    row={r}
                    role={role}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', r.order.id)}
                    onOpen={() => onOpen(r.order.id)}
                    onAdvance={(phase) => onMove(r.order.id, phase)}
                  />
                ))}
                {!list.length && <div className="rounded-lg border border-dashed border-line py-6 text-center text-[12px] text-ink-3">Sin órdenes</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
