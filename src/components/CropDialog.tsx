import { useState, useRef, useEffect } from 'react';
import type { ImageData } from '../types/tauri';
import './CropDialog.css';

interface CropDialogProps {
  imageData: ImageData;
  onConfirm: (x: number, y: number, width: number, height: number, saveAsCopy: boolean) => Promise<void>;
  onCancel: () => void;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function CropDialog({ imageData, onConfirm, onCancel }: CropDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion>({
    x: Math.floor(imageData.width * 0.1),
    y: Math.floor(imageData.height * 0.1),
    width: Math.floor(imageData.width * 0.8),
    height: Math.floor(imageData.height * 0.8),
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRegion, setInitialRegion] = useState<CropRegion>(cropRegion);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async (saveAsCopy: boolean) => {
    setIsProcessing(true);
    try {
      // cropRegion is already in actual image coordinates
      await onConfirm(
        Math.round(cropRegion.x),
        Math.round(cropRegion.y),
        Math.round(cropRegion.width),
        Math.round(cropRegion.height),
        saveAsCopy
      );
    } catch (error) {
      console.error('Crop failed:', error);
      alert(`Crop failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get the image's position and scale relative to the container
  const getImageBounds = () => {
    if (!imageRef.current || !containerRef.current) {
      return { offsetX: 0, offsetY: 0, scale: 1, displayWidth: 0, displayHeight: 0 };
    }
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const scale = displayWidth / imageData.width;
    
    // Get image position relative to container
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;
    
    return { offsetX, offsetY, scale, displayWidth, displayHeight };
  };

  const constrainRegion = (region: CropRegion): CropRegion => {
    return {
      x: Math.max(0, Math.min(region.x, imageData.width - 1)),
      y: Math.max(0, Math.min(region.y, imageData.height - 1)),
      width: Math.max(1, Math.min(region.width, imageData.width - region.x)),
      height: Math.max(1, Math.min(region.height, imageData.height - region.y)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialRegion(cropRegion);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragHandle) return;

      const { scale } = getImageBounds();
      
      // Convert mouse movement from screen pixels to image pixels
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      let newRegion = { ...initialRegion };

      if (dragHandle === 'move') {
        newRegion.x = initialRegion.x + dx;
        newRegion.y = initialRegion.y + dy;
      } else if (dragHandle === 'nw') {
        newRegion.x = initialRegion.x + dx;
        newRegion.y = initialRegion.y + dy;
        newRegion.width = initialRegion.width - dx;
        newRegion.height = initialRegion.height - dy;
      } else if (dragHandle === 'ne') {
        newRegion.y = initialRegion.y + dy;
        newRegion.width = initialRegion.width + dx;
        newRegion.height = initialRegion.height - dy;
      } else if (dragHandle === 'sw') {
        newRegion.x = initialRegion.x + dx;
        newRegion.width = initialRegion.width - dx;
        newRegion.height = initialRegion.height + dy;
      } else if (dragHandle === 'se') {
        newRegion.width = initialRegion.width + dx;
        newRegion.height = initialRegion.height + dy;
      } else if (dragHandle === 'n') {
        newRegion.y = initialRegion.y + dy;
        newRegion.height = initialRegion.height - dy;
      } else if (dragHandle === 's') {
        newRegion.height = initialRegion.height + dy;
      } else if (dragHandle === 'e') {
        newRegion.width = initialRegion.width + dx;
      } else if (dragHandle === 'w') {
        newRegion.x = initialRegion.x + dx;
        newRegion.width = initialRegion.width - dx;
      }

      setCropRegion(constrainRegion(newRegion));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragHandle(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragHandle, dragStart, initialRegion, imageData.width, imageData.height]);

  // Get display bounds for rendering
  const { offsetX, offsetY, scale } = getImageBounds();

  return (
    <div className="crop-dialog-overlay">
      <div className="crop-dialog">
        <div className="crop-dialog-header">
          <h2>Crop Image</h2>
          <button
            className="crop-dialog-close"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="crop-dialog-content">
          <div className="crop-preview-container" ref={containerRef}>
            <img
              ref={imageRef}
              src={`data:image/${imageData.format.toLowerCase()};base64,${imageData.data}`}
              alt="Crop preview"
              className="crop-preview-image"
              draggable={false}
            />
            
            {/* Crop overlay */}
            <div className="crop-overlay">
              {/* Crop selection box - positioned relative to image */}
              <div
                className="crop-selection"
                style={{
                  left: `${offsetX + cropRegion.x * scale}px`,
                  top: `${offsetY + cropRegion.y * scale}px`,
                  width: `${cropRegion.width * scale}px`,
                  height: `${cropRegion.height * scale}px`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Corner handles */}
                <div
                  className="crop-handle crop-handle-nw"
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                />
                <div
                  className="crop-handle crop-handle-ne"
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                />
                <div
                  className="crop-handle crop-handle-sw"
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                />
                <div
                  className="crop-handle crop-handle-se"
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
                
                {/* Edge handles */}
                <div
                  className="crop-handle crop-handle-n"
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                />
                <div
                  className="crop-handle crop-handle-s"
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                />
                <div
                  className="crop-handle crop-handle-e"
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                />
                <div
                  className="crop-handle crop-handle-w"
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                />

                {/* Dimension display */}
                <div className="crop-dimensions">
                  {Math.round(cropRegion.width)} × {Math.round(cropRegion.height)}
                </div>
              </div>
            </div>
          </div>

          <div className="crop-info">
            <p>
              Drag the crop box to select the region you want to keep.
              Use the handles to resize the selection.
            </p>
            <p className="crop-size-info">
              Selection: {Math.round(cropRegion.width)} × {Math.round(cropRegion.height)} pixels
            </p>
          </div>
        </div>

        <div className="crop-dialog-actions">
          <button
            className="crop-dialog-button crop-dialog-button-cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            取消
          </button>
          <button
            className="crop-dialog-button crop-dialog-button-secondary"
            onClick={() => handleConfirm(true)}
            disabled={isProcessing}
          >
            {isProcessing ? '处理中...' : '保存副本'}
          </button>
          <button
            className="crop-dialog-button crop-dialog-button-confirm"
            onClick={() => handleConfirm(false)}
            disabled={isProcessing}
          >
            {isProcessing ? '处理中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
