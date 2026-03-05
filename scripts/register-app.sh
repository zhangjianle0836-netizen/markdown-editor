#!/bin/bash
# 重新注册 MD Editor 到 macOS Launch Services

echo "重新注册 MD Editor..."

# 1. 重新注册应用
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "/Applications/MD Editor.app"

echo "✅ 应用已重新注册"

# 2. 重启 Launch Services
echo "重启 Launch Services..."
killall Finder

echo "✅ 完成！"
echo ""
echo "现在请尝试以下步骤："
echo "1. 在 Finder 中找到任意 .md 文件"
echo "2. 右键点击 → 显示简介"
echo "3. 在'打开方式'中选择 'MD Editor'"
echo "4. 点击'全部更改'"
