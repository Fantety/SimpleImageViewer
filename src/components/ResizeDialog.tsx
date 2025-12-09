import { useState, useEffect } from 'react';
import './ResizeDialog.css';

interface ResizeDialogProps {
  currentWidth: number;
  currentHeight: number;
  onConfirm: (width: number, height: number, keepAspectRatio: boolean) => Promise<void>;
  onCancel: () => void;
}

export function ResizeDialog({
  currentWidth,
  currentHeight,
  onConfirm,
  onCancel,
}: ResizeDialogProps) {
  const [width, setWidth] = useState<string>(currentWidth.toString());
  const [height, setHeight] = useState<string>(currentHeight.toString());
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const aspectRatio = currentWidth / currentHeight;

  // Update height when width changes (if aspect ratio is locked)
  useEffect(() => {
    if (keepAspectRatio && width) {
      const widthNum = parseInt(width, 10);
      if (!isNaN(widthNum) && widthNum > 0) {
        const calculatedHeight = Math.round(widthNum / aspectRatio);
        setHeight(calculatedHeight.toString());
      }
    }
  }, [width, keepAspectRatio, aspectRatio]);

  // Validate input is a positive integer
  const validateInput = (value: string): boolean => {
    if (!value) {
      return false;
    }
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  };

  const handleWidthChange = (value: string) => {
    setWidth(value);
    setError(null);
  };

  const handleHeightChange = (value: string) => {
    // If aspect ratio is locked, temporarily unlock it when user manually changes height
    if (keepAspectRatio) {
      setKeepAspectRatio(false);
    }
    setHeight(value);
    setError(null);
  };

  const handleConfirm = async () => {
    // Validate inputs
    if (!validateInput(width)) {
      setError('Width must be a positive integer');
      return;
    }
    if (!validateInput(height)) {
      setError('Height must be a positive integer');
      return;
    }

    const widthNum = parseInt(width, 10);
    const heightNum = parseInt(height, 10);

    setIsProcessing(true);
    setError(null);

    try {
      await onConfirm(widthNum, heightNum, keepAspectRatio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resize image');
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Resize Image</h2>
        
        <div className="dialog-body">
          <div className="current-dimensions">
            <p>Current size: {currentWidth} × {currentHeight} px</p>
          </div>

          <div className="input-group">
            <label htmlFor="width-input">Width (px)</label>
            <input
              id="width-input"
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(e.target.value)}
              onKeyDown={handleKeyDown}
              min="1"
              step="1"
              disabled={isProcessing}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="height-input">Height (px)</label>
            <input
              id="height-input"
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              onKeyDown={handleKeyDown}
              min="1"
              step="1"
              disabled={isProcessing}
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
                disabled={isProcessing}
              />
              <span>Keep aspect ratio</span>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="dialog-actions">
          <button
            className="button button-secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Resizing...' : 'Resize'}
          </button>
        </div>
      </div>
    </div>
  );
}
