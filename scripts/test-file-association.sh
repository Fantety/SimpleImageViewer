#!/bin/bash

# 测试文件关联功能
# 使用方法: ./scripts/test-file-association.sh [image-file-path]

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查应用是否已构建
APP_PATH="src-tauri/target/release/bundle/macos/Simple Image Viewer.app"
if [ ! -d "$APP_PATH" ]; then
    echo_error "应用未构建，请先运行: yarn tauri build"
    exit 1
fi

# 如果提供了图片文件路径，使用它；否则创建一个测试图片
if [ -n "$1" ]; then
    IMAGE_PATH="$1"
    if [ ! -f "$IMAGE_PATH" ]; then
        echo_error "图片文件不存在: $IMAGE_PATH"
        exit 1
    fi
else
    # 创建一个简单的测试图片
    IMAGE_PATH="/tmp/test_image.png"
    echo_step "创建测试图片: $IMAGE_PATH"
    
    # 使用sips创建一个简单的测试图片（macOS内置工具）
    if command -v sips &> /dev/null; then
        # 创建一个200x200的红色图片
        sips -s format png -s pixelsW 200 -s pixelsH 200 -c red "$IMAGE_PATH" 2>/dev/null || {
            # 如果sips失败，尝试使用其他方法
            echo_warn "sips创建图片失败，尝试其他方法..."
            
            # 创建一个简单的PNG文件（最小的有效PNG）
            echo -ne '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82' > "$IMAGE_PATH"
        }
    else
        echo_error "无法创建测试图片，请提供一个现有的图片文件路径"
        exit 1
    fi
fi

echo_info "测试图片路径: $IMAGE_PATH"

# 测试1: 直接运行应用（无参数）
echo_step "测试1: 直接运行应用（无参数）"
echo_info "启动应用..."
open "$APP_PATH"
echo_info "应用已启动，请检查是否正常显示"
echo_warn "按Enter继续下一个测试..."
read

# 关闭应用
echo_step "关闭应用..."
pkill -f "Simple Image Viewer" || true
sleep 2

# 测试2: 使用命令行参数运行应用
echo_step "测试2: 使用命令行参数运行应用"
echo_info "使用图片文件作为参数启动应用: $IMAGE_PATH"
open "$APP_PATH" --args "$IMAGE_PATH"
echo_info "应用已启动，请检查是否自动加载了指定的图片"
echo_warn "按Enter继续下一个测试..."
read

# 关闭应用
echo_step "关闭应用..."
pkill -f "Simple Image Viewer" || true
sleep 2

# 测试3: 使用系统默认应用打开（如果已设置）
echo_step "测试3: 使用系统默认应用打开"
echo_info "尝试使用系统默认应用打开图片..."
open "$IMAGE_PATH"
echo_info "如果Simple Image Viewer已设置为默认应用，应该会自动打开并显示图片"
echo_warn "按Enter继续..."
read

echo_step "测试完成!"
echo ""
echo_info "测试结果检查:"
echo "1. 应用能否正常启动？"
echo "2. 使用命令行参数时，应用是否自动加载指定图片？"
echo "3. 双击图片文件时，应用是否自动打开并显示图片？"
echo ""
echo_info "如果测试失败，请检查:"
echo "1. 应用是否正确构建"
echo "2. 文件关联是否正确设置（运行 ./scripts/set-default-app.sh）"
echo "3. 查看应用的控制台输出以获取调试信息"

# 清理测试文件
if [ "$IMAGE_PATH" = "/tmp/test_image.png" ]; then
    rm -f "$IMAGE_PATH"
    echo_info "已清理测试文件"
fi