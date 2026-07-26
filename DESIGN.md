# TodoBa — 设计文档

>  Markdown 待办管理工具 | 四象限看板 | 多主题 | 本地优先

---

## 一、项目概述

**项目定位**：一款本地桌面待办管理工具，数据全部以 Markdown 文件存储在用户本地目录（vault），支持四象限（艾森豪威尔矩阵）看板管理、进度/状态/标签/备注、多套内置主题切换。

**应用名称**：TodoBa
- `package.json` productName: `TodoBa`
- `app.setAppName('TodoBa')`
- 应用 ID：`com.todoba.app`（electron-builder 打包用）
- 默认 vault 路径：`~/Documents/TodoBa/`

**技术栈**：

| 层 | 选型 | 理由 |
|---|---|---|
| 壳 | Electron 30+ | 跨平台桌面，文件系统直连 |
| 构建 | electron-vite | 官方推荐，main/preload/renderer 一体配置 |
| UI | React 18 + TypeScript | 生态成熟 |
| 状态 | Zustand | 轻量无 boilerplate |
| 拖放 | @dnd-kit/core + @dnd-kit/sortable | 现代首选，API 简洁 |
| Markdown | gray-matter + marked + dompurify | frontmatter 解析 + 渲染 + XSS 消毒 |
| 设置 | electron-store | 持久化主题/vault 路径 |
| 文件监听 | chokidar | 跨平台可靠 |
| ID | nanoid | 短 ID 生成 |
| 日期 | date-fns | 轻量 |
| 样式 | CSS 变量 (data-theme) | 零运行时主题切换 |

---

## 二、Markdown 文件格式规范

### 2.1 文件命名与位置

- 每个待办事项一个独立 `.md` 文件
- 文件名：`{id}.md`，id 为 8 位 nanoid（如 `a1b2c3d4.md`）
- 存储位置：用户选定的 vault 目录（默认 `~/Documents/TodoBa/`）
- id 与文件名绑定，标题修改无需重命名文件

### 2.2 文件结构

```markdown
---
id: a1b2c3d4
title: 完成季度报告
quadrant: q1
status: in-progress
priority: high
progress: 40
due: 2026-07-28
created: 2026-07-25T09:14:00+08:00
updated: 2026-07-25T14:02:00+08:00
tags:
  - work
  - reporting
---

## 备注

自由 Markdown 正文，支持列表、代码、链接、子任务：
- [x] 起草大纲
- [ ] 收集销售数据
- [ ] 撰写执行摘要
```

### 2.3 字段说明

| 字段 | 类型 | 必填 | 可选值 / 说明 |
|---|---|---|---|
| `id` | string | 是 | 8 位 nanoid，全局唯一 |
| `title` | string | 是 | 事项标题（**不在正文中重复 H1**，单一数据源）|
| `quadrant` | enum | 是 | `q1` / `q2` / `q3` / `q4`（见四象限定义）|
| `status` | enum | 是 | `todo` / `in-progress` / `done` / `cancelled` / `archived` |
| `priority` | enum | 是 | `low` / `medium` / `high` / `critical` |
| `progress` | int | 是 | 0–100 整数 |
| `due` | date | 否 | `YYYY-MM-DD`，过期红色高亮 |
| `created` | ISO datetime | 是 | 创建时间，仅初始化时写入 |
| `updated` | ISO datetime | 是 | 每次保存自动更新 |
| `tags` | string[] | 否 | YAML 序列，侧栏聚合展示 |
| 正文 | markdown | 否 | YAML 结束符 `---` 后所有内容 |

### 2.4 四象限定义（艾森豪威尔矩阵）

| 象限 | 含义 | 视觉定位 | 默认配色 |
|---|---|---|---|
| **q1** | 紧急 & 重要 | 左上 | 红/粉 |
| **q2** | 重要 & 不紧急 | 右上 | 蓝 |
| **q3** | 紧急 & 不重要 | 左下 | 黄 |
| **q4** | 不紧急 & 不重要 | 右下 | 灰 |

### 2.5 原子写入策略

写入流程：先写 `{id}.md.tmp` 临时文件 → `fs.rename` 覆盖目标文件。崩溃时要么是旧状态要么是新状态，绝不会出现部分写入的损坏文件。

---

## 三、目录结构

