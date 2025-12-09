# 图片旋转功能

## 功能描述
在工具栏添加图片旋转按钮，支持顺时针和逆时针旋转90度。由于旋转是可逆操作且不会造成图像信息损失，点击旋转后直接保存覆盖原图。

## 实现内容

### 1. Rust后端实现

#### rotate_image函数
```rust
async fn rotate_image(
    image_data: ImageData,
    clockwise: bool,
) -> Result<ImageData, String>
```

**功能**：
- 支持顺时针（90°）和逆时针（270°）旋转
- 使用image crate的`rotate90()`和`rotate270()`方法
- 自动交换宽度和高度
- 保持原有图片格式和透明度

**实现细节**：
```rust
let rotated = if clockwise {
    img.rotate90()
} else {
    img.rotate270()
};
```

### 2. 前端API封装

#### rotateImage函数
```typescript
export async function rotateImage(
  imageData: ImageData,
  clockwise: boolean
): Promise<ImageData>
```

**特性**：
- 确保不可变性：创建原始数据快照并验证
- 调用Rust后端的rotate_image命令
- 返回新的ImageData对象

### 3. 旋转图标

#### RotateLeftIcon（逆时针）
- Material Design风格
- 箭头指向逆时针方向
- 使用`fill="currentColor"`适配主题

#### RotateRightIcon（顺时针）
- Material Design风格
- 箭头指向顺时针方向
- 使用`fill="currentColor"`适配主题

### 4. Toolbar组件更新

#### 新增按钮
```typescript
<button onClick={onRotateLeft} title="逆时针旋转90° - 旋转后自动保存">
  <Icon name="rotate-left" size={20} />
  <span>逆时针</span>
</button>

<button onClick={onRotateRight} title="顺时针旋转90° - 旋转后自动保存">
  <Icon name="rotate-right" size={20} />
  <span>顺时针</span>
</button>
```

**位置**：
- 在背景设置按钮之后
- 添加分隔线与其他编辑功能区分
- 两个旋转按钮并排显示

### 5. ImageViewer处理逻辑

#### handleRotateLeft（逆时针）
```typescript
const handleRotateLeft = useCallback(async () => {
  // 1. 旋转图片（逆时针90°）
  const rotatedImage = await rotateImage(state.currentImage, false);
  
  // 2. 自动保存到原路径
  await saveImage(rotatedImage, state.currentImage.path);
  
  // 3. 更新状态
  setCurrentImage(rotatedImage);
  addToHistory(rotatedImage);
  
  // 4. 显示成功通知
  showSuccess('旋转成功', '图片已逆时针旋转90°并保存');
}, [dependencies]);
```

#### handleRotateRight（顺时针）
```typescript
const handleRotateRight = useCallback(async () => {
  // 1. 旋转图片（顺时针90°）
  const rotatedImage = await rotateImage(state.currentImage, true);
  
  // 2. 自动保存到原路径
  await saveImage(rotatedImage, state.currentImage.path);
  
  // 3. 更新状态
  setCurrentImage(rotatedImage);
  addToHistory(rotatedImage);
  
  // 4. 显示成功通知
  showSuccess('旋转成功', '图片已顺时针旋转90°并保存');
}, [dependencies]);
```

## 用户交互

### 操作流程
1. 用户点击"逆时针"或"顺时针"按钮
2. 显示加载进度（旋转图片...）
3. 自动保存到原文件
4. 更新显示的图片
5. 显示成功通知

### 无需确认
- 旋转是可逆操作（可以通过反向旋转恢复）
- 不会造成图像质量损失
- 操作简单快速，不需要额外确认步骤

### 与其他功能的区别
| 功能 | 保存方式 | 原因 |
|------|---------|------|
| 旋转 | 直接覆盖 | 可逆操作，无信息损失 |
| 裁剪 | 需要选择 | 不可逆，会丢失图像数据 |
| 调整尺寸 | 需要选择 | 可能降低质量 |
| 格式转换 | 需要选择 | 可能改变文件特性 |
| 背景设置 | 需要选择 | 不可逆，改变透明度 |

## 技术细节

### 旋转算法
- 使用image crate的内置旋转方法
- 高效的像素重排，无质量损失
- 自动处理所有图片格式

### 尺寸变化
```rust
// 旋转后宽高互换
Ok(ImageData {
    width: rotated.width(),   // 原height
    height: rotated.height(), // 原width
    // ...
})
```

### 进度指示
```typescript
setLoadingProgress(30);  // 开始旋转
// ... 旋转操作
setLoadingProgress(60);  // 旋转完成
// ... 保存操作
setLoadingProgress(80);  // 保存完成
// ... 更新状态
setLoadingProgress(100); // 全部完成
```

### 错误处理
- 捕获旋转失败
- 捕获保存失败
- 显示错误通知
- 记录错误日志

## 修改的文件

### 新增文件
- `src/components/icons/RotateLeftIcon.tsx` - 逆时针图标
- `src/components/icons/RotateRightIcon.tsx` - 顺时针图标

### 修改文件
- `src-tauri/src/lib.rs` - 添加rotate_image函数
- `src/api/tauri.ts` - 添加rotateImage API
- `src/components/Toolbar.tsx` - 添加旋转按钮
- `src/components/ImageViewer.tsx` - 添加旋转处理逻辑
- `src/components/icons/index.ts` - 导出旋转图标

## 用户体验优势

1. **快速操作**：
   - 一键旋转并保存
   - 无需额外确认步骤
   - 立即看到结果

2. **安全可靠**：
   - 无质量损失
   - 可逆操作（可以反向旋转）
   - 自动保存，不会忘记

3. **清晰反馈**：
   - 加载进度指示
   - 成功/失败通知
   - 明确的按钮标签和提示

4. **符合直觉**：
   - 图标清晰表达方向
   - 按钮位置合理
   - 操作简单直接

## 测试建议

1. 测试顺时针旋转功能
2. 测试逆时针旋转功能
3. 测试连续旋转（4次应回到原状态）
4. 测试不同格式图片的旋转
5. 测试透明图片的旋转
6. 测试大图片的旋转性能
7. 测试旋转后的保存
8. 测试错误处理（权限问题等）
9. 验证尺寸正确交换
10. 验证图片质量无损失

## 性能考虑

- 旋转操作在Rust后端执行，性能优秀
- 使用image crate的优化算法
- 大图片可能需要几秒钟，有进度指示
- 自动保存避免额外的IO操作
