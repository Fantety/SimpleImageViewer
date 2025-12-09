# 拖拽功能修复说明

## 问题
拖拽图片到应用窗口无法加载图片。

## 原因
在 Tauri 应用中，文件拖放需要：
1. 在 `tauri.conf.json` 中启用 `fileDropEnabled`
2. 使用 Tauri 的事件系统而不是浏览器原生事件

## 解决方案

### 1. 启用 Tauri 文件拖放
在 `src-tauri/tauri.conf.json` 中添加配置：

```json
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

### 2. 使用 Tauri Webview API
在 `src/components/ImageViewer.tsx` 中：

**之前（不工作）：**
```typescript
// 使用浏览器原生事件
document.addEventListener('dragover', handleDragOver);
document.addEventListener('drop', handleDrop);
```

**之后（工作）：**
```typescript
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

// 使用 Tauri webview 的 onDragDropEvent
const webview = getCurrentWebviewWindow();

await webview.onDragDropEvent((event) => {
  if (event.payload.type === 'over') {
    setIsDragging(true);
  } else if (event.payload.type === 'drop') {
    const paths = event.payload.paths; // 直接获取文件路径
    await loadImageFromPath(paths[0]);
  } else if (event.payload.type === 'leave') {
    setIsDragging(false);
  }
});
```

## Tauri 拖放事件

Tauri 2.x 的 `onDragDropEvent` 提供以下事件类型：

1. **`over`** - 文件拖动到窗口上方时触发
2. **`drop`** - 文件释放时触发，payload.paths 包含文件路径数组
3. **`leave`** - 拖动离开窗口时触发

## 优势

使用 Tauri 事件系统的优势：
- ✅ 直接获取文件系统路径
- ✅ 无需读取文件内容到内存
- ✅ 更好的性能
- ✅ 跨平台一致性
- ✅ 与 Tauri 安全模型集成

## 测试

修复后，拖拽功能应该正常工作：
1. 从文件管理器拖动图片文件
2. 拖到应用窗口上方
3. 看到覆盖层提示
4. 释放鼠标
5. 图片自动加载

## 修改的文件

1. `src-tauri/tauri.conf.json` - 添加 dragDropEnabled
2. `src/components/ImageViewer.tsx` - 使用 Tauri 事件系统
3. `DRAG_DROP_FEATURE.md` - 更新文档
4. `DRAG_DROP_FIX.md` - 本修复说明
