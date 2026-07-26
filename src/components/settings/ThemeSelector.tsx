import type { Theme } from '../../types/todo';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cx } from '../../lib/classnames';

const THEMES: { key: Theme; label: string; icon: string }[] = [
  { key: 'light', label: '明亮', icon: '☀' },
  { key: 'dark', label: '深色', icon: '🌙' },
  { key: 'eyecare', label: '护眼', icon: '🌿' },
  { key: 'evernote', label: '印象', icon: '📓' }
];

export function ThemeSelector() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  return (
    <div className="theme-selector">
      <div className="sidebar-section-title">主题</div>
      <div className="theme-options">
        {THEMES.map((t) => (
          <button
            key={t.key}
            className={cx('theme-btn', theme === t.key && 'theme-btn-active')}
            onClick={() => setTheme(t.key)}
            title={t.label}
          >
            <span className="theme-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
