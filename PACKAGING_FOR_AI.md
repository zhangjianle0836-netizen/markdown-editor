# AI 打包与签名操作手册

本文档记录 MD Editor 在 macOS 上使用 Developer ID 证书打包、签名和验证的完整流程，供后续 AI 代理或维护者复用。

## 当前项目事实

- 项目类型：Electron + React + TypeScript
- 打包工具：electron-builder
- macOS 产品名：`MDEditor`
- Bundle ID：`com.mdeditor.app`
- 签名团队 ID：`4M8PLCQCFP`
- 签名身份：`Developer ID Application: Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)`
- 签名证书 SHA-1：`CD373C62B31F0607473508C41897980715CDF043`
- macOS 构建输出目录：`release/`
- macOS 分发产物按架构生成：
  - `release/MDEditor-1.1.1-arm64.dmg`
  - `release/MDEditor-1.1.1-arm64-mac.zip`
  - `release/mac-arm64/MDEditor.app`
  - `release/MDEditor-1.1.1.dmg` 或 `release/MDEditor-1.1.1-x64.dmg`
  - `release/MDEditor-1.1.1-mac.zip` 或 `release/MDEditor-1.1.1-x64-mac.zip`
  - `release/mac/MDEditor.app` 或 `release/mac-x64/MDEditor.app`

## 1.1.1 验证与本地更新

1. 运行 `npm run verify`，确认单元测试、构建、惰性加载检查和 Electron 集成测试全部通过。
2. 验证后使用 `CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' npm run electron:package:mac:arm64`，复用已验证的构建，避免重复编译。
3. 对新应用执行 `codesign --verify --deep --strict`，验证版本及签名身份。
4. 正常退出已安装应用，先保留旧版应用备份，再替换 `/Applications/MDEditor.app`。不要删除 `~/Library/Application Support/md-editor` 用户数据，不要强制终止有未保存内容的应用。
5. 打开新版本，检查窗口、文件打开和预览。签名验证与 Apple 公证是不同步骤；未配置公证凭据时不能声称已公证。

前端依赖均为开发依赖，Electron 主进程只依赖内置模块，应用包不应再次携带整套前端 node_modules。验证与打包通过同一任务锁串行运行。

## 打包前检查

### Apple Developer 前提

正式对外分发 macOS 应用需要：

- 有效的 Apple Developer Program 会员资格。
- 已创建并安装 `Developer ID Application` 证书。
- 证书对应的私钥在本机钥匙串中可用。
- 如需公证，还需要启用双重认证的 Apple ID，并准备 app-specific password，或准备 App Store Connect API Key。

进入项目根目录：

```bash
cd /Volumes/jianle/code/markdown-editor
```

使用 Node.js 22.12+。先检查同仓库是否已有构建或测试进程；不要并发执行重型任务。确认依赖已安装：

```bash
npm install
```

确认钥匙串搜索路径包含 login、System 和 SystemRootCertificates：

```bash
security list-keychains -d user -s \
  /Users/zhangjianle/Library/Keychains/login.keychain-db \
  /Library/Keychains/System.keychain \
  /System/Library/Keychains/SystemRootCertificates.keychain
```

确认 Developer ID 签名身份存在：

```bash
security find-identity -v -p codesigning
```

期望能看到：

```text
CD373C62B31F0607473508C41897980715CDF043 "Developer ID Application: Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)"
```

确认 Developer ID Application 证书在 login 钥匙串：

```bash
security find-certificate -a \
  -c 'Developer ID Application: Fupu Technology' \
  -Z /Users/zhangjianle/Library/Keychains/login.keychain-db
```

确认 Developer ID G2 中间证书在系统钥匙串：

```bash
security find-certificate -a \
  -c 'Developer ID Certification Authority' \
  -Z /Library/Keychains/System.keychain /System/Library/Keychains/SystemRootCertificates.keychain
```

## 关键证书坑位

如果 `codesign` 报以下错误：

```text
Warning: unable to build chain to self-signed root for signer "Developer ID Application: ..."
errSecInternalComponent
```

先检查用户级信任设置：

```bash
security dump-trust-settings
```

本项目实际遇到过的问题是：用户级信任设置里把 `Developer ID Certification Authority` 手动设成了 `TrustAsRoot`。Developer ID CA 是中间证书，不应该被用户手动信任为根证书，否则 `codesign` 可能无法构建正确链路。

修复方式是移除该自定义信任，让它恢复系统默认。不要删除系统钥匙串里的 Apple 证书。

如果已经有 Apple 官方 G2 中间证书文件，可执行：

```bash
security remove-trusted-cert work/signing/DeveloperIDG2CA.pem
```

如果还保留了旧的非 G2 Developer ID CA 备份文件，可执行：

```bash
security remove-trusted-cert work/signing/backup-old-developer-id-ca-non-g2.pem
```

修复后再次检查：

```bash
security dump-trust-settings
```

用户级信任设置里不应再出现把 `Developer ID Certification Authority` 设为 `kSecTrustSettingsResultTrustAsRoot` 的条目。

