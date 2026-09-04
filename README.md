# MD Editor

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/yourusername/md-editor.svg)](https://github.com/yourusername/md-editor/releases)
[![Build Status](https://github.com/yourusername/md-editor/workflows/CI%2FCD/badge.svg)](https://github.com/yourusername/md-editor/actions)
[![GitHub stars](https://img.shields.io/github/stars/yourusername/md-editor.svg?style=social)](https://github.com/yourusername/md-editor/stargazers)

**A lightweight, modern Markdown editor with live preview**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English

### Overview

MD Editor is a fast, secure, and lightweight desktop Markdown editor built with Electron and React. It provides a clean, distraction-free writing experience with real-time preview and full GitHub Flavored Markdown (GFM) support.

**Design Philosophy:** Simple, focused, and efficient. MD Editor is a single-file editor that helps you focus on writing, not managing files.

### ✨ Features

#### Core Features
- 📝 **Real-time Preview** - Live rendering with GitHub Flavored Markdown (GFM) support
- 🎨 **Clean UI** - Minimalist design focused on content creation
- 💾 **Smart Save** - Unsaved changes protection with visual indicators
- ⚡ **Fast & Lightweight** - Optimized performance with small bundle size

#### Markdown Support
- ✅ **GFM Support** - Tables, task lists, strikethrough, and more
- ✅ **Syntax Highlighting** - Beautiful code blocks with automatic language detection
- ✅ **Auto-links** - Automatic URL detection and linking
- ✅ **XSS Protection** - Secure HTML sanitization with DOMPurify

#### Security & Performance
- 🔒 **Capability-based File Access** - Only user-authorized files can be read or written
- ⚡ **Bounded Rendering** - Deferred preview updates and capped search results
- 🚀 **Code Splitting** - Faster startup with optimized chunks
- 📦 **Small Bundle** - Only 104MB installed

#### Cross-Platform
- 🍎 **macOS Native** - Native window styling with traffic light buttons
- 🪟 **Windows Support** - Seamless integration with Windows
- 🐧 **Linux Support** - Works on all major Linux distributions

### 🚀 Quick Start

#### Prerequisites
- Node.js 22.12+
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/md-editor.git
cd md-editor

# Install dependencies
npm install

# Start in development mode
npm run electron:dev

# Build for production
npm run electron:build
```

The built application will be in the `release` directory.

### 📖 User Guide

#### Basic Usage

**Creating a New File:**
- Click "New" button or press `Cmd/Ctrl + N`
- Start writing your Markdown content

**Opening a File:**
- Click "Open" button or press `Cmd/Ctrl + O`
- Select a `.md` or `.markdown` file from your computer

**Saving Your Work:**
- Click "Save" button or press `Cmd/Ctrl + S`
- If it's a new file, you'll be prompted to choose a location

**Live Preview:**
- Your Markdown renders in real-time as you type
- Supports all GFM features including tables, task lists, and code blocks

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New file |
| `Cmd/Ctrl + O` | Open file |
| `Cmd/Ctrl + S` | Save file |

For detailed usage instructions, see [User Guide](./docs/user-guide.md).

### 🛠️ Tech Stack

- **Electron 44** - Cross-platform desktop framework
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Next-generation build tool
- **marked.js** - Fast Markdown parser with GFM support
- **DOMPurify** - XSS protection and HTML sanitization
- **@uiw/react-md-editor** - WYSIWYG editor component

### 📂 Project Structure

```
md-editor/
├── electron/               # Electron main process
│   ├── main.ts            # Main process entry
│   └── preload.ts         # Preload script for IPC
├── src/                   # React rendering process
│   ├── components/        # React components
│   │   ├── EditorArea/    # Markdown editor
│   │   ├── Toast/         # Notifications
│   │   └── Toolbar/       # Main toolbar
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── build/                 # Build resources
│   └── icon.svg           # Application icon
├── public/                # Static assets
├── .github/               # GitHub workflows & templates
│   ├── workflows/         # CI/CD workflows
│   └── ISSUE_TEMPLATE/    # Issue templates
├── docs/                  # Documentation
│   ├── user-guide.md     # User guide
│   ├── developer-guide.md # Developer docs
│   └── architecture.md   # Project structure
├── README.md              # This file
├── CONTRIBUTING.md        # Contribution guide
├── CODE_OF_CONDUCT.md     # Code of conduct
└── CHANGELOG.md           # Version history
```

### 🔧 Development

#### Available Scripts

- `npm run dev` - Start Vite development server only
- `npm run build` - Build React application
- `npm run electron:dev` - Start Electron in development mode
- `npm run electron:build` - Build Electron app for production

For the reproducible macOS Developer ID signing flow, see [AI Packaging Guide](./PACKAGING_FOR_AI.md).

#### Architecture

MD Editor follows a classic Electron architecture:

1. **Main Process** (`electron/main.ts`)
   - Creates and manages application windows
   - Handles file system operations via IPC
   - Manages native dialogs
   - Implements security validation

2. **Renderer Process** (React app)
   - Handles all UI rendering
   - Communicates with main process via preload script
   - Manages application state with React hooks

3. **Preload Script** (`electron/preload.ts`)
   - Provides secure bridge between main and renderer
   - Exposes limited API to renderer via contextBridge

For detailed development information, see [Developer Guide](./docs/developer-guide.md).

### 🗺️ Roadmap

#### Version 1.x
- [x] Single-file editing with live preview
- [x] GFM support
- [x] Cross-platform builds
- [ ] Auto-save functionality
- [ ] Dark theme support
- [ ] Export to PDF/HTML

#### Version 2.x
- [ ] Find and replace
- [ ] Image paste and upload
- [ ] Custom themes
- [ ] Plugin system

See [CHANGELOG.md](./CHANGELOG.md) for release history.

### 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

#### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📝 Improve documentation
- ⭐ Star the project

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) - Excellent Markdown editor component
- [marked.js](https://marked.js.org/) - Fast and lightweight Markdown parser
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitizer
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://react.dev/) - UI framework

### 📮 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/md-editor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/md-editor/discussions)

---

<a name="中文"></a>

## 中文

### 概述

MD Editor 是一个基于 Electron 和 React 构建的快速、安全、轻量级的桌面 Markdown 编辑器。它提供干净、无干扰的写作体验，支持实时预览和完整的 GitHub 风格 Markdown (GFM) 功能。

**设计理念:** 简单、专注、高效。MD Editor 是一个单文件编辑器，帮助你专注于写作，而不是管理文件。

### ✨ 特性

#### 核心功能
- 📝 **实时预览** - 支持 GitHub 风格 Markdown (GFM) 的实时渲染
- 🎨 **简洁界面** - 专注于内容创作的极简设计
- 💾 **智能保存** - 未保存更改保护和可视化提示
- ⚡ **快速轻量** - 优化的性能和小巧的体积

#### Markdown 支持
- ✅ **GFM 支持** - 表格、任务列表、删除线等
- ✅ **语法高亮** - 美观的代码块，自动语言检测
- ✅ **自动链接** - 自动 URL 检测和链接
- ✅ **XSS 防护** - 使用 DOMPurify 进行安全的 HTML 净化

#### 安全与性能
- 🔒 **授权文件访问** - 仅允许读写用户明确选择的文件
- ⚡ **有界渲染** - 延迟预览更新并限制搜索结果规模
- 🚀 **代码分割** - 通过优化块实现更快的启动
- 📦 **小巧体积** - 仅 104MB 安装大小

#### 跨平台支持
- 🍎 **macOS 原生** - 原生窗口样式和红黄绿按钮
- 🪟 **Windows 支持** - 与 Windows 无缝集成
- 🐧 **Linux 支持** - 支持所有主流 Linux 发行版

### 🚀 快速开始

#### 环境要求
- Node.js 22.12+
- npm 或 yarn

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/md-editor.git
cd md-editor

# 安装依赖
npm install

# 开发模式启动
npm run electron:dev

# 生产环境打包
npm run electron:build
```

打包后的应用程序位于 `release` 目录。

### 📖 使用指南

#### 基本使用

**创建新文件:**
- 点击 "New" 按钮或按 `Cmd/Ctrl + N`
- 开始编写你的 Markdown 内容

**打开文件:**
- 点击 "Open" 按钮或按 `Cmd/Ctrl + O`
- 从电脑中选择 `.md` 或 `.markdown` 文件

**保存工作:**
- 点击 "Save" 按钮或按 `Cmd/Ctrl + S`
- 如果是新文件，会提示你选择保存位置

**实时预览:**
- 你的 Markdown 在输入时实时渲染
- 支持所有 GFM 功能，包括表格、任务列表和代码块

#### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + N` | 新建文件 |
| `Cmd/Ctrl + O` | 打开文件 |
| `Cmd/Ctrl + S` | 保存文件 |

详细使用说明请查看 [用户指南](./docs/user-guide.md)。

### 🛠️ 技术栈

- **Electron 44** - 跨平台桌面框架
- **React 18** - 现代 UI 库
- **TypeScript** - 类型安全开发
- **Vite** - 下一代构建工具
- **marked.js** - 快速 Markdown 解析器，支持 GFM
- **DOMPurify** - XSS 防护和 HTML 净化
- **@uiw/react-md-editor** - 所见即所得编辑器组件

### 🗺️ 路线图

#### 版本 1.x
- [x] 单文件编辑与实时预览
- [x] GFM 支持
- [x] 跨平台构建
- [ ] 自动保存功能
- [ ] 深色主题
- [ ] 导出为 PDF/HTML

#### 版本 2.x
- [ ] 查找和替换
- [ ] 图片粘贴和上传
- [ ] 自定义主题
- [ ] 插件系统

版本历史请查看 [CHANGELOG.md](./CHANGELOG.md)。

### 📦 打包与签名

后续需要让 AI 或维护者复用 macOS Developer ID 打包流程时，请查看 [AI 打包与签名操作手册](./PACKAGING_FOR_AI.md)。

### 🤝 贡献

欢迎贡献代码！详情请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

#### 贡献方式
- 🐛 报告 bug
- 💡 建议新功能
- 🔧 提交 pull request
- 📝 改进文档
- ⭐ 给项目加星

### 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) - 优秀的 Markdown 编辑器组件
- [marked.js](https://marked.js.org/) - 快速轻量的 Markdown 解析器
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS 净化器
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用
- [React](https://react.dev/) - UI 框架

### 📮 联系与支持

- **问题反馈:** [GitHub Issues](https://github.com/yourusername/md-editor/issues)
- **讨论交流:** [GitHub Discussions](https://github.com/yourusername/md-editor/discussions)

---

<div align="center">

**Made with ❤️ by MD Editor Contributors**

[⬆ 返回顶部 | Back to top](#md-editor)

</div>
