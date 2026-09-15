import toast from 'react-hot-toast';
import { useSyncStore } from '../../store/useSyncStore';
import { cx } from '../../lib/classnames';

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function SyncSetting() {
  const configured = useSyncStore((s) => s.configured);
  const running = useSyncStore((s) => s.running);
  const direction = useSyncStore((s) => s.direction);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const openModal = useSyncStore((s) => s.openModal);
  const push = useSyncStore((s) => s.push);
  const pull = useSyncStore((s) => s.pull);

  const handleQuick = async (dir: 'push' | 'pull') => {
    const run = dir === 'push' ? push : pull;
    const result = await run();
    if (!result) return;
    if (!result.ok) {
      toast.error(result.error || '同步失败');
      return;
    }
    const parts: string[] = [];
    parts.push(`已${dir === 'push' ? '上传' : '下载'} ${result.transferred} 个`);
    if (result.deleted) parts.push(`删除 ${result.deleted} 个`);
    if (result.conflicts) parts.push(`冲突 ${result.conflicts} 个（已备份）`);
    toast.success(parts.join('，'));
  };

  return (
    <div className="sync-setting">
      <div className="sidebar-section-title">云同步</div>
      <div className="sync-status-row">
        {running ? (
          <span className="badge badge-accent sync-badge-live">
            {direction === 'push' ? '上传中…' : '下载中…'}
          </span>
        ) : configured ? (
          <span className="badge badge-success">已配置</span>
        ) : (
          <span className="badge badge-muted">未配置</span>
        )}
        {configured && !running && lastSyncAt && (
          <span className="sync-last-time" title={lastSyncAt}>
            {formatTime(lastSyncAt)}
          </span>
        )}
      </div>
      <button className="vault-pick-btn" onClick={openModal}>
        WebDAV 云同步设置
      </button>
      {configured && (
        <div className="sync-quick-row">
          <button
            className={cx('sync-quick-btn')}
            disabled={running}
            onClick={() => handleQuick('push')}
            title="上传本地变更到云端"
          >
            ↑ 上传
          </button>
          <button
            className={cx('sync-quick-btn')}
            disabled={running}
            onClick={() => handleQuick('pull')}
            title="从云端下载到本机"
          >
            ↓ 下载
          </button>
        </div>
      )}
    </div>
  );
}