```
case5-TodoList/
├── package.json
├── tsconfig.json / tsconfig.node.json
├── electron.vite.config.ts
├── index.html
├── .gitignore / .eslintrc.cjs / README.md / DESIGN.md
│
├── electron/                              # 主进程 + preload
│   ├── main/
│   │   ├── index.ts                       # 入口、BrowserWindow 创建
│   │   ├── ipc/
│   │   │   ├── todos.ts                   # ★ Markdown CRUD 核心
│   │   │   ├── settings.ts                # electron-store 读写
│   │   │   └── vault.ts                   # vault 目录选择 + watcher 启动
│   │   ├── services/
│   │   │   ├── markdown-parser.ts         # gray-matter 解析 + 默认值填充
│   │   │   ├── markdown-writer.ts         # 序列化 + 原子写入
│   │   │   ├── file-watcher.ts            # chokidar 封装 + 自写事件防抖
│   │   │   └── id.ts                      # nanoid 封装
│   │   └── types/todo.ts                  # 主进程侧 Todo 类型
│   └── preload/
│       └── index.ts                       # contextBridge 暴露 window.api
│
└── src/                                   # 渲染进程 (React)
    ├── main.tsx / App.tsx
    ├── vite-env.d.ts
    ├── types/
    │   ├── todo.ts                        # Todo/Quadrant/Status/Priority
    │   ├── settings.ts
    │   └── ipc.d.ts                       # window.api 类型声明
    ├── store/                             # Zustand stores
    │   ├── useTodoStore.ts
    │   ├── useSettingsStore.ts
    │   └── useUiStore.ts
    ├── hooks/
    │   ├── useIpc.ts                      # window.api 类型化包装
    │   ├── useDebounce.ts
    │   └── useHotkeys.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx              # 三栏外壳
    │   │   ├── Sidebar.tsx                # 左侧栏
    │   │   ├── TitleBar.tsx               # 无边框窗口自定义标题栏
    │   │   ├── SearchBar.tsx              # 全文搜索
    │   │   └── TagList.tsx                # 标签聚合+过滤
    │   ├── kanban/
    │   │   ├── KanbanBoard.tsx            # ★ 2×2 看板 + DndContext
    │   │   ├── QuadrantColumn.tsx         # 单个象限 droppable
    │   │   └── TodoCard.tsx               # draggable 卡片
    │   ├── editor/
    │   │   ├── TodoEditor.tsx             # 右侧编辑面板
    │   │   ├── MetadataForm.tsx           # 元数据表单
    │   │   ├── MarkdownEditor.tsx         # ★ 双栏 textarea/preview + 自动保存
    │   │   └── ProgressSlider.tsx
    │   ├── list/
    │   │   └── TodoListView.tsx           # 扁平列表视图
    │   ├── settings/
    │   │   ├── ThemeSelector.tsx          # 主题切换
    │   │   └── VaultPathSetting.tsx
    │   └── ui/                            # 基础组件
    │       ├── Button.tsx / Input.tsx / Select.tsx
    │       ├── Badge.tsx / Modal.tsx / Slider.tsx
    ├── themes/
    │   └── themes.css                     # ★ 四套主题 CSS 变量
    ├── lib/
    │   ├── date.ts / markdown.ts / classnames.ts
    └── styles/
        ├── global.css / kanban.css / editor.css / sidebar.css
```

---

## 四、进程架构与 IPC 设计

### 4.1 安全配置

```ts
webPreferences: {
  contextIsolation: true,      // ✅ 开启
  nodeIntegration: false,      // ✅ 关闭
  sandbox: false,              // preload 需要 require
  preload: path.join(__dirname, '../preload/index.js')
}
```

### 4.2 IPC 通道

| Channel | 方向 | Payload | Returns | 说明 |
|---|---|---|---|---|
| `todos:list` | R→M | — | `Todo[]` | 扫描 vault 所有 md 文件 |
| `todos:read` | R→M | `{id}` | `Todo` | 读单条 |
| `todos:create` | R→M | `{data}` | `Todo` | 创建（自动生成 id/created/updated）|
| `todos:update` | R→M | `{id, patch}` | `Todo` | 原子更新，自动 bump updated |
| `todos:delete` | R→M | `{id}` | `{ok:true}` | 删除文件 |
| `todos:batchUpdate` | R→M | `{ids, patch}` | `Todo[]` | 批量（撤销 toast 用）|
| `settings:get` | R→M | `{key}` | `unknown` | electron-store 读 |
| `settings:set` | R→M | `{key, value}` | `{ok:true}` | electron-store 写 |
| `vault:pick` | R→M | — | `{path\|null}` | 弹目录选择框 |
| `vault:scan` | R→M | — | `{path, count}` | 强制重新扫描 |
| `vault:changed` | M→R 推送 | `{type, id}` | — | chokidar add/change/unlink |

