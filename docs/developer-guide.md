# 开发者指南

本项目是一个 Electron + React + TypeScript 的本地 Markdown 阅读与轻量编辑工具。开发时请优先保持“预览首屏轻、编辑器按需加载、文件操作集中在 App 协调”的结构。

## 环境要求

- Node.js 22.12+
- npm

安装依赖：

```bash
npm install
```

启动 Electron 开发模式：

```bash
npm run electron:dev
```

只启动 Vite：

```bash
npm run dev
```

## 常用命令

```bash
npm run typecheck
npm test
npm run build
npm run electron:build
```

`npm run typecheck` 会同时检查渲染进程和 Electron 主进程。提交前至少运行该命令；涉及构建或分包时运行 `npm run build`。

## 模块职责

### Electron 主进程

`electron/main.ts` 负责窗口、IPC、原生对话框、原子文件保存和文件关联。所有特权 IPC 必须校验 sender，文件读写必须绑定到由系统对话框或文件关联明确授权的路径；纯函数安全规则集中在 `electron/security.ts`。

### Preload

`electron/preload.ts` 是渲染进程访问桌面能力的唯一桥梁。新增主进程能力时，需要同步更新：

- `electron/preload.ts`
- `src/types/electron.d.ts`
- 调用方类型和错误处理

### App 状态中心

`src/App.tsx` 维护当前文件和视图模式，负责保存、新建、打开、系统打开文件和未保存更改保护。

不要在 Toolbar 或子组件中直接复制文件打开逻辑。子组件应触发 App 下发的回调，避免绕过未保存检查。

### 编辑和预览

`src/components/EditorArea/EditorArea.tsx` 根据视图模式选择：

- `preview`：渲染 `MarkdownPreview`
- `edit` / `live`：按需 lazy load `@uiw/react-md-editor`

`MarkdownPreview` 是阅读体验的主要模块，包含目录、搜索、锚点、阅读进度和轻量代码高亮。新增耗时逻辑时应考虑 debounce、`requestAnimationFrame` 或拆到 Worker。

### Markdown 渲染

`src/utils/markdownRenderer.ts` 使用 `marked` 解析、`DOMPurify` 清洗。新增允许标签或属性时，需要确认不会扩大 XSS 面。

## 文件操作约定

- 读取和保存使用 UTF-8。
- 文件大小上限为 10MB。
- 保存采用同目录临时文件同步后原子替换，禁止退回直接覆盖写入。
- 文件内容以 App 为唯一即时状态源；预览可以延迟，未保存状态不能防抖。
- 新建文件首次保存时弹出保存对话框。
- 替换当前文件前必须处理未保存更改：保存、丢弃或取消。
- 关闭窗口和退出应用同样必须经过未保存更改确认。
- 空文件是合法文件，读取成功时内容可以是空字符串。

## 样式约定

全局设计变量在 `src/styles/variables.css`。组件样式应尽量复用变量，避免引入新的大面积装饰层。阅读模式优先保证正文可读性、稳定宽度和清晰焦点状态。

## 文档同步

改动以下内容时，请同步更新 `docs/` 中相关文档：

- 用户可见流程和快捷键
- 文件格式、大小限制、安全限制
- 架构边界、模块职责、构建命令
- 新增或删除主要组件

文档入口在 `docs/README.md`，新增正式文档时需要在该索引中登记。
