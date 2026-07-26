import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useSettingsStore } from './store/useSettingsStore';
import { useTodoStore } from './store/useTodoStore';
import type { Todo } from './types/todo';
import { useHotkeys } from './hooks/useHotkeys';
import toast from 'react-hot-toast';

function App() {
  const initSettings = useSettingsStore((s) => s.init);
  const loadAll = useTodoStore((s) => s.loadAll);
  const upsertOne = useTodoStore((s) => s.upsertOne);
  const removeOne = useTodoStore((s) => s.removeOne);
  const reloadOne = useTodoStore((s) => s.reloadOne);
  const error = useTodoStore((s) => s.error);

  useHotkeys();

  useEffect(() => {
    let offChanges: (() => void) | null = null;
    (async () => {
      await initSettings();
      try {
        await loadAll();
      } catch (e) {
        toast.error('加载失败：' + String(e));
      }
      offChanges = window.api.todos.onChange((payload: unknown) => {
        const p = payload as { type: 'add' | 'change' | 'unlink'; id: string };
        if (!p?.id) return;
        if (p.type === 'unlink') removeOne(p.id);
        else reloadOne(p.id);
      }) as () => void;
    })();
    return () => {
      offChanges?.();
    };
  }, [initSettings, loadAll, upsertOne, removeOne, reloadOne]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return <AppLayout />;
}

export default App;
