#!/bin/bash

# 测试文件关联的脚本

echo "=== 测试文件关联功能 ==="

# 检查是否有测试图片
TEST_IMAGE="test-image.png"

if [ ! -f "$TEST_IMAGE" ]; then
    echo "创建测试图片..."
    # 创建一个简单的测试图片（如果系统有 convert 命令）
    if command -v convert &> /dev/null; then
        convert -size 100x100 xc:red "$TEST_IMAGE"
        echo "已创建测试图片: $TEST_IMAGE"
    else
        echo "请手动创建一个测试图片文件: $TEST_IMAGE"
        exit 1
    fi
fi

# 构建应用
echo "构建应用..."
yarn tauri build

if [ $? -ne 0 ]; then
    echo "构建失败！"
    exit 1
fi

# 查找构建的应用
APP_PATH=""
if [ -d "src-tauri/target/release/bundle/macos" ]; then
    APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" | head -1)
fi

if [ -z "$APP_PATH" ]; then
    echo "找不到构建的应用！"
    exit 1
fi

echo "找到应用: $APP_PATH"

# 测试1: 直接启动应用
echo ""
echo "=== 测试1: 直接启动应用 ==="
"$APP_PATH/Contents/MacOS/simpleimageviewer" &
APP_PID=$!
sleep 2
kill $APP_PID 2>/dev/null

# 测试2: 通过命令行参数启动
echo ""
echo "=== 测试2: 通过命令行参数启动 ==="
FULL_PATH=$(realpath "$TEST_IMAGE")
echo "测试图片路径: $FULL_PATH"
"$APP_PATH/Contents/MacOS/simpleimageviewer" "$FULL_PATH" &
APP_PID=$!
echo "应用已启动，PID: $APP_PID"
echo "请检查应用是否正确加载了图片"
echo "按任意键继续..."
read -n 1

# 测试3: 通过 open 命令测试
echo ""
echo "=== 测试3: 通过 open 命令测试 ==="
kill $APP_PID 2>/dev/null
sleep 1
open -a "$APP_PATH" "$FULL_PATH"
echo "已通过 open 命令启动应用"
echo "请检查应用是否正确加载了图片"

echo ""
echo "=== 测试完成 ==="
echo "如果应用能正确加载图片，说明文件关联功能正常"