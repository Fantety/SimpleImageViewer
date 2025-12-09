# Task 17: 优化编辑功能的保存选项

## 完成时间
2024-12-10

## 任务描述
优化resize、crop、format conversion和background setter功能，为每个功能添加"保存"和"保存副本"两个选项：
- **保存**：直接覆盖原图
- **保存副本**：弹出保存文件对话框，让用户自定义保存位置和文件名

## 实现内容

### 1. 修改对话框组件

#### ResizeDialog.tsx
- 更新 `onConfirm` 回调函数签名，添加 `saveAsCopy: boolean` 参数
- 修改确认按钮为两个按钮：
  - "保存副本"：调用 `handleConfirm(true)`
  - "保存"：调用 `handleConfirm(false)`
- 更新按钮文本为中文

#### CropDialog.tsx
- 更新 `onConfirm` 回调函数签名，添加 `saveAsCopy: boolean` 参数
- 修改确认按钮为两个按钮：
  - "保存副本"：调用 `handleConfirm(true)`
  - "保存"：调用 `handleConfirm(false)`
- 添加 `.crop-dialog-button-secondary` CSS样式
- 更新按钮文本为中文

#### FormatConverterDialog.tsx
- 更新 `onConfirm` 回调函数签名，添加 `saveAsCopy: boolean` 参数
- 修改确认按钮为两个按钮：
  - "保存副本"：调用 `handleConfirm(true)`
  - "保存"：调用 `handleConfirm(false)`
- 更新按钮文本为中文

#### BackgroundSetterDialog.tsx
- 更新 `onConfirm` 回调函数签名，添加 `saveAsCopy: boolean` 参数
- 修改确认按钮为两个按钮：
  - "保存副本"：调用 `handleConfirm(true)`
  - "保存"：调用 `handleConfirm(false)`
- 更新按钮文本为中文

### 2. 更新ImageViewer.tsx处理逻辑

#### handleResizeConfirm
- 添加 `saveAsCopy` 参数
- 如果 `saveAsCopy === true`：
  - 生成默认文件名（原文件名_resized.扩展名）
  - 调用 `saveFileDialog` 让用户选择保存位置
  - 保存到用户选择的路径
  - 显示成功通知
- 如果 `saveAsCopy === false`：
  - 直接保存到原路径（覆盖）
  - 更新当前图片状态
  - 添加到历史记录
  - 显示成功通知

#### handleConvertConfirm
- 添加 `saveAsCopy` 参数
- 如果 `saveAsCopy === true`：
  - 生成默认文件名（原文件名.新格式扩展名）
  - 调用 `saveFileDialog` 让用户选择保存位置
  - 保存到用户选择的路径
  - 显示成功通知
- 如果 `saveAsCopy === false`：
  - 直接保存到原路径（覆盖）
  - 更新当前图片状态
  - 添加到历史记录
  - 显示成功通知

#### handleCropConfirm
- 添加 `saveAsCopy` 参数
- 如果 `saveAsCopy === true`：
  - 生成默认文件名（原文件名_cropped.扩展名）
  - 调用 `saveFileDialog` 让用户选择保存位置
  - 保存到用户选择的路径
  - 显示成功通知
- 如果 `saveAsCopy === false`：
  - 直接保存到原路径（覆盖）
  - 更新当前图片状态
  - 添加到历史记录
  - 显示成功通知

#### handleSetBackgroundConfirm
- 添加 `saveAsCopy` 参数
- 如果 `saveAsCopy === true`：
  - 生成默认文件名（原文件名_background.扩展名）
  - 调用 `saveFileDialog` 让用户选择保存位置
  - 保存到用户选择的路径
  - 显示成功通知
- 如果 `saveAsCopy === false`：
  - 直接保存到原路径（覆盖）
  - 更新当前图片状态
  - 添加到历史记录
  - 显示成功通知

### 3. CSS样式更新

#### CropDialog.css
- 添加 `.crop-dialog-button-secondary` 样式类
- 与 `.crop-dialog-button-cancel` 样式相似，但hover时边框变为accent颜色

## 用户体验改进

1. **更灵活的保存选项**：用户可以选择覆盖原图或创建副本
2. **智能默认文件名**：
   - Resize: `原文件名_resized.扩展名`
   - Crop: `原文件名_cropped.扩展名`
   - Format: `原文件名.新格式扩展名`
   - Background: `原文件名_background.扩展名`
3. **清晰的按钮标签**：使用中文标签，明确表达功能
4. **一致的交互模式**：所有编辑功能都采用相同的保存选项模式
5. **取消支持**：用户在保存对话框中可以取消操作

## 技术细节

- 所有对话框组件的接口都保持向后兼容
- 使用 `saveFileDialog` API 让用户选择保存位置
- 保存副本时不会修改当前图片状态
- 保存（覆盖）时会更新当前图片状态和历史记录
- 所有操作都有适当的加载进度指示和错误处理

## 测试建议

1. 测试每个编辑功能的"保存"选项（覆盖原图）
2. 测试每个编辑功能的"保存副本"选项（创建新文件）
3. 测试在保存对话框中取消操作
4. 验证默认文件名是否正确生成
5. 验证成功通知是否正确显示
6. 测试错误处理（如磁盘空间不足、权限问题等）

## 相关文件

- `src/components/ResizeDialog.tsx`
- `src/components/CropDialog.tsx`
- `src/components/CropDialog.css`
- `src/components/FormatConverterDialog.tsx`
- `src/components/BackgroundSetterDialog.tsx`
- `src/components/ImageViewer.tsx`
