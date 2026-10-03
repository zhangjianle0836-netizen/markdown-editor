# MD Editor

[![CI](https://github.com/zhangjianle0836-netizen/markdown-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/zhangjianle0836-netizen/markdown-editor/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

一个基于 Electron、React 和 TypeScript 的本地 Markdown 阅读与编辑工具。打开文档默认进入阅读预览，新建文档默认进入编辑模式。当前版本为 **1.1.1**，界面使用简体中文。

[使用指南](docs/user-guide.md) · [开发指南](docs/developer-guide.md) · [架构说明](docs/architecture.md) · [贡献指南](CONTRIBUTING.md) · [English](#english)

## 可以做什么

| 能力 | 说明 |
| --- | --- |
| 本地编辑 | 单文件工作区，支持预览、编辑和分屏，使用 UTF-8 读写 |
| Markdown 预览 | 标题、列表、链接、图片、表格、任务列表和删除线；分屏与阅读使用同一套 HTML 清洗 |
| 阅读辅助 | 3 个及以上标题显示目录；正文搜索、命中导航和阅读进度；搜索最多高亮 500 处，跳过代码块 |
| 文件保护 | 新建、打开、关闭或退出前处理未保存更改；过期读取不会覆盖较新的编辑 |
| 草稿恢复 | 停止编辑约 750ms 后备份未保存草稿，下次启动可选择恢复；恢复后重新选择保存位置 |
| 保存冲突提醒 | 检测磁盘文件被其他程序修改或删除，默认取消覆盖，保留当前编辑内容 |
| PDF 导出 | 导出点击时的当前内容，包含未保存修改；A4 排版，不改变源文件保存状态 |
| 代码高亮 | 按代码块标注的语言高亮 JS/TS、Shell、CSS、HTML 和 Markdown，未知语言显示原文 |
| 按需加载 | 编辑器仅在编辑或分屏时加载，前端依赖不重复携带到安装包的 node_modules |

## 获取和运行

已发布安装包请查看 [Releases](https://github.com/zhangjianle0836-netizen/markdown-editor/releases)。附件、架构、签名和公证状态以对应发布说明为准；没有可用安装包时，可以从源码运行。GitHub Actions 的构建附件用于验证，不能视为已签名、公证的正式发行版。

需要 **Node.js 22.12+、npm 和 Git**：

```bash
git clone https://github.com/zhangjianle0836-netizen/markdown-editor.git
cd markdown-editor
npm ci
npm run electron:dev
```

开发模式会启动 Vite，并等待 Electron 主进程编译成功后打开应用；主进程重新编译成功后会重启开发实例。只查看浏览器界面可使用 `npm run dev`，但文件读写和 PDF 导出需要桌面应用。

## 基本使用

1. 点击“打开”选择文档，或点击“新建”开始写作。
2. 使用“预览”“编辑”“分屏”切换视图。
3. 点击“保存”写回文件；新文档首次保存时选择位置。
4. 点击“导出 PDF”，选择 `.pdf` 目标文件。

| 快捷键 | 功能 |
| --- | --- |
| `Cmd/Ctrl + N` | 新建 |
| `Cmd/Ctrl + O` | 打开 |
| `Cmd/Ctrl + S` | 保存 |
| `Escape` | 关闭已打开的语法帮助面板 |

系统文件关联支持 `.md`、`.markdown`、`.mdown`、`.mkd`；文件对话框也可打开 `.txt`。读取和保存内容的上限为 10 MiB。

## 开发与验证

| 命令 | 用途 |
| --- | --- |
| `npm run electron:dev` | 桌面开发模式 |
| `npm run dev` | 仅运行 Vite 界面开发服务器 |
| `npm run typecheck` | 检查前端与 Electron 类型 |
| `npm test` | 编译主进程并执行单元测试 |
| `npm run build` | 类型检查、主进程与前端构建、惰性加载依赖图检查 |
| `npm run test:integration` | 对已有构建运行两个隔离的 Electron 集成测试 |
| `npm run verify` | 顺序完成单元测试、生产构建与 Electron 集成测试 |
| `npm run electron:build` | 构建并为当前平台打包，输出至 `release/` |

测试、构建和打包共用 `work/verification.lock`。同仓库已有任务运行时会拒绝启动另一个任务，工作线程限制为 2。请顺序执行重型命令；不要删除仍有进程持有的锁。Linux 无显示环境需要 Xvfb，详见 [开发指南](docs/developer-guide.md)。

CI 配置 macOS、Windows、Linux 与 Node.js 22/24 的验证矩阵。最新结果见上方 CI 链接；平台的构建配置与实际验证结果需要分开看。1.1.1 的 macOS arm64 本地安装、签名及运行已经验证，具体测试范围见 [验证记录](docs/optimization/1.1.1-verification.md)。

## 数据与当前边界

- 文档保存在你选择的本地位置，草稿保存在 Electron 应用数据目录。没有内置账号或云同步服务。
- 外部链接会交给系统浏览器；文档中的远程图片会请求对应 HTTP(S) 地址。因此包含远程图片的文档可能需要网络。
- 草稿备份不等于自动保存到原文件，最后约 750ms 的修改可能尚未备份。正常保存或确认丢弃后清除草稿。
- 相对路径图片暂不按 Markdown 文件所在目录解析，预览和 PDF 建议使用可访问的 HTTP(S) 图片地址。
- 当前没有多标签、文件树、HTML 导出、全文替换或插件系统。大型文档的解析与预览增强仍在渲染线程执行。
- MIT 许可证适用于本项目代码，依赖各自的许可证仍需遵守。保留 [LICENSE](LICENSE) 中的版权和授权文本。

## 文档与参与

- [文档目录](docs/README.md)：使用、开发、架构、安装和打包入口。
- [贡献指南](CONTRIBUTING.md)：反馈问题、开发约定和 Pull Request 流程。
- [安全说明](SECURITY.md)：安全边界和漏洞报告方式。
- [更新日志](CHANGELOG.md)：各版本变化。
- [Issues](https://github.com/zhangjianle0836-netizen/markdown-editor/issues)：缺陷和功能建议。

## English

MD Editor is an MIT-licensed, local desktop Markdown reader and editor with a Simplified Chinese interface. It offers reading, editing and split views, a document outline, capped text search, local draft recovery, external file-change confirmation and PDF export of the current content, including unsaved edits.

Requires Node.js 22.12+, npm and Git. Clone this repository, run `npm ci`, then `npm run electron:dev`. Run `npm run verify` for sequential unit tests, type checks, production build, lazy-loading validation and isolated Electron integration tests. On headless Linux, use Xvfb as described in the developer guide.

The editor is loaded on demand. Both preview modes share sanitized Markdown rendering. Draft backup occurs after about 750ms of inactivity and does not save the source file automatically. Relative image paths, multiple tabs and HTML export are not supported. Remote images may make network requests.

See [Releases](https://github.com/zhangjianle0836-netizen/markdown-editor/releases) for available binaries and their signing status. CI artifacts are verification builds. Contributions are welcome under [MIT](LICENSE); see [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
