import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { useImageNavigation } from '../hooks/useImageNavigation';
import { loadImage, openFileDialog, getDirectoryImages } from '../api/tauri';
import { Icon } from './Icon';
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
    addToHistory,
    setDirectoryImages,
    setCurrentImageIndex,
    setLoading,
    setError,
    clearError,
  } = useAppState();

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

  /**
   * Calculate adaptive scaling for the image to fit within the container
   * while maintaining aspect ratio (Requirement 1.4)
   */
  const calculateImageScale = useCallback(() => {
    if (!imageContainerRef.current || !imageRef.current || !state.currentImage) {
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
  }, [state.currentImage]);

  /**
   * Recalculate scale when image changes or window resizes
   */
  useEffect(() => {
    calculateImageScale();

    const handleResize = () => {
      calculateImageScale();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateImageScale]);

  /**
   * Handle opening a file dialog and loading the selected image
   * (Requirement 1.1)
   */
  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const filePath = await openFileDialog();
      
      if (!filePath) {
        // User cancelled the dialog
        setLoading(false);
        return;
      }

      // Load the selected image
      const imageData = await loadImage(filePath);

      // Get the directory path and load all images in that directory
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const dirImages = await getDirectoryImages(dirPath);

      // Find the index of the current image in the directory
      const imageIndex = dirImages.findIndex(path => path === filePath);

      // Update state
      setDirectoryImages(dirImages);
      setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
      setCurrentImage(imageData);
      addToHistory(imageData);

    } catch (err) {
      // Handle loading errors (Requirement 1.3)
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
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
   * Handle keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canNavigate) {
        goToPrevious();
      } else if (e.key === 'ArrowRight' && canNavigate) {
        goToNext();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, goToPrevious, goToNext, handleOpenFile]);

  return (
    <div className="image-viewer">
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
        {/* Loading state (Requirement 8.3) */}
        {state.isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
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
            <p>点击"打开图片"或按 Ctrl+O 开始</p>
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
    </div>
  );
};
