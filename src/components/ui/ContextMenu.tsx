import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/classnames';

export interface MenuItem {
  type?: 'item' | 'separator';
  label?: string;
  icon?: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  submenu?: MenuItem[];
  onClick?: () => void;
}

interface OpenState {
  x: number;
  y: number;
  items: MenuItem[];
}

const MENU_W = 188;
const SUBMENU_W = 180;

function measure(items: MenuItem[]): { h: number } {
  let h = 6;
  for (const it of items) {
    h += it.type === 'separator' ? 9 : 30;
  }
  return { h: h + 6 };
}

function itemHeight(it: MenuItem): number {
  return it.type === 'separator' ? 9 : 30;
}

function MenuList({
  items,
  x,
  y,
  width,
  onCloseAll,
  depth = 0
}: {
  items: MenuItem[];
  x: number;
  y: number;
  width: number;
  onCloseAll: () => void;
  depth?: number;
}) {
  const [openSub, setOpenSub] = useState<number | null>(null);
  const { h } = measure(items);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placeRight = depth === 0 ? x + width + 8 <= vw : x + width + 4 <= vw;
  const left = depth === 0 ? (x + width > vw ? vw - width - 4 : x) : x;
  const top = y + h > vh ? Math.max(4, vh - h - 4) : y;

  const subAnchor = placeRight ? left + width : left;
  const subX = placeRight ? subAnchor - 4 : subAnchor - SUBMENU_W + 4;

  let offset = 6;
  const tops: number[] = items.map((it) => {
    const t = top + offset;
    offset += itemHeight(it);
    return t;
  });

  return (
    <div
      className={cx('ctx-menu', depth > 0 && 'ctx-submenu')}
      style={{ left, top, minWidth: width }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) => {
        if (it.type === 'separator') {
          return <div key={i} className="ctx-separator" />;
        }
        const hasSub = !!it.submenu && it.submenu.length > 0;
        return (
          <div key={i} className="ctx-item-wrap">
            <button
              type="button"
              className={cx(
                'ctx-item',
                it.danger && 'ctx-danger',
                it.disabled && 'ctx-disabled',
                openSub === i && 'ctx-sub-open'
              )}
              disabled={it.disabled}
              onMouseEnter={() => setOpenSub(hasSub ? i : null)}
              onClick={() => {
                if (it.disabled || hasSub) return;
                onCloseAll();
                it.onClick?.();
              }}
            >
              <span className="ctx-check">{it.checked ? '✓' : ''}</span>
              <span className="ctx-icon">{it.icon || ''}</span>
              <span className="ctx-label">{it.label}</span>
              {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
              {hasSub && <span className="ctx-arrow">{placeRight ? '▶' : '◀'}</span>}
            </button>
            {hasSub && openSub === i && (
              <MenuList
                items={it.submenu!}
                x={subX}
                y={tops[i]}
                width={SUBMENU_W}
                onCloseAll={onCloseAll}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function useContextMenu() {
  const [state, setState] = useState<OpenState | null>(null);
  const ref = useRef<OpenState | null>(null);
  ref.current = state;

  const close = useCallback(() => setState(null), []);

  const open = useCallback((x: number, y: number, items: MenuItem[]) => {
    setState({ x, y, items });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ctx-menu')) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onScroll = () => close();
    const onBlur = () => close();
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [state, close]);

  const menu = state
    ? createPortal(
        <MenuList
          items={state.items}
          x={state.x}
          y={state.y}
          width={MENU_W}
          onCloseAll={close}
        />,
        document.body
      )
    : null;

  return { open, close, menu };
}
