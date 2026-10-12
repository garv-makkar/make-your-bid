'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Option = { value: string; label: string; description?: string };

export function StyledSelect({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    requestAnimationFrame(() => root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index]?.focus());
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open, options, value]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (!open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return <div className="styled-select" ref={root} onKeyDown={handleKey} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <span className="styled-select-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="styled-select-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); setOpen(true); } }}>
      <span id={`${id}-value`}>{selected?.label}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div className="styled-select-menu" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className="styled-select-option" onClick={() => choose(option.value)}>
        <span className="styled-select-option-icon" aria-hidden="true">{option.value === value ? '✓' : ''}</span><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
      </button>)}
    </div>}
  </div>;
}
