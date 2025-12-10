# 文件关联设置指南

## 问题
当前文件关联功能无法正常工作，已更新为使用 `tauri-plugin-single-instance` 插件。

## 解决方案

### 1. 清理构建缓存

如果遇到编译错误，先清理构建缓存：

```bash
cd src-tauri
cargo clean
cd ..
```

### 2. 重新构建应用

```bash
yarn tauri build
```

## 工作原理

1. **Single Instance Plugin**: 使用 `tauri-plugin-single-instance` 确保只有一个应用实例运行
2. **文件关联处理**: 当用户通过"打开方式"打开文件时：
   - 如果应用未运行，正常启动并通过命令行参数获取文件路径
   - 如果应用已运行，新实例会被阻止，文件路径通过事件传递给现有实例
3. **事件监听**: 前端监听 `file-open` 事件来接收文件路径

## 测试步骤

构建完成后：

1. 右键点击一个图片文件
2. 选择"打开方式" -> "Simple Image Viewer"
3. 应用应该会打开并显示选中的图片

如果应用已经在运行：
1. 右键点击另一个图片文件
2. 选择"打开方式" -> "Simple Image Viewer"
3. 现有窗口应该获得焦点并显示新选中的图片

## 调试信息

检查控制台输出：
- 启动时: "Command line arguments on startup: [...]"
- 新实例: "New app instance opened with args: [...]"
- 事件: "File open event received: ..."

## 故障排除

如果仍然无法工作：

1. **检查文件关联**: 确保在系统设置中正确设置了文件关联
2. **检查权限**: 确保应用有读取文件的权限
3. **检查路径**: 文件路径可能包含特殊字符或空格
4. **重新安装**: 删除应用并重新安装可能解决某些问题
