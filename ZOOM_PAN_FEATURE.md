# 图片缩放和平移功能

## 功能描述
为图片查看器添加滚轮/触控板缩放和拖动平移功能，让用户可以放大查看图片细节，并在放大后拖动改变图片位置。

## 实现内容

### 1. 创建useImageZoom Hook

#### 功能特性
- **滚轮缩放**：使用鼠标滚轮或触控板进行缩放
- **智能缩放中心**：缩放以鼠标光标位置为中心
- **拖动平移**：放大后可以拖动图片查看不同区域
- **缩放限制**：最小0.5倍，最大5倍
- **自动重置**：缩放到1倍或以下时自动重置位置

#### 接口定义
```typescript
interface UseImageZoomOptions {
  minZoom?: number;      // 最小缩放倍数，默认0.1
  maxZoom?: number;      // 最大缩放倍数，默认10
  zoomStep?: number;     // 缩放步长，默认0.1
}

interface UseImageZoomReturn {
  zoom: number;                              // 当前缩放倍数
  position: { x: number; y: number };        // 当前平移位置
  isDragging: boolean;                       // 是否正在拖动
  handleWheel: (e: React.WheelEvent) => void;        // 滚轮事件处理
  handleMouseDown: (e: React.MouseEvent) => void;    // 鼠标按下处理
  resetZoom: () => void;                     // 重置缩放
  zoomIn: () => void;                        // 放大
  zoomOut: () => void;                       // 缩小
}
```

#### 核心逻辑

**滚轮缩放**
```typescript
const handleWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault();
  
  const delta = -e.deltaY;
  const zoomChange = delta > 0 ? zoomStep : -zoomStep;
  
  setZoom((prevZoom) => {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, prevZoom + zoomChange));
    
    // 以鼠标位置为中心缩放
    if (newZoom !== prevZoom) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomRatio = newZoom / prevZoom;
      
      setPosition((prevPos) => ({
        x: mouseX - (mouseX - prevPos.x) * zoomRatio,
        y: mouseY - (mouseY - prevPos.y) * zoomRatio,
      }));
    }
    
    return newZoom;
  });
}, [minZoom, maxZoom, zoomStep]);
```

**拖动平移**
```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // 只在放大时允许拖动
  if (zoom <= 1) return;
  
  e.preventDefault();
  setIsDragging(true);
  dragStartRef.current = { x: e.clientX, y: e.clientY };
  initialPositionRef.current = position;
}, [zoom, position]);
```

### 2. 更新ImageViewer组件

#### 集成zoom hook
```typescript
const {
  zoom,
  position,
  isDragging: isImageDragging,
  handleWheel,
  handleMouseDown: handleImageMouseDown,
  resetZoom,
  zoomIn,
  zoomOut,
} = useImageZoom({ minZoom: 0.5, maxZoom: 5, zoomStep: 0.2 });
```

#### 应用到图片容器
```typescript
<div 
  className="image-container"
  onWheel={handleWheel}
  onMouseDown={handleImageMouseDown}
  style={{
    cursor: zoom > 1 ? (isImageDragging ? 'grabbing' : 'grab') : 'default',
    overflow: zoom > 1 ? 'hidden' : 'visible',
  }}
>
  <img
    style={{
      width: `${state.currentImage.width * imageScale * zoom}px`,
      height: `${state.currentImage.height * imageScale * zoom}px`,
      transform: `translate(${position.x}px, ${position.y}px)`,
      transition: isImageDragging ? 'none' : 'transform 0.1s ease-out',
    }}
    draggable={false}
  />
</div>
```

#### 加载新图片时重置缩放
```typescript
// 在loadImageFromPath中
setCurrentImage(imageData);
addToHistory(imageData);
resetZoom(); // 重置缩放
```

### 3. 添加缩放控制UI

#### 缩放控制按钮
```typescript
<div className="zoom-controls">
  <button onClick={zoomOut} disabled={zoom <= 0.5}>
    <Icon name="minus" size={20} />
  </button>
  <span className="zoom-level">{Math.round(zoom * 100)}%</span>
  <button onClick={zoomIn} disabled={zoom >= 5}>
    <Icon name="plus" size={20} />
  </button>
  <button onClick={resetZoom} disabled={zoom === 1}>
    <Icon name="reset" size={20} />
  </button>
</div>
```

