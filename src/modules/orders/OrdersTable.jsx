import React, { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AvatarStack, Badge, Card, SlaBar, SlaPill, cx } from '../../components/ui.jsx';
import { phaseIndex, phaseName } from '../../lib/sla.js';
import { fmtDate } from '../../lib/format.js';
import { OrderCard } from './Kanban.jsx';

const COLS = [
  { key: 'id', label: 'OT', get: (r) => r.order.id },
  { key: 'client', label: 'Cliente · proyecto', get: (r) => r.client?.tradeName ?? '' },
  { key: 'phase', label: 'Fase', get: (r) => phaseIndex(r.order.phase) },
  { key: 'due', label: 'Compromiso', get: (r) => r.order.dueDate },
  { key: 'sla', label: 'Tiempo consumido', get: (r) => r.sla.pct },
  { key: 'people', label: 'Equipo', get: (r) => r.people.length },
];

export default function OrdersTable({ rows, role, onOpen, onMove }) {
  const [sort, setSort] = useState({ key: 'sla', dir: -1 });
  const col = COLS.find((c) => c.key === sort.key);
  const sorted = [...rows].sort((a, b) => {
    const x = col.get(a);
    const y = col.get(b);
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });

  return (
    <>
      <Card className="hidden md:block">
        <div className="scroll-x">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="border-b border-line bg-surface-2/60 text-[12px] text-ink-3">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className="px-4 py-2.5 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-ink"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}
                    >
                      {c.label}
                      {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((r) => (
                <tr key={r.order.id} onClick={() => onOpen(r.order.id)} className="cursor-pointer transition hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className={cx('h-2.5 w-2.5 rounded-full', { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-bad' }[r.sla.level] ?? 'bg-ink-3/40')} />
                      <span className="font-mono text-[12.5px]">{r.order.id}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.client?.tradeName}</div>
                    <div className="text-[12.5px] text-ink-3">{r.order.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{phaseName(r.order.phase)}</Badge>
                  </td>
                  <td className="tnum px-4 py-3">
                    <div>{fmtDate(r.order.dueDate)}</div>
                    <div className={cx('text-[12px]', r.sla.overdue ? 'text-bad' : 'text-ink-3')}>{r.sla.text}</div>
                  </td>
                  <td className="w-[200px] px-4 py-3">
                    <div className="mb-1.5">
                      <SlaPill sla={r.sla} />
                    </div>
                    <SlaBar sla={r.sla} />
                  </td>
                  <td className="px-4 py-3">
                    <AvatarStack names={r.people} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* En móvil la tabla se vuelve lista de tarjetas */}
      <ul className="flex flex-col gap-2.5 md:hidden">
        {sorted.map((r) => (
          <li key={r.order.id}>
            <OrderCard row={r} role={role} onOpen={() => onOpen(r.order.id)} onAdvance={(p) => onMove(r.order.id, p)} />
          </li>
        ))}
      </ul>
    </>
  );
}
