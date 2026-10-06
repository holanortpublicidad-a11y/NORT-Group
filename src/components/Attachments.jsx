import React, { useRef, useState } from 'react';
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { IconButton, cx } from './ui.jsx';
import { fmtDateTime } from '../lib/format.js';
import { kb, readFileForStorage } from '../lib/files.js';

export default function Attachments({ files = [], onChange, readOnly, idPrefix = 'att', label = 'Adjuntar archivos de diseño', hint = 'Arrastra o toca para elegir · PNG, JPG, PDF, AI, CDR · las imágenes se guardan reducidas', accept }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const add = async (list) => {
    const read = await Promise.all([...list].map(readFileForStorage));
    onChange([...files, ...read]);
  };
  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <label
          htmlFor={`${idPrefix}-input`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (e.dataTransfer.files?.length) add(e.dataTransfer.files);
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center text-[13px] transition',
            over ? 'border-accent bg-accent/5 text-accent' : 'border-line text-ink-2 hover:border-accent/60',
          )}
        >
          <Upload size={18} />
          <span className="font-medium">{label}</span>
          <span className="text-[11.5px] text-ink-3">{hint}</span>
          <input
            ref={input}
            id={`${idPrefix}-input`}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) add(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {files.length > 0 ? (
        <ul className="grid-cols-1 grid gap-2 sm:grid-cols-2">
          {files.map((f) => {
            const img = f.data && f.type?.startsWith('image/');
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
                  {img ? <img src={f.data} alt="" className="h-full w-full object-cover" /> : f.data ? <FileText size={20} className="text-ink-3" /> : <Paperclip size={18} className="text-ink-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{f.name}</span>
                  <span className="block text-[11.5px] text-ink-3">
                    {kb(f.size)} · {f.data ? 'guardado' : 'solo referencia (archivo grande)'} · {fmtDateTime(f.at)}
                  </span>
                </span>
                {!readOnly && <IconButton icon={Trash2} label={`Quitar ${f.name}`} onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="hover:text-bad" />}
              </li>
            );
          })}
        </ul>
      ) : (
        readOnly && <p className="text-[12.5px] text-ink-3">Sin archivos adjuntos.</p>
      )}
    </div>
  );
}
