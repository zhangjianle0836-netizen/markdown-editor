# 开发文档

## 架构概述

Markdown Editor 采用 Electron + React 架构，遵循现代桌面应用开发的最佳实践。

### 技术栈

```
┌─────────────────────────────────────┐
│           Electron Shell            │
│  ┌────────────────────────────────┐ │
│  │      Main Process (Node.js)    │ │
│  │  - 文件系统操作                 │ │
│  │  - 原生对话框                   │ │
│  │  - IPC 通信                     │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │   Renderer Process (Chromium)  │ │
│  │  ┌──────────────────────────┐  │ │
│  │  │    React Application     │  │ │
│  │  │  - UI 组件               │  │ │
│  │  │  - 状态管理              │  │ │
│  │  │  - Markdown 渲染         │  │ │
│  │  └──────────────────────────┘  │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 项目结构

```
markdown-editor/
├── electron/                    # Electron 主进程
│   ├── main.ts                 # 主进程入口
│   │   - 创建应用窗口
│   │   - 注册 IPC 处理器
│   │   - 管理应用生命周期
│   └── preload.ts              # 预加载脚本
│       - 暴露安全 API 给渲染进程
│       - 上下文隔离
│
├── src/                        # React 渲染进程
│   ├── components/             # UI 组件
│   │   ├── EditorArea/         # Markdown 编辑器
│   │   │   └── EditorArea.tsx
│   │   ├── Sidebar/            # 文件树侧边栏
│   │   │   └── Sidebar.tsx
│   │   ├── Tabs/               # 标签页管理
│   │   │   └── Tabs.tsx
│   │   └── Toolbar/            # 工具栏
│   │       └── Toolbar.tsx
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── types/                  # TypeScript 类型
│   │   └── electron.d.ts
│   │
│   ├── utils/                  # 工具函数
│   │   └── export.ts           # 导出功能
│   │
│   ├── styles/                 # 全局样式
│   │   └── index.css
│   │
│   ├── App.tsx                 # 根组件
│   └── main.tsx               # 入口文件
│
├── dist/                       # React 构建输出
├── dist-electron/              # Electron 构建输出
└── release/                    # 应用安装包
```

## 核心模块

### 1. 主进程 (Main Process)

#### 文件操作 (`electron/main.ts`)

```typescript
// 文件读取
ipcMain.handle('file:read', async (_, filePath) => {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return { success: true, content };
});

// 文件保存
ipcMain.handle('file:save', async (_, filePath, content) => {
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return { success: true };
});
```

**职责：**
- 文件系统访问
- 原生对话框
- 应用生命周期管理
- IPC 通信

### 2. 预加载脚本 (Preload Script)

#### 安全桥梁 (`electron/preload.ts`)

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  // ...
});
```

**职责：**
- 安全暴露 API
- 上下文隔离
- 类型安全

### 3. 渲染进程 (Renderer Process)

#### 状态管理 (`src/App.tsx`)

```typescript
const [tabs, setTabs] = useState<Tab[]>([]);
const [activeTabId, setActiveTabId] = useState<string | null>(null);
```

**职责：**
- UI 渲染
- 用户交互
- 状态管理

## 数据流

### 文件打开流程

```
用户点击 "Open"
    ↓
Toolbar.tsx → window.electronAPI.showOpenDialog()
    ↓
Main Process → dialog.showOpenDialog()
    ↓
返回文件路径
    ↓
Renderer → window.electronAPI.readFile(path)
    ↓
Main Process → fs.promises.readFile()
    ↓
返回文件内容
    ↓
Renderer → 创建新 Tab
    ↓
EditorArea 显示内容
```

### 文件保存流程

```
用户编辑内容
    ↓
EditorArea 更新 content
    ↓
App.tsx 更新 tab.isModified = true
    ↓
用户点击 "Save"
    ↓
App.tsx → window.electronAPI.saveFile()
    ↓
Main Process → fs.promises.writeFile()
    ↓
返回成功
    ↓
App.tsx 更新 tab.isModified = false
```

## 组件设计

### App 组件

**状态：**
- `tabs`: 所有打开的标签页
- `activeTabId`: 当前激活的标签页 ID

**核心功能：**
- 标签页管理
- 文件操作协调
- 快捷键处理

### EditorArea 组件

**职责：**
- 集成 Markdown 编辑器
- 处理内容变化
- 实时预览

**使用：**
- `@uiw/react-md-editor` 作为核心编辑器
- 支持 "live" 模式（分屏预览）

### Sidebar 组件

