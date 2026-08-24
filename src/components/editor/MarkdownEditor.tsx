import { useEffect, useState, lazy, Suspense } from 'react';
import { cx } from '../../lib/classnames';
import { renderMarkdown } from '../../lib/markdown';

const RichTextEditor = lazy(() =>
  import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor }))
);

type Tab = 'edit' | 'preview' | 'split';
type Mode = 'rich' | 'source';

const MODE_KEY = 'todoba-editor-mode';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function MarkdownEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('split');
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === 'source' ? 'source' : 'rich';
  });
  const [html, setHtml] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setHtml(renderMarkdown(value || ''));
  }, [value]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setFullscreen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const showRich = mode === 'rich';
  const showSource = mode === 'source' && (tab === 'edit' || tab === 'split');
  const showPreview = mode === 'source' && (tab === 'preview' || tab === 'split');

  return (
    <div className={cx('md-editor', showRich && 'is-rich', fullscreen && 'is-fullscreen')}>
      <div className="md-tabs">
        <div className="md-tabs-left">
          {showRich ? (
            <span className="md-tab md-tab-active">所见即所得</span>
          ) : (
            <>
              <button
                className={cx('md-tab', tab === 'edit' && 'md-tab-active')}
                onClick={() => setTab('edit')}
              >
                编辑
              </button>
              <button
                className={cx('md-tab', tab === 'split' && 'md-tab-active')}
                onClick={() => setTab('split')}
              >
                分栏
              </button>
              <button
                className={cx('md-tab', tab === 'preview' && 'md-tab-active')}
                onClick={() => setTab('preview')}
              >
                预览
              </button>
            </>
          )}
        </div>
        <div className="md-tabs-right">
          <div className="md-mode-switch" role="group" aria-label="编辑模式">
            <button
              type="button"
              className={cx('md-mode-btn', mode === 'rich' && 'is-active')}
              onClick={() => setMode('rich')}
              title="所见即所得模式（类似 Typora）"
            >
              富文本
            </button>
            <button
              type="button"
              className={cx('md-mode-btn', mode === 'source' && 'is-active')}
              onClick={() => setMode('source')}
              title="直接编辑 Markdown 源代码"
            >
              源代码
            </button>
          </div>
          <button
            type="button"
            className="md-fullscreen-btn"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? '退出全屏 (Esc)' : '全屏编辑'}
            aria-label={fullscreen ? '退出全屏' : '全屏编辑'}
          >
            {fullscreen ? '⤫ 退出全屏' : '⛶ 全屏'}
          </button>
        </div>
      </div>
      <div className="md-body">
        {showRich && (
          <Suspense fallback={<div className="rt-loading">加载富文本编辑器…</div>}>
            <RichTextEditor value={value} onChange={onChange} />
          </Suspense>
        )}
        {showSource && (
          <textarea
            className="md-textarea"
            placeholder={
              '用 Markdown 写备注…\n\n例如：\n- [ ] 子任务 1\n- [x] 子任务 2\n**加粗**  `code`'
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        )}
        {showPreview && (
          <div
            className="md-preview"
            dangerouslySetInnerHTML={{
              __html: html || '<p style="color:var(--text-faint)">预览区</p>'
            }}
          />
        )}
      </div>
    </div>
  );
}
