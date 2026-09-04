# Git 提交指南

## 📝 初始提交

项目已准备好进行初始提交。以下是推荐的提交步骤：

### 1. 添加所有文件

```bash
# 添加所有文件到暂存区
git add .

# 查看将要提交的文件
git status
```

### 2. 创建初始提交

```bash
# 使用详细的提交信息
git commit -m "feat: initial release of MD Editor

Features:
- Simple, focused single-file Markdown editor
- Real-time preview with GitHub Flavored Markdown (GFM) support
- Cross-platform support (macOS, Windows, Linux)
- File associations for .md, .markdown, .mdown, .mkd files
- Clean, minimalist UI focused on content creation
- Security: XSS protection, path validation
- Performance: Code splitting, optimized bundle

Tech Stack:
- Electron 44
- React 18
- TypeScript
- Vite
- marked.js
- DOMPurify

Documentation:
- Comprehensive README with bilingual support (EN/CN)
- User guide and developer documentation
- Contribution guidelines
- Code of conduct
- GitHub issue/PR templates
- CI/CD workflows

This is the first public release ready for open source."
```

### 3. 创建 GitHub 仓库

前往 GitHub 创建新仓库：
1. 访问 https://github.com/new
2. 仓库名称: `md-editor`
3. 描述: "A lightweight, modern Markdown editor with live preview"
4. 公开仓库
5. **不要**初始化 README, .gitignore, 或 license（我们已经有了）
6. 点击 "Create repository"

### 4. 连接远程仓库

```bash
# 添加远程仓库（替换 yourusername）
git remote add origin https://github.com/yourusername/md-editor.git

# 设置主分支
git branch -M main

# 推送到 GitHub
git push -u origin main
```

### 5. 创建第一个 Release

```bash
# 创建标签
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release

Features:
- Single-file Markdown editor with live preview
- GFM support (tables, task lists, etc.)
- Cross-platform (macOS, Windows, Linux)
- File associations
- Security and performance optimizations"

# 推送标签
git push origin v1.0.0
```

### 6. 在 GitHub 上创建 Release

1. 访问仓库的 Releases 页面
2. 点击 "Draft a new release"
3. 选择标签: v1.0.0
4. 填写 Release 标题和说明
5. 上传构建产物:
   - `release/MD Editor-1.0.0-arm64.dmg`
   - `release/MD Editor-1.0.0-arm64-mac.zip`
6. 点击 "Publish release"

## 📋 后续提交规范

### 提交类型

遵循约定式提交规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具
- `ci`: CI/CD 配置

**示例:**

```bash
# 新功能
git commit -m "feat(editor): add syntax highlighting for code blocks"

# Bug 修复
git commit -m "fix(save): resolve file path validation issue on Windows"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 性能优化
git commit -m "perf(render): debounce markdown preview rendering"

# 重构
git commit -m "refactor(utils): simplify markdown parser logic"
```

## 🌿 分支策略

### 主分支
- `main` - 稳定的生产代码

### 开发分支
- `develop` - 开发中的代码（可选）
- `feat/*` - 新功能分支
- `fix/*` - Bug 修复分支
- `docs/*` - 文档更新分支

### 示例工作流

```bash
# 创建功能分支
git checkout -b feat/dark-theme

# 开发功能
git add .
git commit -m "feat(ui): add dark theme support"

# 推送到 GitHub
git push origin feat/dark-theme

# 在 GitHub 上创建 Pull Request
# 审核通过后合并到 main
```

## 🏷️ 版本标签

### 语义化版本

```
MAJOR.MINOR.PATCH

- MAJOR: 不兼容的 API 更改
- MINOR: 向后兼容的新功能
- PATCH: 向后兼容的 Bug 修复
```

### 创建标签

```bash
# 补丁版本 (1.0.0 → 1.0.1)
git tag -a v1.0.1 -m "Release v1.0.1 - Bug fixes"

# 次要版本 (1.0.1 → 1.1.0)
git tag -a v1.1.0 -m "Release v1.1.0 - New features"

# 主要版本 (1.1.0 → 2.0.0)
git tag -a v2.0.0 -m "Release v2.0.0 - Breaking changes"
```

## 📊 Git 最佳实践

### 提交信息
- ✅ 使用清晰的标题
- ✅ 解释"为什么"而不是"是什么"
- ✅ 引用相关 Issue
- ✅ 保持一致的格式

### 提交大小
- ✅ 小而频繁的提交
- ✅ 每个提交只做一件事
- ✅ 提交前测试代码

### 分支管理
- ✅ 功能分支开发
- ✅ 定期同步主分支
- ✅ 删除已合并的分支

## 🔗 有用的 Git 命令

```bash
# 查看提交历史
git log --oneline --graph --all

# 查看文件变更
git diff

# 撤销未提交的更改
git checkout -- <file>

# 撤销最后一次提交（保留更改）
git reset --soft HEAD^

# 查看远程仓库
git remote -v

# 更新远程 URL
git remote set-url origin <new-url>

# 清理未跟踪的文件
git clean -fd
```

## ⚠️ 注意事项

### 提交前检查
- [ ] 代码已测试
- [ ] 没有调试代码 (console.log)
- [ ] 没有敏感信息
- [ ] 文档已更新
- [ ] CHANGELOG 已更新

### 避免提交
- ❌ `node_modules/`
- ❌ `dist/`, `dist-electron/`
- ❌ `release/`
- ❌ `.env` 文件
- ❌ IDE 配置文件
- ❌ 系统文件 (.DS_Store)

## 🎯 当前状态

项目已准备就绪，所有文件都已创建：

✅ 核心代码 (src/, electron/)
✅ 配置文件 (package.json, vite.config.ts, tsconfig.json)
✅ 文档 (README.md, USER_GUIDE.md, etc.)
✅ GitHub 配置 (.github/)
✅ 开源准备 (LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md)

**下一步:** 执行上述 Git 命令提交代码到 GitHub！

---

**提示:** 第一次推送可能需要设置 GitHub 认证。推荐使用 SSH 或 Personal Access Token。
