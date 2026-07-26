# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TodoBa** — 印象笔记风格的本地 Markdown 待办管理桌面应用。Electron + React 18 + TypeScript + Vite，数据以 Markdown 文件形式存储在用户本地 vault 目录，支持艾森豪威尔四象限看板、版本历史、多主题切换。

应用名 `TodoBa`，应用 ID `com.todoba.app`，默认 vault 路径 `~/Documents/TodoBa/`，默认主题 `evernote`。

## Commands

```bash
npm run dev          # 开发模式：electron-vite dev（主进程 + Vite dev server + Electron 一起启动）
npm run build        # 生产构建：编译 main/preload/renderer 到 out/
npm run preview      # 预览构建产物
npm run package      # 构建 + electron-builder 打平台安装包
npm run package:win  # 构建 + Windows NSIS x64 安装包
npm run typecheck    # tsc --noEmit 类型检查（唯一的代码质量工具，无 lint/测试）
```

打包产物输出到 `release/`：
- `release/TodoBa Setup 1.0.0.exe` — NSIS 安装程序
- `release/win-unpacked/TodoBa.exe` — 便携版（免安装直接运行）

构建前如果 `release/win-unpacked/TodoBa.exe` 正在运行需先关掉，否则无法覆盖（`taskkill //F //IM TodoBa.exe`）。

国内镜像配置在 `.npmrc`：npmmirror registry + electron/electron-builder 镜像。

## Build System

**electron-vite** 三个独立配置（见 `electron.vite.config.ts`）：

| Target | Entry | Output | 备注 |
|---|---|---|---|
| main | `electron/main/index.ts` | `out/main/` | `externalizeDepsPlugin()` 不打包 node_modules |
| preload | `electron/preload/index.ts` | `out/preload/` | 同上 |
| renderer | `src/index.html`（root 为 `src/`）| `out/renderer/` | `@vitejs/plugin-react` |

**Path aliases**（tsconfig + vite 两边都要配）：
- `@/*` → `src/*`
- `@main/*` → `electron/main/*`

electron-builder 配置嵌在 `package.json` 的 `"build"` 字段，`signAndEditExecutable: false` 跳过代码签名（本地工具无需证书）。

## Architecture（三进程 Electron 架构）

### Main 进程 (`electron/main/`)

- `index.ts` — 应用入口：创建无边框 BrowserWindow（`frame: false`, `titleBarStyle: 'hidden'`，1280×820，min 960×640），注册所有 IPC handler，启动 chokidar 监听 vault
- `ipc/todos.ts` — **核心**：Markdown 文件 CRUD、frontmatter 解析/序列化、原子写入、版本快照、回滚
- `ipc/settings.ts` — electron-store 包装，key：`theme`、`vaultPath`，store 文件名 `todoba-settings.json`
- `services/markdown-parser.ts` — gray-matter 解析；所有字段都有 clamp/coerce 兜底（非法 quadrant→q2，非法 status→todo，非法 progress→0；缺 created/updated 用文件 mtime）
- `services/markdown-writer.ts` — **原子写入**：先写 `{id}.md.tmp` 再 `fs.rename`，防崩溃损坏
- `services/file-watcher.ts` — chokidar 封装，含 `justWrote` Set 自写防抖（800ms TTL），忽略 `.history/` 等点目录
- `services/history.ts` — 版本管理：每次更新前把旧内容快照到 `.history/{id}/{timestamp}.md`，每 todo 保留 50 版本
- `services/id.ts` — nanoid(8) 生成短 ID

### Preload (`electron/preload/index.ts`)

`contextBridge.exposeInMainWorld('api', api)`，`contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`。渲染端类型在 `src/types/ipc.d.ts`。

`window.api` 命名空间：
- `todos`：`list / read / create / update / delete / batchUpdate / versions / readVersion / rollback / onChange`
- `settings`：`get / set`
- `vault`：`pick / scan`
- `window`：`minimize / maximize / close / isMaximized`（自定义标题栏用）

### Renderer (`src/`)

- `App.tsx` — 启动流程：`useSettingsStore.init()` → `useTodoStore.loadAll()` → 订阅 `vault:changed` 增量更新
- `components/layout/` — AppLayout 三栏外壳、Sidebar、TitleBar、SearchBar、TagList
- `components/kanban/` — KanbanBoard（DndContext）、QuadrantColumn（useDroppable）、TodoCard（useDraggable）
- `components/editor/` — TodoEditor、MetadataForm、MarkdownEditor（双栏 编辑/分栏/预览 + 500ms 防抖自动保存）、HistoryModal
- `components/list/` — TodoListView（扁平表格）
- `components/settings/` — ThemeSelector、VaultPathSetting
- `components/ui/` — Button/Input/Select/Badge/Modal 基础组件

## IPC 约定

