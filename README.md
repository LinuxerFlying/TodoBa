# TodoBa

> v0.6.0 · 印象笔记风格的 Markdown 待办管理工具 — 四象限看板 · Markdown 存储 · 多主题

![technology](https://img.shields.io/badge/Electron-33-47848F) ![react](https://img.shields.io/badge/React-18-61DAFB) ![typescript](https://img.shields.io/badge/TypeScript-5-3178C6)

## ✨ 功能特性

- **📝 Markdown 一事项一文件**：数据完全保存在本地 Markdown 文件中，便于版本控制、外部编辑、数据迁移
- **🎯 四象限看板**（艾森豪威尔矩阵）：紧急重要 / 重要不紧急 / 紧急不重要 / 不重要不紧急，拖放即可分类
- **📊 进度管理**：每个事项支持 0–100% 进度滑块
- **🏷️ 状态管理**：待办 / 进行中 / 已完成 / 已取消 / 已归档
- **📅 备注与标签**：支持 Markdown 富文本备注（双栏预览）、标签聚合过滤、截止日期、优先级
- **🔍 全文搜索**：标题、正文、标签一次搜到
- **🎨 四套主题**：明亮 / 深色 / 护眼绿 / 印象黄，一键切换并持久化
- **⌨️ 键盘快捷键**：Ctrl+N 新建 / Ctrl+F 搜索 / Ctrl+1–4 设象限 / Ctrl+D 删除 / Esc 取消
- **↩️ 删除撤销**：5 秒内可撤销删除
- **📁 外部同步**：vault 目录通过 chokidar 监听，外部编辑器修改实时同步
- **💾 原子写入**：写临时文件 + rename，断电不损坏数据

## 📦 Markdown 文件格式

每个待办事项一个独立 `.md` 文件，YAML frontmatter 存元数据，正文为 Markdown 备注：

```markdown
---
id: a1b2c3d4
title: 完成季度报告
quadrant: q1          # q1-q4
status: in-progress   # todo / in-progress / done / cancelled / archived
priority: high        # low / medium / high / critical
progress: 40          # 0-100
due: 2026-07-28
created: 2026-07-25T09:14:00+08:00
updated: 2026-07-25T14:02:00+08:00
tags: [work, reporting]
---

## 备注

- [x] 起草大纲
- [ ] 收集数据
```

## 🚀 开发

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（主进程 + Vite dev server）
npm run build      # 构建
npm run package    # 打包为可安装程序 (Windows NSIS)
npm run typecheck  # 类型检查
```

## 🗂️ 项目结构

```
electron/           主进程 + preload
  main/
    index.ts        应用入口
    ipc/            todos / settings / vault IPC
    services/       markdown-parser / writer / file-watcher / id
    types/
  preload/index.ts  contextBridge 暴露 window.api
src/                渲染进程 (React)
  components/
    layout/         AppLayout / Sidebar / TitleBar / SearchBar / TagList
    kanban/         KanbanBoard / QuadrantColumn / TodoCard
    editor/         TodoEditor / MetadataForm / MarkdownEditor / ProgressSlider
    list/           TodoListView
    settings/       ThemeSelector / VaultPathSetting
    ui/             Button / Input / Select / Badge / Modal
  store/            Zustand: useTodo / useSettings / useUi
  hooks/            useDebounce / useHotkeys
  themes/           四套主题 CSS 变量
  lib/              date / markdown / classnames 工具
  styles/           global / sidebar / kanban / editor
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd + N` | 新建事项 |
| `Ctrl/Cmd + F` | 聚焦搜索 |
| `Ctrl/Cmd + 1~4` | 设置象限 q1~q4 |
| `Ctrl/Cmd + D` | 删除选中事项 |
| `Esc` | 清除搜索 / 取消选中 |

## 🎨 主题

通过 `data-theme` 属性 + CSS 变量实现，组件无硬编码颜色：

- `light` — 明亮
- `dark` — 深色
- `eyecare` — 护眼豆沙绿
- `evernote` — 印象笔记经典米黄（默认）

## 📄 License

MIT
