import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { EncryptionPanel } from './EncryptionPanel';
import { useSyncStore, type SafeSyncConfig, type SyncRunResult } from '../../store/useSyncStore';
import { cx } from '../../lib/classnames';

const JIANGUOYUN_URL = 'https://dav.jianguoyun.com/dav/';

interface Draft {
  provider: 'jianguoyun' | 'custom';
  url: string;
  username: string;
  password: string;
  remoteDir: string;
  auto: boolean;
}

function formatFullTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function toDraft(c: SafeSyncConfig | null): Draft {
  return {
    provider: c?.provider || 'jianguoyun',
    url: c?.url || JIANGUOYUN_URL,
    username: c?.username || '',
    password: '',
    remoteDir: c?.remoteDir || 'TodoBa',
    auto: c?.auto ?? false
  };
}

function summarizeResult(result: SyncRunResult, dir: 'push' | 'pull'): string {
  const verb = dir === 'push' ? '上传' : '下载';
  const parts = [`已${verb} ${result.transferred} 个文件`];
  if (result.skipped) parts.push(`跳过 ${result.skipped} 个`);
  if (result.deleted) parts.push(`删除 ${result.deleted} 个`);
  if (result.conflicts) parts.push(`冲突 ${result.conflicts} 个（本地版本已备份）`);
  return parts.join('，');
}