## 最小签名测试

在跑 electron-builder 前，先做最小 `codesign` 测试。这个步骤能区分“证书/钥匙串问题”和“Electron 打包配置问题”。

```bash
mkdir -p work/signing
printf 'int main(void){return 0;}\n' > work/signing/minimal.c
xcrun clang work/signing/minimal.c -o work/signing/minimal-app

/usr/bin/codesign \
  --force \
  --sign 'CD373C62B31F0607473508C41897980715CDF043' \
  --keychain /Users/zhangjianle/Library/Keychains/login.keychain-db \
  --timestamp=none \
  --verbose=4 \
  work/signing/minimal-app
```

验证最小签名：

```bash
/usr/bin/codesign --display --verbose=4 work/signing/minimal-app
/usr/bin/codesign --verify --strict --verbose=4 work/signing/minimal-app
```

期望看到：

```text
Authority=Developer ID Application: Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamIdentifier=4M8PLCQCFP
```

只有最小签名成功后，再继续正式打包。

## 正式 macOS 打包

当前 `package.json` 的 `build.mac` 已配置：

- `target`: `dmg`, `zip`
- `hardenedRuntime`: `true`
- `entitlements`: `build/entitlements.mac.plist`
- `entitlementsInherit`: `build/entitlements.mac.plist`
- `type`: `distribution`

### Apple Silicon arm64 打包

适用于 M1/M2/M3/M4 等 Apple Silicon Mac：

```bash
CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' \
  npm run electron:build:mac:arm64
```

注意：`CSC_NAME` 使用 electron-builder 期望的名称，不要加 `Developer ID Application:` 前缀。electron-builder 会自动匹配到完整 Developer ID Application 身份。

成功后会生成：

```text
release/mac-arm64/MDEditor.app
release/MDEditor-1.1.1-arm64.dmg
release/MDEditor-1.1.1-arm64-mac.zip
```

### Intel x64 打包

适用于 Intel Mac：

```bash
CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' \
  npm run electron:build:mac:x64
```

常见输出路径可能是：

```text
release/mac/MDEditor.app
release/mac-x64/MDEditor.app
release/MDEditor-1.1.1.dmg
release/MDEditor-1.1.1-mac.zip
release/MDEditor-1.1.1-x64.dmg
release/MDEditor-1.1.1-x64-mac.zip
```

实际文件名以 electron-builder 输出为准。

### Universal 打包

Universal 包同时支持 Apple Silicon 和 Intel Mac，但体积更大：

```bash
CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' \
  npm run electron:build:mac:universal
```

如果项目引入原生 Node 模块，Universal 打包前要确认这些模块同时支持 `arm64` 和 `x64`。当前项目主要是前端依赖，风险较低。

## 签 DMG

electron-builder 默认会签 app bundle，但 DMG 文件本身可能没有签名。打包完成后手动签对应的 DMG。

arm64 示例：

```bash
/usr/bin/codesign \
  --force \
  --sign 'CD373C62B31F0607473508C41897980715CDF043' \
  --keychain /Users/zhangjianle/Library/Keychains/login.keychain-db \
  --timestamp \
  --verbose=4 \
  release/MDEditor-1.1.1-arm64.dmg
```

x64 或 universal 时，把最后一行替换成实际生成的 DMG 文件名，例如：

```bash
release/MDEditor-1.0.0.dmg
```

## 验证清单

验证 app bundle。按本次打包架构替换路径：

```bash
/usr/bin/codesign --display --verbose=4 release/mac-arm64/MDEditor.app
/usr/bin/codesign --verify --deep --strict --verbose=4 release/mac-arm64/MDEditor.app
```

x64 常见路径是：

```bash
release/mac/MDEditor.app
release/mac-x64/MDEditor.app
```

验证 DMG 文件签名：

```bash
/usr/bin/codesign --verify --verbose=4 release/MDEditor-1.1.1-arm64.dmg
/usr/bin/codesign --display --verbose=4 release/MDEditor-1.1.1-arm64.dmg
```

验证架构：

```bash
lipo -archs release/mac-arm64/MDEditor.app/Contents/MacOS/MDEditor
lipo -archs release/mac/MDEditor.app/Contents/MacOS/MDEditor
```

期望：

- arm64 包输出 `arm64`
- x64 包输出 `x86_64`
- universal 包输出 `x86_64 arm64`

验证 ZIP 内的 app：

```bash
rm -rf work/verify-zip
mkdir -p work/verify-zip
ditto -x -k release/MDEditor-1.1.1-arm64-mac.zip work/verify-zip

/usr/bin/codesign --display --verbose=4 work/verify-zip/MDEditor.app
/usr/bin/codesign --verify --deep --strict --verbose=4 work/verify-zip/MDEditor.app
```

验证 DMG 内的 app：

