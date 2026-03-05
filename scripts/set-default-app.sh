#!/bin/bash
# 设置 MD Editor 为 .md 文件的默认应用

echo "======================================"
echo "MD Editor 文件关联设置工具"
echo "======================================"
echo ""

APP_PATH="/Applications/MD Editor.app"
BUNDLE_ID="com.mdeditor.app"

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 错误: 找不到 MD Editor.app"
    echo "   请确认应用已安装到 /Applications/"
    exit 1
fi

echo "✅ 找到应用: $APP_PATH"
echo ""

# 1. 重新注册应用
echo "步骤 1/4: 重新注册应用..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_PATH" 2>&1
echo "✅ 完成"
echo ""

# 2. 设置为 .md 文件的默认应用
echo "步骤 2/4: 设置文件关联..."

# 方法 A: 使用 defaults write
defaults write com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers -array-add \
  "{LSHandlerContentType='public.plain-text';LSHandlerRoleAll='$BUNDLE_ID';}" 2>/dev/null

defaults write com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers -array-add \
  "{LSHandlerContentType='net.daringfireball.markdown';LSHandlerRoleAll='$BUNDLE_ID';}" 2>/dev/null

echo "✅ 完成"
echo ""

# 3. 更新 Launch Services 数据库
echo "步骤 3/4: 更新 Launch Services 数据库..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -kill -r -domain local -domain system -domain user 2>&1
echo "✅ 完成"
echo ""

# 4. 重启 Finder
echo "步骤 4/4: 重启 Finder..."
killall Finder 2>/dev/null
echo "✅ 完成"
echo ""

echo "======================================"
echo "✅ 设置完成！"
echo "======================================"
echo ""
echo "现在请尝试以下操作："
echo ""
echo "方法 1 - 右键菜单（推荐）:"
echo "  1. 在 Finder 中找到任意 .md 文件"
echo "  2. 右键点击 → 显示简介（Get Info）"
echo "  3. 在'打开方式'（Open with）中选择 'MD Editor'"
echo "  4. 点击'全部更改...'（Change All...）"
echo "  5. 确认更改"
echo ""
echo "方法 2 - 测试打开文件:"
echo "  open -a 'MD Editor' test.md"
echo ""
echo "如果仍然无法设置，请："
echo "  1. 重启 Mac"
echo "  2. 或运行: chmod +x scripts/register-app.sh && ./scripts/register-app.sh"
echo ""
