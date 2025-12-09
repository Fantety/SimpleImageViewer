# Resize功能添加百分比调节

## 功能描述
为ResizeDialog添加百分比调节模式，用户可以选择使用像素或百分比来调整图片尺寸。

## 实现内容

### 1. 模式切换
添加两种调整模式：
- **像素模式**：直接输入宽度和高度的像素值（原有功能）
- **百分比模式**：输入缩放百分比，自动计算新的尺寸

### 2. UI改进

#### 模式选择器
```tsx
<div className="resize-mode-selector">
  <button className={`mode-button ${mode === 'pixels' ? 'active' : ''}`}>
    像素
  </button>
  <button className={`mode-button ${mode === 'percentage' ? 'active' : ''}`}>
    百分比
  </button>
</div>
```

#### 像素模式界面
- 宽度输入框
- 高度输入框
- 保持宽高比复选框

#### 百分比模式界面
- 缩放比例输入框（%）
- 新尺寸预览（自动计算）
- 保持宽高比复选框（禁用，因为百分比缩放自动保持比例）

### 3. 核心逻辑

#### 百分比转换
```typescript
useEffect(() => {
  if (mode === 'percentage' && percentage) {
    const percentNum = parseFloat(percentage);
    if (!isNaN(percentNum) && percentNum > 0) {
      const newWidth = Math.round(currentWidth * (percentNum / 100));
      const newHeight = Math.round(currentHeight * (percentNum / 100));
      setWidth(newWidth.toString());
      setHeight(newHeight.toString());
    }
  }
}, [percentage, mode, currentWidth, currentHeight]);
```

#### 模式切换处理
```typescript
const handleModeChange = (newMode: ResizeMode) => {
  setMode(newMode);
  setError(null);
  
  // 切换到百分比模式时，计算当前百分比
  if (newMode === 'percentage') {
    const widthNum = parseInt(width, 10);
    if (!isNaN(widthNum) && widthNum > 0) {
      const percent = Math.round((widthNum / currentWidth) * 100);
      setPercentage(percent.toString());
    }
  }
};
```

### 4. CSS样式

#### 模式选择器样式
```css
.resize-mode-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background-color: var(--color-background);
  border-radius: 6px;
}

.mode-button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.mode-button.active {
  background-color: var(--color-accent);
  color: white;
}
```

#### 预览尺寸样式
```css
.preview-dimensions {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--color-background);
  border-radius: 4px;
  border: 1px solid var(--color-border);
}
```

### 5. 用户体验优化

1. **智能模式切换**：
   - 从像素模式切换到百分比模式时，自动计算当前的缩放百分比
   - 保持用户已输入的尺寸信息

2. **实时预览**：
   - 百分比模式下，实时显示计算后的新尺寸
   - 用户可以直观看到缩放效果

3. **自动保持比例**：
   - 百分比模式下自动保持宽高比
   - 禁用"保持宽高比"复选框，避免混淆

4. **中文界面**：
   - 所有文本都使用中文
   - 更符合用户习惯

### 6. 常见使用场景

#### 场景1：缩小到50%
1. 选择"百分比"模式
2. 输入 50
3. 查看预览尺寸
4. 点击"保存"或"保存副本"

#### 场景2：放大到200%
1. 选择"百分比"模式
2. 输入 200
3. 查看预览尺寸
4. 点击"保存"或"保存副本"

#### 场景3：精确像素调整
1. 选择"像素"模式
2. 输入具体的宽度和高度
3. 选择是否保持宽高比
4. 点击"保存"或"保存副本"

## 技术细节

### 状态管理
```typescript
const [mode, setMode] = useState<ResizeMode>('pixels');
const [percentage, setPercentage] = useState<string>('100');
```

### 验证逻辑
```typescript
if (mode === 'percentage') {
  const percentNum = parseFloat(percentage);
  if (isNaN(percentNum) || percentNum <= 0) {
    setError('百分比必须是正数');
    return;
  }
}
```

### 计算精度
- 使用 `Math.round()` 确保计算结果为整数像素
- 百分比支持小数（如 50.5%）

## 修改的文件
- `src/components/ResizeDialog.tsx`
- `src/components/ResizeDialog.css`

## 优势

1. **更直观**：百分比缩放比计算像素更容易理解
2. **更快捷**：常见的缩放操作（50%、200%等）可以快速完成
3. **更灵活**：同时支持像素和百分比两种方式
4. **更友好**：实时预览让用户清楚知道结果

## 测试建议

1. 测试像素模式的所有功能（保持原有功能不变）
2. 测试百分比模式的缩放计算是否准确
3. 测试模式切换时的状态保持
4. 测试边界情况（0%、负数、非常大的百分比等）
5. 测试实时预览是否正确更新
6. 测试保存和保存副本功能是否正常
