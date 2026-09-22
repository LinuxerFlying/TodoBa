import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSyncStore, type EncryptionState } from '../../store/useSyncStore';
import { cx } from '../../lib/classnames';

type Mode = 'locked' | 'idle' | 'enabled';

export function EncryptionPanel() {
  const enc = useSyncStore((s) => s.encryption);
  const refresh = useSyncStore((s) => s.refreshEncryption);

  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [unlockPw, setUnlockPw] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changeRemember, setChangeRemember] = useState(true);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showChange, setShowChange] = useState(false);

  useEffect(() => {
    if (enc) setChanging(false);
  }, [enc]);

  if (!enc) return null;

  const mode: Mode = enc.enabled ? (enc.locked ? 'locked' : 'enabled') : 'idle';

  const handleEnable = async () => {
    if (password.length < 6) {
      toast.error('加密密码至少 6 位');
      return;
    }
    if (
      !window.confirm(
        '启用端到端加密后，云端文件将以密文存储。\n\n请务必牢记加密密码：忘记密码将无法恢复云端数据，其他设备需输入相同密码才能解密。\n\n确定启用？'
      )
    )
      return;
    setBusy(true);
    try {
      const r = (await window.api.sync.encryption.enable(password, remember)) as {
        ok: boolean;
        error?: string;
      };
      if (!r.ok) {
        toast.error(r.error || '启用失败');
        return;
      }
      setPassword('');
      await refresh();
      toast.success('端到端加密已启用');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (
      !window.confirm(
        '确定关闭端到端加密？\n\n关闭后将立即重新上传所有文件，云端将恢复为明文存储。'
      )
    )
      return;
    setBusy(true);
    try {
      const r = (await window.api.sync.encryption.disable()) as {
        ok: boolean;
        error?: string;
      };
      if (!r.ok) {
        toast.error(r.error || '关闭失败');
        return;
      }
      await refresh();
      toast.success('加密已关闭，文件已回迁为明文');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    setBusy(true);
    try {
      const r = (await window.api.sync.encryption.unlock(unlockPw)) as {
        ok: boolean;
        error?: string;
      };
      if (!r.ok) {
        toast.error(r.error || '解锁失败');
        return;
      }
      setUnlockPw('');
      await refresh();
      toast.success('已解锁');
    } finally {
      setBusy(false);
    }
  };

  const handleLock = async () => {
    await window.api.sync.encryption.lock();
    await refresh();
  };

  const handleChangePw = async () => {
    if (newPw.length < 6) {
      toast.error('新密码至少 6 位');
      return;
    }
    setBusy(true);
    try {
      const r = (await window.api.sync.encryption.changePassword(
        oldPw,
        newPw,
        changeRemember
      )) as { ok: boolean; error?: string };
      if (!r.ok) {
        toast.error(r.error || '修改失败');
        return;
      }
      setOldPw('');
      setNewPw('');
      setShowChange(false);
      await refresh();
      toast.success('加密密码已修改');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sync-encryption">
      <div className="sync-encryption-head">
        <span className="sync-encryption-title">🔒 端到端加密</span>
        <span
          className={cx(
            'sync-encryption-state',
            mode === 'enabled' && 'state-on',
            mode === 'locked' && 'state-locked'
          )}
        >
          {mode === 'enabled'
            ? '已启用'
            : mode === 'locked'
              ? '已锁定'
              : '未启用'}
        </span>
      </div>
      <div className="sync-encryption-desc">
        启用后文件上传前在本机加密（AES-256-GCM），云端仅保存密文；文件名与目录结构不变。
      </div>

      {mode === 'idle' && (
        <div className="sync-encryption-form">
          <input
            type="password"
            className="ui-input sync-control"
            placeholder="设置加密密码（至少 6 位）"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="sync-remember-row">
            <input
              type="checkbox"
              checked={remember}
              disabled={busy}
              onChange={(e) => setRemember(e.target.checked)}
            />
            在本机记住密码（加密存储，换机需重新输入）
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={handleEnable}
          >
            {busy ? '加密并上传中…' : '启用加密'}
          </button>
        </div>
      )}

      {mode === 'locked' && (
        <div className="sync-encryption-form">
          <input
            type="password"
            className="ui-input sync-control"
            placeholder="输入加密密码解锁"
            value={unlockPw}
            disabled={busy}
            onChange={(e) => setUnlockPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <div className="sync-encryption-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={handleUnlock}
            >
              解锁
            </button>
          </div>
        </div>
      )}

      {mode === 'enabled' && (
        <div className="sync-encryption-form">
          <div className="sync-encryption-actions">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => setShowChange((v) => !v)}
            >
              修改密码
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={handleLock}
            >
              锁定
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={handleDisable}
            >
              关闭加密
            </button>
          </div>
          {showChange && (
            <div className="sync-encryption-subform">
              <input
                type="password"
                className="ui-input sync-control"
                placeholder="原密码"
                value={oldPw}
                disabled={busy}
                onChange={(e) => setOldPw(e.target.value)}
              />
              <input
                type="password"
                className="ui-input sync-control"
                placeholder="新密码（至少 6 位）"
                value={newPw}
                disabled={busy}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <label className="sync-remember-row">
                <input
                  type="checkbox"
                  checked={changeRemember}
                  disabled={busy}
                  onChange={(e) => setChangeRemember(e.target.checked)}
                />
                在本机记住新密码
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={handleChangePw}
              >
                {busy ? '处理中…' : '确认修改并重传'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
