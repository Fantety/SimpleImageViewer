import React from 'react';
import { Icon } from './Icon';
import { useTheme } from '../contexts/ThemeContext';
import './Toolbar.css';

/**
 * Toolbar Component
 * 
 * Provides access to all editing functions and theme switching.
 * 
 * Features:
 * - Edit operation buttons (resize, convert, crop, background)
 * - Theme toggle button
 * - Tooltips for all buttons
 * - Disabled state logic based on image availability
 * 
 * Note: Save functionality is integrated into each edit dialog (save/save as copy)
 * 
 * Requirements: 8.1, 8.2
 */

export interface ToolbarProps {
  onResize: () => void;
  onConvert: () => void;
  onCrop: () => void;
  onSetBackground: () => void;
  disabled: boolean;
  hasAlpha?: boolean; // For conditional background button enabling
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onResize,
  onConvert,
  onCrop,
  onSetBackground,
  disabled,
  hasAlpha = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="toolbar">
      <div className="toolbar-section toolbar-edit">
        <button
          className="toolbar-button"
          onClick={onResize}
          disabled={disabled}
          title="调整尺寸 - 改变图片的宽度和高度"
          aria-label="调整尺寸"
        >
          <Icon name="resize" size={20} />
          <span className="toolbar-button-label">调整尺寸</span>
        </button>

        <button
          className="toolbar-button"
          onClick={onConvert}
          disabled={disabled}
          title="格式转换 - 将图片转换为其他格式"
          aria-label="格式转换"
        >
          <Icon name="convert" size={20} />
          <span className="toolbar-button-label">格式转换</span>
        </button>

        <button
          className="toolbar-button"
          onClick={onCrop}
          disabled={disabled}
          title="裁剪 - 提取图片的特定区域"
          aria-label="裁剪"
        >
          <Icon name="crop" size={20} />
          <span className="toolbar-button-label">裁剪</span>
        </button>

        <button
          className="toolbar-button"
          onClick={onSetBackground}
          disabled={disabled || !hasAlpha}
          title={
            disabled
              ? "背景设置 - 为透明PNG设置背景色"
              : !hasAlpha
              ? "背景设置 - 仅适用于透明图片"
              : "背景设置 - 为透明区域设置背景色"
          }
          aria-label="背景设置"
        >
          <Icon name="background" size={20} />
          <span className="toolbar-button-label">背景设置</span>
        </button>
      </div>

      <div className="toolbar-section toolbar-settings">
        <button
          className="toolbar-button toolbar-button-icon-only"
          onClick={toggleTheme}
          title={theme === 'light' ? '切换到暗色模式' : '切换到浅色模式'}
          aria-label={theme === 'light' ? '切换到暗色模式' : '切换到浅色模式'}
        >
          <Icon name={theme === 'light' ? 'theme-dark' : 'theme-light'} size={20} />
        </button>
      </div>
    </div>
  );
};
