# 拖拽重复通知调试

## 问题描述
拖拽加载图片时，同时显示两个"加载成功"通知。

## 调试方法

### 添加的日志
1. **Drop 事件计数器** - 追踪 drop 事件触发次数
2. **loadImageFromPath 调用 ID** - 每次调用生成唯一 ID
3. **showNotification 参数追踪** - 记录参数值
4. **showSuccess 调用追踪** - 记录所有调用位置

### 预期行为
拖拽加载时应该看到：
```
Drag event #N: { type: 'drop', paths: [...] }
[abc123] loadImageFromPath called with: { filePath: '...', showNotification: false }
[abc123] showNotification flag: false
[abc123] Skipping notification (showNotification=false)
Image loaded successfully
About to show notification for: image.png
Notification shown
```

### 可能的问题原因

#### 1. Drop 事件触发两次
**症状：** 看到两个 "Drag event #N: { type: 'drop' }"
**解决：** 已添加 `isProcessingDrop` 标志防止并发处理

#### 2. loadImageFromPath 被调用两次
**症状：** 看到两个不同的 callId
**原因：** 可能是函数被重新创建或事件监听器注册了多次
**解决：** 检查 useEffect 依赖数组

#### 3. showNotification 参数未生效
**症状：** 看到 `showNotification flag: true` 而不是 `false`
**原因：** 参数传递错误
**解决：** 检查函数调用

#### 4. showSuccess 被调用两次
**症状：** 看到两次 "About to show notification"
**原因：** Promise 回调执行了多次
**解决：** 添加防重复逻辑

## 测试步骤

1. 打开开发者工具控制台
2. 拖拽一个图片文件到应用窗口
3. 观察控制台输出
4. 检查通知数量

## 当前实现的防护措施

1. **时间窗口去重** - 1秒内相同文件路径只处理一次
2. **处理标志** - `isProcessingDrop` 防止并发处理
3. **参数控制** - `showNotification=false` 禁用内部通知
4. **手动通知** - 在 Promise 回调中显示通知

## 问题诊断结果

### 日志分析
```
[l3yndq] loadImageFromPath called with: { showNotification: false }
[l3yndq] Skipping notification (showNotification=false)
Image loaded successfully
About to show notification for: "image.png"
Notification shown
[9e0poh] showNotification flag: false
[9e0poh] Skipping notification (showNotification=false)
Image loaded successfully
About to show notification for: "image.png"
Notification shown
```

**关键发现：**
- Drop 事件只触发了 1 次
- `loadImageFromPath` 被调用了 2 次（两个不同的 callId）
- 两次调用都正确传递了 `showNotification: false`
- 但 Promise 回调执行了 2 次，导致 2 个通知

### 根本原因

**函数闭包问题：**
1. `loadImageFromPath` 的依赖数组包含 `showSuccess` 和 `showError`
2. 这两个函数来自 `useNotification` hook，可能会变化
3. 当它们变化时，`loadImageFromPath` 被重新创建
4. 拖拽事件监听器的 useEffect 有空依赖数组 `[]`
5. 旧的监听器仍然持有旧版本的 `loadImageFromPath`
6. 新旧两个版本的函数都被调用，导致重复

## 解决方案

使用 `useRef` 存储通知函数，避免 `loadImageFromPath` 依赖它们：

```typescript
// 1. 创建 refs 存储通知函数
const showSuccessRef = useRef(showSuccess);
const showErrorRef = useRef(showError);

// 2. 更新 refs
useEffect(() => {
  showSuccessRef.current = showSuccess;
  showErrorRef.current = showError;
}, [showSuccess, showError]);

// 3. 在 loadImageFromPath 中使用 ref
showSuccessRef.current('加载成功', `已打开 ${fileName}`);

// 4. 从依赖数组中移除 showSuccess 和 showError
}, [
  setLoading,
  clearError,
  setCurrentImage,
  addToHistory,
  setDirectoryImages,
  setCurrentImageIndex,
  setError,
  // showSuccess, showError 已移除
]);
```

这样 `loadImageFromPath` 函数就不会因为通知函数变化而重新创建，拖拽监听器始终使用同一个版本。
