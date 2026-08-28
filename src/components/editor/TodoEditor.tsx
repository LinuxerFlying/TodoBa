import { useEffect, useRef, useState } from 'react';
import { useTodoStore } from '../../store/useTodoStore';
import { MetadataForm } from './MetadataForm';
import { MarkdownEditor } from './MarkdownEditor';
import { HistoryModal } from './HistoryModal';
import type { Todo } from '../../types/todo';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../lib/date';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useUiStore } from '../../store/useUiStore';
import toast from 'react-hot-toast';

export function TodoEditor() {
  const selectedId = useTodoStore((s) => s.selectedId);
  const todos = useTodoStore((s) => s.todos);
  const update = useTodoStore((s) => s.update);
  const remove = useTodoStore((s) => s.remove);
  const select = useTodoStore((s) => s.select);
  const restore = useTodoStore((s) => s.restore);
  const toggleEditor = useUiStore((s) => s.toggleEditor);

  const todo = selectedId ? todos[selectedId] : null;
  const [draft, setDraft] = useState<Todo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastSavedRef = useRef<Todo | null>(null);

  // Sync draft when selecting OR when the selected todo was refreshed externally
  // (e.g., after rollback, reloadOne from file watcher, etc.)
  useEffect(() => {
    if (!todo) {
      setDraft(null);
      lastSavedRef.current = null;
      return;
    }
    // If draft is null (first load / new selection) OR the store's updated timestamp
    // is newer than what we have in draft, take the store version as authoritative.
    const cur = draft;
    const shouldTakeStore =
      !cur ||
      cur.id !== todo.id ||
      new Date(todo.updated).getTime() > new Date(cur.updated || 0).getTime();
    if (shouldTakeStore) {
      setDraft({ ...todo });
      lastSavedRef.current = { ...todo };
    }
  }, [selectedId, todo?.id, todo?.updated]);

  // Debounced autosave
  const debounced = useDebounce(draft, 500);
  useEffect(() => {
    if (!debounced || !todo) return;
    const prev = lastSavedRef.current;
    const patch: Partial<Todo> = {};
    let dirty = false;
    (Object.keys(debounced) as (keyof Todo)[]).forEach((k) => {
      const prevV = prev?.[k];
      const curV = debounced[k];
      if (JSON.stringify(prevV) !== JSON.stringify(curV)) {
        (patch as Record<string, unknown>)[k as string] = curV;
        dirty = true;
      }
    });
    if (dirty) {
      lastSavedRef.current = { ...debounced };
      update(debounced.id, patch);
    }
  }, [debounced, todo?.id]);

  if (!todo || !draft) {
    return <div className="editor-empty">选择或创建一个事项开始编辑</div>;
  }

  const patch = (p: Partial<Todo>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const handleDelete = async () => {
    setConfirmDelete(false);
    const backup = { ...todo };
    await remove(todo.id);
    toast((t) => (
      <span>
        已删除「{backup.title}」
        <button
          style={{
            marginLeft: 10,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
            padding: '3px 10px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
          onClick={() => {
            restore(backup);
            toast.dismiss(t.id);
            toast.success('已撤销删除');
          }}
        >
          撤销
        </button>
      </span>
    ), { duration: 5000 });
  };

  return (
    <div className="editor">
      <div className="editor-header">
        <MetadataForm todo={draft} onChange={patch} />
        <div className="editor-actions">
          <div className="editor-dates">
            创建 {formatDateTime(todo.created)} · 更新 {formatDateTime(todo.updated)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="editor-hide-btn"
              onClick={toggleEditor}
              title="隐藏编辑面板"
            >
              ▸ 隐藏
            </button>
            <button
              className="editor-history-btn"
              onClick={() => setHistoryOpen(true)}
              title="查看历史版本"
            >
              🕘 历史
            </button>
            <button
              className="editor-delete-btn"
              onClick={() => setConfirmDelete(true)}
              title="删除事项"
            >
              🗑 删除
            </button>
          </div>
        </div>
      </div>
      <MarkdownEditor value={draft.body} onChange={(v) => patch({ body: v })} />

      <Modal
        open={confirmDelete}
        title="删除事项"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        确定要删除「{todo.title}」吗？<br />
        此操作会删除对应的 Markdown 文件（可在 5 秒内撤销）。
      </Modal>

      {selectedId && (
        <HistoryModal
          todoId={selectedId}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onRolledBack={() => {
            /* After rollback the file watcher will refresh todos automatically,
               but we also force reload for responsiveness. */
            setTimeout(() => {
              useTodoStore.getState().reloadOne(selectedId);
            }, 200);
          }}
        />
      )}
    </div>
  );
}
