import { useUiStore } from '../../store/useUiStore';
import { Input } from '../ui/Input';

export function SearchBar() {
  const query = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <Input
        placeholder="搜索标题、正文、标签…"
        value={query}
        onChange={(e) => setSearch(e.target.value)}
      />
      {query && (
        <button className="search-clear" onClick={() => setSearch('')} title="清除">
          ✕
        </button>
      )}
    </div>
  );
}
