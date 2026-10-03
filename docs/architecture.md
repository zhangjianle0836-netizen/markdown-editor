# MD Editor 项目架构

MD Editor 是一个 Electron + React + TypeScript 桌面应用，当前核心形态是“单文件、预览优先、本地轻量阅读与编辑”。

## 技术栈

- Electron 44：桌面壳、窗口生命周期、原生文件对话框和文件关联
- React 18：渲染进程 UI
- TypeScript：主进程和渲染进程类型约束
- Vite 7：前端构建和代码分割
- marked + DOMPurify：Markdown 解析和 HTML 清洗
- @uiw/react-md-editor：编辑/分屏模式下按需加载的编辑器

## 目录结构

```text
md-editor/
├── electron/
│   ├── main.ts              # Electron 主进程、IPC、文件读写、文件关联
│   ├── preload.ts           # contextBridge 安全 API
│   └── security.ts          # URL、路径和文件参数的纯函数安全校验
├── src/
│   ├── App.tsx              # 单文件状态、保存/打开协调、快捷键
│   ├── components/
│   │   ├── EditorArea/      # 预览、编辑器 lazy loader、阅读样式
│   │   ├── HelpPanel/       # 帮助面板
│   │   ├── Toast/           # 通知
│   │   └── Toolbar/         # 工具栏和视图切换
│   ├── hooks/               # 快捷键、Toast
│   ├── styles/              # 全局样式和设计变量
│   ├── types/               # Electron API 类型
│   └── utils/               # Markdown 渲染、导出、路径、对话框
├── docs/                    # 用户和开发文档
├── build/                   # 打包资源
└── vite.config.mts           # Vite 构建配置
```

## 运行时架构

### 主进程

`electron/main.ts` 负责：

- 创建和管理 `BrowserWindow`
- 注册 `file:read`、`file:save`、`dialog:*` 等 IPC handler
- 校验 IPC 来源，并仅允许读写由系统对话框或文件关联授权的路径
- 使用临时文件、同步和重命名完成原子保存
- 处理 macOS `open-file`、单实例和命令行传入的 Markdown 文件
- 拦截主窗口导航，将安全的外部链接交给系统浏览器
- 通过 `file:openFromSystem` 把系统打开的文件发送给渲染进程

### 预加载脚本

`electron/preload.ts` 通过 `contextBridge.exposeInMainWorld` 暴露最小化的 `window.electronAPI`，渲染进程不直接访问 Node.js API。

### 渲染进程

`src/App.tsx` 是单文件状态中心，维护：

- 当前文件 `currentFile`
- 当前视图 `preview | edit | live`
- 保存、新建、打开和系统文件打开流程
- 未保存更改处理：保存、丢弃或取消，包括关闭窗口和退出应用
- 通过内容 revision 避免异步保存把新内容错误标记为已保存
- 用操作序号和打开前后 revision 校验拒绝过期读取，关闭时再次检查异步清理期间的编辑

`Toolbar` 只负责触发 App 下发的动作和切换视图，不直接读写文件。

`EditorArea` 根据视图选择预览或编辑器。预览模式不加载 `@uiw/react-md-editor`；编辑和分屏模式才 lazy load 编辑器 chunk。

`MarkdownPreview` 负责：

- 通过 `useRenderedMarkdown` 与分屏共享延迟加载、DOMPurify 清洗和预览增强逻辑
- 提取标题目录
- 为标题添加全局唯一锚点
- 包装代码块并做轻量高亮
- 正文搜索、高亮命中和命中导航
- 阅读进度计算

## 数据流

### 打开文件

```text
Toolbar / 快捷键
  -> App 检查未保存更改
  -> electronAPI.showOpenDialog()
  -> electronAPI.readFile(path)
  -> main.ts 确认路径已由对话框授权，并校验大小后读取 UTF-8
  -> App 设置 currentFile，默认进入 preview
```

### 通过系统打开文件

```text
系统文件关联 / 命令行参数
  -> main.ts 排队并等待 renderer ready，再读取和校验文件
  -> webContents.send('file:openFromSystem')
  -> App 检查未保存更改
  -> App 设置 currentFile，默认进入 preview
```

### 保存文件

```text
Toolbar / 快捷键
  -> App.saveTab()
  -> 有路径：electronAPI.saveFile(path, content)
  -> 无路径：electronAPI.showSaveDialog() 后保存
  -> main.ts 校验路径授权、内容大小和磁盘版本，遇到外部修改时先确认
  -> files.ts 在同目录原子写入，保留文件权限和编辑文档的符号链接
  -> App 仅在 revision 未变化时标记 isModified = false
```

## 构建策略

`vite.config.mts` 使用手动分包：

- `react-vendor`
- `editor-vendor`
- `markdown-vendor`

编辑器和 Markdown 解析依赖按需加载。`scripts/check-bundle.cjs` 追踪静态依赖图，防止编辑器泄漏到启动入口。前端依赖属于开发依赖，构建结果已包含运行时资源；打包不重复携带 node_modules。应用界面为中文，Electron 只保留中文与英文语言资源。

`npm run verify` 在同一个进程锁下依次执行单元测试、类型检查、构建和两个隔离 Electron 集成测试，工作线程最多为 2。开发模式等待主进程编译成功，再启动或重启开发实例。

## 当前边界

- 当前是单文件工作区，不提供多标签和文件树。
- 草稿在停止编辑约 750ms 后备份到本地应用数据目录，异常退出后可恢复；不自动写回原文件。恢复后需要重新选择保存位置。
- PDF 导出复用经过 DOMPurify 清洗的 Markdown HTML，经受信任的 `file:exportPdf` IPC 交给主进程；系统保存对话框授权目标路径后，由无脚本、无预加载的隔离窗口调用 Electron `printToPDF`，使用 A4 排版并原子写入。导出限制单任务、20MB HTML 和 30 秒渲染超时，不增加生产依赖。
- HTML 导出尚未实现。
- Markdown 预览增强逻辑运行在渲染进程主线程，后续处理超大文档时可考虑 Web Worker 或更结构化的 AST 管线。
