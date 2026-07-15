'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LoaderCircle, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  value: string | null;
  selectedLabel?: string;
  options: SearchableSelectOption[];
  total?: number;
  disabled?: boolean;
  loading?: boolean;
  onSearchChange: (search: string) => void;
  onSelect: (value: string | null, label: string) => void;
}

export function SearchableSelect({
  label,
  placeholder = 'Buscar…',
  value,
  selectedLabel = '',
  options,
  total,
  disabled = false,
  loading = false,
  onSearchChange,
  onSelect,
}: SearchableSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);

  useEffect(() => {
    if (!open) {
      setQuery(selectedLabel);
    }
  }, [selectedLabel, value, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const shown = total ?? options.length;
  const footer =
    shown > 0
      ? `${options.length}${total != null && total > options.length ? ` de ${total}` : ''} resultado${options.length === 1 ? '' : 's'}`
      : null;

  return (
    <div ref={rootRef} className="relative block text-sm">
      <span className="mb-1.5 block font-medium text-stone-200">{label}</span>
      <div
        className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${
          disabled
            ? 'cursor-not-allowed border-white/10 bg-white/5 text-stone-500'
            : open
              ? 'border-emerald-400/70 bg-[#12201b] text-stone-100 ring-1 ring-emerald-400/30'
              : 'border-white/15 bg-[#12201b] text-stone-100 hover:border-white/30'
        }`}
      >
        <Search className="size-4 shrink-0 text-emerald-300/80" aria-hidden />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            onSearchChange(next);
            if (value !== null) {
              onSelect(null, '');
            }
          }}
          className="w-full bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-500 disabled:cursor-not-allowed"
        />
        {loading ? (
          <LoaderCircle
            className="size-4 shrink-0 animate-spin text-emerald-300"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className={`size-4 shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        )}
      </div>

      {open && !disabled ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-white/15 bg-[#0f1a16] shadow-xl shadow-black/40">
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto py-1">
            {loading && options.length === 0 ? (
              <li className="px-3 py-3 text-stone-400">Carregando…</li>
            ) : null}
            {!loading && options.length === 0 ? (
              <li className="px-3 py-3 text-stone-400">Nenhum resultado</li>
            ) : null}
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`w-full px-3 py-2.5 text-left transition ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-100'
                        : 'text-stone-100 hover:bg-white/5'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(option.value, option.label);
                      setQuery(option.label);
                      setOpen(false);
                    }}
                  >
                    <span className="block text-sm">{option.label}</span>
                    {option.hint ? (
                      <span className="mt-0.5 block text-xs text-stone-400">
                        {option.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {footer ? (
            <div className="border-t border-white/10 px-3 py-2 text-xs text-stone-400">
              {footer}
              {total != null && total > options.length
                ? ' — refine a busca para ver os demais'
                : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