### 4.3 Preload 桥（类型化）

```ts
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  todos: {
    list:   ()             => ipcRenderer.invoke('todos:list'),
    read:   (id: string)   => ipcRenderer.invoke('todos:read', { id }),
    create: (data)         => ipcRenderer.invoke('todos:create', { data }),
    update: (id, patch)    => ipcRenderer.invoke('todos:update', { id, patch }),
    delete: (id: string)   => ipcRenderer.invoke('todos:delete', { id }),
    batchUpdate: (ids, patch) => ipcRenderer.invoke('todos:batchUpdate', { ids, patch }),
    onChange: (cb) => {
      const h = (_e, p) => cb(p);
      ipcRenderer.on('vault:changed', h);
      return () => ipcRenderer.removeListener('vault:changed', h);
    },
  },
  settings: {
    get: (k: string) => ipcRenderer.invoke('settings:get', { key: k }),
    set: (k: string, v: unknown) => ipcRenderer.invoke('settings:set', { key: k, value: v }),
  },
  vault: {
    pick: () => ipcRenderer.invoke('vault:pick'),
    scan: () => ipcRenderer.invoke('vault:scan'),
  },
};
contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
```

### 4.4 文件监听自写防抖

主进程维护内存集合 `justWrote`：每次 IPC 写入后把文件名放入集合（TTL 500ms），chokidar 事件命中则忽略，避免"自己写→触发 change→重复刷新"的反馈循环。

---

## 五、数据模型与状态管理

### 5.1 Todo 类型（主/渲染共享）

```ts
type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';
type Status   = 'todo' | 'in-progress' | 'done' | 'cancelled' | 'archived';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  status: Status;
  priority: Priority;
  progress: number;        // 0-100
  due?: string;            // YYYY-MM-DD
  created: string;         // ISO
  updated: string;         // ISO
  tags: string[];
  body: string;            // markdown 正文
}
```

### 5.2 Zustand Store

**useTodoStore**

```ts
interface TodoState {
  todos: Record<string, Todo>;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  create: (data: Partial<Todo>) => Promise<Todo>;
  update: (id: string, patch: Partial<Todo>) => Promise<void>;  // 乐观更新
  remove: (id: string) => Promise<void>;
  select: (id: string | null) => void;
  getByQuadrant: (q: Quadrant) => Todo[];
  getAllTags: () => { tag: string; count: number }[];
}
```

- `update` 先乐观更新 Zustand，再发 IPC；`vault:changed` 推送到达时对账（主要处理外部编辑器修改）。

**useSettingsStore**

```ts
interface SettingsState {
  theme: 'light' | 'dark' | 'eyecare' | 'evernote';
  vaultPath: string;
  init: () => Promise<void>;
  setTheme: (t: Theme) => Promise<void>;   // 写 data-theme 并持久化
  setVaultPath: (p: string) => Promise<void>;
}
```

**useUiStore**

```ts
interface UiState {
  view: 'kanban' | 'list';
  searchQuery: string;
  activeTag: string | null;
  sidebarOpen: boolean;
  setView / setSearch / setActiveTag / toggleSidebar;
}
```

---

## 六、UI 布局

三栏布局：

```
┌─────────────┬──────────────────────────┬─────────────────────┐
│ TitleBar (窗口拖动 / 最小化/最大化/关闭)                        │
├─────────────┼──────────────────────────┼─────────────────────┤
│             │  ┌────── Q1 ──────┬────── Q2 ──────┐           │
│ 🔍 搜索     │  │ 紧急重要       │ 重要不紧急      │           │
│ ─────────   │  │ [TodoCard]     │ [TodoCard]      │           │
│ ➕ 新建     │  │ [TodoCard]     │                 │    编辑面板│
│ ─────────   │  ├────────────────┼─────────────────┤  ────────│
│ 📋 看板/列表│  │ 紧急不重要     │ 不紧急不重要    │  标题[input]
│ 🎨 主题     │  │                │                 │  象限[sel]│
│ 📁 vault    │  └────────────────┴─────────────────┘  状态[sel]│
│ ─────────   │                                        优先级   │
│ 标签        │   (若选择列表视图则为扁平表格)         进度slider
│ ▢ work (3)  │                                        日期     │
│ ▢ home (1)  │                                        标签chips│
│ ▢ ...       │                                        ────────│
│             │                                        Markdown │
│             │                                        双栏编辑 │
└─────────────┴─────────────────────────────────────────────────┘
```