```bash
hdiutil attach -nobrowse -readonly release/MDEditor-1.1.1-arm64.dmg

/usr/bin/codesign --display --verbose=4 '/Volumes/MDEditor 1.1.1-arm64/MDEditor.app'
/usr/bin/codesign --verify --deep --strict --verbose=4 '/Volumes/MDEditor 1.1.1-arm64/MDEditor.app'

hdiutil detach '/Volumes/MDEditor 1.1.1-arm64'
```

生成校验值：

```bash
shasum -a 256 \
  release/MDEditor-1.1.1-arm64.dmg \
  release/MDEditor-1.1.1-arm64-mac.zip
```

## Gatekeeper 结果说明

执行：

```bash
/usr/sbin/spctl --assess --type execute --verbose=4 release/mac-arm64/MDEditor.app
/usr/sbin/spctl --assess --type open --context context:primary-signature --verbose=4 release/MDEditor-1.1.1-arm64.dmg
```

如果结果是：

```text
rejected
source=Unnotarized Developer ID
```

这表示应用已经使用 Developer ID 签名，但尚未完成 Apple notarization 公证。它不是签名失败。

要让外部分发时 Gatekeeper 更顺畅，需要继续配置 Apple 公证流程。

## 公证待办

当前打包流程已完成 Developer ID 签名，但没有配置 notarization。electron-builder 输出：

```text
skipped macOS notarization reason=`notarize` options were unable to be generated
```

后续如需公证，需要补充以下任一方案：

- Apple ID + app-specific password + team ID
- App Store Connect API Key

### Apple ID 公证方案

创建本地 `.env` 文件，不要提交到 Git：

```bash
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=4M8PLCQCFP
```

安装公证依赖：

```bash
npm install --save-dev @electron/notarize
```

创建 `build/notarize.js`：

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization: missing Apple credentials');
    return;
  }

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
};
```

在 `package.json` 的 `build` 配置里增加：

```json
{
  "build": {
    "afterSign": "build/notarize.js"
  }
}
```

然后重新执行正式打包命令。

### 公证验证

公证完成后，再执行：

```bash
/usr/sbin/spctl --assess --type execute --verbose=4 release/mac-arm64/MDEditor.app
/usr/sbin/spctl --assess --type open --context context:primary-signature --verbose=4 release/MDEditor-1.1.1-arm64.dmg
```

通过时不应再显示 `source=Unnotarized Developer ID`。

## 未签名或未公证时的用户打开方式

如果只是内部测试，还没有完成签名或公证，用户可能看到：

- “无法打开应用，因为它来自身份不明的开发者”
- “macOS 无法验证此 App 不含恶意软件”

可临时使用以下方式打开。

### Finder 右键打开

1. 在 Finder 中找到应用。
2. 右键点击应用图标。
3. 选择“打开”。
4. 在弹窗中再次点击“打开”。

### 系统设置允许

1. 首次打开应用，看到警告后关闭弹窗。
2. 打开“系统设置” > “隐私与安全性”。
3. 找到该应用的安全提示。
4. 点击“仍要打开”。

### 清理隔离属性

仅用于本机测试：

```bash
xattr -cr /Applications/MDEditor.app
```

## 成本与维护

- Apple Developer Program：按 Apple 当前价格收费。
- Developer ID 签名：包含在 Apple Developer Program 中。
- Apple notarization：包含在 Apple Developer Program 中。
- 证书会过期，需要在过期前更新并重新打包。

## 不要做的事

- 不要删除 `/System/Library/Keychains/SystemRootCertificates.keychain` 中的 Apple 系统证书。
- 不要把 `Developer ID Certification Authority` 手动设成 `Always Trust` 或 `TrustAsRoot`。
- 不要用 `/bin/echo` 这类系统自带已签名二进制判断 Developer ID 是否签成功；请使用本文的最小 C 程序测试。
- 不要把证书密码、Apple ID app-specific password 或 API key 写进仓库文档。
- 不要把 `CSC_NAME` 写成带 `Developer ID Application:` 前缀的值；electron-builder 会拒绝该格式。

## 快速命令汇总

```bash
cd /Volumes/jianle/code/markdown-editor

security list-keychains -d user -s \
  /Users/zhangjianle/Library/Keychains/login.keychain-db \
  /Library/Keychains/System.keychain \
  /System/Library/Keychains/SystemRootCertificates.keychain

security find-identity -v -p codesigning

CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' \
  npm run electron:build:mac:arm64

CSC_NAME='Fupu Technology (Beijing) Co., Ltd. (4M8PLCQCFP)' \
  npm run electron:build:mac:x64

/usr/bin/codesign \
  --force \
  --sign 'CD373C62B31F0607473508C41897980715CDF043' \
  --keychain /Users/zhangjianle/Library/Keychains/login.keychain-db \
  --timestamp \
  --verbose=4 \
  release/MDEditor-1.1.1-arm64.dmg

/usr/bin/codesign --verify --deep --strict --verbose=4 release/mac-arm64/MDEditor.app
/usr/bin/codesign --verify --verbose=4 release/MDEditor-1.1.1-arm64.dmg
```

## 参考资源

- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
