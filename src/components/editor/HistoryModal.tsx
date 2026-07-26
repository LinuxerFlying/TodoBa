import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDateTime } from '../../lib/date';
import { renderMarkdown } from '../../lib/markdown';
import toast from 'react-hot-toast';

interface VersionMeta {
  version: string;
  createdAt: string;
  size: number;
}
interface VersionPayload {
  raw: string;
  meta: { title: string; body: string; progress: number; status: string };
}

interface Props {
  todoId: string;
  open: boolean;
  onClose: () => void;
  onRolledBack: () => void;
}

export function HistoryModal({ todoId, open, onClose, onRolledBack }: Props) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [payload, setPayload] = useState<VersionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    window.api.todos.versions(todoId).then((list) => {
      if (!alive) return;
      const arr = list as VersionMeta[];
      setVersions(arr);
      setSelected(arr[0]?.version ?? null);
      setPayload(null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, todoId]);

  useEffect(() => {
    if (!selected || !open) return;
    let alive = true;
    window.api.todos.readVersion(todoId, selected).then((p) => {
      if (!alive) return;
      setPayload(p as VersionPayload);
    });
    return () => {
      alive = false;
    };
  }, [selected, open, todoId]);

  const handleRollback = async () => {
    if (!selected) return;
    if (!confirm('确定回滚到此版本吗？当前状态会先被自动保存为一个版本，以便再次"回滚回来"。'))
      return;
    setRolling(true);
    try {
      await window.api.todos.rollback(todoId, selected);
      toast.success('已回滚到所选版本');
      onRolledBack();
      onClose();
    } catch (e) {
      toast.error('回滚失败：' + String(e));
    } finally {
      setRolling(false);
    }
  };

  return (
    <Modal
      open={open}
      title="历史版本"
      onClose={onClose}
      width={820}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="primary"
            onClick={handleRollback}
            disabled={!selected || rolling}
          >
            {rolling ? '回滚中…' : '回滚到所选版本'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, minHeight: 360 }}>
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            paddingRight: 10,
            overflowY: 'auto',
            maxHeight: 420
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>加载中…</div>
          ) : versions.length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
              暂无历史版本。<br />
              修改事项时会自动快照保存。
            </div>
          ) : (
            versions.map((v) => (
              <button
                key={v.version}
                onClick={() => setSelected(v.version)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 9px',
                  border: 'none',
                  background:
                    selected === v.version ? 'var(--accent-soft)' : 'transparent',
                  color: selected === v.version ? 'var(--accent)' : 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  marginBottom: 2
                }}
              >
                <div style={{ fontWeight: 500 }}>{formatDateTime(v.createdAt)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                  {v.size} B
                </div>
              </button>
            ))
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420 }}>
          {payload ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                {payload.meta.title || '(无标题)'}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginBottom: 10
                }}
              >
                <span>进度：{payload.meta.progress}%</span>
                <span>状态：{payload.meta.status}</span>
              </div>
              <div
                className="md-preview"
                style={{ border: 'none', padding: 0, background: 'transparent' }}
                dangerouslySetInnerHTML={{
                  __html: payload.meta.body
                    ? renderMarkdown(payload.meta.body)
                    : '<span style="color:var(--text-faint)">(无备注)</span>'
                }}
              />
            </>
          ) : (
            <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
              {versions.length ? '加载预览中…' : ''}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
