import { useEffect, useState } from 'react';
import { cx } from '../../lib/classnames';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.api.window.isMaximized().then(setMaximized);
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
        <span className="titlebar-version">v0.1.0</span>
      </div>
      <div className="titlebar-controls">
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