### 6.1 核心组件职责

| 组件 | 职责 |
|---|---|
| `AppLayout` | 三栏网格容器 + DndContext + toast/modal 宿主 |
| `Sidebar` | 新建按钮、主题切换、vault 设置、视图切换、标签列表 |
| `TitleBar` | 无边框窗口拖动区域 + 最小化/最大化/关闭按钮 |
| `KanbanBoard` | 2×2 网格，DndContext 根，处理 onDragEnd |
| `QuadrantColumn` | Droppable，象限标题+计数，接收拖入卡片 |
| `TodoCard` | Draggable，显示标题/进度条/截止日期/标签/状态图标 |
| `TodoEditor` | 选中事项的编辑面板（未选中时显示引导文案）|
| `MetadataForm` | 元数据表单：标题/象限/状态/优先级/进度/日期/标签 |
| `MarkdownEditor` | 左 textarea 编辑、右 marked+dompurify 预览，500ms 防抖自动保存 |
| `TodoListView` | 按截止日期/优先级排序的扁平列表（备选视图）|
| `ThemeSelector` | 4 主题分段控件，立即应用并持久化 |

### 6.2 拖放交互（@dnd-kit）

- `KanbanBoard` 包裹 `<DndContext onDragEnd={handleDragEnd}>`
- `QuadrantColumn` 使用 `useDroppable`，`isOver` 时高亮边框
- `TodoCard` 使用 `useDraggable`，拖动中原位置 `opacity: .4`
- `<DragOverlay>` 渲染带阴影的卡片克隆作为拖动预览
- `handleDragEnd`：若 `over.id !== active.card.quadrant`，调用 `todoStore.update(id, { quadrant: over.id })`；同象限拖放 no-op 不落盘

---

## 七、主题系统

### 7.1 主题列表

| 主题 key | 风格 | 主色 | 背景色 |
|---|---|---|---|
| `light` | 明亮 | 蓝 #2563eb | #ffffff |
| `dark` | 深色 | 浅蓝 #60a5fa | #0f1115 |
| `eyecare` | 护眼豆沙绿 | 深绿 #2f6f2f | #c7e6c7 |
| `evernote` | 经典 | 印象绿 #2dbe60 | #f6f1e1（米黄）|

### 7.2 实现方式

所有颜色定义为 CSS 自定义属性，挂在 `:root`；各主题通过 `[data-theme="xxx"]` 选择器重写。组件**只引用 `var(--xxx)`**，绝无硬编码颜色。

```css
/* src/themes/themes.css */
:root, [data-theme="light"] {
  --bg: #ffffff; --bg-elev: #f7f7f8; --bg-card: #ffffff;
  --border: #e5e7eb; --text: #1f2328; --text-muted: #6b7280;
  --accent: #2563eb; --accent-fg: #ffffff; --danger: #dc2626;
  --q1: #fecaca; --q2: #bfdbfe; --q3: #fde68a; --q4: #d1d5db;
  --shadow: 0 1px 3px rgba(0,0,0,.08);
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
[data-theme="dark"] {
  --bg: #0f1115; --bg-elev: #171a21; --bg-card: #1c2029;
  --border: #2a2f3a; --text: #e6e7ea; --text-muted: #9aa0aa;
  --accent: #60a5fa; --accent-fg: #0b1220; --danger: #f87171;
  --q1: #7f1d1d; --q2: #1e3a8a; --q3: #78350f; --q4: #374151;
  --shadow: 0 1px 2px rgba(0,0,0,.5);
}
[data-theme="eyecare"] {
  --bg: #c7e6c7; --bg-elev: #b6dcb6; --bg-card: #d8efd8;
  --border: #8fbf8f; --text: #1f3a1f; --text-muted: #4a6b4a;
  --accent: #2f6f2f; --accent-fg: #fff; --danger: #b91c1c;
  --q1: #fca5a5; --q2: #93c5fd; --q3: #fcd34d; --q4: #a8bfa8;
}
[data-theme="evernote"] {
  --bg: #f6f1e1; --bg-elev: #efe8d0; --bg-card: #fffdf5;
  --border: #d8cfae; --text: #2f2a1d; --text-muted: #6f6749;
  --accent: #2dbe60; --accent-fg: #fff; --danger: #c0392b;
  --q1: #f5b7b1; --q2: #aed6f1; --q3: #f9e79f; --q4: #d5d8dc;
}
```

