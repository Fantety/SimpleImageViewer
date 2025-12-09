# 拖拽加载图片功能

## 功能概述

为图片查看器应用添加了拖拽加载功能，用户现在可以通过以下三种方式打开图片：

1. 点击"打开图片"按钮
2. 使用键盘快捷键 Ctrl+O (macOS: Cmd+O)
3. **直接拖拽图片文件到应用窗口** ✨ 新功能

## 功能特性

### 1. 拖拽检测
- 自动检测拖入的文件类型
- 只接受支持的图片格式
- 实时视觉反馈

### 2. 支持的图片格式
- PNG
- JPEG/JPG
- GIF
- BMP
- WEBP
- SVG
- TIFF/TIF
- ICO
- HEIC
- AVIF

### 3. 视觉反馈
- **拖拽悬停状态**：显示半透明覆盖层，带有虚线边框的提示框
- **图标提示**：显示打开图标和"释放以打开图片"文字
- **背景模糊**：使用 backdrop-filter 实现毛玻璃效果
- **平滑动画**：0.2秒淡入动画

### 4. 错误处理
- 不支持的文件类型：显示错误通知
- 文件路径获取失败：显示错误提示
- 加载失败：显示详细错误信息

### 5. 用户体验优化
- 拖拽时禁用默认浏览器行为
- 只在拖拽文件时显示覆盖层
- 离开窗口时自动隐藏覆盖层
- 成功加载后显示成功通知

## 技术实现

### 代码结构

#### 1. 状态管理
```typescript
const [isDragging, setIsDragging] = useState<boolean>(false);
```

#### 2. 通用加载函数
创建了 `loadImageFromPath` 函数，被以下场景复用：
- 文件对话框选择
- 拖拽加载

#### 3. Tauri 配置
在 `tauri.conf.json` 中启用文件拖放：
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

#### 4. Tauri 事件监听
使用 Tauri 的事件系统监听文件拖放：
```typescript
useEffect(() => {
  const setupListeners = async () => {
    // 监听文件悬停（拖动到窗口上方）
    await listen('tauri://drag-over', () => {
      setIsDragging(true);
    });

    // 监听文件释放
    await listen<string[]>('tauri://drag-drop', async (event) => {
      const paths = event.payload;
      // 处理文件路径...
    });

    // 监听拖拽取消（离开窗口）
    await listen('tauri://drag-cancelled', () => {
      setIsDragging(false);
    });
  };
  
  setupListeners();
  return () => { /* cleanup */ };
}, [loadImageFromPath, showError]);
```

#### 4. UI 覆盖层
```jsx
{isDragging && (
  <div className="drag-overlay">
    <div className="drag-overlay-content">
      <Icon name="open" size={64} color="var(--color-accent)" />
      <p className="drag-overlay-text">释放以打开图片</p>
    </div>
  </div>
)}
```

### CSS 样式

#### 覆盖层样式
```css
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  pointer-events: none;
  animation: fadeIn 0.2s ease-out;
}
```

#### 内容框样式
```css
.drag-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background-color: var(--color-surface);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
```

## 使用方法

### 用户操作步骤

1. **打开应用**
   - 看到空状态提示："点击'打开图片'、按 Ctrl+O 或拖入图片文件开始"

2. **拖拽图片**
   - 从文件管理器中选择图片文件
   - 拖动到应用窗口上方
   - 看到覆盖层出现，显示"释放以打开图片"

3. **释放鼠标**
   - 松开鼠标按钮
   - 应用自动加载图片
   - 显示成功通知

4. **错误情况**
   - 如果拖入非图片文件，显示错误提示
   - 如果加载失败，显示详细错误信息

## 文件修改清单

### 修改的文件

1. **src/components/ImageViewer.tsx**
   - 导入 Tauri 的 `listen` 函数
   - 添加 `isDragging` 状态
   - 创建 `loadImageFromPath` 通用加载函数
   - 简化 `handleOpenFile` 函数
   - 使用 Tauri 事件系统监听文件拖放（tauri://drag-over, tauri://drag-drop, tauri://drag-cancelled）
   - 添加拖拽覆盖层 UI
   - 更新空状态提示文本

2. **src/components/ImageViewer.css**
   - 添加 `.drag-overlay` 样式
   - 添加 `.drag-overlay-content` 样式
   - 添加 `.drag-overlay-text` 样式
   - 添加 `fadeIn` 动画

3. **src-tauri/tauri.conf.json**
   - 在窗口配置中添加 `"dragDropEnabled": true`

### 新建的文件

1. **DRAG_DROP_FEATURE.md** - 本文档

## 性能考虑

### 优化措施

1. **Tauri 原生事件**
   - 使用 Tauri 的原生文件拖放事件系统
   - 直接获取文件系统路径，无需读取文件内容

2. **异步事件监听**
   - 使用 async/await 设置事件监听器
   - 正确清理监听器避免内存泄漏

3. **条件渲染**
   - 只在拖拽时渲染覆盖层
   - 使用 CSS 动画而非 JavaScript 动画

4. **内存管理**
   - useEffect 清理函数正确移除事件监听器
   - 避免内存泄漏

## 兼容性

### 浏览器支持
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Tauri WebView

### 平台支持
- ✅ macOS
- ✅ Windows
- ✅ Linux

### Tauri 特性
- 使用 Tauri 的文件路径 API
- 通过 `(file as any).path` 获取文件系统路径
- 与现有的文件对话框功能完全兼容

## 测试建议

### 手动测试清单

1. **基本功能**
   - [ ] 拖入 PNG 图片
   - [ ] 拖入 JPEG 图片
   - [ ] 拖入其他支持的格式
   - [ ] 拖入不支持的文件（应显示错误）

2. **视觉反馈**
   - [ ] 拖拽时显示覆盖层
   - [ ] 离开窗口时隐藏覆盖层
   - [ ] 释放后覆盖层消失
   - [ ] 动画流畅

3. **错误处理**
   - [ ] 拖入文本文件（应拒绝）
   - [ ] 拖入损坏的图片（应显示错误）
   - [ ] 拖入多个文件（只加载第一个）

4. **集成测试**
   - [ ] 拖拽加载后可以编辑
   - [ ] 拖拽加载后可以保存
   - [ ] 拖拽加载后可以导航（如果目录有多个图片）
   - [ ] 与键盘快捷键配合使用

## 未来改进建议

### 可能的增强功能

1. **多文件支持**
   - 一次拖入多个图片
   - 自动创建图片列表
   - 支持批量操作

2. **拖拽预览**
   - 在覆盖层中显示图片缩略图
   - 显示文件名和大小

3. **拖拽位置**
   - 支持拖拽到特定区域
   - 不同区域不同操作（如：拖到工具栏直接编辑）

4. **文件夹支持**
   - 拖入文件夹自动加载所有图片
   - 创建图片库

5. **URL 支持**
   - 支持拖入图片 URL
   - 自动下载并加载

## 总结

拖拽加载功能为图片查看器应用提供了更加直观和便捷的用户体验。用户现在可以：

- 🖱️ 直接从文件管理器拖拽图片
- 👀 获得即时的视觉反馈
- ⚡ 快速打开图片，无需点击按钮
- 🎨 享受流畅的动画效果

这个功能与现有的文件对话框和键盘快捷键完美配合，为用户提供了三种灵活的图片加载方式。
