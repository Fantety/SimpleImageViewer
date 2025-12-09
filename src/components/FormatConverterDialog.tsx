import { useState } from 'react';
import type { ImageFormat, ConversionOptions } from '../types/tauri';
import './FormatConverterDialog.css';

interface FormatConverterDialogProps {
  currentFormat: ImageFormat;
  onConfirm: (targetFormat: ImageFormat, options?: ConversionOptions) => Promise<void>;
  onCancel: () => void;
}

// All supported formats for conversion (excluding SVG and HEIC)
const SUPPORTED_FORMATS: ImageFormat[] = [
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
  const [targetFormat, setTargetFormat] = useState<ImageFormat>(
    currentFormat === 'PNG' ? 'JPEG' : 'PNG'
  );
  const [quality, setQuality] = useState<string>('90');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const supportsQuality = QUALITY_SUPPORTED_FORMATS.includes(targetFormat);

  const validateQuality = (value: string): boolean => {
    if (!value) return false;
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 1 && num <= 100;
  };

  const handleConfirm = async () => {
    // Validate quality if applicable
    if (supportsQuality && !validateQuality(quality)) {
      setError('Quality must be between 1 and 100');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const options: ConversionOptions = {};
      if (supportsQuality) {
        options.quality = parseInt(quality, 10);
      }

      await onConfirm(targetFormat, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert format');
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
        <h2>Convert Format</h2>
        
        <div className="dialog-body">
          <div className="current-format">
            <p>Current format: <strong>{currentFormat}</strong></p>
          </div>

          <div className="input-group">
            <label htmlFor="format-select">Target Format</label>
            <select
              id="format-select"
              value={targetFormat}
              onChange={(e) => {
                setTargetFormat(e.target.value as ImageFormat);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              autoFocus
            >
              {SUPPORTED_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          {supportsQuality && (
            <div className="input-group">
              <label htmlFor="quality-input">
                Quality (1-100)
                <span className="label-hint">Higher = better quality, larger file</span>
              </label>
              <input
                id="quality-input"
                type="number"
                value={quality}
                onChange={(e) => {
                  setQuality(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                min="1"
                max="100"
                step="1"
                disabled={isProcessing}
              />
            </div>
          )}

          <div className="format-info">
            <p className="info-text">
              {getFormatDescription(targetFormat)}
            </p>
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
            {isProcessing ? 'Converting...' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getFormatDescription(format: ImageFormat): string {
  switch (format) {
    case 'PNG':
      return 'Lossless compression with transparency support. Best for graphics and screenshots.';
    case 'JPEG':
      return 'Lossy compression without transparency. Best for photographs.';
    case 'GIF':
      return 'Limited colors with transparency. Best for simple animations.';
    case 'BMP':
      return 'Uncompressed format. Large file size but maximum compatibility.';
    case 'WEBP':
      return 'Modern format with good compression. Supports both lossy and lossless.';
    case 'TIFF':
      return 'High-quality format often used in professional photography.';
    case 'ICO':
      return 'Icon format for Windows applications.';
    case 'AVIF':
      return 'Next-gen format with excellent compression. May have limited browser support.';
    default:
      return '';
  }
}
