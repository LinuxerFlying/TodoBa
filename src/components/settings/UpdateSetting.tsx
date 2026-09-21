import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUpdaterStore } from '../../store/useUpdaterStore';
import { cx } from '../../lib/classnames';

export function UpdateSetting() {
  const s = useUpdaterStore((st) => st.state);
  const check = useUpdaterStore((st) => st.check);
  const download = useUpdaterStore((st) => st.download);
  const install = useUpdaterStore((st) => st.install);
  const [busy, setBusy] = useState(false);

  const handleCheck = async () => {
    setBusy(true);
    try {
      await check();
      const cur = useUpdaterStore.getState().state;
      if (cur.status === 'not-available') toast.success('当前已是最新版本');
      if (cur.status === 'available') toast.success('发现新版本 v' + cur.newVersion);
      if (cur.status === 'error') toast.error(cur.error || '检查更新失败');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      await download();
      const cur = useUpdaterStore.getState().state;
      if (cur.status === 'error') toast.error(cur.error || '下载失败');
    } finally {
      setBusy(false);
    }
  };

  const status = s.status;

  return (
    <div className="update-setting">
      <div className="sidebar-section-title">软件更新</div>
      <div className="update-status-row">
        {status === 'checking' && <span className="badge badge-accent">检查中…</span>}
        {status === 'available' && (
          <span className="badge badge-accent">新版本 v{s.newVersion}</span>
        )}
        {status === 'downloading' && (
          <span className="badge badge-accent">下载中 {s.progress}%</span>
        )}
        {status === 'downloaded' && <span className="badge badge-success">已就绪</span>}
        {status === 'not-available' && <span className="badge badge-success">最新</span>}
        {status === 'error' && <span className="badge badge-muted">更新失败</span>}
        {status === 'idle' && <span className="badge badge-muted">v{s.currentVersion}</span>}
      </div>

      {status === 'downloading' && (
        <div className="update-progress">
          <div className="update-progress-bar" style={{ width: `${s.progress}%` }} />
        </div>
      )}

      {status === 'available' && s.releaseNotes && (
        <pre className="update-notes">{s.releaseNotes}</pre>
      )}
      {status === 'downloaded' && s.releaseNotes && (
        <pre className="update-notes">{s.releaseNotes}</pre>
      )}

      {(status === 'idle' ||
        status === 'not-available' ||
        status === 'error') && (
        <button
          className="vault-pick-btn"
          disabled={busy}
          onClick={handleCheck}
        >
          检查更新
        </button>
      )}
      {status === 'available' && (
        <button
          className="vault-pick-btn update-primary-btn"
          disabled={busy}
          onClick={handleDownload}
        >
          下载新版本
        </button>
      )}
      {status === 'downloading' && (
        <button className="vault-pick-btn" disabled>
          正在下载 {s.progress}%
        </button>
      )}
      {status === 'downloaded' && (
        <button
          className={cx('vault-pick-btn', 'update-primary-btn')}
          onClick={() => install()}
        >
          立即重启安装
        </button>
      )}

      <div className="update-current-ver">
        当前版本 v{s.currentVersion}
      </div>
    </div>
  );
}
