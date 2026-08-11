import { useState } from 'react';
import type { Todo, Quadrant, Status, Priority } from '../../types/todo';
import { QUADRANT_LABELS, STATUS_LABELS, PRIORITY_LABELS, QUADRANT_ORDER } from '../../types/todo';
import { ProgressSlider } from './ProgressSlider';
import { DatePicker } from '../ui/DatePicker';

interface Props {
  todo: Todo;
  onChange: (patch: Partial<Todo>) => void;
}

export function MetadataForm({ todo, onChange }: Props) {
  const [tagDraft, setTagDraft] = useState('');

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (todo.tags.includes(t)) return;
    onChange({ tags: [...todo.tags, t] });
    setTagDraft('');
  };

  const removeTag = (t: string) => {
    onChange({ tags: todo.tags.filter((x) => x !== t) });
  };

  return (
    <>
      <input
        className="editor-title-input"
        placeholder="事项标题…"
        value={todo.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <div className="editor-meta-grid">
        <span className="editor-meta-label">象限</span>
        <select
          className="ui-select"
          value={todo.quadrant}
          onChange={(e) => onChange({ quadrant: e.target.value as Quadrant })}
        >
          {QUADRANT_ORDER.map((q) => (
            <option key={q} value={q}>
              {QUADRANT_LABELS[q].title}
            </option>
          ))}
        </select>

        <span className="editor-meta-label">状态</span>
        <select
          className="ui-select"
          value={todo.status}
          onChange={(e) => onChange({ status: e.target.value as Status })}
        >
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <span className="editor-meta-label">优先级</span>
        <select
          className="ui-select"
          value={todo.priority}
          onChange={(e) => onChange({ priority: e.target.value as Priority })}
        >
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <span className="editor-meta-label">截止</span>
        <DatePicker
          value={todo.due}
          onChange={(v) => onChange({ due: v })}
          placeholder="设置截止日期"
        />

        <span className="editor-meta-label">标签</span>
        <div className="editor-tags">
          {todo.tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <button onClick={() => removeTag(t)} title="删除标签">
                ×
              </button>
            </span>
          ))}
          <input
            className="chip-input"
            placeholder={todo.tags.length ? '' : '+ 添加标签'}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagDraft);
              } else if (e.key === 'Backspace' && !tagDraft && todo.tags.length) {
                removeTag(todo.tags[todo.tags.length - 1]);
              }
            }}
            onBlur={() => tagDraft && addTag(tagDraft)}
          />
        </div>

        <ProgressSlider
          value={todo.progress}
          onChange={(v) => onChange({ progress: v })}
        />
      </div>
    </>
  );
}
