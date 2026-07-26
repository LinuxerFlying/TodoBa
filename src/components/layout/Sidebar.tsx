import { useTodoStore } from '../../store/useTodoStore';
import { useUiStore } from '../../store/useUiStore';
import { SearchBar } from './SearchBar';
import { TagList } from './TagList';
import { ThemeSelector } from '../settings/ThemeSelector';
import { VaultPathSetting } from '../settings/VaultPathSetting';
import { cx } from '../../lib/classnames';
import toast from 'react-hot-toast';

export function Sidebar() {
  const create = useTodoStore((s) => s.create);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const showArchived = useUiStore((s) => s.showArchived);
  const toggleArchived = useUiStore((s) => s.toggleArchived);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const handleNew = async () => {
    await create();
    toast.success('已新建事项');
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      <aside className={cx('sidebar', !sidebarOpen && 'sidebar-collapsed')}>
        <div className="sidebar-header">
          <SearchBar />
          <button className="new-btn" onClick={handleNew}>
            <span className="new-btn-icon">＋</span> 新建事项
          </button>
        </div>

        <div className="sidebar-section">
          <div className="view-switch">
            <button
              className={cx('view-btn', view === 'kanban' && 'view-btn-active')}
              onClick={() => setView('kanban')}
            >
              ▦ 看板
            </button>
            <button
              className={cx('view-btn', view === 'list' && 'view-btn-active')}
              onClick={() => setView('list')}
            >
              ☰ 列表
            </button>
          </div>
          <label className="archived-toggle">
            <input type="checkbox" checked={showArchived} onChange={toggleArchived} />
            显示已归档
          </label>
        </div>

        <div className="sidebar-scroll">
          <TagList />
          <div className="sidebar-divider" />
          <ThemeSelector />
          <div className="sidebar-divider" />
          <VaultPathSetting />
        </div>
      </aside>
    </>
  );
}