切换主题：`document.documentElement.dataset.theme = theme`，由 `useSettingsStore.setTheme` 调用并通过 `settings:set` 持久化到 electron-store。

---

## 八、关键流程

### 8.1 启动流程

```
app ready
  → 读 electron-store（theme, vaultPath）
  → 若无 vaultPath → 弹 VaultPicker Modal（默认 ~/Documents/TodoBa）
  → chokidar.watch(vaultPath, {glob: '*.md'})
  → todos:list 扫描所有 md → 灌入 Zustand
  → 创建 BrowserWindow → 加载 renderer
  → 订阅 vault:changed → 增量更新 Zustand
```

### 8.2 创建待办

```
点击「新建」→ todos:create {title:'新事项', quadrant:'q2', status:'todo', ...}
  → 主进程生成 id/created/updated → 原子写入 {id}.md
  → 返回完整 Todo → Zustand 插入 + select(id) → 编辑器面板聚焦标题
```

### 8.3 编辑自动保存

```
用户输入 → MetadataForm / MarkdownEditor 的 onChange
  → 本地 state 更新
  → 500ms debounce
  → todoStore.update(id, patch) → Zustand 乐观更新 + ipc invoke
  → 主进程原子写盘 → 文件 mtime 更新
  → chokidar 检测到 change（但 justWrote 集合命中，忽略自写事件）
```

### 8.4 外部文件变更同步

```
用户用 VS Code/笔记编辑 vault 内某 .md
  → chokidar 'change' 事件（不在 justWrote 集合）
  → 主进程读文件 → 通过 vault:changed 推送
  → 渲染进程 reconcile：更新 Zustand；
    若该文件正打开编辑且未修改，静默刷新；
    若有本地未保存修改，toast 提示"文件已被外部修改，点击重载"
```

### 8.5 跨象限拖放

```
dragStart → dragOver QuadrantColumn → drop
  → onDragEnd: over.id = q4, active.data.current.quadrant = q1
  → 不同象限 → update(id, { quadrant: 'q4' }) → 乐观重排 → 写盘
  → DragOverlay 消失，卡片出现在新列
```

### 8.6 删除与撤销

```
点击删除 → 确认弹窗 → 确认后：
  → 备份该 Todo 到内存栈
  → todos:delete(id) → unlink 文件
  → 显示 toast "已删除 XX [撤销]"（5s 自动消失）
  → 若点击撤销 → todos:create 以原数据重建（保持原 id）
```

---

## 九、快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd + N` | 新建待办 |
| `Ctrl/Cmd + F` | 聚焦搜索框 |
| `Ctrl/Cmd + S` | 立即保存（自动保存已开，仅作心理安慰）|
| `Esc` | 取消选中 / 关闭弹窗 |
| `Ctrl/Cmd + 1..4` | 快速设置当前选中事项的象限 |
| `Ctrl/Cmd + D` | 删除当前选中事项 |

---

## 十、实施路线（10 个阶段，每阶段可运行）

| 阶段 | 内容 | 验收点 |
|---|---|---|
| **A 脚手架** | vite + electron-vite + react-ts；主进程加载 dev server；preload ping | hello world 窗口 |
| **B 设置 + Vault** | electron-store 默认路径；首次 vault 选择；chokidar 事件打印 | 外部建文件控制台可见 |
| **C Markdown 持久化** | parser/writer 原子读写；todos CRUD IPC | 渲染原始标题列表 |
| **D 布局 + UI 外壳** | AppLayout/Sidebar/TitleBar；CSS 变量（light 先）；新建按钮 | 点新建出现卡片 |
| **E 看板 + DnD** | 2×2 KanbanBoard；@dnd-kit 拖放；列表视图切换 | 拖放跨象限即时移动 |
| **F 编辑器** | MetadataForm + MarkdownEditor 双栏；500ms 防抖自动保存；DOMPurify | 重启数据完整 |
| **G 侧栏功能** | 标签聚合/过滤；全文搜索；归档过滤 | 搜索命中跨字段 |
| **H 主题** | 四主题 CSS；ThemeSelector 切换+持久化 | 四套无 FOUC 切换 |
| **I 打磨** | 快捷键；删除确认+撤销 toast；过期红标；错误边界 | 交互顺畅 |
| **J 打包** | electron-builder Windows NSIS 配置；打包冒烟 | exe 安装后全功能 |

---

## 十一、依赖清单

**运行时**：

