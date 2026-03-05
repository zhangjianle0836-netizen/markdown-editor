# macOS 代码签名指南

## 问题说明

macOS 应如果未进行代码签名，用户安装时会看到以下警告：
- "无法打开'应用名'，因为它来自身份不明的开发者"
- "macOS 无法验证此 App 不含恶意软件"

## 解决方案概览

### 1. 获取开发者证书

**前提条件**：
- 有效的 Apple Developer Program 会员资格（$99/年）
- 个人或企业开发者账号

**步骤**：
1. 登录 [Apple Developer](https://developer.apple.com/account)
2. 进入 "Certificates, Identifiers & Profiles"
3. 创建 "Developer ID Application" 证书
4. 下载并安装到钥匙串

### 2. 配置签名（自动化脚本）

创建 `.env` 文件（不要提交到 Git）：

```bash
# Apple Developer 账号信息
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 从 appleid.apple.com 生成
APPLE_TEAM_ID=XXXXXXXXXX  # 从开发者中心获取

# 证书信息（可选，如果有多个证书）
CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
```

### 3. 更新 package.json

在 `build.mac` 配置中添加：

```json
{
  "build": {
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "afterSign": "build/notarize.js"
  }
}
```

### 4. 创建权限配置文件

创建 `build/entitlements.mac.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
```

### 5. 创建公证脚本

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
    console.log('Skipping notarization: Missing credentials');
    return;
  }

  console.log('Notarizing app...');

  return await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
};
```

### 6. 安装依赖

```bash
npm install --save-dev @electron/notarize
```

### 7. 构建签名版本

```bash
npm run electron:build
```

## 临时解决方案（无证书）

如果暂时没有证书，可以告诉用户：

### 方法 1：右键打开
1. 在 Finder 中找到应用
2. 右键点击应用图标
3. 选择"打开"
4. 点击"打开"确认

### 方法 2：系统设置允许
1. 首次打开会显示警告，点击"完成"
2. 打开"系统设置" > "隐私与安全性"
3. 找到"仍要打开"按钮并点击
4. 点击"打开"确认

### 方法 3：终端命令
```bash
xattr -cr /Applications/MD\ Editor.app
```

## 公证（Notarization）说明

签名后还建议进行公证，让苹果验证应用安全性：

**好处**：
- 用户无需任何额外操作即可安装
- 显示"已通过 Apple 公证"
- 提升用户信任度

**要求**：
- 有效的开发者证书
- 启用双重认证的 Apple ID
- App-specific password

## 成本总结

- **Apple Developer Program**: $99/年
- **代码签名**: 包含在会员资格中
- **公证**: 免费（包含在会员资格中）

## 检查清单

- [ ] 确认有 Apple Developer Program 会员资格
- [ ] 创建 Developer ID Application 证书
- [ ] 配置 package.json 签名选项
- [ ] 创建 entitlements.mac.plist
- [ ] 安装 @electron/notarize
- [ ] 配置环境变量
- [ ] 构建并测试
- [ ] 验证签名：`codesign -vvv --deep --strict app.app`
- [ ] 验证公证：`spctl --assess --verbose app.app`

## 参考资源

- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Apple Notarization](https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
