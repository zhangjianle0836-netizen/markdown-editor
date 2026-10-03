# macOS 文件关联

应用包的产品名为 `MDEditor.app`，Bundle ID 为 `com.mdeditor.app`。构建配置声明 `.md`、`.markdown`、`.mdown` 和 `.mkd` 的文件关联；默认打开应用由 macOS 和用户选择管理。

## 设置默认打开应用

先安装应用到 `/Applications/MDEditor.app`。在 Finder 中选中一个 Markdown 文件，打开“显示简介”，在“打开方式”中选择 MDEditor，需要对同类文件生效时点击“全部更改”。不同扩展名可能需要分别设置。

## 应用未出现在列表中

确认使用的是已安装的应用包，而不是仅运行 Vite 的浏览器页面。可以重新注册这一应用：

```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f /Applications/MDEditor.app
```

这一步只注册指定应用，不重置全局关联或重启 Finder。也可先通过 Finder 的“打开方式”选择应用，或在应用内点击“打开”。文件关联问题不需要通过授予完全磁盘访问权限解决。

## 验证打开流程

```bash
open -a /Applications/MDEditor.app /path/to/example.md
```

已打开文档默认进入预览；如果当前内容未保存，系统再次打开文件仍会先显示保存、丢弃或取消的确认。文本读取和保存上限为 10 MiB。

安装、架构选择及升级见 [安装与构建](../deployment/installation.md)，签名和公证见 [打包手册](../../PACKAGING_FOR_AI.md)。
