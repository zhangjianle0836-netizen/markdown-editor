# 安装、构建与升级

## 获取应用

优先查看仓库的 [Releases](https://github.com/zhangjianle0836-netizen/markdown-editor/releases)，确认目标系统、CPU 架构、版本及签名/公证说明。仓库公开不表示每个平台已经发布安装包；没有对应附件时请从源码运行或本机打包。

GitHub Actions 在验证成功后可以生成构建附件。这些附件用于验证，并非自动签名、公证的正式发行版。不要把本地某个版本的签名状态套用到 CI 附件或自己构建的应用上。

## 从源码运行

需要 Node.js 22.12+、npm 和 Git。在有图形界面的桌面系统中执行：

```bash
git clone https://github.com/zhangjianle0836-netizen/markdown-editor.git
cd markdown-editor
npm ci
npm run electron:dev
```

只启动 `npm run dev` 会得到浏览器界面，桌面文件操作和 PDF 导出仍需 Electron。

## 本机打包

先按 [开发指南](../developer-guide.md) 顺序完成相关验证。跨平台打包还可能需要额外的系统工具或签名环境，以下为在目标平台执行的命令：

| 目标 | 命令 | 输出 |
| --- | --- | --- |
| 当前系统 | `npm run electron:build` | 当前平台配置的安装包 |
| macOS Apple Silicon | `npm run electron:build:mac:arm64` | DMG、ZIP、应用包 |
| macOS Intel | `npm run electron:build:mac:x64` | DMG、ZIP、应用包 |
| macOS Universal | `npm run electron:build:mac:universal` | 通用 DMG、ZIP、应用包 |
| Windows x64 | `npm run electron:build -- --win --x64` | NSIS 安装程序 |
| Linux x64 | `npm run electron:build -- --linux AppImage deb --x64` | AppImage、DEB |

产物写入忽略的 `release/`。macOS 无签名证书时可用 `npm run electron:build:mac:unsigned` 生成本机架构的测试包；正式分发的签名和公证见 [打包手册](../../PACKAGING_FOR_AI.md)。

## 安装

- macOS：打开对应架构的 DMG，将 `MDEditor.app` 放入 `/Applications`；ZIP 也可解压得到应用包。操作系统的签名和公证提示以该产物的实际状态为准。
- Windows：运行 NSIS 安装程序并选择安装目录，完成后从开始菜单启动。
- Linux：AppImage 需要可执行权限以及系统对应的运行依赖；DEB 使用发行版的包管理器安装。不同发行版的依赖和图形环境可能不同，应先在目标环境验证。

## 升级和恢复

正常退出旧应用；有未保存内容时先保存或处理确认。保留旧应用备份后，再替换或安装新版，不要强制终止仍在编辑的进程。源码升级使用正常的 Git 更新和 `npm ci`，不要覆盖自己的未提交改动。

草稿位于 Electron `userData` 目录，通常为：

| 系统 | 默认目录 |
| --- | --- |
| macOS | `~/Library/Application Support/md-editor/` |
| Windows | `%APPDATA%/md-editor/` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/md-editor/` |

具体位置可能受系统或启动配置影响。升级时保留用户数据目录；需要降级时恢复旧应用包，并先备份现有草稿。草稿为本地文本备份，不能代替对重要原文件的独立备份。
