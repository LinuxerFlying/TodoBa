import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { cx } from '../../lib/classnames';
import { renderMarkdown } from '../../lib/markdown';
import { PromptModal } from '../ui/PromptModal';
import toast from 'react-hot-toast';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [linkPrompt, setLinkPrompt] = useState(false);
  const [imgUrlPrompt, setImgUrlPrompt] = useState(false);

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

  const insertAtCursor = (before: string, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + before.length;
      ta.setSelectionRange(caret, caret + sel.length);
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const importLocal = async () => {
    try {
      (document.activeElement as HTMLElement | null)?.blur?.();
      await new Promise((r) => setTimeout(r, 0));
      const r = (await window.api.assets.import()) as { path: string | null; error?: string };
      if (r.path) {
        insertAtCursor(`![`, `](${r.path})`, '图片说明');
      } else if (r.error) {
        toast.error('图片导入失败：' + r.error);
      }
    } catch {
      toast.error('图片导入失败');
    }
  };

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
          {mode === 'source' && (
            <div className="md-source-tools">
              <button
                type="button"
                className="md-src-btn"
                title="粗体"
                onClick={() => insertAtCursor('**', '**', '粗体')}
              >
                <b>B</b>
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="斜体"
                onClick={() => insertAtCursor('*', '*', '斜体')}
              >
                <i>I</i>
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="标题"
                onClick={() => insertLinePrefix('## ')}
              >
                H
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="无序列表"
                onClick={() => insertLinePrefix('- ')}
              >
                •
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="任务列表"
                onClick={() => insertLinePrefix('- [ ] ')}
              >
                ☑
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="插入链接"
                onClick={() => setLinkPrompt(true)}
              >
                🔗
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="本地图片"
                onClick={importLocal}
              >
                🖼
              </button>
              <button
                type="button"
                className="md-src-btn"
                title="网络图片"
                onClick={() => setImgUrlPrompt(true)}
              >
                🌐
              </button>
            </div>
          )}
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
            ref={textareaRef}
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

      <PromptModal
        open={linkPrompt}
        title="插入链接"
        label="链接地址"
        placeholder="https://example.com"
        okText="插入"
        onConfirm={(url) => {
          setLinkPrompt(false);
          const u = url.trim();
          if (u) insertAtCursor('[', `](${u})`, '链接文字');
        }}
        onCancel={() => setLinkPrompt(false)}
      />
      <PromptModal
        open={imgUrlPrompt}
        title="插入网络图片"
        label="图片 URL"
        placeholder="https://example.com/image.png"
        okText="插入"
        onConfirm={(url) => {
          setImgUrlPrompt(false);
          const u = url.trim();
          if (u) insertAtCursor(`![`, `](${u})`, '图片说明');
        }}
        onCancel={() => setImgUrlPrompt(false)}
      />
    </div>
  );
}