**职责：**
- 显示文件树
- 文件夹导航
- 文件快速打开

**实现：**
- 递归渲染文件树
- 点击文件打开到新标签

### Tabs 组件

**职责：**
- 标签页显示
- 标签切换
- 标签关闭

**特性：**
- 修改标记（圆点）
- 活动标签高亮

### Toolbar 组件

**职责：**
- 文件操作按钮
- 应用标题显示
- 导出功能入口

## IPC 通信

### 主进程 API

```typescript
// 文件操作
'file:read'       // 读取文件
'file:save'       // 保存文件
'file:tree'       // 获取文件树

// 对话框
'dialog:open'     // 打开文件对话框
'dialog:save'     // 保存文件对话框
```

### 类型定义

```typescript
interface ElectronAPI {
  readFile: (filePath: string) => Promise<FileReadResult>;
  saveFile: (filePath: string, content: string) => Promise<FileSaveResult>;
  showOpenDialog: () => Promise<OpenDialogReturnValue>;
  showSaveDialog: () => Promise<SaveDialogReturnValue>;
  getFileTree: (dirPath: string) => Promise<FileTreeResult>;
}
```

## 快捷键实现

使用自定义 Hook `useKeyboardShortcuts`：

```typescript
useKeyboardShortcuts({
  onOpen: handleOpenFile,
  onSave: () => handleTabSave(activeTab.id),
  onClose: () => handleTabClose(activeTab.id),
  onNew: handleNewFile,
});
```

**支持的快捷键：**
- `Cmd/Ctrl + O`: 打开文件
- `Cmd/Ctrl + S`: 保存文件
- `Cmd/Ctrl + W`: 关闭标签
- `Cmd/Ctrl + N`: 新建文件

## 构建流程

### 开发模式

```bash
npm run electron:dev
```

1. 启动 Vite 开发服务器 (localhost:3000)
2. 等待服务器就绪
3. 启动 Electron 应用
4. 加载开发服务器 URL
5. 启用热重载

### 生产构建

```bash
npm run electron:build
```

1. 编译 TypeScript (Electron)
2. 构建 React 应用 (Vite)
3. 打包应用 (electron-builder)
4. 生成安装包

## 性能优化

### 已实现

1. **懒加载**
   - 文件树按需加载

2. **状态优化**
   - 使用 `useCallback` 避免不必要的重渲染
   - 状态最小化

3. **虚拟滚动**
   - 计划为大文件实现虚拟滚动

### 计划优化

1. **代码分割**
   - 按需加载编辑器组件
   - 减少初始包大小

2. **Web Workers**
   - 大文件处理
   - Markdown 解析

## 测试

### 单元测试（计划）

```bash
npm run test
```

- 组件测试
- Hook 测试
- 工具函数测试

### E2E 测试（计划）

```bash
npm run test:e2e
```

- 用户交互流程
- 文件操作
- 快捷键

## 调试

### 主进程调试

```bash
npm run electron:dev -- --inspect=5858
```

然后在 Chrome DevTools 中连接。

### 渲染进程调试

开发模式下自动打开 DevTools。

## 发布流程

1. 更新版本号
2. 构建应用
3. 测试安装包
4. 发布到 GitHub Releases

## 扩展开发

### 添加新的 IPC 通道

1. 在 `electron/main.ts` 添加处理器：
```typescript
ipcMain.handle('custom:action', async (_, ...args) => {
  // 实现逻辑
});
```

2. 在 `electron/preload.ts` 暴露 API：
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ...
  customAction: (...args) => ipcRenderer.invoke('custom:action', ...args),
});
```

3. 在渲染进程使用：
```typescript
const result = await window.electronAPI.customAction(data);
```

### 添加新组件

1. 创建组件目录：`src/components/NewComponent/`
2. 实现组件：`NewComponent.tsx`
3. 添加样式：`NewComponent.css`
4. 在需要的地方导入使用

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

### 代码规范

- 遵循 ESLint 配置
- 使用 Prettier 格式化
- 编写单元测试
- 更新文档

## 常见问题

### Q: 如何添加新的导出格式？

A: 在 `src/utils/export.ts` 添加新的导出函数，然后在 Toolbar 添加按钮。

### Q: 如何自定义主题？

A: 修改 CSS 变量，或实现主题切换逻辑。

### Q: 如何支持新的 Markdown 扩展？

A: 配置 `react-markdown` 的 remark/rehype 插件。

## 参考资源

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vite 文档](https://vitejs.dev/)
- [react-md-editor](https://github.com/uiwjs/react-md-editor)

---

更新日期：2026-03-03
