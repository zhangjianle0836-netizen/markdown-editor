# 贡献指南 / Contributing

欢迎通过 [Issues](https://github.com/zhangjianle0836-netizen/markdown-editor/issues) 反馈缺陷、提出建议，或提交 Pull Request。参与交流请遵守 [行为准则](CODE_OF_CONDUCT.md)。安全漏洞请使用 [安全说明](SECURITY.md) 中的私密报告渠道。

## 准备开发环境

需要 Node.js 22.12+、npm 和 Git。先 Fork 仓库，再克隆自己的 Fork：

```bash
git clone https://github.com/<your-account>/markdown-editor.git
cd markdown-editor
npm ci
git switch -c codex/your-change
npm run electron:dev
```

模块职责和测试命令见 [开发指南](docs/developer-guide.md)。请不要把编辑器迁移到其他框架，或在一次改动中混入无关重构。

## 提交缺陷或建议

缺陷报告请包含应用版本、操作系统与架构、复现步骤、期望行为和实际结果。开发模式的问题还应包含 Node.js 版本及失败命令。示例 Markdown 尽量缩减到可复现所需内容，日志和截图不要包含个人文档、凭据或私钥。

功能建议请描述使用场景、当前阻碍和期望结果；提出实现方式时说明兼容性与依赖影响。

## 实现约定

- 遵循现有 TypeScript 严格类型、React Hooks 和 2 空格缩进约定。
- 文件操作集中由 `App` 协调，所有特权 IPC 在主进程校验来源和授权。
- 阅读与分屏共用渲染管线，不绕过 DOMPurify 或未保存更改确认。
- 保留键盘导航、可见焦点、控件名称和原生弹窗行为。
- 修复缺陷或改变行为时，补充能验证用户结果的回归测试。
- 新生产依赖需先在 Issue/PR 中说明必要性，优先使用现有能力。
- 用户流程、命令、文件格式和架构变更需同步更新文档。

## 检查与提交

开发中先运行受影响的测试；最终需要完整验证时运行一次 `npm run verify`，不要并发运行测试、构建或依赖安装。纯文档改动检查链接、命令和 Markdown 格式即可。Linux 的集成验证需要 Xvfb。

提交信息使用约定式提交，例如：

```text
fix: preserve edits made during file opening
feat: add a new reading option
docs: explain draft recovery
```

向本仓库的 `main` 分支提出 Pull Request，说明改动解决的问题、最终行为、实际执行的验证以及限制。涉及界面时附不含私人内容的截图。不要提交 `dist/`、`release/`、`work/`、`node_modules/`、`.env` 或签名凭据。

贡献代码继续采用本仓库已有的 [MIT 许可证](LICENSE)，不改变依赖原有的许可证。

## English

Use Issues for bugs and feature requests, and private vulnerability reports for security issues. Fork the repository, use Node.js 22.12+, install with `npm ci`, and submit a focused PR to `main`. Follow existing TypeScript/React conventions and preserve file authorization, unsaved-change protection and shared sanitized rendering.

Add meaningful regression tests when behavior changes. Run relevant checks sequentially; use `npm run verify` when full verification is needed. For documentation-only changes, validate links and commands. Use conventional commits, describe tests actually run, and exclude build outputs and credentials. Contributions remain under the existing MIT license.
