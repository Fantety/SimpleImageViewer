import { useState } from 'react';
import { OcrIcon } from './icons';
import './OcrDialog.css';

interface OcrDialogProps {
  text: string;
  onClose: () => void;
  onCopy: () => void;
}

export function OcrDialog({ text, onClose, onCopy }: OcrDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ocr-dialog-overlay" onClick={onClose}>
      <div className="ocr-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ocr-dialog-header">
          <div className="ocr-dialog-title">
            <OcrIcon size={20} />
            <h3>识别结果</h3>
          </div>
          <button className="ocr-dialog-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="ocr-dialog-content">
          {text ? (
            <textarea
              className="ocr-dialog-textarea"
              value={text}
              readOnly
              rows={15}
            />
          ) : (
            <div className="ocr-dialog-empty">
              <p>未识别到文字</p>
            </div>
          )}
        </div>

        <div className="ocr-dialog-footer">
          <button className="ocr-dialog-button-close" onClick={onClose}>
            关闭
          </button>
          {text && (
            <button 
              className="ocr-dialog-button-copy" 
              onClick={handleCopy}
            >
              {copied ? '已复制' : '复制文本'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