#### 位置和样式
- 位置：右下角
- 显示：当前缩放百分比
- 按钮：放大、缩小、重置
- 禁用状态：达到最大/最小缩放时禁用相应按钮

### 4. 创建缩放图标

#### ZoomInIcon（放大）
- 放大镜 + 加号

#### ZoomOutIcon（缩小）
- 放大镜 + 减号

#### ResetZoomIcon（重置）
- 放大镜 + 重置箭头

### 5. CSS样式

#### 缩放控制样式
```css
.zoom-controls {
  position: absolute;
  bottom: var(--spacing-xl);
  right: var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  z-index: 10;
}
```

#### 光标样式
- 默认：`default`
- 放大时：`grab`
- 拖动时：`grabbing`

## 用户交互

### 缩放操作
1. **滚轮缩放**：
   - 向上滚动：放大
   - 向下滚动：缩小
   - 以鼠标位置为中心缩放

2. **按钮缩放**：
   - 点击"+"按钮：放大
   - 点击"-"按钮：缩小
   - 点击重置按钮：恢复到100%

### 平移操作
1. **拖动平移**（仅在放大时）：
   - 按住鼠标左键拖动
   - 光标变为"抓手"图标
   - 拖动时光标变为"抓取"图标

### 自动行为
1. **加载新图片**：自动重置缩放到100%
2. **缩放到100%或以下**：自动重置位置到中心
3. **达到缩放限制**：禁用相应的缩放按钮

## 技术细节

### 性能优化
1. **GPU加速**：
   - 使用`transform`而不是`left/top`
   - 添加`will-change`提示
   - 使用`translateZ(0)`触发GPU加速

2. **平滑过渡**：
   - 拖动时禁用过渡动画
   - 释放后启用平滑过渡

3. **事件优化**：
   - 使用`useCallback`避免重复创建函数
   - 使用`useRef`存储拖动状态

### 坐标计算
```typescript
// 缩放中心计算
const rect = e.currentTarget.getBoundingClientRect();
const mouseX = e.clientX - rect.left;
const mouseY = e.clientY - rect.top;

const zoomRatio = newZoom / prevZoom;

setPosition((prevPos) => ({
  x: mouseX - (mouseX - prevPos.x) * zoomRatio,
  y: mouseY - (mouseY - prevPos.y) * zoomRatio,
}));
```

### 缩放范围
- 最小：50%（0.5倍）
- 最大：500%（5倍）
- 步长：20%（0.2倍）

## 修改的文件

### 新增文件
- `src/hooks/useImageZoom.ts` - 缩放和平移hook
- `src/components/icons/ZoomInIcon.tsx` - 放大图标
- `src/components/icons/ZoomOutIcon.tsx` - 缩小图标
- `src/components/icons/ResetZoomIcon.tsx` - 重置图标

### 修改文件
- `src/components/ImageViewer.tsx` - 集成缩放功能
- `src/components/ImageViewer.css` - 添加缩放控制样式
- `src/components/icons/index.ts` - 导出新图标

## 用户体验改进

1. **直观的缩放**：
   - 滚轮缩放符合用户习惯
   - 以鼠标位置为中心，精确控制

2. **流畅的拖动**：
   - 放大后可以拖动查看细节
   - 光标变化提供视觉反馈

3. **清晰的状态**：
   - 显示当前缩放百分比
   - 按钮禁用状态明确

4. **智能重置**：
   - 加载新图片自动重置
   - 缩小到100%自动居中

## 响应式设计

移动端适配：
- 缩放控制按钮变小
- 位置调整到合适位置
- 支持触摸手势（浏览器原生）

## 测试建议

1. 测试滚轮缩放功能
2. 测试以鼠标位置为中心缩放
3. 测试放大后的拖动功能
4. 测试缩放按钮功能
5. 测试重置功能
6. 测试加载新图片时的自动重置
7. 测试缩放限制（最小/最大）
8. 测试光标变化
9. 测试响应式布局
10. 测试性能（大图片缩放）
