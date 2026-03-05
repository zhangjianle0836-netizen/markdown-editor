# Contributing to MD Editor

感谢你考虑为 MD Editor 做贡献！

Thank you for considering contributing to MD Editor!

## 🌍 贡献方式 | Ways to Contribute

- 报告 Bug | Report bugs
- 提出新功能建议 | Suggest new features
- 提交代码改进 | Submit code improvements
- 改进文档 | Improve documentation
- 分享项目 | Share the project

## 🐛 报告 Bug | Reporting Bugs

如果你发现了 bug，请通过 GitHub Issues 提交：

If you find a bug, please submit it via GitHub Issues:

1. 使用清晰的标题描述问题 | Use a clear title to describe the issue
2. 详细描述复现步骤 | Describe the steps to reproduce in detail
3. 附上截图或日志 | Attach screenshots or logs
4. 说明操作系统和版本 | Specify your OS and version

## 💡 功能建议 | Feature Requests

欢迎提出新功能建议！请：

New feature suggestions are welcome! Please:

1. 描述功能的使用场景 | Describe the use case
2. 解释为什么这个功能有用 | Explain why it would be useful
3. 提供可能的实现方案 | Provide possible implementation ideas

## 🔧 开发设置 | Development Setup

### 环境要求 | Prerequisites

- Node.js 16+
- npm or yarn
- Git

### 安装步骤 | Installation Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/md-editor.git
cd md-editor

# Install dependencies
npm install

# Start development server
npm run electron:dev
```

### 项目结构 | Project Structure

```
md-editor/
├── electron/               # Electron main process
│   ├── main.ts            # Main process entry
│   └── preload.ts         # Preload script
├── src/                   # React rendering process
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── build/                # Build resources
└── public/               # Static assets
```

### 代码规范 | Code Style

- **TypeScript**: 使用严格模式 | Use strict mode
- **命名规范 | Naming Conventions**:
  - 文件: `PascalCase.tsx` (组件), `camelCase.ts` (工具)
  - 组件: `PascalCase`
  - 函数/变量: `camelCase`
  - 常量: `UPPER_SNAKE_CASE`
- **注释**: 复杂逻辑必须注释 | Complex logic must be commented
- **提交信息**: 遵循约定式提交 | Follow Conventional Commits

### Git 提交规范 | Git Commit Convention

使用约定式提交格式：

Use Conventional Commits format:

```
type(scope): subject

body

footer
```

**类型 | Types:**
- `feat`: 新功能 | New feature
- `fix`: Bug 修复 | Bug fix
- `docs`: 文档更新 | Documentation update
- `style`: 代码格式 | Code formatting
- `refactor`: 代码重构 | Code refactoring
- `perf`: 性能优化 | Performance improvement
- `test`: 测试 | Test
- `chore`: 构建/工具 | Build/tooling

**示例 | Example:**
```
feat(editor): add syntax highlighting for code blocks

- Add highlight.js integration
- Support multiple languages
- Add line numbers option

Closes #123
```

## 🎨 开发流程 | Development Workflow

1. **Fork 项目** | Fork the repository
2. **创建分支** | Create a branch
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **编写代码** | Write code
4. **测试** | Test your changes
   ```bash
   npm run dev
   npm run build
   ```
5. **提交更改** | Commit changes
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```
6. **推送到 GitHub** | Push to GitHub
   ```bash
   git push origin feat/your-feature-name
   ```
7. **创建 Pull Request** | Create a Pull Request

## ✅ Pull Request 指南 | Pull Request Guidelines

- **标题清晰** | Clear title
- **描述更改内容** | Describe what was changed
- **关联 Issue** | Link related issues
- **添加截图** | Add screenshots (if applicable)
- **测试通过** | Ensure tests pass
- **代码审查** | Respond to code review

## 📝 许可证 | License

通过提交代码，你同意你的贡献将根据 MIT 许可证授权。

By submitting code, you agree that your contributions will be licensed under the MIT License.

## 🙏 谢谢！

感谢所有贡献者的付出！

Thanks to all contributors for their efforts!

---

如有问题，请随时联系维护者或提交 Issue。

If you have questions, feel free to contact the maintainers or submit an Issue.
