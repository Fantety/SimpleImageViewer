import { useState, useRef, useEffect } from 'react';
import type { ImageData } from '../types/tauri';
import './CropDialog.css';

interface CropDialogProps {
  imageData: ImageData;
  onConfirm: (x: number, y: number, width: number, height: number) => Promise<void>;
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

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // Convert from display coordinates to actual image coordinates
      const scale = getImageScale();
      const actualX = Math.round(cropRegion.x / scale);
      const actualY = Math.round(cropRegion.y / scale);
      const actualWidth = Math.round(cropRegion.width / scale);
      const actualHeight = Math.round(cropRegion.height / scale);
      
      await onConfirm(actualX, actualY, actualWidth, actualHeight);
    } catch (error) {
      console.error('Crop failed:', error);
      alert(`Crop failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getImageScale = (): number => {
    if (!imageRef.current) return 1;
    const displayWidth = imageRef.current.clientWidth;
    return displayWidth / imageData.width;
  };

  const constrainRegion = (region: CropRegion): CropRegion => {
    const scale = getImageScale();
    const maxWidth = imageData.width * scale;
    const maxHeight = imageData.height * scale;

    return {
      x: Math.max(0, Math.min(region.x, maxWidth - 1)),
      y: Math.max(0, Math.min(region.y, maxHeight - 1)),
      width: Math.max(1, Math.min(region.width, maxWidth - region.x)),
      height: Math.max(1, Math.min(region.height, maxHeight - region.y)),
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

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

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
  }, [isDragging, dragHandle, dragStart, initialRegion]);

  // Calculate actual dimensions in image pixels
  const scale = getImageScale();
  const actualWidth = Math.round(cropRegion.width / scale);
  const actualHeight = Math.round(cropRegion.height / scale);

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
              {/* Darkened areas outside crop region */}
              <div
                className="crop-overlay-dark crop-overlay-top"
                style={{ height: `${cropRegion.y}px` }}
              />
              <div
                className="crop-overlay-dark crop-overlay-bottom"
                style={{
                  top: `${cropRegion.y + cropRegion.height}px`,
                  height: `calc(100% - ${cropRegion.y + cropRegion.height}px)`,
                }}
              />
              <div
                className="crop-overlay-dark crop-overlay-left"
                style={{
                  top: `${cropRegion.y}px`,
                  height: `${cropRegion.height}px`,
                  width: `${cropRegion.x}px`,
                }}
              />
              <div
                className="crop-overlay-dark crop-overlay-right"
                style={{
                  top: `${cropRegion.y}px`,
                  left: `${cropRegion.x + cropRegion.width}px`,
                  height: `${cropRegion.height}px`,
                  width: `calc(100% - ${cropRegion.x + cropRegion.width}px)`,
                }}
              />

              {/* Crop selection box */}
              <div
                className="crop-selection"
                style={{
                  left: `${cropRegion.x}px`,
                  top: `${cropRegion.y}px`,
                  width: `${cropRegion.width}px`,
                  height: `${cropRegion.height}px`,
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
                  {actualWidth} × {actualHeight}
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
              Selection: {actualWidth} × {actualHeight} pixels
            </p>
          </div>
        </div>

        <div className="crop-dialog-actions">
          <button
            className="crop-dialog-button crop-dialog-button-cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="crop-dialog-button crop-dialog-button-confirm"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Cropping...' : 'Crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
