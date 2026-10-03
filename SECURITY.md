# 安全说明 / Security

## 漏洞报告

请通过本仓库的 [私密漏洞报告](https://github.com/zhangjianle0836-netizen/markdown-editor/security/advisories/new) 提交可复现的安全问题，不要在公开 Issue 中发布凭据、私钥、个人文档或尚未修复的利用细节。

报告请提供受影响版本、系统与架构、复现步骤、最小示例、影响范围和建议修复。维护者会根据问题确认结果、影响和可用维护时间处理；本项目不承诺固定响应时限。

普通功能缺陷请提交 [Issue](https://github.com/zhangjianle0836-netizen/markdown-editor/issues)。

## 维护范围

安全修复以最新发布版本和 `main` 分支为目标，旧版本不保证回移修复。升级时请查看 [更新日志](CHANGELOG.md) 和产物的签名说明。

## 安全边界

- Electron 渲染进程启用沙箱与上下文隔离，不直接提供 Node.js 文件系统访问。
- 特权 IPC 校验窗口和发送页面，文件操作限于通过原生对话框或系统打开流程授权的路径。
- 阅读与分屏共用 marked + DOMPurify 清洗，原始 HTML 的脚本、事件处理器和未允许属性会被移除。
- 文件读取、保存、草稿和 PDF 输入均有大小限制；保存使用临时文件同步后原子替换，并检查磁盘版本冲突。
- 草稿恢复不授予历史文件路径写权限，恢复后需重新选择保存位置。
- 外部链接交给系统浏览器；HTTP(S) 图片可能向其来源发送网络请求。未内置账号、云同步或遥测上传功能。

这些控制不能保证所有输入和平台都绝对安全。对于重要内容，请使用可信来源的应用构建和独立文件备份。依赖审计只反映执行时的已知告警，不代表永久无漏洞。

## 发布和凭据

代码采用已有 MIT 许可证。应用签名与 Apple 公证是独立步骤，公开源代码不代表所有安装包已签名或已公证。签名私钥、证书密码、GitHub token、Apple 凭据和 `.env` 不应进入 Git；本地签名材料、构建产物和验证工作目录已由 `.gitignore` 排除。

## English

Report reproducible security issues through [private vulnerability reporting](https://github.com/zhangjianle0836-netizen/markdown-editor/security/advisories/new), not public Issues. Include affected versions, environment, reproduction and impact without sharing credentials or personal files. Fixes target the latest release and `main`; no response-time or backport guarantee is made.

The application isolates its renderer, validates privileged IPC and file grants, sanitizes Markdown and bounds file/export inputs. Draft recovery requires fresh save authorization. Remote images may make network requests. Signing and notarization depend on each binary, and build credentials must never be committed.
