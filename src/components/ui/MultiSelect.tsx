import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/classnames';

export interface MultiSelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  width?: number;
  disabled?: boolean;
}

export function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  width = 180,
  disabled
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const count = value.length;
  const active = count > 0;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const popHeight = 320;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (top + popHeight > window.innerHeight - 8) top = r.top - popHeight - 4;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    setCoords({ top, left });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const allSelected = value.length === options.length;
  const toggleAll = () => {
    if (allSelected) onChange([]);
    else onChange(options.map((o) => o.value));
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        className={cx('multi-select-trigger', active && 'is-active', open && 'is-open')}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="multi-select-label">{label}</span>
        {active && <span className="multi-select-count">{count}</span>}
        <span className="multi-select-caret">▾</span>
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="multi-select-popover"
            style={{ top: coords.top, left: coords.left, width }}
            role="listbox"
            aria-multiselectable="true"
          >
            <div className="multi-select-header">
              <button type="button" className="multi-select-all" onClick={toggleAll}>
                {allSelected ? '清除全选' : '全选'}
              </button>
              <span className="multi-select-hint">已选 {count}</span>
            </div>
            <div className="multi-select-options">
              {options.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className={cx('multi-select-option', checked && 'is-checked')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="multi-select-option-label">{o.label}</span>
                  </label>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
