import React, { useState } from 'react';
import type { ImageFormat, ConversionOptions } from '../types/tauri';
import { ConfirmDialog } from './ConfirmDialog';
import './FormatConverterDialog.css';

interface FormatConverterDialogProps {
  currentFormat: ImageFormat;
  onConfirm: (targetFormat: ImageFormat, saveAsCopy: boolean, options?: ConversionOptions) => Promise<void>;
  onCancel: () => void;
}

// All supported formats for conversion (excluding SVG and HEIC which cannot be encoded)
const AVAILABLE_FORMATS: ImageFormat[] = [
  'PNG',
  'JPEG',
  'GIF',
  'BMP',
  'WEBP',
  'TIFF',
  'ICO',
  'AVIF',
];

// Formats that support quality parameter
const QUALITY_SUPPORTED_FORMATS: ImageFormat[] = ['JPEG', 'WEBP', 'AVIF'];

export function FormatConverterDialog({
  currentFormat,
  onConfirm,
  onCancel,
}: FormatConverterDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>(
    AVAILABLE_FORMATS.includes(currentFormat) ? currentFormat : 'PNG'
  );
  const [quality, setQuality] = useState<number>(90);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [pendingSaveAsCopy, setPendingSaveAsCopy] = useState<boolean>(false);

  const supportsQuality = QUALITY_SUPPORTED_FORMATS.includes(selectedFormat);

  const handleFormatChange = (format: ImageFormat) => {
    setSelectedFormat(format);
    setError(null);
  };

  const handleQualityChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setQuality(Math.max(1, Math.min(100, numValue)));
    }
    setError(null);
  };

  const validateInputs = (): boolean => {
    if (!selectedFormat) {
      setError('Please select a target format');
      return false;
    }

    if (supportsQuality) {
      if (quality < 1 || quality > 100) {
        setError('Quality must be between 1 and 100');
        return false;
      }
    }

    return true;
  };

  const handleConfirm = async (saveAsCopy: boolean) => {
    if (!validateInputs()) {
      return;
    }

    // Show confirmation dialog if saving (overwriting)
    if (!saveAsCopy) {
      setPendingSaveAsCopy(saveAsCopy);
      setShowConfirm(true);
      return;
    }

    await executeConvert(saveAsCopy);
  };

  const executeConvert = async (saveAsCopy: boolean) => {
    setIsProcessing(true);
    setError(null);

    try {
      const options: ConversionOptions | undefined = supportsQuality
        ? { quality }
        : undefined;

      await onConfirm(selectedFormat, saveAsCopy, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert format');
      setIsProcessing(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    setShowConfirm(false);
    await executeConvert(pendingSaveAsCopy);
  };

  const handleCancelOverwrite = () => {
    setShowConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm(false); // Default to save (overwrite)
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

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
      
      <div className="dialog-overlay" onClick={onCancel}>
        <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
          <h2>格式转换</h2>

        <div className="dialog-body">
          <div className="current-format">
            <p>Current format: <strong>{currentFormat}</strong></p>
          </div>

          <div className="format-selection">
            <label>Target Format</label>
            <div className="format-grid">
              {AVAILABLE_FORMATS.map((format) => (
                <button
                  key={format}
                  className={`format-option ${selectedFormat === format ? 'selected' : ''}`}
                  onClick={() => handleFormatChange(format)}
                  disabled={isProcessing}
                  type="button"
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {supportsQuality && (
            <div className="quality-control">
              <label htmlFor="quality-input">
                Quality ({quality})
                <span className="quality-hint">Higher = better quality, larger file</span>
              </label>
              <div className="quality-input-group">
                <input
                  id="quality-input"
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => handleQualityChange(e.target.value)}
                  disabled={isProcessing}
                  className="quality-slider"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => handleQualityChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isProcessing}
                  className="quality-number"
                />
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="format-info">
            <p className="info-text">
              {selectedFormat === 'PNG' && 'PNG: Lossless compression, supports transparency'}
              {selectedFormat === 'JPEG' && 'JPEG: Lossy compression, best for photos, no transparency'}
              {selectedFormat === 'GIF' && 'GIF: Limited colors, supports animation and transparency'}
              {selectedFormat === 'BMP' && 'BMP: Uncompressed, large file size'}
              {selectedFormat === 'WEBP' && 'WEBP: Modern format, good compression, supports transparency'}
              {selectedFormat === 'TIFF' && 'TIFF: High quality, large file size, used in professional imaging'}
              {selectedFormat === 'ICO' && 'ICO: Icon format, typically small sizes'}
              {selectedFormat === 'AVIF' && 'AVIF: Modern format, excellent compression, supports transparency'}
            </p>
          </div>
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
    </>
  );
}
