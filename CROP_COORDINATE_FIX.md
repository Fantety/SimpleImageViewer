# 裁剪功能坐标修复

## 问题描述
裁剪功能存在以下问题：
1. UI显示的裁剪区域和实际的裁剪区域不一致
2. UI可以裁剪的区域边界和显示的图片不一致
3. 裁剪的边界靠左了许多
4. 实际被裁剪的区域在显示的区域上又靠左了一些

## 根本原因
原来的实现中，裁剪区域的坐标系统存在混淆：
1. **初始化时**：cropRegion使用的是图片的实际像素坐标（imageData.width * 0.1）
2. **渲染时**：直接使用cropRegion的值作为CSS像素，没有考虑图片的缩放和偏移
3. **拖动时**：鼠标移动的像素直接加到cropRegion上，没有转换坐标系
4. **提交时**：又将cropRegion除以scale转换回图片坐标

这导致了多重坐标系混乱。

## 解决方案

### 1. 统一坐标系统
**cropRegion始终使用图片的实际像素坐标**（0到imageData.width/height）

### 2. 添加getImageBounds函数
```typescript
const getImageBounds = () => {
  // 计算图片在容器中的位置和缩放比例
  const displayWidth = img.clientWidth;
  const scale = displayWidth / imageData.width;
  
  // 计算图片相对于容器的偏移
  const imgRect = img.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offsetX = imgRect.left - containerRect.left;
  const offsetY = imgRect.top - containerRect.top;
  
  return { offsetX, offsetY, scale, displayWidth, displayHeight };
};
```

### 3. 渲染时转换坐标
```typescript
// 将图片坐标转换为显示坐标
<div
  className="crop-selection"
  style={{
    left: `${offsetX + cropRegion.x * scale}px`,
    top: `${offsetY + cropRegion.y * scale}px`,
    width: `${cropRegion.width * scale}px`,
    height: `${cropRegion.height * scale}px`,
  }}
/>
```

### 4. 拖动时转换鼠标移动
```typescript
// 将鼠标移动从屏幕像素转换为图片像素
const dx = (e.clientX - dragStart.x) / scale;
const dy = (e.clientY - dragStart.y) / scale;
```

### 5. 提交时直接使用cropRegion
```typescript
// cropRegion已经是图片坐标，直接使用
await onConfirm(
  Math.round(cropRegion.x),
  Math.round(cropRegion.y),
  Math.round(cropRegion.width),
  Math.round(cropRegion.height),
  saveAsCopy
);
```

### 6. 约束函数简化
```typescript
const constrainRegion = (region: CropRegion): CropRegion => {
  // 直接使用图片的实际尺寸约束
  return {
    x: Math.max(0, Math.min(region.x, imageData.width - 1)),
    y: Math.max(0, Math.min(region.y, imageData.height - 1)),
    width: Math.max(1, Math.min(region.width, imageData.width - region.x)),
    height: Math.max(1, Math.min(region.height, imageData.height - region.y)),
  };
};
```

### 7. 简化CSS
移除了复杂的四个暗色遮罩层（crop-overlay-top/bottom/left/right），改用box-shadow实现遮罩效果：
```css
.crop-selection {
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}
```

## 修改的文件
- `src/components/CropDialog.tsx`
- `src/components/CropDialog.css`

## 技术要点

### 坐标系统
- **图片坐标**：cropRegion使用的坐标系，范围是[0, imageData.width] x [0, imageData.height]
- **显示坐标**：CSS像素坐标，需要考虑图片的缩放(scale)和偏移(offsetX, offsetY)

### 转换公式
- 图片坐标 → 显示坐标：`displayX = offsetX + imageX * scale`
- 鼠标移动 → 图片坐标变化：`deltaImageX = deltaScreenX / scale`

### 关键改进
1. **单一数据源**：cropRegion始终是图片坐标，避免混淆
2. **清晰的转换点**：只在渲染和鼠标事件处理时转换坐标
3. **准确的边界计算**：使用getBoundingClientRect获取精确的图片位置
4. **简化的CSS**：使用box-shadow替代复杂的遮罩层

## 测试验证
1. 裁剪框应该完全覆盖在图片上
2. 拖动裁剪框时，边界应该与图片边界对齐
3. 调整裁剪框大小时，应该精确响应鼠标移动
4. 最终裁剪的结果应该与UI显示的区域完全一致

## 预期效果
- ✅ 裁剪框准确显示在图片上
- ✅ 裁剪框边界与图片边界对齐
- ✅ 拖动和调整大小响应准确
- ✅ 实际裁剪结果与UI显示一致
