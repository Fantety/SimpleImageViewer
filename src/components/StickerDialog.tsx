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
          const newSticker: StickerData = {
            id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            imageData: result.split(',')[1], // Remove data:image/...;base64, prefix
            originalDataUrl: result, // Keep full data URL for display
            x: Math.floor(imageData.width * 0.1),
            y: Math.floor(imageData.height * 0.1),
            width: Math.min(img.width, Math.floor(imageData.width * 0.3)),
            height: Math.min(img.height, Math.floor(imageData.height * 0.3)),
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
      } else if (dragState.handle === 'nw') {
        const newWidth = Math.max(20, dragState.initialSticker.width - dx);
        const newHeight = Math.max(20, dragState.initialSticker.height - dy);
        updatedSticker.x = dragState.initialSticker.x + dragState.initialSticker.width - newWidth;
        updatedSticker.y = dragState.initialSticker.y + dragState.initialSticker.height - newHeight;
        updatedSticker.width = newWidth;
        updatedSticker.height = newHeight;
      } else if (dragState.handle === 'ne') {
        updatedSticker.width = Math.max(20, dragState.initialSticker.width + dx);
        const newHeight = Math.max(20, dragState.initialSticker.height - dy);
        updatedSticker.y = dragState.initialSticker.y + dragState.initialSticker.height - newHeight;
        updatedSticker.height = newHeight;
      } else if (dragState.handle === 'sw') {
        const newWidth = Math.max(20, dragState.initialSticker.width - dx);
        updatedSticker.x = dragState.initialSticker.x + dragState.initialSticker.width - newWidth;
        updatedSticker.width = newWidth;
        updatedSticker.height = Math.max(20, dragState.initialSticker.height + dy);
      } else if (dragState.handle === 'se') {
        updatedSticker.width = Math.max(20, dragState.initialSticker.width + dx);
        updatedSticker.height = Math.max(20, dragState.initialSticker.height + dy);
      } else if (dragState.handle === 'rotate') {
        // Calculate rotation based on mouse position relative to sticker center
        const centerX = dragState.initialSticker.x + dragState.initialSticker.width / 2;
        const centerY = dragState.initialSticker.y + dragState.initialSticker.height / 2;
        
        const angle = Math.atan2(
          (dragState.startY / scale) + dy - centerY,
          (dragState.startX / scale) + dx - centerX
        ) * (180 / Math.PI);
        
        updatedSticker.rotation = angle;
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
                            {sticker.rotation !== 0 && (
                              <span> · {Math.round(sticker.rotation)}°</span>
                            )}
                          </div>
                        </div>
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