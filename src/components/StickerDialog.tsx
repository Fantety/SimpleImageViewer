import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageData, StickerData } from '../types/tauri';
import { ConfirmDialog } from './ConfirmDialog';
import './StickerDialog.css';

interface StickerDialogProps {
  imageData: ImageData;
  onConfirm: (stickers: StickerData[], saveAsCopy: boolean) => Promise<void>;
  onCancel: () => void;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'rotate' | null;

interface DragState {
  isDragging: boolean;
  handle: DragHandle;
  startX: number;
  startY: number;
  initialSticker: StickerData | null;
  lastAngle?: number; // 用于跟踪上一次的角度，避免角度跳跃
  accumulatedRotation?: number; // 累积的旋转角度
}

export function StickerDialog({ imageData, onConfirm, onCancel }: StickerDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    initialSticker: null,
  });
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [pendingSaveAsCopy, setPendingSaveAsCopy] = useState<boolean>(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = async (saveAsCopy: boolean) => {
    if (stickers.length === 0) {
      alert('请先添加贴纸');
      return;
    }

    // Show confirmation dialog if saving (overwriting)
    if (!saveAsCopy) {
      setPendingSaveAsCopy(saveAsCopy);
      setShowConfirm(true);
      return;
    }

    await executeSticker(saveAsCopy);
  };

  const executeSticker = async (saveAsCopy: boolean) => {
    setIsProcessing(true);
    try {
      await onConfirm(stickers, saveAsCopy);
    } catch (error) {
      console.error('Sticker application failed:', error);
      alert(`贴纸应用失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    setShowConfirm(false);
    await executeSticker(pendingSaveAsCopy);
  };

  const handleCancelOverwrite = () => {
    setShowConfirm(false);
  };

  // Get the image's position and scale relative to the container
  const getImageBounds = () => {
    if (!imageRef.current || !containerRef.current) {
      return { offsetX: 0, offsetY: 0, scale: 1, displayWidth: 0, displayHeight: 0 };
    }
    
    const img = imageRef.current;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const scale = displayWidth / imageData.width;
    
    // Get image position relative to container
    const imgRect = img.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;
    
    return { offsetX, offsetY, scale, displayWidth, displayHeight };
  };

  const handleAddSticker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Create a temporary image to get dimensions
        const img = new Image();
        img.onload = () => {
          // 计算贴纸的合适尺寸，保持原始宽高比
          const maxStickerSize = Math.min(imageData.width, imageData.height) * 0.3; // 最大尺寸为底图较小边的30%
          const stickerAspectRatio = img.width / img.height;
          
          let stickerWidth, stickerHeight;
          
          // 如果贴纸原始尺寸小于最大尺寸，使用原始尺寸
          if (img.width <= maxStickerSize && img.height <= maxStickerSize) {
            stickerWidth = img.width;
            stickerHeight = img.height;
          } else {
            // 否则按比例缩放到合适尺寸
            if (stickerAspectRatio > 1) {
              // 宽度大于高度，以宽度为准
              stickerWidth = maxStickerSize;
              stickerHeight = maxStickerSize / stickerAspectRatio;
            } else {
              // 高度大于等于宽度，以高度为准
              stickerHeight = maxStickerSize;
              stickerWidth = maxStickerSize * stickerAspectRatio;
            }
          }
          
          const newSticker: StickerData = {
            id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            imageData: result.split(',')[1], // Remove data:image/...;base64, prefix
            originalDataUrl: result, // Keep full data URL for display
            x: Math.floor(imageData.width * 0.1),
            y: Math.floor(imageData.height * 0.1),
            width: Math.round(stickerWidth),
            height: Math.round(stickerHeight),
            rotation: 0,
            zIndex: stickers.length,
          };
          
          setStickers(prev => [...prev, newSticker]);
          setSelectedStickerId(newSticker.id);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleDeleteSticker = (stickerId: string) => {
    setStickers(prev => prev.filter(s => s.id !== stickerId));
    if (selectedStickerId === stickerId) {
      setSelectedStickerId(null);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, stickerId: string, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker) return;

    setSelectedStickerId(stickerId);
    setDragState({
      isDragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialSticker: { ...sticker },
      lastAngle: undefined, // Reset for rotation tracking
      accumulatedRotation: 0, // Reset accumulated rotation
    });
  }, [stickers]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.initialSticker) return;

      const { scale } = getImageBounds();
      
      // Convert mouse movement from screen pixels to image pixels
      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;

      const updatedSticker = { ...dragState.initialSticker };

      if (dragState.handle === 'move') {
        updatedSticker.x = Math.max(0, Math.min(dragState.initialSticker.x + dx, imageData.width - updatedSticker.width));
        updatedSticker.y = Math.max(0, Math.min(dragState.initialSticker.y + dy, imageData.height - updatedSticker.height));
      } else if (dragState.handle === 'nw' || dragState.handle === 'ne' || dragState.handle === 'sw' || dragState.handle === 'se') {
        // 保持宽高比的调整逻辑
        const aspectRatio = dragState.initialSticker.width / dragState.initialSticker.height;
        
        let newWidth, newHeight;
        
        if (dragState.handle === 'nw') {
          // 左上角：向左上拖拽减小尺寸，向右下拖拽增大尺寸
          const sizeDelta = Math.max(-dx, -dy); // 取较大的变化量
          newWidth = Math.max(20, dragState.initialSticker.width + sizeDelta);
          newHeight = newWidth / aspectRatio;
          
          updatedSticker.x = dragState.initialSticker.x + dragState.initialSticker.width - newWidth;
          updatedSticker.y = dragState.initialSticker.y + dragState.initialSticker.height - newHeight;
        } else if (dragState.handle === 'ne') {
          // 右上角：向右上拖拽
          const sizeDelta = Math.max(dx, -dy);
          newWidth = Math.max(20, dragState.initialSticker.width + sizeDelta);
          newHeight = newWidth / aspectRatio;
          
          updatedSticker.y = dragState.initialSticker.y + dragState.initialSticker.height - newHeight;
        } else if (dragState.handle === 'sw') {
          // 左下角：向左下拖拽
          const sizeDelta = Math.max(-dx, dy);
          newWidth = Math.max(20, dragState.initialSticker.width + sizeDelta);
          newHeight = newWidth / aspectRatio;
          
          updatedSticker.x = dragState.initialSticker.x + dragState.initialSticker.width - newWidth;
        } else if (dragState.handle === 'se') {
          // 右下角：向右下拖拽增大尺寸
          const sizeDelta = Math.max(dx, dy);
          newWidth = Math.max(20, dragState.initialSticker.width + sizeDelta);
          newHeight = newWidth / aspectRatio;
        }
        
        // 确保最小尺寸
        newWidth = Math.max(20, newWidth!);
        newHeight = Math.max(20 / aspectRatio, newHeight!);
        
        updatedSticker.width = newWidth;
        updatedSticker.height = newHeight;
      } else if (dragState.handle === 'rotate') {
        // 旋转手柄现在只用于点击旋转90度，拖拽功能已移除
        // 精确旋转请使用右侧列表中的滑动条
      }

      setStickers(prev => prev.map(s => s.id === dragState.initialSticker!.id ? updatedSticker : s));
    };

    const handleMouseUp = () => {
      setDragState({
        isDragging: false,
        handle: null,
        startX: 0,
        startY: 0,
        initialSticker: null,
      });
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, imageData.width, imageData.height]);

  // Get display bounds for rendering
  const { offsetX, offsetY, scale } = getImageBounds();

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          title="确认覆盖原图"
          message="此操作将覆盖原始图片，无法撤销。确定要继续吗？"
          confirmText="确认覆盖"
          cancelText="取消"
          onConfirm={handleConfirmOverwrite}
          onCancel={handleCancelOverwrite}
          type="warning"
        />
      )}
      
      <div className="sticker-dialog-overlay">
        <div className="sticker-dialog">
          <div className="sticker-dialog-header">
            <h2>添加贴纸</h2>
            <button
              className="sticker-dialog-close"
              onClick={onCancel}
              disabled={isProcessing}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="sticker-dialog-content">
            {/* Left side - Image preview */}
            <div className="sticker-preview-section">
              <div className="sticker-preview-container" ref={containerRef}>
                <img
                  ref={imageRef}
                  src={`data:image/${imageData.format.toLowerCase()};base64,${imageData.data}`}
                  alt="Sticker preview"
                  className="sticker-preview-image"
                  draggable={false}
                />
                
                {/* Sticker overlay */}
                <div className="sticker-overlay">
                  {stickers
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((sticker) => {
                      const isSelected = selectedStickerId === sticker.id;
                      return (
                        <div
                          key={sticker.id}
                          className={`sticker-item ${isSelected ? 'sticker-item-selected' : ''}`}
                          style={{
                            left: `${offsetX + sticker.x * scale}px`,
                            top: `${offsetY + sticker.y * scale}px`,
                            width: `${sticker.width * scale}px`,
                            height: `${sticker.height * scale}px`,
                            transform: `rotate(${sticker.rotation}deg)`,
                            zIndex: sticker.zIndex + 10,
                          }}
                          onMouseDown={(e) => handleMouseDown(e, sticker.id, 'move')}
                        >
                          <img
                            src={sticker.originalDataUrl}
                            alt="Sticker"
                            className="sticker-image"
                            draggable={false}
                          />
                          
                          {isSelected && (
                            <>
                              {/* Corner handles for resizing */}
                              <div
                                className="sticker-handle sticker-handle-nw"
                                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'nw')}
                              />
                              <div
                                className="sticker-handle sticker-handle-ne"
                                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'ne')}
                              />
                              <div
                                className="sticker-handle sticker-handle-sw"
                                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'sw')}
                              />
                              <div
                                className="sticker-handle sticker-handle-se"
                                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'se')}
                              />
                              
                              {/* Rotation handle */}
                              <div
                                className="sticker-handle sticker-handle-rotate"
                                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'rotate')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Quick rotate by 90 degrees on click
                                  const updatedSticker = { ...sticker };
                                  updatedSticker.rotation = (sticker.rotation + 90) % 360;
                                  setStickers(prev => prev.map(s => s.id === sticker.id ? updatedSticker : s));
                                }}
                                title="拖拽旋转或点击旋转90°"
                              />
                              
                              {/* Delete button */}
                              <button
                                className="sticker-delete"
                                onClick={() => handleDeleteSticker(sticker.id)}
                                title="删除贴纸"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right side - Controls and sticker list */}
            <div className="sticker-controls-section">
              <div className="sticker-controls">
                <button
                  className="sticker-add-button"
                  onClick={handleAddSticker}
                  disabled={isProcessing}
                >
                  选择图片作为贴纸
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                <div className="sticker-info">
                  <p>点击贴纸选择，拖拽移动位置，使用控制点调整大小和旋转</p>
                </div>
              </div>

              {/* Sticker list */}
              <div className="sticker-list">
                <h3>贴纸列表 ({stickers.length})</h3>
                {stickers.length === 0 ? (
                  <div className="sticker-list-empty">
                    <p>暂无贴纸</p>
                    <p>点击上方按钮添加贴纸</p>
                  </div>
                ) : (
                  <div className="sticker-list-items">
                    {stickers.map((sticker, index) => (
                      <div
                        key={sticker.id}
                        className={`sticker-list-item ${selectedStickerId === sticker.id ? 'sticker-list-item-selected' : ''}`}
                        onClick={() => setSelectedStickerId(sticker.id)}
                      >
                        <div className="sticker-list-item-preview">
                          <img
                            src={sticker.originalDataUrl}
                            alt={`贴纸 ${index + 1}`}
                            className="sticker-list-item-image"
                          />
                        </div>
                        <div className="sticker-list-item-info">
                          <div className="sticker-list-item-name">贴纸 {index + 1}</div>
                          <div className="sticker-list-item-details">
                            {Math.round(sticker.width)} × {Math.round(sticker.height)}
                          </div>
                          <div className="sticker-list-item-rotation">
                            <label>旋转: {Math.round(sticker.rotation)}°</label>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={sticker.rotation}
                              onChange={(e) => {
                                e.stopPropagation();
                                const updatedSticker = { ...sticker };
                                updatedSticker.rotation = parseFloat(e.target.value);
                                setStickers(prev => prev.map(s => s.id === sticker.id ? updatedSticker : s));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="sticker-rotation-slider"
                            />
                          </div>
                        </div>
                        <div className="sticker-list-item-actions">
                          <button
                            className="sticker-list-item-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSticker(sticker.id);
                            }}
                            title="删除贴纸"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sticker-dialog-actions">
            <button
              className="sticker-dialog-button sticker-dialog-button-cancel"
              onClick={onCancel}
              disabled={isProcessing}
            >
              取消
            </button>
            <button
              className="sticker-dialog-button sticker-dialog-button-secondary"
              onClick={() => handleConfirm(true)}
              disabled={isProcessing || stickers.length === 0}
            >
              {isProcessing ? '处理中...' : '保存副本'}
            </button>
            <button
              className="sticker-dialog-button sticker-dialog-button-confirm"
              onClick={() => handleConfirm(false)}
              disabled={isProcessing || stickers.length === 0}
            >
              {isProcessing ? '处理中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}