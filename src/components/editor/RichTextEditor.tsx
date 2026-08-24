import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { cx } from '../../lib/classnames';
import { htmlToMarkdown, markdownToHtml } from '../../lib/rich-text';

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
      TaskItem.configure({ nested: true })
    ],
    content: markdownToHtml(value || ''),
    editorProps: {
      attributes: {
        class: 'rt-content',
        'data-placeholder': placeholder || '在这里输入内容…'
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

  if (!editor) return <div className="rt-loading">加载编辑器…</div>;

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('链接地址', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

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
          onMouseDown={(e) => e.preventDefault()}
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
        <ToolBtn title="链接" active={editor.isActive('link')} onClick={setLink}>
          🔗
        </ToolBtn>

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
    </div>
  );
}