- `electron-store` — 设置持久化
- `gray-matter` — YAML frontmatter 解析
- `js-yaml` — frontmatter 依赖显式 pin
- `chokidar` — vault 文件监听
- `nanoid` — 短 ID 生成
- `marked` — markdown → HTML 渲染
- `dompurify` — preview XSS 消毒
- `zustand` — 状态管理
- `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` — 拖放
- `date-fns` — 日期处理
- `clsx` — classname 拼接
- `react-hot-toast` — toast 通知

**开发时**：

- `electron` / `electron-builder` / `electron-vite`
- `vite` / `@vitejs/plugin-react`
- `typescript` / `@types/react` / `@types/react-dom` / `@types/node` / `@types/dompurify`
- `eslint` / `@typescript-eslint/parser` / `@typescript-eslint/eslint-plugin` / `eslint-plugin-react-hooks`

---

## 十二、验证/测试要点

### 12.1 手动验证清单

**启动 & Vault**
- [ ] 首次启动弹目录选择；重启记住路径
- [ ] 外部拖入符合格式的 `.md` → ~200ms 内卡片出现
- [ ] 外部编辑器修改正文/frontmatter → UI 实时同步
- [ ] 外部删除文件 → 卡片消失

**CRUD**
- [ ] 新建 → 编辑标题/进度/标签/正文 → Alt+F4 强杀 → 重启数据完整
- [ ] 打开磁盘 `.md` 文件，frontmatter 与正文正确
- [ ] UI 删除 → 磁盘文件消失

**看板拖放**
- [ ] Q1→Q4 拖放 → 卡片到 Q4，磁盘 frontmatter `quadrant: q4`
- [ ] 重载 → 象限保持
- [ ] 同象限拖放 → 无磁盘写入（检查 mtime）

**编辑器**
- [ ] Markdown 标题/粗体/列表/代码块/链接 预览正确
- [ ] 连续输入无错误 toast；切换事项再切回内容最新
- [ ] due < today 且非 done → 红色 badge

**侧栏/搜索**
- [ ] 标签列表计数正确；点击过滤；再次点击取消过滤
- [ ] 搜索命中 title/body/tags；清空恢复全部

**主题**
- [ ] 四主题瞬间切换无 FOUC；重启保留选择

**安全性**
- [ ] 拖放瞬间强杀进程 → 重启无损坏文件（原子写入保护）
- [ ] 放入 frontmatter 损坏的文件 → 友好 toast 提示，其它文件仍加载

**打包**
- [ ] `npm run build && npm run package` → 安装 exe → 全功能验证

### 12.2 自动化测试（可选扩展）

- Vitest 单测：`parseTodoFile` / `serializeTodo`（空 body、缺字段、特殊字符、Windows 换行）
- React Testing Library：`TodoCard` / `MetadataForm` 冒烟测试
- Playwright + Electron E2E：启动 → 新建 → 拖放 → 断言磁盘文件内容

---

## 十三、风险与对策

| 风险 | 对策 |
|---|---|
| Electron 打包体积大（~80MB+） | 预期内；本地应用可接受 |
| chokidar 自写事件反馈循环 | 内存 `justWrote` TTL 500ms 集合过滤 |
| 大量 todos（>1000）渲染性能 | 看板虚拟列表延后实现；初版仅做简单渲染 |
| frontmatter 解析异常（脏文件） | 单文件 try/catch + toast 提示，不影响其它 |
| 多窗口同步（未来） | `vault:changed` 向所有 BrowserWindow 广播，架构已支持 |
| Markdown XSS | preview 使用 DOMPurify 消毒 |
| npm 在国内安装 electron 慢 | 配置 `.npmrc` 使用 electron 镜像 |

---

## 十四、实现周期估算

| 阶段 | AI 编码时间 |
|---|---|
| A 脚手架 | ~10 分钟 |
| B 设置 + Vault | ~15 分钟 |
| C Markdown 持久化 | ~25 分钟 |
| D 布局 + UI 外壳 | ~20 分钟 |
| E 看板 + DnD | ~25 分钟 |
| F 编辑器 | ~35 分钟 |
| G 侧栏功能 | ~15 分钟 |
| H 主题 | ~10 分钟 |
| I 打磨 | ~20 分钟 |
| J 打包 | ~15 分钟 |
| **AI 编码合计** | **~3 小时** |
| 依赖安装/构建等待 | +30–60 分钟 |
| 含用户验收反馈的日历时间 | **1–2 天**（宽松）|
