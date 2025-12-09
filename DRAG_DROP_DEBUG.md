# 拖拽功能调试指南

## 最新更新

使用 Tauri 2.x 的 `onDragDropEvent` API 来处理文件拖放。

## 如何测试

1. **启动开发服务器**
   ```bash
   npm run tauri dev
   ```

2. **打开浏览器控制台**
   - 在 Tauri 应用中，按 F12 或右键选择"检查"
   - 查看 Console 标签页

3. **拖拽图片文件**
   - 从文件管理器选择一个图片文件
   - 拖动到应用窗口
   - 观察控制台输出

## 预期的控制台输出

### 成功场景

```
Setting up drag and drop listeners...
Drag and drop listeners set up successfully
Drag event: { payload: { type: 'over', paths: [] } }
Drag over detected
Drag event: { payload: { type: 'drop', paths: ['/path/to/image.png'] } }
File dropped: ['/path/to/image.png']
Processing file: /path/to/image.png
Loading image from path: /path/to/image.png
```

### 非图片文件

```
Drag event: { payload: { type: 'drop', paths: ['/path/to/file.txt'] } }
File dropped: ['/path/to/file.txt']
Processing file: /path/to/file.txt
File is not an image: /path/to/file.txt
```

### 拖拽取消

```
Drag event: { payload: { type: 'over', paths: [] } }
Drag over detected
Drag event: { payload: { type: 'leave', paths: [] } }
Drag leave
```

## 事件类型

Tauri 的 `onDragDropEvent` 提供以下事件类型：

1. **`over`** - 文件拖动到窗口上方
2. **`drop`** - 文件释放（包含文件路径数组）
3. **`leave`** - 拖动离开窗口

## 已修复的问题

### 重复通知问题 ✅

**问题：** 拖拽加载图片后，成功通知显示两次

**原因：** `onDragDropEvent` 可能在短时间内触发多次 drop 事件

**解决方法：** 添加了 `isProcessing` 标志来防止重复处理：

```typescript
let isProcessing = false;

if (event.payload.type === 'drop') {
  if (isProcessing) {
    console.log('Already processing, ignoring duplicate');
    return;
  }
  
  isProcessing = true;
  await loadImageFromPath(filePath);
  
  setTimeout(() => {
    isProcessing = false;
  }, 500);
}
```

## 常见问题排查

### 1. 没有任何控制台输出

**可能原因：**
- `dragDropEnabled` 未在 `tauri.conf.json` 中启用
- 事件监听器未正确设置

**解决方法：**
```json
// src-tauri/tauri.conf.json
{
  "app": {
    "windows": [
      {
        "dragDropEnabled": true
      }
    ]
  }
}
```

### 2. 看到 "Drag over detected" 但没有 "File dropped"

**可能原因：**
- 文件未正确释放
- 操作系统权限问题

**解决方法：**
- 确保完全释放鼠标按钮
- 检查应用是否有文件访问权限

### 3. 看到 "File dropped" 但图片未加载

**可能原因：**
- 文件路径格式问题
- `loadImageFromPath` 函数错误
- Tauri command 错误

**解决方法：**
- 检查控制台是否有错误信息
- 验证文件路径格式
- 测试使用文件对话框打开同一文件

### 4. 错误: "Error setting up drag and drop listeners"

**可能原因：**
- Tauri API 版本不匹配
- webview 未正确初始化

**解决方法：**
- 检查 `@tauri-apps/api` 版本
- 确保使用 Tauri 2.x
- 重新安装依赖: `npm install`

## 代码结构

### 事件监听器设置

```typescript
const webview = getCurrentWebviewWindow();

const unlisten = await webview.onDragDropEvent((event) => {
  if (event.payload.type === 'over') {
    // 显示拖拽覆盖层
    setIsDragging(true);
  } else if (event.payload.type === 'drop') {
    // 处理文件释放
    const paths = event.payload.paths;
    // 加载图片...
  } else if (event.payload.type === 'leave') {
    // 隐藏覆盖层
    setIsDragging(false);
  }
});
```

### 清理

```typescript
return () => {
  if (unlisten) unlisten();
};
```

## 测试清单

- [ ] 拖拽 PNG 图片 → 应该加载
- [ ] 拖拽 JPEG 图片 → 应该加载
- [ ] 拖拽文本文件 → 应该显示错误
- [ ] 拖拽到窗口上方 → 应该显示覆盖层
- [ ] 拖拽离开窗口 → 覆盖层应该消失
- [ ] 释放文件 → 覆盖层消失，图片加载
- [ ] 控制台无错误信息

## 性能监控

在控制台中运行以下命令来监控性能：

```javascript
// 监控事件触发频率
let eventCount = 0;
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && args[0].includes('Drag event')) {
    eventCount++;
    originalLog(`Event #${eventCount}:`, ...args);
  } else {
    originalLog(...args);
  }
};
```

## 下一步

如果拖拽功能仍然不工作：

1. 检查 Tauri 版本: `npm list @tauri-apps/api`
2. 查看完整的错误堆栈
3. 尝试简化代码，只监听事件并打印日志
4. 检查 Tauri 文档的最新变化

## 相关文件

- `src/components/ImageViewer.tsx` - 拖拽事件处理
- `src-tauri/tauri.conf.json` - Tauri 配置
- `DRAG_DROP_FIX.md` - 修复说明
- `DRAG_DROP_FEATURE.md` - 功能文档
