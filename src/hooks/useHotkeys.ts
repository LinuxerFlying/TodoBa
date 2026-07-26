import { useEffect } from 'react';
import { useTodoStore } from '../store/useTodoStore';
import { useUiStore } from '../store/useUiStore';
import type { Quadrant } from '../types/todo';

export function useHotkeys() {
  const create = useTodoStore((s) => s.create);
  const selectedId = useTodoStore((s) => s.selectedId);
  const todos = useTodoStore((s) => s.todos);
  const update = useTodoStore((s) => s.update);
  const remove = useTodoStore((s) => s.remove);
  const select = useTodoStore((s) => s.select);
  const setSearch = useUiStore((s) => s.setSearch);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const handler = async (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      // Ctrl+N new
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        await create();
        return;
      }
      // Ctrl+F focus search: just clear and let focus
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('.search-bar input');
        input?.focus();
        input?.select();
        return;
      }
      // Esc: deselect or clear search
      if (e.key === 'Escape' && !isEditable(e.target)) {
        if (useUiStore.getState().searchQuery) {
          setSearch('');
        } else if (useTodoStore.getState().selectedId) {
          select(null);
        }
        return;
      }
      // Ctrl+D delete selected
      if (mod && e.key.toLowerCase() === 'd' && selectedId && !isEditable(e.target)) {
        e.preventDefault();
        const todo = todos[selectedId];
        if (todo && confirm(`删除「${todo.title}」？`)) {
          await remove(selectedId);
        }
        return;
      }
      // Ctrl+1..4 set quadrant
      if (mod && ['1', '2', '3', '4'].includes(e.key) && selectedId && !isEditable(e.target)) {
        e.preventDefault();
        const qmap: Record<string, Quadrant> = { '1': 'q1', '2': 'q2', '3': 'q3', '4': 'q4' };
        update(selectedId, { quadrant: qmap[e.key] });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [create, selectedId, todos, update, remove, select, setSearch]);
}
