import { useEffect, useState } from 'react';
import { cx } from '../../lib/classnames';
import { useUiStore } from '../../store/useUiStore';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [version, setVersion] = useState('');
  const editorOpen = useUiStore((s) => s.editorOpen);
  const toggleEditor = useUiStore((s) => s.toggleEditor);

  useEffect(() => {
    window.api.window.isMaximized().then(setMaximized);
    window.api.appVersion().then((v) => setVersion('v' + v));
  }, []);

  const handleMax = async () => {
    const m = await window.api.window.maximize();
    setMaximized(!!m);
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag" />
      <div className="titlebar-brand">
        <span className="titlebar-logo">✓</span>
        <span className="titlebar-name">TodoBa</span>
        <span className="titlebar-version">{version}</span>
      </div>
      <div className="titlebar-controls">
        <button
          className={cx('titlebar-btn', 'titlebar-btn-editor', !editorOpen && 'titlebar-btn-editor-hidden')}
          title={editorOpen ? '隐藏编辑面板' : '显示编辑面板'}
          onClick={toggleEditor}
        >
          ▮
        </button>
        <button
          className="titlebar-btn"
          title="最小化"
          onClick={() => window.api.window.minimize()}
        >
          ─
        </button>
        <button
          className={cx('titlebar-btn', maximized && 'titlebar-btn-restore')}
          title={maximized ? '还原' : '最大化'}
          onClick={handleMax}
        >
          {maximized ? '❐' : '□'}
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          title="关闭"
          onClick={() => window.api.window.close()}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
