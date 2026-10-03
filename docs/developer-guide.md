# 开发者指南

本项目是一个 Electron + React + TypeScript 的本地 Markdown 阅读与轻量编辑工具。开发时请优先保持“预览首屏轻、编辑器按需加载、文件操作集中在 App 协调”的结构。

## 环境要求

- Node.js 22.12+
- npm

安装依赖：

```bash
npm ci
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
npm run verify
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

`MarkdownPreview` 包含目录、搜索、锚点与阅读进度。阅读和分屏通过 `useRenderedMarkdown` 共享解析、清洗和 `markdownEnhancements` 增强，代码高亮只处理原始代码文本。新增耗时逻辑时应考虑 debounce、`requestAnimationFrame` 或拆到 Worker。

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
- 操作序号和 revision 校验保护打开与关闭流程，异步完成后必须再次确认当前文档。
- `electron/files.ts` 检测磁盘版本、保存权限和符号链接；PDF 导出不跟随目标链接覆盖源文件。
- 草稿串行写入 `userData/recovery-draft.json`，恢复后不复用历史路径写权限。

## 样式约定

全局设计变量在 `src/styles/variables.css`。组件样式应尽量复用变量，避免引入新的大面积装饰层。阅读模式优先保证正文可读性、稳定宽度和清晰焦点状态。

## 文档同步

改动以下内容时，请同步更新 `docs/` 中相关文档：

- 用户可见流程和快捷键
- 文件格式、大小限制、安全限制
- 架构边界、模块职责、构建命令
- 新增或删除主要组件

文档入口在 `docs/README.md`，新增正式文档时需要在该索引中登记。

## 回归验证与资源限制

`npm run verify` 在同一任务锁下顺序执行单元测试、前端和主进程类型检查、生产构建、启动静态依赖图检查以及两个 Electron 集成测试。集成测试使用临时用户数据目录和原生对话框桩，不使用正在运行的用户应用。PDF 和截图输出到忽略的 `work/pdf-verification/`。

开发中先运行受影响的单元测试；`npm test` 会编译主进程。单独运行 `npm run test:integration` 前需要已有最新 `npm run build` 结果。不要并行运行验证、构建、安装或打包，不要重复启动同仓库的全量检查。`scripts/run-task.cjs` 共用进程锁并将工作线程限制为 2。

Linux 图形测试需要可用的桌面会话，无显示环境使用 Xvfb：

```bash
xvfb-run -a npm run verify
```

CI 在 Ubuntu 上提供 Xvfb；Electron 集成测试在 Linux 使用软件合成并在截图前显示测试窗口，以避免隐藏窗口没有捕获表面。测试窗口只在临时测试进程内创建。其他系统可以直接运行 `npm run verify`。

## 打包和提交

平台命令见 [安装与构建](deployment/installation.md)，macOS 签名和公证见 [打包手册](../PACKAGING_FOR_AI.md)。主进程仅依赖 Electron/Node 内置能力，前端包已构建到 `dist/`；新增运行时依赖时需要重新审视依赖分类和安装包内容。

贡献流程见 [CONTRIBUTING.md](../CONTRIBUTING.md)，安全问题见 [SECURITY.md](../SECURITY.md)。文档改动检查链接和命令；应用行为改动需要对应回归测试。不要将生成目录或凭据加入 Git。
