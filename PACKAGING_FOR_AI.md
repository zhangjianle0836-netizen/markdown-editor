# macOS 打包、签名与验证

本手册面向维护者和构建代理。命令使用通用路径与身份占位符，签名证书和私钥由各自的本机环境提供。Windows/Linux 构建入口见 [安装与构建](docs/deployment/installation.md)。

## 产物和配置

- 产品名：`MDEditor`；Bundle ID：`com.mdeditor.app`。
- `build/entitlements.mac.plist` 为主应用和辅助进程提供现有 entitlement 配置。
- macOS 构建启用 hardened runtime；Electron 语言资源保留英文、简体中文和繁体中文。
- 构建输出在 `release/`，不提交到 Git。
- 当前示例版本为 1.1.1；版本变化后以 `package.json` 和实际文件名为准。

arm64 的典型产物：

```text
release/mac-arm64/MDEditor.app
release/MDEditor-1.1.1-arm64.dmg
release/MDEditor-1.1.1-arm64-mac.zip
```

## 准备和验证

使用 Node.js 22.12+。进入自己的仓库目录，检查是否已有同仓库的测试、编译或打包进程。各重型命令顺序运行，不删除仍由活进程持有的 `work/verification.lock`。

```bash
npm ci
npm run verify
```

验证通过后可复用该构建：

```bash
npm run electron:package:mac:arm64
```

此命令本身不会重新编译。若之后改过应用源码、依赖或构建配置，先重新完成相关验证，不要直接打包旧 `dist/`。

## 无签名证书的测试包

```bash
npm run electron:build:mac:unsigned
```

该脚本关闭身份自动发现，并构建本机架构的 DMG 和 ZIP。它用于测试，不具备正式 Developer ID 分发签名。不要把 CI 或无证书构建描述为签名通过。

## Developer ID 签名

正式签名需要自己的 `Developer ID Application` 身份及对应私钥已存在于本机钥匙串。查看可用身份：

```bash
security find-identity -v -p codesigning
```

不要通过本手册修改系统信任规则或重新设置全局钥匙串列表。证书导入、私钥访问和签名权限应由该证书持有人按本机环境配置。

将下方示例名称替换为自己身份中的组织和团队编号，`CSC_NAME` 不加 `Developer ID Application:` 前缀：

```bash
CSC_NAME='Your Organization (YOUR_TEAM_ID)' npm run electron:package:mac:arm64
```

需要从源码重新构建，或目标为其他架构时：

```bash
CSC_NAME='Your Organization (YOUR_TEAM_ID)' npm run electron:build:mac:arm64
CSC_NAME='Your Organization (YOUR_TEAM_ID)' npm run electron:build:mac:x64
CSC_NAME='Your Organization (YOUR_TEAM_ID)' npm run electron:build:mac:universal
```

只执行需要的目标，勿并发运行。Universal 构建需要两种架构的资源；新增原生模块后必须重新验证其兼容性。

DMG 如需单独签名，可以使用 `security find-identity` 输出中选定身份的 SHA-1，变量只在本机赋值：

```bash
SIGNING_IDENTITY_HASH='<your-signing-identity-sha1>'
codesign --force --sign "$SIGNING_IDENTITY_HASH" --timestamp release/MDEditor-1.1.1-arm64.dmg
```

不要提交签名私钥、证书密码、Apple 凭据或 `.env`。开发时也不应在聊天、日志和 Issue 中复制这些信息。

## 验证签名和版本

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/MDEditor.app
codesign --display --verbose=4 release/mac-arm64/MDEditor.app
codesign --verify --verbose=2 release/MDEditor-1.1.1-arm64.dmg
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' release/mac-arm64/MDEditor.app/Contents/Info.plist
shasum -a 256 release/MDEditor-1.1.1-arm64.dmg release/MDEditor-1.1.1-arm64-mac.zip
```

检查签名身份、团队编号、hardened runtime 标记、时间戳及版本是否符合预期。ZIP 不能用 `codesign` 验证本身的应用签名，应解压后验证内部 `.app`。校验和必须针对最终产物生成；再次签名后需要重新计算。

## Apple 公证

Developer ID 签名和 notarization 是独立步骤。需要对外分发时，应按 [electron-builder 公证配置](https://www.electron.build/mac.html#notarize) 配置 Apple 凭据，再根据 [Apple 公证文档](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) 验证结果。

凭据从本机环境或受保护的 CI secret 提供，不写入源码或公开配置。构建日志出现 `skipped macOS notarization` 时，不能声称产物已公证。公证完成后检查应用和 DMG 的 Gatekeeper 评估，并按实际分发方式附加公证票据。

```bash
spctl --assess --type execute --verbose=4 release/mac-arm64/MDEditor.app
spctl --assess --type open --context context:primary-signature --verbose=4 release/MDEditor-1.1.1-arm64.dmg
```

本地验证过的 1.1.1 arm64 产物已完成 Developer ID 签名，未配置 Apple 公证。这不代表他人从源码构建或 CI 构建的产物拥有同样身份。

## 本地更新

1. 正常退出旧应用，先处理未保存内容。
2. 对新应用检查版本和签名，保留旧应用备份。
3. 用新应用替换 `/Applications/MDEditor.app`；替换失败时恢复旧应用。
4. 保留 `~/Library/Application Support/md-editor/` 用户数据。
5. 启动新应用，检查欢迎界面、文档打开、预览和帮助面板。

用户数据和应用包分开保存，不要用清空草稿或删除用户文件来处理升级问题。

## 发布说明需包含

版本、操作系统、CPU 架构、构建来源或提交号、实际执行的验证、签名身份与公证状态，以及最终附件的 SHA-256。公开源代码与发布二进制是两个步骤，只有实际上传的附件才能写成已发布安装包。
