import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageData, TextData } from '../types/tauri';
import { ConfirmDialog } from './ConfirmDialog';
import './TextDialog.css';

interface TextDialogProps {
  imageData: ImageData;
  onConfirm: (texts: TextData[], saveAsCopy: boolean) => Promise<void>;
  onCancel: () => void;
}

type DragHandle = 'move' | 'rotate' | null;

interface DragState {
  isDragging: boolean;
  handle: DragHandle;
  startX: number;
  startY: number;
  initialText: TextData | null;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#008000', '#800000', '#000080', '#808080', '#C0C0C0'
];

export function TextDialog({ imageData, onConfirm, onCancel }: TextDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    initialText: null,
  });
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [pendingSaveAsCopy, setPendingSaveAsCopy] = useState<boolean>(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async (saveAsCopy: boolean) => {
    if (texts.length === 0) {
      alert('请先添加文字');
      return;
    }

    // Show confirmation dialog if saving (overwriting)
    if (!saveAsCopy) {
      setPendingSaveAsCopy(saveAsCopy);
      setShowConfirm(true);
      return;
    }

    await executeText(saveAsCopy);
  };

  const executeText = async (saveAsCopy: boolean) => {
    setIsProcessing(true);
    try {
      await onConfirm(texts, saveAsCopy);
    } catch (error) {
      console.error('Text application failed:', error);
      alert(`文字应用失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    setShowConfirm(false);
    await executeText(pendingSaveAsCopy);
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

  const handleAddText = () => {
    const newText: TextData = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      text: '新文字',
      x: Math.floor(imageData.width * 0.1),
      y: Math.floor(imageData.height * 0.1),
      fontSize: 32,
      fontFamily: 'Arial',
      color: '#000000',
      rotation: 0,
      zIndex: texts.length,
    };
    
    setTexts(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const handleDeleteText = (textId: string) => {
    setTexts(prev => prev.filter(t => t.id !== textId));
    if (selectedTextId === textId) {
      setSelectedTextId(null);
    }
  };

  const handleTextChange = (textId: string, field: keyof TextData, value: any) => {
    setTexts(prev => prev.map(t => 
      t.id === textId ? { ...t, [field]: value } : t
    ));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, textId: string, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const text = texts.find(t => t.id === textId);
    if (!text) return;

    setSelectedTextId(textId);
    setDragState({
      isDragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialText: { ...text },
    });
  }, [texts]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.initialText) return;

      const { scale } = getImageBounds();
      
      // Convert mouse movement from screen pixels to image pixels
      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;

      const updatedText = { ...dragState.initialText };

      if (dragState.handle === 'move') {
        updatedText.x = Math.max(0, Math.min(dragState.initialText.x + dx, imageData.width));
        updatedText.y = Math.max(0, Math.min(dragState.initialText.y + dy, imageData.height));
      }

      setTexts(prev => prev.map(t => t.id === dragState.initialText!.id ? updatedText : t));
    };

    const handleMouseUp = () => {
      setDragState({
        isDragging: false,
        handle: null,
        startX: 0,
        startY: 0,
        initialText: null,
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
      
      <div className="text-dialog-overlay">
        <div className="text-dialog">
          <div className="text-dialog-header">
            <h2>添加文字</h2>
            <button
              className="text-dialog-close"
              onClick={onCancel}
              disabled={isProcessing}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="text-dialog-content">
            {/* Left side - Image preview */}
            <div className="text-preview-section">
              <div className="text-preview-container" ref={containerRef}>
                <img
                  ref={imageRef}
                  src={`data:image/${imageData.format.toLowerCase()};base64,${imageData.data}`}
                  alt="Text preview"
                  className="text-preview-image"
                  draggable={false}
                />
                
                {/* Text overlay */}
                <div className="text-overlay">
                  {texts
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((text) => {
                      const isSelected = selectedTextId === text.id;
                      return (
                        <div
                          key={text.id}
                          className={`text-item ${isSelected ? 'text-item-selected' : ''}`}
                          style={{
                            left: `${offsetX + text.x * scale}px`,
                            top: `${offsetY + text.y * scale}px`,
                            fontSize: `${text.fontSize * scale}px`,
                            fontFamily: text.fontFamily,
                            color: text.color,
                            transform: `rotate(${text.rotation}deg)`,
                            zIndex: text.zIndex + 10,
                          }}
                          onMouseDown={(e) => handleMouseDown(e, text.id, 'move')}
                        >
                          {text.text}
                          
                          {isSelected && (
                            <>
                              {/* Delete button */}
                              <button
                                className="text-delete"
                                onClick={() => handleDeleteText(text.id)}
                                title="删除文字"
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

            {/* Right side - Controls and text list */}
            <div className="text-controls-section">
              <div className="text-controls">
                <button
                  className="text-add-button"
                  onClick={handleAddText}
                  disabled={isProcessing}
                >
                  添加文字
                </button>
                
                <div className="text-info">
                  <p>点击文字选择，拖拽移动位置，在右侧调整样式</p>
                </div>
              </div>

              {/* Text list */}
              <div className="text-list">
                <h3>文字列表 ({texts.length})</h3>
                {texts.length === 0 ? (
                  <div className="text-list-empty">
                    <p>暂无文字</p>
                    <p>点击上方按钮添加文字</p>
                  </div>
                ) : (
                  <div className="text-list-items">
                    {texts.map((text, index) => (
                      <div
                        key={text.id}
                        className={`text-list-item ${selectedTextId === text.id ? 'text-list-item-selected' : ''}`}
                        onClick={() => setSelectedTextId(text.id)}
                      >
                        <div className="text-list-item-info">
                          <div className="text-list-item-name">文字 {index + 1}</div>
                          
                          {/* Text content input */}
                          <div className="text-list-item-field">
                            <label>内容:</label>
                            <input
                              type="text"
                              value={text.text}
                              onChange={(e) => handleTextChange(text.id, 'text', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-input"
                            />
                          </div>

                          {/* Font size */}
                          <div className="text-list-item-field">
                            <label>字号:</label>
                            <select
                              value={text.fontSize}
                              onChange={(e) => handleTextChange(text.id, 'fontSize', parseInt(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="text-select"
                            >
                              {FONT_SIZES.map(size => (
                                <option key={size} value={size}>{size}px</option>
                              ))}
                            </select>
                          </div>

                          {/* Font family */}
                          <div className="text-list-item-field">
                            <label>字体:</label>
                            <select
                              value={text.fontFamily}
                              onChange={(e) => handleTextChange(text.id, 'fontFamily', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-select"
                            >
                              {FONT_FAMILIES.map(font => (
                                <option key={font} value={font}>{font}</option>
                              ))}
                            </select>
                          </div>

                          {/* Color picker */}
                          <div className="text-list-item-field">
                            <label>颜色:</label>
                            <div className="text-color-picker">
                              {COLORS.map(color => (
                                <button
                                  key={color}
                                  className={`text-color-option ${text.color === color ? 'selected' : ''}`}
                                  style={{ backgroundColor: color }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTextChange(text.id, 'color', color);
                                  }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Rotation slider */}
                          <div className="text-list-item-field">
                            <label>旋转: {Math.round(text.rotation)}°</label>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={text.rotation}
                              onChange={(e) => handleTextChange(text.id, 'rotation', parseFloat(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="text-rotation-slider"
                            />
                          </div>
                        </div>
                        
                        <div className="text-list-item-actions">
                          <button
                            className="text-list-item-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteText(text.id);
                            }}
                            title="删除文字"
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

          <div className="text-dialog-actions">
            <button
              className="text-dialog-button text-dialog-button-cancel"
              onClick={onCancel}
              disabled={isProcessing}
            >
              取消
            </button>
            <button
              className="text-dialog-button text-dialog-button-secondary"
              onClick={() => handleConfirm(true)}
              disabled={isProcessing || texts.length === 0}
            >
              {isProcessing ? '处理中...' : '保存副本'}
            </button>
            <button
              className="text-dialog-button text-dialog-button-confirm"
              onClick={() => handleConfirm(false)}
              disabled={isProcessing || texts.length === 0}
            >
              {isProcessing ? '处理中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}