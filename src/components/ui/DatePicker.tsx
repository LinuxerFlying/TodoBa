import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { cx } from '../../lib/classnames';

interface Props {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function toDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  try {
    return parseISO(iso);
  } catch {
    return undefined;
  }
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function DatePicker({ value, onChange, placeholder = '选择日期', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(toDate(value) ?? new Date()));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const selected = useMemo(() => toDate(value), [value]);
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(selected ?? new Date()));
  }, [open, selected]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const popWidth = 260;
    const popHeight = 300;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + popWidth > window.innerWidth - 8) left = window.innerWidth - popWidth - 8;
    if (top + popHeight > window.innerHeight - 8) top = r.top - popHeight - 4;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    setCoords({ top, left });
  }, [open, viewMonth]);

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

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const pick = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = () => {
    onChange(undefined);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const goToday = () => pick(today);

  const display = selected ? format(selected, 'yyyy-MM-dd') : '';

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={cx('datepicker-trigger', !selected && 'is-empty', open && 'is-open')}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="datepicker-icon" aria-hidden>📅</span>
        <span className="datepicker-value">{display || placeholder}</span>
        {selected && !disabled && (
          <span
            className="datepicker-clear"
            role="button"
            tabIndex={-1}
            aria-label="清除日期"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
          >
            ×
          </span>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="datepicker-popover"
            style={{ top: coords.top, left: coords.left }}
            role="dialog"
            aria-label="选择截止日期"
          >
            <div className="datepicker-header">
              <button
                type="button"
                className="datepicker-nav"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                aria-label="上个月"
              >
                ‹
              </button>
              <button
                type="button"
                className="datepicker-title"
                onClick={() => setViewMonth(startOfMonth(new Date()))}
                title="回到本月"
              >
                {format(viewMonth, 'yyyy年 M月', { locale: zhCN })}
              </button>
              <button
                type="button"
                className="datepicker-nav"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="下个月"
              >
                ›
              </button>
            </div>

            <div className="datepicker-weekdays">
              {WEEK_DAYS.map((w) => (
                <span key={w} className="datepicker-weekday">
                  {w}
                </span>
              ))}
            </div>

            <div className="datepicker-grid">
              {days.map((d) => {
                const iso = toISO(d);
                const isSel = selected ? isSameDay(d, selected) : false;
                const isToday = isSameDay(d, today);
                const outside = !isSameMonth(d, viewMonth);
                const past = isBefore(d, today) && !isToday;
                return (
                  <button
                    type="button"
                    key={iso}
                    className={cx(
                      'datepicker-cell',
                      isSel && 'is-selected',
                      isToday && 'is-today',
                      outside && 'is-outside',
                      past && 'is-past'
                    )}
                    onClick={() => pick(d)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="datepicker-footer">
              <button type="button" className="datepicker-footer-btn" onClick={goToday}>
                今天
              </button>
              <button type="button" className="datepicker-footer-btn" onClick={clear}>
                清除
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
