import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { TodoEditor } from '../editor/TodoEditor';
import { TodoListView } from '../list/TodoListView';
import { useUiStore } from '../../store/useUiStore';
import { SyncModal } from '../settings/SyncModal';
import { Toaster } from 'react-hot-toast';

export function AppLayout() {
  const view = useUiStore((s) => s.view);
  const editorOpen = useUiStore((s) => s.editorOpen);
  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <main className="main-area">
          {view === 'kanban' ? <KanbanBoard /> : <TodoListView />}
        </main>
        {editorOpen && <TodoEditor />}
        <SyncModal />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)'
          }
        }}
      />
    </div>
  );
}
