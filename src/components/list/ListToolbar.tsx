import { MultiSelect } from '../ui/MultiSelect';
import { useUiStore, type SortField } from '../../store/useUiStore';
import {
  QUADRANT_LABELS,
  QUADRANT_ORDER,
  STATUS_LABELS,
  PRIORITY_LABELS
} from '../../types/todo';
import type { Quadrant, Status, Priority } from '../../types/todo';
import { hasActiveFilters } from '../../lib/sort';
import { cx } from '../../lib/classnames';

interface Props {
  total: number;
  shown: number;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'smart', label: '智能排序' },
  { value: 'title', label: '标题' },
  { value: 'quadrant', label: '象限' },
  { value: 'status', label: '状态' },
  { value: 'priority', label: '优先级' },
  { value: 'progress', label: '进度' },
  { value: 'due', label: '截止日期' },
  { value: 'updated', label: '更新时间' }
];

export function ListToolbar({ total, shown }: Props) {
  const sort = useUiStore((s) => s.listSort);
  const filters = useUiStore((s) => s.listFilters);
  const setSort = useUiStore((s) => s.setListSort);
  const setFilter = useUiStore((s) => s.setListFilter);
  const reset = useUiStore((s) => s.resetListControls);

  const filtered = hasActiveFilters(filters);
  const dirLabel = sort.field === 'smart' ? '' : sort.dir === 'asc' ? '↑' : '↓';

  return (
    <div className="list-toolbar">
      <div className="list-toolbar-info">
        <span className="list-toolbar-icon" aria-hidden>▽</span>
        {filtered ? (
          <span>
            筛选后 <strong>{shown}</strong> / 共 {total} 条
          </span>
        ) : (
          <span>共 {total} 条</span>
        )}
      </div>

      <div className="list-toolbar-actions">
        <label className="list-sort">
          <span className="list-sort-label">排序</span>
          <select
            className="ui-select list-sort-select"
            value={sort.field}
            onChange={(e) => setSort(e.target.value as SortField)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {sort.field !== 'smart' && (
            <button
              type="button"
              className="list-sort-dir"
              title="切换升/降序"
              onClick={() => setSort(sort.field)}
            >
              {dirLabel}
            </button>
          )}
        </label>

        <MultiSelect<Quadrant>
          label="象限"
          width={170}
          options={QUADRANT_ORDER.map((q) => ({
            value: q,
            label: QUADRANT_LABELS[q].title
          }))}
          value={filters.quadrant}
          onChange={(v) => setFilter('quadrant', v)}
        />

        <MultiSelect<Status>
          label="状态"
          width={150}
          options={(Object.keys(STATUS_LABELS) as Status[]).map((s) => ({
            value: s,
            label: STATUS_LABELS[s]
          }))}
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
        />

        <MultiSelect<Priority>
          label="优先级"
          width={150}
          options={(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p]
          }))}
          value={filters.priority}
          onChange={(v) => setFilter('priority', v)}
        />

        {(filtered || sort.field !== 'smart') && (
          <button
            type="button"
            className={cx('btn list-reset-btn')}
            onClick={reset}
            title="恢复默认排序并清空筛选"
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}
