import { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTodoStore } from '../../store/useTodoStore';
import toast from 'react-hot-toast';

export function VaultPathSetting() {
  const vaultPath = useSettingsStore((s) => s.vaultPath);
  const setVaultPath = useSettingsStore((s) => s.setVaultPath);
  const loadAll = useTodoStore((s) => s.loadAll);
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    setBusy(true);
    try {
      const r = (await window.api.vault.pick()) as { path: string | null };
      if (r.path) {
        await setVaultPath(r.path);
        await loadAll();
        toast.success('数据目录已切换');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vault-setting">
      <div className="sidebar-section-title">数据目录</div>
      <div className="vault-path" title={vaultPath}>
        {vaultPath || '未设置'}
      </div>
      <button className="vault-pick-btn" onClick={handlePick} disabled={busy}>
        {busy ? '…' : '选择目录'}
      </button>
    </div>
  );
}
