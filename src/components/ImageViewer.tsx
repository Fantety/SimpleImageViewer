import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { useNotification } from '../contexts/NotificationContext';
import { useImageNavigation } from '../hooks/useImageNavigation';
import { loadImage, openFileDialog, getDirectoryImages, resizeImage, convertFormat, cropImage, setBackground, saveImage, saveFileDialog } from '../api/tauri';
import type { ImageFormat, ConversionOptions, RGBColor } from '../types/tauri';
import { Icon } from './Icon';
import { Toolbar } from './Toolbar';
import { ResizeDialog } from './ResizeDialog';
import { FormatConverterDialog } from './FormatConverterDialog';
import { CropDialog } from './CropDialog';
import { BackgroundSetterDialog } from './BackgroundSetterDialog';
import { ErrorBoundary } from './ErrorBoundary';
import { logError } from '../utils/errorLogger';
import './ImageViewer.css';

/**
 * ImageViewer Component
 * 
 * Main view component responsible for:
 * - Displaying images with adaptive scaling
 * - Showing loading and error states
 * - Providing navigation controls (prev/next)
 * - Handling file opening
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5, 8.1, 8.3, 8.4
 */
export const ImageViewer: React.FC = () => {
  const {
    state,
    setCurrentImage,
    updateCurrentImagePath,
    addToHistory,
    setDirectoryImages,
    setCurrentImageIndex,
    setLoading,
    setError,
    clearError,
  } = useAppState();

  const { showSuccess, showError } = useNotification();

  const {
    goToPrevious,
    goToNext,
    canNavigate,
    currentIndex,
    totalImages,
  } = useImageNavigation();

  const [imageScale, setImageScale] = useState<number>(1);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [showResizeDialog, setShowResizeDialog] = useState<boolean>(false);
  const [showFormatConverterDialog, setShowFormatConverterDialog] = useState<boolean>(false);
  const [showCropDialog, setShowCropDialog] = useState<boolean>(false);
  const [showBackgroundSetterDialog, setShowBackgroundSetterDialog] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [operationName, setOperationName] = useState<string>('');
  
  // Performance optimization: debounce resize calculations
  const resizeTimeoutRef = useRef<number | null>(null);

  /**
   * Calculate adaptive scaling for the image to fit within the container
   * while maintaining aspect ratio (Requirement 1.4)
   * 
   * Performance optimization: Uses requestAnimationFrame for smooth updates
   */
  const calculateImageScale = useCallback(() => {
    if (!imageContainerRef.current || !state.currentImage) {
      return;
    }

    // Use requestAnimationFrame for smooth, optimized updates
    requestAnimationFrame(() => {
      if (!imageContainerRef.current || !state.currentImage) {
        return;
      }

      const container = imageContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const imageWidth = state.currentImage.width;
      const imageHeight = state.currentImage.height;

      // Calculate scale to fit image within container while maintaining aspect ratio
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

      setImageScale(scale);
    });
  }, [state.currentImage]);

  /**
   * Recalculate scale when image changes or window resizes
   * Performance optimization: Debounce resize events to avoid excessive calculations
   */
  useEffect(() => {
    calculateImageScale();

    const handleResize = () => {
      // Clear existing timeout
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce resize calculations (wait 100ms after last resize event)
      resizeTimeoutRef.current = window.setTimeout(() => {
        calculateImageScale();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [calculateImageScale]);

  /**
   * Handle opening a file dialog and loading the selected image
   * (Requirement 1.1)
   * 
   * Performance optimization: Shows progress indicator for better UX
   */
  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('打开图片');

      const filePath = await openFileDialog();
      
      if (!filePath) {
        // User cancelled the dialog
        setLoading(false);
        setLoadingProgress(0);
        setOperationName('');
        return;
      }

      // Simulate progress for better UX (actual loading is fast but feels better with feedback)
      setLoadingProgress(30);

      // Load the selected image
      const imageData = await loadImage(filePath);
      setLoadingProgress(60);

      // Get the directory path and load all images in that directory
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const dirImages = await getDirectoryImages(dirPath);
      setLoadingProgress(80);

      // Find the index of the current image in the directory
      const imageIndex = dirImages.findIndex(path => path === filePath);

      // Update state
      setDirectoryImages(dirImages);
      setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
      setCurrentImage(imageData);
      addToHistory(imageData);
      setLoadingProgress(100);

    } catch (err) {
      // Handle loading errors (Requirement 1.3)
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to load image', error, 'ImageViewer', { operation: 'openFile' });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [
    setLoading,
    clearError,
    setCurrentImage,
    addToHistory,
    setDirectoryImages,
    setCurrentImageIndex,
    setError,
  ]);

  /**
   * Handle resize operation
   * Opens the resize dialog (Requirement 2.1)
   */
  const handleResize = useCallback(() => {
    if (state.currentImage) {
      setShowResizeDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle resize confirmation
   * Performs the resize operation and updates the image (Requirements 2.2, 2.3, 2.4, 2.5)
   */
  const handleResizeConfirm = useCallback(async (
    width: number,
    height: number,
    keepAspectRatio: boolean
  ) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('调整尺寸');

      setLoadingProgress(30);

      // Call the resize API
      const resizedImage = await resizeImage(
        state.currentImage,
        width,
        height,
        keepAspectRatio
      );

      setLoadingProgress(80);

      // Update state with the resized image
      setCurrentImage(resizedImage);
      addToHistory(resizedImage);

      setLoadingProgress(100);

      // Close the dialog
      setShowResizeDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '调整尺寸失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to resize image', error, 'ImageViewer', { operation: 'resize', width, height, keepAspectRatio });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError]);

  /**
   * Handle resize cancellation
   */
  const handleResizeCancel = useCallback(() => {
    setShowResizeDialog(false);
  }, []);

  /**
   * Handle format conversion operation
   * Opens the format converter dialog (Requirement 3.1)
   */
  const handleConvert = useCallback(() => {
    if (state.currentImage) {
      setShowFormatConverterDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle format conversion confirmation
   * Performs the conversion and updates the image (Requirements 3.2, 3.3, 3.4, 3.5)
   */
  const handleConvertConfirm = useCallback(async (
    targetFormat: ImageFormat,
    options?: ConversionOptions
  ) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('格式转换');

      setLoadingProgress(30);

      // Call the convert format API
      const convertedImage = await convertFormat(
        state.currentImage,
        targetFormat,
        options
      );

      setLoadingProgress(80);

      // Update state with the converted image
      setCurrentImage(convertedImage);
      addToHistory(convertedImage);

      setLoadingProgress(100);

      // Close the dialog
      setShowFormatConverterDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '格式转换失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to convert format', error, 'ImageViewer', { operation: 'convert', targetFormat, options });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError]);

  /**
   * Handle format converter cancellation
   */
  const handleConvertCancel = useCallback(() => {
    setShowFormatConverterDialog(false);
  }, []);

  /**
   * Handle crop operation
   * Opens the crop dialog (Requirement 4.1)
   */
  const handleCrop = useCallback(() => {
    if (state.currentImage) {
      setShowCropDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle crop confirmation
   * Performs the crop operation and updates the image (Requirements 4.2, 4.3, 4.4, 4.5)
   */
  const handleCropConfirm = useCallback(async (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('裁剪图片');

      setLoadingProgress(30);

      // Call the crop API
      const croppedImage = await cropImage(
        state.currentImage,
        x,
        y,
        width,
        height
      );

      setLoadingProgress(80);

      // Update state with the cropped image
      setCurrentImage(croppedImage);
      addToHistory(croppedImage);

      setLoadingProgress(100);

      // Close the dialog
      setShowCropDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '裁剪失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to crop image', error, 'ImageViewer', { operation: 'crop', x, y, width, height });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError]);

  /**
   * Handle crop cancellation
   */
  const handleCropCancel = useCallback(() => {
    setShowCropDialog(false);
  }, []);

  /**
   * Handle set background operation
   * Opens the background setter dialog (Requirements 5.1, 5.2)
   */
  const handleSetBackground = useCallback(() => {
    if (state.currentImage) {
      setShowBackgroundSetterDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle background setting confirmation
   * Applies the background color to transparent areas (Requirements 5.3, 5.4, 5.5)
   */
  const handleSetBackgroundConfirm = useCallback(async (color: RGBColor) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('设置背景');

      setLoadingProgress(30);

      // Call the set background API
      const imageWithBackground = await setBackground(
        state.currentImage,
        color.r,
        color.g,
        color.b
      );

      setLoadingProgress(80);

      // Update state with the image with background applied
      setCurrentImage(imageWithBackground);
      addToHistory(imageWithBackground);

      setLoadingProgress(100);

      // Close the dialog
      setShowBackgroundSetterDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置背景失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to set background', error, 'ImageViewer', { operation: 'setBackground', color });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError]);

  /**
   * Handle background setter cancellation
   */
  const handleSetBackgroundCancel = useCallback(() => {
    setShowBackgroundSetterDialog(false);
  }, []);

  /**
   * Handle save operation
   * Opens save dialog and saves the current image (Requirements 6.1, 6.2, 6.3, 6.4, 6.5)
   */
  const handleSave = useCallback(async () => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('保存图片');

      // Generate default filename from current path
      const currentPath = state.currentImage.path;
      const fileName = currentPath.split('/').pop() || 'image';
      
      setLoadingProgress(20);

      // Open save file dialog
      const savePath = await saveFileDialog(fileName);
      
      if (!savePath) {
        // User cancelled the dialog
        setLoading(false);
        setLoadingProgress(0);
        setOperationName('');
        return;
      }

      setLoadingProgress(50);

      // Save the image
      await saveImage(state.currentImage, savePath);

      setLoadingProgress(90);

      // Update the current image path to the new location (Requirement 6.5)
      updateCurrentImagePath(savePath);

      setLoadingProgress(100);

      // Show success notification (Requirement 6.5)
      showSuccess('保存成功', `图片已保存到 ${savePath.split('/').pop()}`);

    } catch (err) {
      // Handle save errors (Requirement 6.4)
      const errorMessage = err instanceof Error ? err.message : '保存图片失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      
      // Log the error
      logError('Failed to save image', error, 'ImageViewer', { operation: 'save' });
      
      // Show error notification (Requirement 6.4)
      showError('保存失败', errorMessage);
      
      // Also set error state for consistency
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [
    state.currentImage,
    setLoading,
    clearError,
    updateCurrentImagePath,
    setError,
    showSuccess,
    showError,
  ]);

  /**
   * Handle keyboard shortcuts (Requirement 8.5)
   * 
   * Supported shortcuts:
   * - Ctrl/Cmd + O: Open file dialog
   * - Ctrl/Cmd + S: Save current image
   * - Arrow Left (←): Navigate to previous image
   * - Arrow Right (→): Navigate to next image
   * 
   * Performance: All shortcuts respond within 100ms for optimal UX
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation shortcuts (only when multiple images are available)
      if (e.key === 'ArrowLeft' && canNavigate) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight' && canNavigate) {
        e.preventDefault();
        goToNext();
      } 
      // File operations (Ctrl/Cmd + key)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.currentImage) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, goToPrevious, goToNext, handleOpenFile, handleSave, state.currentImage]);

  return (
    <div className="image-viewer">
      {/* Toolbar with edit operations and theme toggle */}
      <ErrorBoundary
        isolationName="Toolbar"
        onError={(error) => logError("Toolbar error", error, "Toolbar")}
      >
        <Toolbar
          onResize={handleResize}
          onConvert={handleConvert}
          onCrop={handleCrop}
          onSetBackground={handleSetBackground}
          onSave={handleSave}
          disabled={!state.currentImage || state.isLoading}
          hasAlpha={state.currentImage?.hasAlpha || false}
        />
      </ErrorBoundary>

      {/* Header with open button and image info */}
      <div className="image-viewer-header">
        <button 
          className="open-button"
          onClick={handleOpenFile}
          disabled={state.isLoading}
          title="打开图片 (Ctrl+O)"
        >
          <Icon name="open" size={20} />
          <span>打开图片</span>
        </button>

        {state.currentImage && (
          <div className="image-info">
            <span className="image-name">
              {state.currentImage.path.split('/').pop()}
            </span>
            <span className="image-meta">
              {state.currentImage.width} × {state.currentImage.height} · {state.currentImage.format}
              {state.currentImage.hasAlpha && ' · 透明'}
            </span>
            {canNavigate && (
              <span className="image-position">
                {currentIndex + 1} / {totalImages}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main image display area */}
      <div className="image-viewer-content" ref={imageContainerRef}>
        {/* Loading state with progress indicator (Requirement 8.3, 8.5) */}
        {state.isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{operationName || '加载中'}...</p>
            {loadingProgress > 0 && (
              <div className="loading-progress">
                <div className="loading-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
              </div>
            )}
          </div>
        )}

        {/* Error state (Requirement 1.3, 8.3) */}
        {state.error && !state.isLoading && (
          <div className="error-state">
            <p className="error-message">{state.error}</p>
            <button onClick={clearError} className="error-dismiss">
              关闭
            </button>
          </div>
        )}

        {/* Empty state */}
        {!state.currentImage && !state.isLoading && !state.error && (
          <div className="empty-state">
            <Icon name="open" size={64} color="var(--color-text-secondary)" />
            <p>点击&ldquo;打开图片&rdquo;或按 Ctrl+O 开始</p>
          </div>
        )}

        {/* Image display with adaptive scaling (Requirement 1.4) */}
        {state.currentImage && !state.isLoading && !state.error && (
          <div className="image-container">
            <img
              ref={imageRef}
              src={`data:image/${state.currentImage.format.toLowerCase()};base64,${state.currentImage.data}`}
              alt={state.currentImage.path}
              className="main-image"
              style={{
                width: `${state.currentImage.width * imageScale}px`,
                height: `${state.currentImage.height * imageScale}px`,
              }}
              onLoad={calculateImageScale}
            />
          </div>
        )}
      </div>

      {/* Navigation controls (Requirement 1.5) */}
      {canNavigate && state.currentImage && !state.isLoading && (
        <div className="image-viewer-navigation">
          <button
            className="nav-button nav-prev"
            onClick={goToPrevious}
            title="上一张 (←)"
          >
            <Icon name="prev" size={24} />
          </button>
          <button
            className="nav-button nav-next"
            onClick={goToNext}
            title="下一张 (→)"
          >
            <Icon name="next" size={24} />
          </button>
        </div>
      )}

      {/* Resize Dialog */}
      {showResizeDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="ResizeDialog"
          onError={(error) => {
            logError("Resize dialog error", error, "ResizeDialog");
            setShowResizeDialog(false);
          }}
        >
          <ResizeDialog
            currentWidth={state.currentImage.width}
            currentHeight={state.currentImage.height}
            onConfirm={handleResizeConfirm}
            onCancel={handleResizeCancel}
          />
        </ErrorBoundary>
      )}

      {/* Format Converter Dialog */}
      {showFormatConverterDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="FormatConverterDialog"
          onError={(error) => {
            logError("Format converter dialog error", error, "FormatConverterDialog");
            setShowFormatConverterDialog(false);
          }}
        >
          <FormatConverterDialog
            currentFormat={state.currentImage.format}
            onConfirm={handleConvertConfirm}
            onCancel={handleConvertCancel}
          />
        </ErrorBoundary>
      )}

      {/* Crop Dialog */}
      {showCropDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="CropDialog"
          onError={(error) => {
            logError("Crop dialog error", error, "CropDialog");
            setShowCropDialog(false);
          }}
        >
          <CropDialog
            imageData={state.currentImage}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        </ErrorBoundary>
      )}

      {/* Background Setter Dialog */}
      {showBackgroundSetterDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="BackgroundSetterDialog"
          onError={(error) => {
            logError("Background setter dialog error", error, "BackgroundSetterDialog");
            setShowBackgroundSetterDialog(false);
          }}
        >
          <BackgroundSetterDialog
            hasAlpha={state.currentImage.hasAlpha}
            onConfirm={handleSetBackgroundConfirm}
            onCancel={handleSetBackgroundCancel}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};
