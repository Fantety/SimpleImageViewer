# 拖拽重复通知问题 - 最终修复

## 问题描述
拖拽加载图片时，同时显示两个"加载成功"通知。

## 问题诊断

### 日志分析
通过添加详细的调试日志，发现：
```
Drag event #142: { type: 'drop' }  // 只触发 1 次
[l3yndq] loadImageFromPath called   // 第 1 次调用
[9e0poh] loadImageFromPath called   // 第 2 次调用（不同的 callId！）
```

**关键发现：**
- Drop 事件只触发了 **1 次**
- `loadImageFromPath` 函数被调用了 **2 次**
- 两次调用都有不同的 callId，说明是不同的函数实例

### 根本原因

**React useCallback 闭包陷阱：**

1. `loadImageFromPath` 使用 `useCallback` 定义，依赖数组包含：
   ```typescript
   }, [
     setLoading,
     clearError,
     setCurrentImage,
     addToHistory,
     setDirectoryImages,
     setCurrentImageIndex,
     setError,
     showSuccess,  // ← 问题所在
     showError,    // ← 问题所在
   ]);
   ```

2. `showSuccess` 和 `showError` 来自 `useNotification` hook，可能会在组件重新渲染时变化

3. 当这些函数变化时，`loadImageFromPath` 被重新创建（新的函数实例）

4. 拖拽事件监听器的 useEffect 有**空依赖数组** `[]`：
   ```typescript
   useEffect(() => {
     // 设置监听器，捕获当前的 loadImageFromPath
     setupListeners();
   }, []); // 空数组 = 只在挂载时运行一次
   ```

5. **问题核心：** 旧的事件监听器仍然持有旧版本的 `loadImageFromPath`，而新的代码路径使用新版本

6. 结果：拖拽时，新旧两个版本的 `loadImageFromPath` 都被调用，导致重复通知

## 解决方案

### 使用 useRef 稳定函数引用

通过 `useRef` 存储通知函数，使 `loadImageFromPath` 不再依赖它们：

```typescript
// 1. 创建 refs 存储通知函数
const showSuccessRef = useRef(showSuccess);
const showErrorRef = useRef(showError);

// 2. 在单独的 useEffect 中更新 refs（当函数变化时）
useEffect(() => {
  showSuccessRef.current = showSuccess;
  showErrorRef.current = showError;
}, [showSuccess, showError]);

// 3. 在 loadImageFromPath 中使用 ref.current
const loadImageFromPath = useCallback(async (filePath: string, showNotification: boolean = true) => {
  // ...
  if (showNotification) {
    showSuccessRef.current('加载成功', `已打开 ${fileName}`);  // 使用 ref
  }
  // ...
  showErrorRef.current('加载失败', errorMessage);  // 使用 ref
}, [
  setLoading,
  clearError,
  setCurrentImage,
  addToHistory,
  setDirectoryImages,
  setCurrentImageIndex,
  setError,
  // showSuccess 和 showError 已从依赖数组中移除
]);

// 4. 在拖拽处理器中也使用 ref
showSuccessRef.current('加载成功', `已打开 ${fileName}`);
showErrorRef.current('不支持的文件', '...');
```

### 为什么这样有效？

1. **稳定的函数引用：** `loadImageFromPath` 不再依赖会变化的 `showSuccess` 和 `showError`
2. **单一实例：** 整个组件生命周期中只有一个 `loadImageFromPath` 实例
3. **动态访问：** 通过 `ref.current` 始终访问最新的通知函数
4. **无闭包陷阱：** 事件监听器捕获的函数不会过时

## 修改的文件

### src/components/ImageViewer.tsx

**添加的代码：**
```typescript
// 在组件顶部添加 refs
const showSuccessRef = useRef(showSuccess);
const showErrorRef = useRef(showError);

// 添加 useEffect 更新 refs
useEffect(() => {
  showSuccessRef.current = showSuccess;
  showErrorRef.current = showError;
}, [showSuccess, showError]);
```

**修改的地方：**
1. `loadImageFromPath` 函数内：`showSuccess` → `showSuccessRef.current`
2. `loadImageFromPath` 函数内：`showError` → `showErrorRef.current`
3. `loadImageFromPath` 依赖数组：移除 `showSuccess` 和 `showError`
4. 拖拽处理器内：`showSuccess` → `showSuccessRef.current`
5. 拖拽处理器内：`showError` → `showErrorRef.current`

## 测试验证

### 预期行为
拖拽图片后，控制台应该显示：
```
Drag event #N: { type: 'drop' }
[abc123] loadImageFromPath called with: { showNotification: false }
[abc123] Skipping notification (showNotification=false)
Image loaded successfully
About to show notification for: "image.png"
Notification shown
```

**关键点：**
- 只有 **1 个** callId（只调用一次）
- 只显示 **1 个** "About to show notification"
- 只显示 **1 个** 通知

### 测试步骤
1. 打开应用
2. 打开开发者工具控制台
3. 拖拽一个图片文件到应用窗口
4. 确认只显示 1 个通知
5. 检查控制台日志确认只有 1 次调用

## 技术要点

### React Hooks 最佳实践

**问题模式（避免）：**
```typescript
const callback = useCallback(() => {
  externalFunction(); // 如果这个函数会变化
}, [externalFunction]); // 会导致 callback 频繁重新创建
```

**解决模式（推荐）：**
```typescript
const externalFunctionRef = useRef(externalFunction);

useEffect(() => {
  externalFunctionRef.current = externalFunction;
}, [externalFunction]);

const callback = useCallback(() => {
  externalFunctionRef.current(); // 始终调用最新版本
}, []); // 稳定的依赖数组
```

### 何时使用这个模式？

1. **事件监听器** - 需要在组件生命周期内保持稳定
2. **定时器回调** - setTimeout/setInterval 的回调
3. **第三方库回调** - 传递给外部库的回调函数
4. **优化性能** - 避免不必要的函数重新创建

## 总结

这是一个经典的 React Hooks 闭包问题。通过使用 `useRef` 模式，我们：
- ✅ 保持了 `loadImageFromPath` 函数的稳定性
- ✅ 避免了事件监听器捕获过时的函数
- ✅ 解决了重复通知的问题
- ✅ 保持了代码的可维护性

修复后，拖拽加载图片只会显示 **1 个** 通知！
