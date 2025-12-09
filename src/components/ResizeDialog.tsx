import { useState, useEffect } from 'react';
import './ResizeDialog.css';

interface ResizeDialogProps {
  currentWidth: number;
  currentHeight: number;
  onConfirm: (width: number, height: number, keepAspectRatio: boolean, saveAsCopy: boolean) => Promise<void>;
  onCancel: () => void;
}

type ResizeMode = 'pixels' | 'percentage';

export function ResizeDialog({
  currentWidth,
  currentHeight,
  onConfirm,
  onCancel,
}: ResizeDialogProps) {
  const [mode, setMode] = useState<ResizeMode>('pixels');
  const [width, setWidth] = useState<string>(currentWidth.toString());
  const [height, setHeight] = useState<string>(currentHeight.toString());
  const [percentage, setPercentage] = useState<string>('100');
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const aspectRatio = currentWidth / currentHeight;

  // Update height when width changes (if aspect ratio is locked) in pixel mode
  useEffect(() => {
    if (mode === 'pixels' && keepAspectRatio && width) {
      const widthNum = parseInt(width, 10);
      if (!isNaN(widthNum) && widthNum > 0) {
        const calculatedHeight = Math.round(widthNum / aspectRatio);
        setHeight(calculatedHeight.toString());
      }
    }
  }, [width, keepAspectRatio, aspectRatio, mode]);

  // Update dimensions when percentage changes
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

  // Validate input is a positive integer
  const validateInput = (value: string): boolean => {
    if (!value) {
      return false;
    }
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  };

  const handleModeChange = (newMode: ResizeMode) => {
    setMode(newMode);
    setError(null);
    
    // When switching to percentage mode, calculate current percentage
    if (newMode === 'percentage') {
      const widthNum = parseInt(width, 10);
      if (!isNaN(widthNum) && widthNum > 0) {
        const percent = Math.round((widthNum / currentWidth) * 100);
        setPercentage(percent.toString());
      }
    }
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

  const handlePercentageChange = (value: string) => {
    setPercentage(value);
    setError(null);
  };

  const handleConfirm = async (saveAsCopy: boolean) => {
    // Validate inputs based on mode
    if (mode === 'percentage') {
      const percentNum = parseFloat(percentage);
      if (isNaN(percentNum) || percentNum <= 0) {
        setError('百分比必须是正数');
        return;
      }
    } else {
      if (!validateInput(width)) {
        setError('宽度必须是正整数');
        return;
      }
      if (!validateInput(height)) {
        setError('高度必须是正整数');
        return;
      }
    }

    const widthNum = parseInt(width, 10);
    const heightNum = parseInt(height, 10);

    setIsProcessing(true);
    setError(null);

    try {
      await onConfirm(widthNum, heightNum, keepAspectRatio, saveAsCopy);
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整尺寸失败');
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm(false); // Default to save (overwrite)
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>调整尺寸</h2>
        
        <div className="dialog-body">
          <div className="current-dimensions">
            <p>当前尺寸: {currentWidth} × {currentHeight} px</p>
          </div>

          {/* Mode selector */}
          <div className="resize-mode-selector">
            <button
              type="button"
              className={`mode-button ${mode === 'pixels' ? 'active' : ''}`}
              onClick={() => handleModeChange('pixels')}
              disabled={isProcessing}
            >
              像素
            </button>
            <button
              type="button"
              className={`mode-button ${mode === 'percentage' ? 'active' : ''}`}
              onClick={() => handleModeChange('percentage')}
              disabled={isProcessing}
            >
              百分比
            </button>
          </div>

          {mode === 'pixels' ? (
            <>
              <div className="input-group">
                <label htmlFor="width-input">宽度 (px)</label>
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
                <label htmlFor="height-input">高度 (px)</label>
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
            </>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="percentage-input">缩放比例 (%)</label>
                <input
                  id="percentage-input"
                  type="number"
                  value={percentage}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  min="1"
                  step="1"
                  disabled={isProcessing}
                  autoFocus
                />
              </div>

              <div className="preview-dimensions">
                <p>新尺寸: {width} × {height} px</p>
              </div>
            </>
          )}

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
                disabled={isProcessing || mode === 'percentage'}
              />
              <span>保持宽高比</span>
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
            取消
          </button>
          <button
            className="button button-secondary"
            onClick={() => handleConfirm(true)}
            disabled={isProcessing}
          >
            {isProcessing ? '处理中...' : '保存副本'}
          </button>
          <button
            className="button button-primary"
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
