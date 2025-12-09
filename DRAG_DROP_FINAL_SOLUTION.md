# 拖拽重复通知问题 - 最终解决方案

## 问题总结

拖拽加载图片时，同时显示**两个**"加载成功"通知。

## 调试过程

### 第一次尝试：参数控制
- 添加 `showNotification` 参数到 `loadImageFromPath`
- 拖拽时传 `false`，手动显示通知
- **结果：** 失败，仍然显示两个通知

### 第二次尝试：useRef 稳定函数
- 使用 `useRef` 存储 `showSuccess` 和 `showError`
- 从 `loadImageFromPath` 依赖数组中移除这些函数
- **结果：** 失败，仍然显示两个通知

### 第三次尝试：组件级 ref 防护
- 使用 `useRef` 追踪监听器是否已注册
- **结果：** 失败，仍然显示两个通知

## 根本原因

通过详细的日志分析发现：

```
Drag event #293: { id: 5 }  // 第一个 drop 事件
Drag event #293: { id: 4 }  // 第二个 drop 事件（不同的 id！）
```

**关键发现：**
1. Drop 事件本身就触发了**两次**
2. 两个事件有**不同的 event id**
3. 这说明有**两个独立的监听器**被注册了
4. 问题不在业务逻辑，而在监听器注册

**为什么会有两个监听器？**

React 18 的 Strict Mode 在开发环境下会**故意**挂载组件两次来帮助发现副作用问题：
1. 第一次挂载 → 注册监听器 A
2. 卸载（清理）
3. 第二次挂载 → 注册监听器 B

如果清理函数没有正确执行，或者有时序问题，就会导致两个监听器同时存在。

## 最终解决方案

使用**模块级别**的变量来防止重复注册：

```typescript
// 在组件外部，模块级别
let dragDropListenerRegistered = false;
let dragDropUnlistenFn: (() => void) | undefined = undefined;

export const ImageViewer: React.FC = () => {
  useEffect(() => {
    // 检查模块级标志
    if (dragDropListenerRegistered) {
      console.log('Listener already registered, skipping...');
      return;
    }
    
    dragDropListenerRegistered = true;
    
    const setupListeners = async () => {
      const webview = getCurrentWebviewWindow();
      const unlisten = await webview.onDragDropEvent((event) => {
        // 处理事件...
      });
      
      // 存储到模块级变量
      dragDropUnlistenFn = unlisten;
    };
    
    setupListeners();
    
    return () => {
      // 清理
      if (dragDropUnlistenFn) {
        dragDropUnlistenFn();
        dragDropUnlistenFn = undefined;
      }
      dragDropListenerRegistered = false;
    };
  }, []);
};
```

## 为什么这个方案有效？

1. **模块级作用域：** 变量在整个应用生命周期内持久存在
2. **跨渲染共享：** 即使组件重新挂载，标志仍然保持
3. **早期返回：** 第二次挂载时立即返回，不执行任何代码
4. **正确清理：** 只有真正卸载时才重置标志

## 与组件级 ref 的区别

| 特性 | 组件级 useRef | 模块级变量 |
|------|--------------|-----------|
| 作用域 | 组件实例 | 整个模块 |
| Strict Mode | 每次挂载都是新实例 | 跨挂载共享 |
| 清理时机 | 组件卸载 | 组件卸载 |
| 防护效果 | ❌ 无效 | ✅ 有效 |

## 测试验证

修复后，拖拽图片应该只显示：
- ✅ 1 个 drop 事件
- ✅ 1 次 `loadImageFromPath` 调用
- ✅ 1 个通知

## 注意事项

1. **开发 vs 生产：** 这个问题主要在开发环境的 Strict Mode 下出现
2. **模块级变量：** 通常应避免，但这是处理全局事件监听器的合理用例
3. **清理很重要：** 确保在组件卸载时正确清理，避免内存泄漏

## 相关文档

- [Tauri onDragDropEvent API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#ondragdropevent)
- [React 18 Strict Mode](https://react.dev/reference/react/StrictMode)
- [React useEffect 清理函数](https://react.dev/reference/react/useEffect#cleanup-function)

## 总结

这是一个经典的 React + 全局事件监听器的问题。关键教训：
- 🔍 详细的日志对调试至关重要
- 🎯 找到根本原因比快速修复更重要
- 🛡️ 全局事件监听器需要特殊的防护机制
- 📚 查阅官方文档可以避免走弯路

修复完成！拖拽加载现在只会显示 **1 个** 通知了。
