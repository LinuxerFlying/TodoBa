import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { cx } from '../../lib/classnames';
import { htmlToMarkdown, markdownToHtml } from '../../lib/rich-text';
import { resolveAssetSrc } from '../../lib/markdown';
import { PromptModal } from '../ui/PromptModal';
import toast from 'react-hot-toast';

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

interface ToolBtnProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolBtn({ active, disabled, title, onClick, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cx('rt-tool-btn', active && 'is-active')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="rt-tool-divider" />;
}

function NativeToolBtn({
  title,
  children,
  onClick
}: {
  title: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="rt-tool-btn"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

async function importLocalImage(): Promise<string | null> {
  try {
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise((r) => setTimeout(r, 0));
    const r = (await window.api.assets.import()) as { path: string | null; error?: string };
    if (r.path) return r.path;
    if (r.error) toast.error('图片导入失败：' + r.error);
  } catch (e) {
    toast.error('图片导入失败');
  }
  return null;
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const lastEmitRef = useRef<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rt-codeblock' } }
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({
        table: { resizable: true, lastColumnResizable: false }
      }),
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'rt-image' } })
    ],
    content: markdownToHtml(value || ''),
    editorProps: {
      attributes: {
        class: 'rt-content',
        'data-placeholder': placeholder || '在这里输入内容…'
      },
      handleClick: (_view, _pos, event) => {
        if (!(event.ctrlKey || event.metaKey)) return false;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return false;
        const anchor = target.closest('a');
        if (!anchor) return false;
        const href = anchor.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (!blob) continue;
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: dataUrl });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
              toast('图片已粘贴，建议使用图片按钮导入本地文件以长期保存', { icon: '🖼' });
            };
            reader.readAsDataURL(blob);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return false;
        event.preventDefault();
        images.forEach((file) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src: dataUrl });
            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);
          };
          reader.readAsDataURL(file);
        });
        toast('图片已拖入，建议使用图片按钮导入本地文件以长期保存', { icon: '🖼' });
        return true;
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      lastEmitRef.current = md;
      onChange(md);
    }
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitRef.current) return;
    const expectedHtml = editor.getHTML();
    const expectedMd = htmlToMarkdown(expectedHtml);
    if (expectedMd === value) return;
    const html = markdownToHtml(value || '');
    editor.commands.setContent(html, { emitUpdate: false });
    lastEmitRef.current = value;
  }, [value, editor]);

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableBtnRef = useRef<HTMLButtonElement>(null);
  const [tableCoords, setTableCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (tableMenuOpen && tableBtnRef.current) {
      const r = tableBtnRef.current.getBoundingClientRect();
      const menuWidth = 210;
      const menuHeight = 320;
      let left = r.left;
      let top = r.bottom + 4;
      if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
      if (top + menuHeight > window.innerHeight - 8) top = r.top - menuHeight - 4;
      setTableCoords({ top, left });
    } else {
      setTableCoords(null);
    }
  }, [tableMenuOpen]);

  useEffect(() => {
    if (!tableMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tableBtnRef.current?.contains(t)) return;
      const pop = document.getElementById('rt-table-menu');
      if (pop?.contains(t)) return;
      setTableMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setTableMenuOpen(false);
        tableBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tableMenuOpen]);

  const [linkPrompt, setLinkPrompt] = useState<{
    open: boolean;
    url: string;
  }>({ open: false, url: '' });
  const [imagePrompt, setImagePrompt] = useState<{
    open: boolean;
    url: string;
  }>({ open: false, url: '' });

  if (!editor) return <div className="rt-loading">加载编辑器…</div>;

  const openLinkDialog = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    setLinkPrompt({ open: true, url: previous ?? '' });
  };

  const confirmLink = (url: string) => {
    const u = url.trim();
    if (u === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      const normalized = /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u;
      const chain = editor.chain().focus();
      const { empty } = editor.state.selection;
      if (empty) {
        chain.insertContent({
          type: 'text',
          text: u,
          marks: [{ type: 'link', attrs: { href: normalized } }]
        });
      } else {
        chain.extendMarkRange('link').setLink({ href: normalized });
      }
      chain.run();
    }
    setLinkPrompt({ open: false, url: '' });
  };

  const insertLocalImage = async () => {
    const rel = await importLocalImage();
    if (!rel) return;
    editor
      .chain()
      .focus()
      .setImage({ src: resolveAssetSrc(rel), alt: '' })
      .run();
  };

  const insertNetworkImage = () => {
    setImagePrompt({ open: true, url: '' });
  };

  const confirmNetworkImage = (url: string) => {
    const u = url.trim();
    if (u) {
      const normalized = /^(https?:|data:|todoba-asset:)/i.test(u)
        ? u
        : 'https://' + u;
      editor.chain().focus().setImage({ src: normalized, alt: '' }).run();
    }
    setImagePrompt({ open: false, url: '' });
  };

  const removeImage = () => {
    if (editor.isActive('image')) {
      editor.chain().focus().deleteSelection().run();
    }
  };

  const inTable = editor.isActive('table');
  const inImage = editor.isActive('image');
  const can = (fn: (c: any) => boolean) => {
    if (!inTable) return false;
    try {
      return fn(editor.can().chain().focus());
    } catch {
      return false;
    }
  };
  const run = (fn: (c: any) => any) => {
    fn(editor.chain().focus()).run();
    editor.commands.focus();
  };

  const tableActions: {
    label: string;
    hint?: string;
    disabled?: boolean;
    separator?: boolean;
    onClick: () => void;
  }[] = [
    {
      label: '插入 3×3 表格',
      hint: '含表头',
      onClick: () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: '上方插入行',
      disabled: !can((c) => c.addRowBefore().run()),
      onClick: () => run((c) => c.addRowBefore())
    },
    {
      label: '下方插入行',
      disabled: !can((c) => c.addRowAfter().run()),
      onClick: () => run((c) => c.addRowAfter())
    },
    {
      label: '删除当前行',
      disabled: !can((c) => c.deleteRow().run()),
      onClick: () => run((c) => c.deleteRow())
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: '左侧插入列',
      disabled: !can((c) => c.addColumnBefore().run()),
      onClick: () => run((c) => c.addColumnBefore())
    },
    {
      label: '右侧插入列',
      disabled: !can((c) => c.addColumnAfter().run()),
      onClick: () => run((c) => c.addColumnAfter())
    },
    {
      label: '删除当前列',
      disabled: !can((c) => c.deleteColumn().run()),
      onClick: () => run((c) => c.deleteColumn())
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: '切换表头行',
      disabled: !can((c) => c.toggleHeaderRow().run()),
      onClick: () => run((c) => c.toggleHeaderRow())
    },
    {
      label: '删除整个表格',
      disabled: !can((c) => c.deleteTable().run()),
      onClick: () => run((c) => c.deleteTable())
    }
  ];

  return (
    <div className="rt-editor">
      <div className="rt-toolbar">
        <select
          className="rt-select"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('codeBlock')
                    ? 'code'
                    : editor.isActive('blockquote')
                      ? 'quote'
                      : 'p'
          }
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            if (v === 'p') chain.setParagraph().run();
            else if (v === 'h1') chain.toggleHeading({ level: 1 }).run();
            else if (v === 'h2') chain.toggleHeading({ level: 2 }).run();
            else if (v === 'h3') chain.toggleHeading({ level: 3 }).run();
            else if (v === 'quote') chain.toggleBlockquote().run();
            else if (v === 'code') chain.toggleCodeBlock().run();
            e.target.value = v;
          }}
        >
          <option value="p">正文</option>
          <option value="h1">标题 1</option>
          <option value="h2">标题 2</option>
          <option value="h3">标题 3</option>
          <option value="quote">引用</option>
          <option value="code">代码块</option>
        </select>

        <Divider />
        <ToolBtn
          title="加粗 (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </ToolBtn>
        <ToolBtn
          title="斜体 (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </ToolBtn>
        <ToolBtn
          title="删除线"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </ToolBtn>
        <ToolBtn
          title="行内代码"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {'<>'}
        </ToolBtn>
        <ToolBtn
          title="链接"
          active={editor.isActive('link')}
          onClick={openLinkDialog}
        >
          🔗
        </ToolBtn>
        <NativeToolBtn title="图片：本地" onClick={insertLocalImage}>
          🖼
        </NativeToolBtn>
        <ToolBtn title="图片：网络 URL" onClick={insertNetworkImage}>
          🌐
        </ToolBtn>
        {inImage && (
          <ToolBtn title="删除图片" onClick={removeImage}>
            ✕图
          </ToolBtn>
        )}

        <Divider />
        <ToolBtn
          title="无序列表"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • 列表
        </ToolBtn>
        <ToolBtn
          title="有序列表"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolBtn>
        <ToolBtn
          title="任务列表"
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☑
        </ToolBtn>

        <Divider />
        <div className="rt-dropdown-wrap">
          <button
            ref={tableBtnRef}
            type="button"
            className={cx(
              'rt-tool-btn rt-dropdown-trigger',
              inTable && 'is-active',
              tableMenuOpen && 'is-open'
            )}
            title="表格"
            aria-haspopup="menu"
            aria-expanded={tableMenuOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableMenuOpen((o) => !o)}
          >
            ▦ 表格 <span className="rt-caret">▾</span>
          </button>
          {tableMenuOpen &&
            tableCoords &&
            createPortal(
              <div
                id="rt-table-menu"
                className="rt-menu"
                style={{ top: tableCoords.top, left: tableCoords.left }}
                role="menu"
              >
                {tableActions.map((a, i) =>
                  a.separator ? (
                    <div key={i} className="rt-menu-sep" />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      role="menuitem"
                      className="rt-menu-item"
                      disabled={a.disabled}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        a.onClick();
                        setTableMenuOpen(false);
                      }}
                    >
                      <span>{a.label}</span>
                      {a.hint && <span className="rt-menu-hint">{a.hint}</span>}
                    </button>
                  )
                )}
              </div>,
              document.body
            )}
        </div>

        <Divider />
        <ToolBtn
          title="撤销 (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolBtn>
        <ToolBtn
          title="重做 (Ctrl+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolBtn>
      </div>
      <EditorContent editor={editor} className="rt-scroll" />

      <PromptModal
        open={linkPrompt.open}
        title="插入链接"
        label="链接地址（以 http(s):// 开头；留空可清除链接）"
        initialValue={linkPrompt.url}
        placeholder="https://example.com"
        okText="确定"
        onConfirm={confirmLink}
        onCancel={() => setLinkPrompt({ open: false, url: '' })}
      />
      <PromptModal
        open={imagePrompt.open}
        title="插入网络图片"
        label="图片 URL（https:// 或 data:）"
        initialValue={imagePrompt.url}
        placeholder="https://example.com/image.png"
        okText="插入"
        onConfirm={confirmNetworkImage}
        onCancel={() => setImagePrompt({ open: false, url: '' })}
      />
    </div>
  );
}