- Channel 命名：`domain:action`（如 `todos:update`、`settings:get`）
- 单向推送：`vault:changed`（main → renderer），payload `{type: 'add'|'change'|'unlink', id: string}`
- 所有 R→M 调用用 `ipcRenderer.invoke` + `ipcMain.handle`

## State Management（Zustand 三个 store）

- **useTodoStore** — `todos: Record<id, Todo>`、`selectedId`；`update`/`remove`/`create` 均为乐观更新（先改 Zustand 再发 IPC，IPC 返回后以服务端为准覆盖，主要用于拿到正确的 updated 时间戳）
- **useSettingsStore** — `theme`/`vaultPath`；`setTheme` 立即写 `document.documentElement.dataset.theme` 再持久化
- **useUiStore** — `view`（kanban/list）、`searchQuery`、`activeTag`、`showArchived`、`sidebarOpen`，纯同步

**Todo 类型**（`src/types/todo.ts` 和 `electron/main/types/todo.ts` 两边重复，小项目不抽 shared 包）：

```ts
type Quadrant = 'q1'|'q2'|'q3'|'q4';
type Status = 'todo'|'in-progress'|'done'|'cancelled'|'archived';
type Priority = 'low'|'medium'|'high'|'critical';
interface Todo {
  id: string; title: string; quadrant: Quadrant; status: Status; priority: Priority;
  progress: number; // 0-100
  due?: string; created: string; updated: string; // ISO datetime / YYYY-MM-DD
  tags: string[]; body: string; // markdown
}
```

## Markdown 文件格式

每个 todo 一个 `{vaultPath}/{id}.md`：

```markdown
---
id: a1b2c3d4
title: 事项标题
quadrant: q1
status: in-progress
priority: high
progress: 40
due: 2026-07-28
created: 2026-07-25T09:14:00+08:00
updated: 2026-07-25T14:02:00+08:00
tags: [work, reporting]
---

Markdown 正文……
```

- 标题**只存 frontmatter**，正文不写 H1，单一数据源
- 版本历史在 `{vaultPath}/.history/{id}/`，文件名 `{ISO-timestamp-with-dashes}.md`
- `.history/` 在 `.gitignore`，且 chokidar 通过正则 `ignored` 忽略，不会触发 vault 事件

## Theming（CSS 变量）

- 所有颜色/半径/阴影用 CSS 自定义属性定义在 `src/themes/themes.css`
- 四套主题：`light` / `dark` / `eyecare` / `evernote`（默认），通过 `[data-theme="xxx"]` 选择器重写
- 组件**禁止硬编码颜色**，只引用 `var(--xxx)`
- 象限各自有 `--q1..--q4` 变量，主题独立配置
- 切换：`document.documentElement.dataset.theme = theme`

## Key Conventions（跨文件、非显而易见的约定）

1. **原子写入**（`markdown-writer.ts`）：所有写盘走 tmp + rename，崩溃不会有半写文件
2. **自写事件防抖**（`file-watcher.ts`）：每次 IPC 写盘后 `markWrote(id)` → 800ms 内忽略 chokidar 事件，避免反馈循环
3. **乐观 UI**（`useTodoStore.update`）：先改 Zustand 再 IPC；IPC 返回后用服务端值覆盖；外部编辑器修改通过 `vault:changed` → `reloadOne` 对账
4. **防抖自动保存**（`TodoEditor` + `useDebounce`）：编辑器本地 `draft` 状态，500ms 无输入触发 IPC 保存；`lastSavedRef` 对比字段避免无意义写入
5. **draft 与 store 同步边界**（`TodoEditor.tsx`）：draft 仅在 `selectedId`/`todo.id`/`todo.updated` 变化时从 store 重置——这保证回滚等外部更新能覆盖本地 draft（曾因只监听 id 导致回滚被自动保存覆盖的 bug）
6. **frontmatter 容错解析**：单字段损坏不会让整个文件失败，clamp 到默认值继续加载
7. **DOMPurify**：所有 Markdown preview HTML 消毒防 XSS
8. **删除撤销**：乐观删除 + 5 秒 toast 内含撤销按钮，撤销走 `todos:create` 保留原 id 重建
9. **拖放**：@dnd-kit/core，PointerSensor 5px 激活距离（避免点击被识别为拖放），closestCorners 碰撞检测，DragOverlay 显示带阴影的卡片克隆
10. **frameless 窗口**：TitleBar 自己画 `-webkit-app-region: drag`，按钮区域 `no-drag`，最小化/最大化/关闭走 `window:*` IPC

## 没有的东西

- 没有 ESLint / Prettier 配置
- 没有测试框架（无 vitest/jest/playwright）
- 没有 CI 配置
- 没有代码签名（打包时跳过 signtool，安装会有"未知发布者"提示，预期行为）
