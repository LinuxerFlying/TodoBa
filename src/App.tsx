import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useSettingsStore } from './store/useSettingsStore';
import { useTodoStore } from './store/useTodoStore';
import { useSyncStore } from './store/useSyncStore';
import { useUpdaterStore } from './store/useUpdaterStore';
import { useHotkeys } from './hooks/useHotkeys';
import toast from 'react-hot-toast';

function App() {
  const initSettings = useSettingsStore((s) => s.init);
  const initSync = useSyncStore((s) => s.init);
  const initUpdater = useUpdaterStore((s) => s.init);
  const loadAll = useTodoStore((s) => s.loadAll);
  const upsertOne = useTodoStore((s) => s.upsertOne);
  const removeOne = useTodoStore((s) => s.removeOne);
  const reloadOne = useTodoStore((s) => s.reloadOne);
  const error = useTodoStore((s) => s.error);

  useHotkeys();

  useEffect(() => {
    let offChanges: (() => void) | null = null;
    let offPulled: (() => void) | null = null;
    (async () => {
      await initSettings();
      await initSync().catch(() => undefined);
      await initUpdater().catch(() => undefined);
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
      offPulled = window.api.sync.onPulled(() => {
        loadAll().catch((e) => toast.error('同步后刷新失败：' + String(e)));
      }) as () => void;
    })();
    return () => {
      offChanges?.();
      offPulled?.();
    };
  }, [initSettings, initSync, initUpdater, loadAll, upsertOne, removeOne, reloadOne]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return <AppLayout />;
}

export default App;