export function SyncModal() {
  const open = useSyncStore((s) => s.modalOpen);
  const closeModal = useSyncStore((s) => s.closeModal);
  const config = useSyncStore((s) => s.config);
  const configured = useSyncStore((s) => s.configured);
  const running = useSyncStore((s) => s.running);
  const direction = useSyncStore((s) => s.direction);
  const progress = useSyncStore((s) => s.progress);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const refreshConfig = useSyncStore((s) => s.refreshConfig);
  const refreshEncryption = useSyncStore((s) => s.refreshEncryption);
  const push = useSyncStore((s) => s.push);
  const pull = useSyncStore((s) => s.pull);

  const [draft, setDraft] = useState<Draft>(() => toDraft(config));
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(toDraft(useSyncStore.getState().config));
      refreshEncryption().catch(() => undefined);
    }
  }, [open, refreshEncryption]);

  const dirty = useMemo(() => {
    if (!config) return true;
    return (
      draft.provider !== config.provider ||
      draft.url.trim() !== (config.url || '').trim() ||
      draft.username.trim() !== config.username.trim() ||
      draft.remoteDir.trim() !== config.remoteDir.trim() ||
      draft.auto !== config.auto ||
      draft.password !== ''
    );
  }, [draft, config]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleProvider = (provider: Draft['provider']) => {
    setDraft((d) => {
      if (provider === 'jianguoyun') return { ...d, provider, url: JIANGUOYUN_URL };
      return { ...d, provider, url: d.url === JIANGUOYUN_URL ? '' : d.url };
    });
  };

  const payload = () => ({
    provider: draft.provider,
    url: draft.provider === 'jianguoyun' ? JIANGUOYUN_URL : draft.url.trim(),
    username: draft.username.trim(),
    password: draft.password,
    remoteDir: draft.remoteDir.trim() || 'TodoBa',
    auto: draft.auto
  });

  const validate = (): string | null => {
    const p = payload();
    if (!/^https?:\/\/.+/i.test(p.url)) return '服务器地址需以 http:// 或 https:// 开头';
    if (!p.username) return '请填写 WebDAV 账户';
    if (!config?.hasPassword && !p.password) return '请填写应用密码';
    return null;
  };

  const handleTest = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setTesting(true);
    try {
      const r = (await window.api.sync.testConnection(payload())) as {
        ok: boolean;
        message?: string;
      };
      if (r.ok) toast.success(r.message || '连接成功');
      else toast.error(r.message || '连接失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const r = (await window.api.sync.saveConfig(payload())) as {
        ok: boolean;
        error?: string;
      };
      if (!r.ok) {
        toast.error(r.error || '保存失败');
        return;
      }
      await refreshConfig();
      setDraft((d) => ({ ...d, password: '' }));
      toast.success('配置已保存');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async (dir: 'push' | 'pull') => {
    if (dirty) {
      toast.error('配置有未保存的修改，请先保存');
      return;
    }
    const result = await (dir === 'push' ? push() : pull());
    if (!result) return;
    if (!result.ok) {
      toast.error(result.error || '同步失败');
      return;
    }
    toast.success(summarizeResult(result, dir), { duration: 5000 });
  };

  const progressText = running
    ? progress && progress.total > 0
      ? `${
          progress.phase === 'upload'
            ? '上传中'
            : progress.phase === 'download'
              ? '下载中'
              : progress.phase === 'delete'
                ? '删除中'
                : '准备中'
        } ${progress.done}/${progress.total}`
      : direction === 'push'
        ? '正在上传…'
        : '正在下载…'
    : lastSyncAt
      ? `上次同步：${formatFullTime(lastSyncAt)}`
      : '尚未同步';

  return (
    <Modal open={open} onClose={closeModal} width={760}>
      <div className="sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sync-modal-head">
          <div className="sync-modal-title">WebDAV 云同步</div>
          <button className="sync-modal-close" onClick={closeModal} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="sync-modal-subtitle">通过 WebDAV 在多设备间同步待办数据和图片。</div>

        <div className="sync-form-row sync-method-row">
          <label className="sync-label">同步方式</label>
          <select className="ui-select sync-method-select" value="webdav" disabled>
            <option value="webdav">WebDAV</option>
          </select>
        </div>

        <div className="sync-card">
          <div className="sync-form-row">
            <label className="sync-label">服务商</label>
            <select
              className="ui-select sync-control"
              value={draft.provider}
              disabled={running}
              onChange={(e) => handleProvider(e.target.value as Draft['provider'])}
            >
              <option value="jianguoyun">坚果云</option>
              <option value="custom">自定义（Nextcloud / 群晖等）</option>
            </select>
          </div>

          <div className="sync-form-row">
            <label className="sync-label">WebDAV 服务器地址</label>
            <input
              className="ui-input sync-control"
              value={draft.url}
              disabled={running || draft.provider === 'jianguoyun'}
              placeholder="https://dav.example.com/dav/"
              onChange={(e) => update('url', e.target.value)}
            />
          </div>

          <div className="sync-form-row">
            <label className="sync-label">WebDAV 账户</label>
            <input
              className="ui-input sync-control"
              value={draft.username}
              disabled={running}
              placeholder="账户邮箱或用户名"
              onChange={(e) => update('username', e.target.value)}
            />
          </div>

          <div className="sync-form-row">
            <label className="sync-label">WebDAV 密码</label>
            <input
              type="password"
              className="ui-input sync-control"
              value={draft.password}
              disabled={running}
              placeholder={
                config?.hasPassword
                  ? '已保存应用密码（留空表示不修改）'
                  : '应用密码（坚果云请使用「第三方应用密码」）'
              }
              onChange={(e) => update('password', e.target.value)}
            />
          </div>

          <div className="sync-hint">
            ⓘ 坚果云请在「安全选项」中生成「第三方应用密码」，不要使用登录密码。
          </div>

          <div className="sync-form-row">
            <label className="sync-label">
              远程根目录
              <span className="sync-label-sub">默认: TodoBa</span>
            </label>
            <input
              className="ui-input sync-control"
              value={draft.remoteDir}
              disabled={running}
              placeholder="TodoBa"
              onChange={(e) => update('remoteDir', e.target.value)}
            />
          </div>

          <div className="sync-form-row sync-auto-row">
            <label className="sync-label">
              自动同步
              <span className="sync-label-sub">开启后待办变更会自动上传到 WebDAV。</span>
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={draft.auto}
              disabled={running}
              className={cx('sync-switch', draft.auto && 'sync-switch-on')}
              onClick={() => update('auto', !draft.auto)}
            >
              <span className="sync-switch-knob" />
            </button>
          </div>

          <div className="sync-last-sync">{progressText}</div>

          <div className="sync-actions">
            <button className="btn" disabled={testing || saving || running} onClick={handleTest}>
              {testing ? '测试中…' : '⇄ 测试连接'}
            </button>
            <button
              className="btn"
              disabled={saving || testing || running}
              onClick={handleSave}
            >
              {saving ? '保存中…' : '▣ 保存配置'}
            </button>
          </div>

          <div className="sync-divider" />

          <div className="sync-actions">
            <button
              className="btn btn-primary"
              disabled={running || !configured}
              onClick={() => handleRun('push')}
            >
              {running && direction === 'push' ? '上传中…' : '☁ 上传到云端'}
            </button>
            <button
              className="btn btn-ghost"
              disabled={running || !configured}
              onClick={() => handleRun('pull')}
            >
              {running && direction === 'pull' ? '下载中…' : '☁ 从云端下载'}
            </button>
          </div>
        </div>

        <div className="sync-divider" />
        <EncryptionPanel />
      </div>
    </Modal>
  );
}
