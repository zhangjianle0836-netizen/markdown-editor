# MD Editor 项目结构

## 📁 目录结构

```
md-editor/
├── .github/                    # GitHub 配置
│   ├── ISSUE_TEMPLATE/         # Issue 模板
│   │   ├── bug_report.md      # Bug 报告模板
│   │   └── feature_request.md # 功能请求模板
│   ├── workflows/             # GitHub Actions
│   │   └── ci.yml            # CI/CD 工作流
│   └── pull_request_template.md # PR 模板
│
├── .vscode/                    # VS Code 配置（可选）
│
├── build/                      # 构建资源
│   └── icon.svg               # 应用图标（SVG）
│
├── dist/                       # Vite 构建输出（git 忽略）
│   └── assets/                # 编译后的资源
│
├── dist-electron/              # Electron 构建输出（git 忽略）
│   ├── main.js                # 编译后的主进程
│   └── preload.js             # 编译后的预加载脚本
│
├── docs/                       # 文档目录
│   └── FILE_ASSOCIATION.md    # macOS 文件关联指南
│
├── electron/                   # Electron 主进程
│   ├── main.ts                # 主进程入口
│   └── preload.ts             # 预加载脚本
│
├── node_modules/               # 依赖（git 忽略）
│
├── public/                     # 静态资源
│   └── vite.svg               # Vite logo
│
├── release/                    # 构建产物（git 忽略）
│   ├── MD Editor-1.0.0-arm64.dmg
│   └── MD Editor-1.0.0-arm64-mac.zip
│
├── src/                        # React 源代码
│   ├── components/            # React 组件
│   │   ├── EditorArea/       # 编辑器区域
│   │   │   ├── EditorArea.tsx
│   │   │   └── EditorArea.css
│   │   ├── Toast/            # 通知组件
│   │   │   ├── Toast.tsx
│   │   │   ├── Toast.css
│   │   │   └── useToast.ts
│   │   └── Toolbar/          # 工具栏
│   │       ├── Toolbar.tsx
│   │       └── Toolbar.css
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useToast.ts
│   ├── types/                # TypeScript 类型
│   │   └── electron.d.ts
│   ├── utils/                # 工具函数
│   │   ├── dialog.ts
│   │   ├── export.ts
│   │   ├── id.ts
│   │   ├── markdownRenderer.ts
│   │   └── path.ts
│   ├── App.tsx               # 根组件
│   ├── App.css               # 根样式
│   ├── main.tsx              # 入口文件
│   └── index.css             # 全局样式
│
├── .editorconfig              # 编辑器配置
├── .gitignore                 # Git 忽略规则
├── CHANGELOG.md               # 版本更新日志
├── CODE_OF_CONDUCT.md         # 行为准则
├── CONTRIBUTING.md            # 贡献指南
├── DEVELOPER_GUIDE.md         # 开发者文档
├── LICENSE                    # MIT 许可证
├── OPEN_SOURCE_CHECKLIST.md   # 开源准备清单
├── package-lock.json          # 依赖锁定文件
├── package.json               # 项目配置
├── README.md                  # 项目主文档
├── tsconfig.electron.json     # Electron TS 配置
├── tsconfig.json              # TypeScript 配置
├── tsconfig.node.json         # Node TS 配置
├── USER_GUIDE.md              # 用户指南
└── vite.config.ts             # Vite 配置
```

## 📄 重要文件说明

### 配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | 项目元数据、依赖、脚本配置 |
| `tsconfig.json` | TypeScript 编译器配置 |
| `vite.config.ts` | Vite 构建工具配置 |
| `.gitignore` | Git 版本控制忽略规则 |
| `.editorconfig` | 跨编辑器代码风格配置 |

### 文档文件

| 文件 | 用途 |
|------|------|
| `README.md` | 项目主文档，包含功能介绍和快速开始 |
| `USER_GUIDE.md` | 详细用户使用指南 |
| `DEVELOPER_GUIDE.md` | 开发者文档和架构说明 |
| `CONTRIBUTING.md` | 贡献指南和开发流程 |
| `CODE_OF_CONDUCT.md` | 社区行为准则 |
| `CHANGELOG.md` | 版本历史和更新日志 |

### 构建配置

| 文件 | 用途 |
|------|------|
| `electron/main.ts` | Electron 主进程代码 |
| `electron/preload.ts` | 预加载脚本，暴露安全 API |
| `src/main.tsx` | React 应用入口 |
| `src/App.tsx` | React 根组件 |

### GitHub 配置

| 文件 | 用途 |
|------|------|
| `.github/workflows/ci.yml` | CI/CD 自动化工作流 |
| `.github/ISSUE_TEMPLATE/` | Issue 模板 |
| `.github/pull_request_template.md` | Pull Request 模板 |

## 🔧 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

### 桌面
- **Electron 31** - 桌面应用框架
- **electron-builder** - 打包工具

### Markdown
- **marked.js** - Markdown 解析
- **DOMPurify** - XSS 防护
- **@uiw/react-md-editor** - 编辑器组件

### 开发工具
- **TypeScript** - 类型检查
- **ESLint** - 代码检查（待添加）
- **Prettier** - 代码格式化（待添加）

## 📊 代码统计

| 类型 | 文件数 | 代码行数 |
|------|--------|----------|
| TypeScript | ~15 | ~800 |
| CSS | ~5 | ~400 |
| Config | ~5 | ~200 |
| Docs | ~8 | ~1500 |

## 🔄 工作流程

### 开发流程
```
修改代码 → npm run dev → 浏览器预览
         ↓
修改 Electron → npm run electron:dev → 应用预览
         ↓
npm run build → 构建测试
         ↓
npm run electron:build → 生成安装包
```

### 发布流程
```
更新版本号 → 更新 CHANGELOG → 提交代码
         ↓
创建 Git 标签 → 推送到 GitHub
         ↓
CI/CD 自动构建 → 上传 Release 文件
         ↓
发布公告 → 社区推广
```

## 🎯 未来规划

### 短期（v1.1）
- [ ] 添加 ESLint 和 Prettier
- [ ] 添加单元测试
- [ ] 优化性能

### 中期（v1.5）
- [ ] 深色主题
- [ ] 自动保存
- [ ] 导出 PDF/HTML

### 长期（v2.0）
- [ ] 插件系统
- [ ] 云同步
- [ ] 协作编辑

## 📦 打包产物

### macOS
- `MD Editor-1.0.0-arm64.dmg` (104 MB) - Apple Silicon
- `MD Editor-1.0.0-x64.dmg` - Intel Mac
- `MD Editor-1.0.0-arm64-mac.zip` (101 MB) - 压缩包

### Windows
- `MD Editor Setup 1.0.0.exe` - 安装程序
- `MD Editor-1.0.0-portable.exe` - 便携版

### Linux
- `md-editor-1.0.0-x86_64.AppImage` - 通用格式
- `md-editor_1.0.0_amd64.deb` - Debian/Ubuntu
- `md-editor-1.0.0.x86_64.rpm` - RedHat/Fedora

## 🚀 快速命令

```bash
# 安装依赖
npm install

# 开发模式（浏览器）
npm run dev

# 开发模式（Electron）
npm run electron:dev

# 构建前端
npm run build

# 构建应用
npm run electron:build

# 代码检查（待添加）
npm run lint

# 代码格式化（待添加）
npm run format

# 运行测试（待添加）
npm test
```

## 📚 相关链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [marked.js 文档](https://marked.js.org/)

---

**维护者:** MD Editor Contributors
**许可证:** MIT
**最后更新:** 2026-03-03
