import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeSearch } from '../../domain/search';
import './cell-picker.css';

type CellPickerProps = {
  label: string;
  value: string;
  displayValue?: string;
  options: string[];
  searchable?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function CellPicker({ label, value, displayValue, options, searchable = false, disabled = false, onChange }: CellPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return normalizedQuery
      ? options.filter(option => normalizeSearch(option).includes(normalizedQuery))
      : options;
  }, [options, query]);
  const selectedIsFilteredOut = value !== '' && !filteredOptions.includes(value);
  const visibleOptions = [
    { value: '', label: '—' },
    ...(selectedIsFilteredOut ? [{ value, label: `${value} (giá trị hiện tại)` }] : []),
    ...filteredOptions.filter(option => option !== '' && !(selectedIsFilteredOut && option === value)).map(option => ({ value: option, label: option })),
  ];

  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (nextValue: string) => {
    onChange(nextValue);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;

    const placePopover = () => {
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const width = Math.max(1, Math.min(Math.max(rect.width, 260), viewportWidth - 16, 360));
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const maxHeight = Math.max(120, Math.min(360, viewportHeight - 16));
      const below = viewportHeight - rect.bottom - 8;
      const top = below >= Math.min(maxHeight, 180) || rect.top < maxHeight + 8
        ? Math.min(rect.bottom + 4, viewportHeight - 8 - maxHeight)
        : Math.max(8, rect.top - maxHeight - 4);
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.style.width = `${width}px`;
      popover.style.maxHeight = `${maxHeight}px`;
    };

    if (!popover.matches(':popover-open')) popover.showPopover();
    placePopover();
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (popover.contains(target) || trigger.contains(target))) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    const focusFirstOption = () => {
      const current = visibleOptions.findIndex(option => option.value === value);
      optionRefs.current[current >= 0 ? current : 0]?.focus();
    };

    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', placePopover);
    window.addEventListener('scroll', placePopover, true);
    requestAnimationFrame(() => {
      placePopover();
      if (searchable) searchRef.current?.focus();
      else focusFirstOption();
    });

    return () => {
      document.removeEventListener('pointerdown', onOutsidePointer, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', placePopover);
      window.removeEventListener('scroll', placePopover, true);
      if (popover.matches(':popover-open')) popover.hidePopover();
    };
  }, [open]);

  const focusOption = (index: number) => {
    const next = Math.max(0, Math.min(index, visibleOptions.length - 1));
    optionRefs.current[next]?.focus();
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="cell-value-button cell-picker-trigger"
      disabled={disabled}
      aria-label={displayValue?`${label}: ${value}`:label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => { setQuery(''); setOpen(value => !value); }}
    >
      {(displayValue??value) || '—'}
    </button>
    <div
      ref={popoverRef}
      className="cell-picker-popover"
      popover="manual"
      role="dialog"
      aria-label={label}
      onBlur={() => requestAnimationFrame(() => {
        const popover = popoverRef.current;
        if (popover && !popover.contains(document.activeElement)) close();
      })}
    >
      {searchable && <label className="cell-picker-search">Tìm lựa chọn<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(0); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(visibleOptions.length - 1); }
        else if (event.key === 'Enter' && filteredOptions.length) { event.preventDefault(); choose(filteredOptions[0]); }
      }} placeholder="Nhập để lọc" /></label>}
      {selectedIsFilteredOut && <p className="cell-picker-note" role="status">Giá trị hiện tại “{value}” không khớp bộ lọc.</p>}
      <div className="cell-picker-options" role="listbox" aria-label={label}>
        {visibleOptions.map((option, index) => (
          <button
            key={`${option.value}:${index}`}
            ref={element => { optionRefs.current[index] = element; }}
            type="button"
            role="option"
            aria-selected={value === option.value}
            className="cell-picker-option"
            onClick={() => choose(option.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1); }
              else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1); }
            }}
          >
            {option.label}
          </button>
        ))}
        {!visibleOptions.length && <p className="cell-picker-empty">Không có lựa chọn phù hợp.</p>}
      </div>
    </div>
  </>;
}
