import { useEffect, useState } from 'react';
import { cx } from '../../lib/classnames';
import { renderMarkdown } from '../../lib/markdown';

type Tab = 'edit' | 'preview' | 'split';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function MarkdownEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('split');
  const [html, setHtml] = useState('');

  useEffect(() => {
    setHtml(renderMarkdown(value || ''));
  }, [value]);

  return (
    <div className="md-editor">
      <div className="md-tabs">
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
      </div>
      <div className="md-body">
        {(tab === 'edit' || tab === 'split') && (
          <textarea
            className="md-textarea"
            placeholder={"用 Markdown 写备注…\n\n例如：\n- [ ] 子任务 1\n- [x] 子任务 2\n**加粗**  `code`"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        )}
        {(tab === 'preview' || tab === 'split') && (
          <div
            className="md-preview"
            dangerouslySetInnerHTML={{ __html: html || '<p style="color:var(--text-faint)">预览区</p>' }}
          />
        )}
      </div>
    </div>
  );
}
