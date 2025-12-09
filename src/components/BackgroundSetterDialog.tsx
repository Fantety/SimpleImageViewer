import { useState } from 'react';
import './BackgroundSetterDialog.css';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface BackgroundSetterDialogProps {
  hasAlpha: boolean;
  onConfirm: (color: RGBColor, saveAsCopy: boolean) => Promise<void>;
  onCancel: () => void;
}

export function BackgroundSetterDialog({
  hasAlpha,
  onConfirm,
  onCancel,
}: BackgroundSetterDialogProps) {
  const [color, setColor] = useState<string>('#ffffff');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Convert hex color to RGB
  const hexToRgb = (hex: string): RGBColor => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 255, g: 255, b: 255 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  };

  const handleConfirm = async (saveAsCopy: boolean) => {
    if (!hasAlpha) {
      setError('This image does not have transparency. Background setting is only applicable to transparent images.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const rgb = hexToRgb(color);
      await onConfirm(rgb, saveAsCopy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set background');
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

  // Predefined color palette
  const presetColors = [
    '#ffffff', // White
    '#000000', // Black
    '#f44336', // Red
    '#4caf50', // Green
    '#2196f3', // Blue
    '#ffeb3b', // Yellow
    '#ff9800', // Orange
    '#9c27b0', // Purple
    '#607d8b', // Blue Grey
    '#795548', // Brown
  ];

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>设置背景</h2>
        
        <div className="dialog-body">
          {!hasAlpha && (
            <div className="warning-message">
              <p>此图片不包含透明通道。背景设置功能仅适用于透明图片。</p>
            </div>
          )}

          {hasAlpha && (
            <>
              <div className="info-message">
                <p>选择一个背景颜色来替换透明区域</p>
              </div>

              <div className="color-preview-section">
                <div className="color-preview-label">预览</div>
                <div 
                  className="color-preview" 
                  style={{ backgroundColor: color }}
                  title={`当前颜色: ${color}`}
                />
              </div>

              <div className="input-group">
                <label htmlFor="color-input">颜色选择器</label>
                <div className="color-input-wrapper">
                  <input
                    id="color-input"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isProcessing}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isProcessing}
                    className="color-text-input"
                    placeholder="#ffffff"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="preset-colors-section">
                <label>预设颜色</label>
                <div className="preset-colors">
                  {presetColors.map((presetColor) => (
                    <button
                      key={presetColor}
                      className={`preset-color-button ${color === presetColor ? 'active' : ''}`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => setColor(presetColor)}
                      disabled={isProcessing}
                      title={presetColor}
                      aria-label={`选择颜色 ${presetColor}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

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
            disabled={isProcessing || !hasAlpha}
          >
            {isProcessing ? '处理中...' : '保存副本'}
          </button>
          <button
            className="button button-primary"
            onClick={() => handleConfirm(false)}
            disabled={isProcessing || !hasAlpha}
          >
            {isProcessing ? '处理中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
