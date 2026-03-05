# macOS 文件关联设置指南

## 问题说明

MD Editor 在 macOS 上需要配置文件关联才能成为 `.md` 文件的默认打开应用。

## 已完成配置

在 `package.json` 中已经添加了文件关联配置：

```json
"fileAssociations": [
  {
    "ext": "md",
    "name": "Markdown",
    "description": "Markdown Document",
    "role": "Editor"
  },
  {
    "ext": "markdown",
    "name": "Markdown",
    "description": "Markdown Document",
    "role": "Editor"
  },
  {
    "ext": "mdown",
    "name": "Markdown",
    "description": "Markdown Document",
    "role": "Editor"
  },
  {
    "ext": "mkd",
    "name": "Markdown",
    "description": "Markdown Document",
    "role": "Editor"
  }
]
```

## 如何设置为默认应用

### 方法一：右键菜单（推荐）

1. 在 Finder 中找到任意 `.md` 文件
2. 右键点击文件，选择"显示简介" (Get Info)
3. 在"打开方式" (Open with) 部分，选择 "MD Editor"
4. 点击"全部更改..." (Change All...) 按钮
5. 确认更改

### 方法二：系统偏好设置

1. 打开"系统偏好设置" > "隐私与安全性" > "隐私"
2. 找到"文件和文件夹"或"完全磁盘访问权限"
3. 重启 Mac 后重新打开应用

### 方法三：命令行

```bash
# 设置 MD Editor 为 .md 文件的默认应用
defaults write com.apple.LaunchServices/com.apple.launchservices.secure \
  LSHandlers -array-add \
  '{LSHandlerContentType="net.daringfireball.markdown";LSHandlerRoleAll="com.mdeditor.app";}'

# 重启 Launch Services
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -kill -r -domain local -domain system -domain user
```

## 验证文件关联

### 检查 Info.plist

构建后的应用 Info.plist 应该包含：

```xml
<key>CFBundleDocumentTypes</key>
<array>
    <dict>
        <key>CFBundleTypeExtensions</key>
        <array>
            <string>md</string>
        </array>
        <key>CFBundleTypeName</key>
        <string>Markdown</string>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
    </dict>
</array>
```

### 命令行验证

```bash
# 查看应用的文件类型
mdls -name kMDItemContentType /Applications/MD\ Editor.app

# 检查 .md 文件的默认应用
mdls -name kMDItemContentTypeTree example.md
```

## 故障排除

### 问题：应用不出现在"打开方式"列表中

**解决方案：**
1. 重启 Mac
2. 重新安装应用
3. 运行命令：
   ```bash
   /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
     -f /Applications/MD\ Editor.app
   ```

### 问题：双击 .md 文件不打开应用

**解决方案：**
1. 检查应用是否正确安装
2. 检查文件权限
3. 尝试方法一的右键菜单设置

### 问题：文件图标没有改变

**解决方案：**
- macOS 缓存了文件图标，重启 Finder 或重启 Mac
- 添加自定义应用图标后图标会更明显

## 技术说明

### macOS 文件关联原理

1. **Info.plist** - 应用包内的配置文件，声明支持的文件类型
2. **Launch Services** - macOS 系统服务，管理文件关联
3. **Uniform Type Identifiers (UTI)** - 文件类型的唯一标识符

### Electron Builder 配置

`fileAssociations` 配置会在构建时自动写入应用的 Info.plist：

- `ext`: 文件扩展名
- `name`: 文件类型名称
- `description`: 文件类型描述
- `role`: 应用角色 (Editor/Viewer)
- `icon`: 文件图标（可选）

## 相关链接

- [Electron Builder File Associations](https://www.electron.build/configuration#file-associations)
- [Apple Uniform Type Identifiers](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_intro/understand_utis_intro.html)
- [macOS Launch Services](https://developer.apple.com/documentation/coreservices/launch_services)

## 注意事项

1. **代码签名**：正式发布时需要代码签名，否则用户会看到安全警告
2. **公证**：macOS 10.15+ 需要公证才能正常分发
3. **用户确认**：首次打开时用户需要手动确认
4. **权限**：可能需要"完全磁盘访问权限"才能访问所有文件

## 开发环境测试

在开发环境中，文件关联可能不生效。需要：

1. 构建并安装应用
2. 重启 Launch Services
3. 使用方法一设置默认应用

```bash
# 开发环境快速测试
npm run electron:build
npm run electron:dev
```
