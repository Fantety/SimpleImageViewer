import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAppState } from '../contexts/AppStateContext';
import { useNotification } from '../contexts/NotificationContext';
import { useImageNavigation } from '../hooks/useImageNavigation';
import { useImageZoom } from '../hooks/useImageZoom';
import { loadImage, openFileDialog, getDirectoryImages, resizeImage, convertFormat, cropImage, setBackground, rotateImage, saveImage, saveFileDialog, isFavorite, removeFavorite, getAllFavorites, applyStickers, applyTexts } from '../api/tauri';
import type { ImageFormat, ConversionOptions, RGBColor, StickerData, TextData } from '../types/tauri';
import { Icon } from './Icon';
import { Toolbar } from './Toolbar';
import { ResizeDialog } from './ResizeDialog';
import { FormatConverterDialog } from './FormatConverterDialog';
import { CropDialog } from './CropDialog';
import { BackgroundSetterDialog } from './BackgroundSetterDialog';
import { StickerDialog } from './StickerDialog';
import { TextDialog } from './TextDialog';
import { FavoritesSidebar } from './FavoritesSidebar';
import { AddFavoriteDialog } from './AddFavoriteDialog';
import { ErrorBoundary } from './ErrorBoundary';
import { logError } from '../utils/errorLogger';
import './ImageViewer.css';

// Module-level flag to prevent double registration of drag-drop listener
// This is necessary because React Strict Mode may mount components twice in development
let dragDropListenerRegistered = false;
let dragDropUnlistenFn: (() => void) | undefined = undefined;

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
  
  // Zoom and pan functionality
  const {
    zoom,
    position,
    isDragging: isImageDragging,
    handleWheel,
    handleMouseDown: handleImageMouseDown,
    resetZoom,
    zoomIn,
    zoomOut,
  } = useImageZoom({ minZoom: 0.5, maxZoom: 5, zoomStep: 0.2 });
  const [showResizeDialog, setShowResizeDialog] = useState<boolean>(false);
  const [showFormatConverterDialog, setShowFormatConverterDialog] = useState<boolean>(false);
  const [showCropDialog, setShowCropDialog] = useState<boolean>(false);
  const [showBackgroundSetterDialog, setShowBackgroundSetterDialog] = useState<boolean>(false);
  const [showStickerDialog, setShowStickerDialog] = useState<boolean>(false);
  const [showTextDialog, setShowTextDialog] = useState<boolean>(false);
  const [showFavoritesSidebar, setShowFavoritesSidebar] = useState<boolean>(false);
  const [showAddFavoriteDialog, setShowAddFavoriteDialog] = useState<boolean>(false);
  const [isCurrentImageFavorite, setIsCurrentImageFavorite] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [operationName, setOperationName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Performance optimization: debounce resize calculations
  const resizeTimeoutRef = useRef<number | null>(null);
  
  // Store notification functions in refs to avoid recreating loadImageFromPath
  const showSuccessRef = useRef(showSuccess);
  const showErrorRef = useRef(showError);
  
  // Update refs when functions change
  useEffect(() => {
    showSuccessRef.current = showSuccess;
    showErrorRef.current = showError;
  }, [showSuccess, showError]);

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
   * Load an image from a file path
   * Common function used by both file dialog and drag-and-drop
   */
  const loadImageFromPath = useCallback(async (filePath: string, showNotification: boolean = true) => {
    const callId = Math.random().toString(36).substring(7);
    console.log(`[${callId}] loadImageFromPath called with:`, { filePath, showNotification });
    
    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('打开图片');

      // Simulate progress for better UX
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
      
      // Reset zoom when loading new image
      resetZoom();

      // Only show notification if requested (to avoid duplicates in drag-and-drop)
      console.log(`[${callId}] showNotification flag:`, showNotification);
      if (showNotification) {
        console.log(`[${callId}] Calling showSuccess from loadImageFromPath`);
        showSuccessRef.current('加载成功', `已打开 ${filePath.split('/').pop()}`);
      } else {
        console.log(`[${callId}] Skipping notification (showNotification=false)`);
      }
    } catch (err) {
      // Handle loading errors (Requirement 1.3)
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to load image', error, 'ImageViewer', { operation: 'loadImage', filePath });
      setError(errorMessage);
      showErrorRef.current('加载失败', errorMessage);
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
    resetZoom,
  ]);

  /**
   * Handle opening a file dialog and loading the selected image
   * (Requirement 1.1)
   * 
   * Performance optimization: Shows progress indicator for better UX
   */
  const handleOpenFile = useCallback(async () => {
    const filePath = await openFileDialog();
    
    if (!filePath) {
      // User cancelled the dialog
      return;
    }

    await loadImageFromPath(filePath);
  }, [loadImageFromPath]);

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
    keepAspectRatio: boolean,
    saveAsCopy: boolean
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

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const defaultName = `${fileNameWithoutExt}_resized${ext}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          setShowResizeDialog(false);
          return;
        }

        setLoadingProgress(80);
        await saveImage(resizedImage, savePath);
        showSuccess('保存成功', `图片已保存到 ${savePath.split('/').pop()}`);
      } else {
        // Save (overwrite) - update current image
        setLoadingProgress(80);
        await saveImage(resizedImage, state.currentImage.path);
        setCurrentImage(resizedImage);
        addToHistory(resizedImage);
        showSuccess('保存成功', '图片已更新');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowResizeDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '调整尺寸失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to resize image', error, 'ImageViewer', { operation: 'resize', width, height, keepAspectRatio, saveAsCopy });
      setError(errorMessage);
      showError('操作失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

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
    saveAsCopy: boolean,
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

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const newExt = `.${targetFormat.toLowerCase()}`;
        const defaultName = `${fileNameWithoutExt}${newExt}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          setShowFormatConverterDialog(false);
          return;
        }

        setLoadingProgress(80);
        await saveImage(convertedImage, savePath);
        showSuccess('保存成功', `图片已保存到 ${savePath.split('/').pop()}`);
      } else {
        // Save (overwrite) - update current image
        setLoadingProgress(80);
        await saveImage(convertedImage, state.currentImage.path);
        setCurrentImage(convertedImage);
        addToHistory(convertedImage);
        showSuccess('保存成功', '图片已更新');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowFormatConverterDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '格式转换失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to convert format', error, 'ImageViewer', { operation: 'convert', targetFormat, saveAsCopy, options });
      setError(errorMessage);
      showError('操作失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

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
    height: number,
    saveAsCopy: boolean
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

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const defaultName = `${fileNameWithoutExt}_cropped${ext}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          setShowCropDialog(false);
          return;
        }

        setLoadingProgress(80);
        await saveImage(croppedImage, savePath);
        showSuccess('保存成功', `图片已保存到 ${savePath.split('/').pop()}`);
      } else {
        // Save (overwrite) - update current image
        setLoadingProgress(80);
        await saveImage(croppedImage, state.currentImage.path);
        setCurrentImage(croppedImage);
        addToHistory(croppedImage);
        showSuccess('保存成功', '图片已更新');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowCropDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '裁剪失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to crop image', error, 'ImageViewer', { operation: 'crop', x, y, width, height, saveAsCopy });
      setError(errorMessage);
      showError('操作失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

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
  const handleSetBackgroundConfirm = useCallback(async (color: RGBColor, saveAsCopy: boolean) => {
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

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const defaultName = `${fileNameWithoutExt}_background${ext}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          setShowBackgroundSetterDialog(false);
          return;
        }

        setLoadingProgress(80);
        await saveImage(imageWithBackground, savePath);
        showSuccess('保存成功', `图片已保存到 ${savePath.split('/').pop()}`);
      } else {
        // Save (overwrite) - update current image
        setLoadingProgress(80);
        await saveImage(imageWithBackground, state.currentImage.path);
        setCurrentImage(imageWithBackground);
        addToHistory(imageWithBackground);
        showSuccess('保存成功', '图片已更新');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowBackgroundSetterDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置背景失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to set background', error, 'ImageViewer', { operation: 'setBackground', color, saveAsCopy });
      setError(errorMessage);
      showError('操作失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

  /**
   * Handle background setter cancellation
   */
  const handleSetBackgroundCancel = useCallback(() => {
    setShowBackgroundSetterDialog(false);
  }, []);

  /**
   * Handle sticker operation
   * Opens the sticker dialog
   */
  const handleSticker = useCallback(() => {
    if (state.currentImage) {
      setShowStickerDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle sticker confirmation
   * Applies stickers to the image
   */
  const handleStickerConfirm = useCallback(async (stickers: StickerData[], saveAsCopy: boolean) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('应用贴纸');

      setLoadingProgress(30);

      // Convert StickerData to the format expected by the API
      const stickerParams = stickers.map(sticker => ({
        image_data: sticker.imageData,
        x: Math.round(sticker.x),
        y: Math.round(sticker.y),
        width: Math.round(sticker.width),
        height: Math.round(sticker.height),
        rotation: sticker.rotation,
      }));

      // Apply stickers to the image
      const imageWithStickers = await applyStickers(state.currentImage, stickerParams);

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const defaultName = `${fileNameWithoutExt}_with_stickers${ext}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          return;
        }

        setLoadingProgress(80);

        // Save to the new path
        await saveImage(imageWithStickers, savePath);
        
        showSuccess('保存成功', `贴纸已应用并保存到 ${savePath.split('/').pop()}`);
      } else {
        setLoadingProgress(80);

        // Save to the original path (overwrite)
        await saveImage(imageWithStickers, state.currentImage.path);
        
        // Update state with the modified image
        setCurrentImage(imageWithStickers);
        addToHistory(imageWithStickers);
        showSuccess('保存成功', '贴纸已应用并保存');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowStickerDialog(false);
    } catch (err) {
      console.error('Sticker application error details:', err);
      const errorMessage = err instanceof Error ? err.message : '应用贴纸失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to apply stickers', error, 'ImageViewer', { 
        operation: 'applyStickers', 
        saveAsCopy, 
        stickerCount: stickers.length
      });
      setError(errorMessage);
      showError('操作失败', `${errorMessage} - 请检查控制台获取详细信息`);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

  /**
   * Handle sticker cancellation
   */
  const handleStickerCancel = useCallback(() => {
    setShowStickerDialog(false);
  }, []);

  /**
   * Opens the text dialog
   */
  const handleText = useCallback(() => {
    if (state.currentImage) {
      setShowTextDialog(true);
    }
  }, [state.currentImage]);

  /**
   * Handle text confirmation
   * Applies text to the image
   */
  const handleTextConfirm = useCallback(async (texts: TextData[], saveAsCopy: boolean) => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('应用文字');

      setLoadingProgress(30);

      // Convert TextData to the format expected by the API
      const textParams = texts.map(text => ({
        text: text.text,
        x: Math.round(text.x),
        y: Math.round(text.y),
        font_size: text.fontSize,
        font_family: text.fontFamily,
        color: text.color,
        rotation: text.rotation,
      }));

      // Apply texts to the image
      const imageWithTexts = await applyTexts(state.currentImage, textParams);

      setLoadingProgress(60);

      if (saveAsCopy) {
        // Save as copy - open save dialog
        const currentPath = state.currentImage.path;
        const fileName = currentPath.split('/').pop() || 'image';
        const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const defaultName = `${fileNameWithoutExt}_with_text${ext}`;
        
        const savePath = await saveFileDialog(defaultName);
        
        if (!savePath) {
          // User cancelled
          setLoading(false);
          setLoadingProgress(0);
          setOperationName('');
          return;
        }

        setLoadingProgress(80);

        // Save to the new path
        await saveImage(imageWithTexts, savePath);
        
        showSuccess('保存成功', `文字已应用并保存到 ${savePath.split('/').pop()}`);
      } else {
        setLoadingProgress(80);

        // Save to the original path (overwrite)
        await saveImage(imageWithTexts, state.currentImage.path);
        
        // Update state with the modified image
        setCurrentImage(imageWithTexts);
        addToHistory(imageWithTexts);
        showSuccess('保存成功', '文字已应用并保存');
      }

      setLoadingProgress(100);

      // Close the dialog
      setShowTextDialog(false);
    } catch (err) {
      console.error('Text application error details:', err);
      const errorMessage = err instanceof Error ? err.message : '应用文字失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to apply texts', error, 'ImageViewer', { 
        operation: 'applyTexts', 
        saveAsCopy, 
        textCount: texts.length
      });
      setError(errorMessage);
      showError('操作失败', `${errorMessage} - 请检查控制台获取详细信息`);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

  /**
   * Handle text cancellation
   */
  const handleTextCancel = useCallback(() => {
    setShowTextDialog(false);
  }, []);

  /**
   * Handle rotate left (counter-clockwise 90°)
   * Rotates the image and automatically saves it
   */
  const handleRotateLeft = useCallback(async () => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('旋转图片');

      setLoadingProgress(30);

      // Rotate the image counter-clockwise
      const rotatedImage = await rotateImage(state.currentImage, false);

      setLoadingProgress(60);

      // Save the rotated image to the original path
      await saveImage(rotatedImage, state.currentImage.path);

      setLoadingProgress(80);

      // Update state with the rotated image
      setCurrentImage(rotatedImage);
      addToHistory(rotatedImage);

      setLoadingProgress(100);

      showSuccess('旋转成功', '图片已逆时针旋转90°并保存');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '旋转失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to rotate image left', error, 'ImageViewer', { operation: 'rotateLeft' });
      setError(errorMessage);
      showError('旋转失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

  /**
   * Handle rotate right (clockwise 90°)
   * Rotates the image and automatically saves it
   */
  const handleRotateRight = useCallback(async () => {
    if (!state.currentImage) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      setLoadingProgress(0);
      setOperationName('旋转图片');

      setLoadingProgress(30);

      // Rotate the image clockwise
      const rotatedImage = await rotateImage(state.currentImage, true);

      setLoadingProgress(60);

      // Save the rotated image to the original path
      await saveImage(rotatedImage, state.currentImage.path);

      setLoadingProgress(80);

      // Update state with the rotated image
      setCurrentImage(rotatedImage);
      addToHistory(rotatedImage);

      setLoadingProgress(100);

      showSuccess('旋转成功', '图片已顺时针旋转90°并保存');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '旋转失败';
      const error = err instanceof Error ? err : new Error(errorMessage);
      logError('Failed to rotate image right', error, 'ImageViewer', { operation: 'rotateRight' });
      setError(errorMessage);
      showError('旋转失败', errorMessage);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setOperationName('');
    }
  }, [state.currentImage, setLoading, clearError, setCurrentImage, addToHistory, setError, showSuccess, showError]);

  /**
   * Check if current image is favorited
   */
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (state.currentImage) {
        try {
          const favorited = await isFavorite(state.currentImage.path);
          setIsCurrentImageFavorite(favorited);
        } catch (error) {
          console.error('Failed to check favorite status:', error);
        }
      } else {
        setIsCurrentImageFavorite(false);
      }
    };

    checkFavoriteStatus();
  }, [state.currentImage]);

  /**
   * Handle toggle favorite
   */
  const handleToggleFavorite = useCallback(async () => {
    if (!state.currentImage) {
      return;
    }

    if (isCurrentImageFavorite) {
      // Remove from favorites
      try {
        await removeFavorite(state.currentImage.path);
        setIsCurrentImageFavorite(false);
        showSuccess('取消收藏', '已从收藏夹中移除');
      } catch (error) {
        console.error('Failed to remove favorite:', error);
        showError('操作失败', '取消收藏失败');
      }
    } else {
      // Show add favorite dialog
      setShowAddFavoriteDialog(true);
    }
  }, [state.currentImage, isCurrentImageFavorite, showSuccess, showError]);

  /**
   * Handle open favorites sidebar
   */
  const handleOpenFavorites = useCallback(() => {
    setShowFavoritesSidebar(true);
  }, []);

  /**
   * Handle select image from favorites
   */
  const handleSelectFavoriteImage = useCallback(async (path: string) => {
    setShowFavoritesSidebar(false);
    await loadImageFromPath(path);
  }, [loadImageFromPath]);

  /**
   * Handle add favorite success
   */
  const handleAddFavoriteSuccess = useCallback(() => {
    setIsCurrentImageFavorite(true);
    showSuccess('添加成功', '已添加到收藏夹');
  }, [showSuccess]);



  /**
   * Load favorites on startup
   */
  useEffect(() => {
    const loadInitialFavorites = async () => {
      try {
        const favorites = await getAllFavorites();
        if (favorites.length > 0 && !state.currentImage) {
          // Load the first favorite image
          await loadImageFromPath(favorites[0].path, false);
        }
      } catch (error) {
        console.error('Failed to load initial favorites:', error);
      }
    };

    loadInitialFavorites();
  }, []); // Only run once on mount

  /**
   * Handle keyboard shortcuts (Requirement 8.5)
   * 
   * Supported shortcuts:
   * - Ctrl/Cmd + O: Open file dialog
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, goToPrevious, goToNext, handleOpenFile]);

  /**
   * Handle drag and drop for image files using Tauri webview events
   * Allows users to drag image files into the application window
   * 
   * Uses module-level flag to prevent double registration in React Strict Mode
   */
  useEffect(() => {
    // Prevent double registration using module-level flag
    if (dragDropListenerRegistered) {
      console.log('Drag-drop listener already registered (module-level check), skipping...');
      return;
    }
    
    console.log('Registering drag-drop listener...');
    dragDropListenerRegistered = true;
    
    let lastProcessedPath: string | null = null;
    let lastProcessedTime = 0;
    let isProcessingDrop = false;
    let dropEventCounter = 0;

    // Set up Tauri file drop event listeners
    const setupListeners = async () => {
      try {
        const listenerId = Math.random().toString(36).substring(7);
        console.log(`[Listener ${listenerId}] Setting up drag and drop listeners...`);
        const webview = getCurrentWebviewWindow();
        
        // Single event listener for all drag/drop events
        const unlisten = await webview.onDragDropEvent((event) => {
          dropEventCounter++;
          console.log(`[Listener ${listenerId}] Drag event #${dropEventCounter}:`, event);
          
          if (event.payload.type === 'over') {
            console.log(`[Listener ${listenerId}] Drag over detected`);
            setIsDragging(true);
          } else if (event.payload.type === 'drop') {
            console.log(`[Listener ${listenerId}] File dropped:`, event.payload.paths);
            setIsDragging(false);
            
            // Prevent concurrent drop processing
            if (isProcessingDrop) {
              console.log('Already processing a drop, ignoring');
              return;
            }
            
            const paths = event.payload.paths;
            if (!paths || paths.length === 0) {
              console.log('No paths in drop event');
              return;
            }

            // Get the first file path
            const filePath = paths[0];
            const now = Date.now();
            
            // Prevent duplicate processing of the same file within 1 second
            if (filePath === lastProcessedPath && now - lastProcessedTime < 1000) {
              console.log('Duplicate drop event detected, ignoring:', filePath);
              return;
            }
            
            lastProcessedPath = filePath;
            lastProcessedTime = now;
            isProcessingDrop = true;
            
            console.log(`[Listener ${listenerId}] Processing file:`, filePath);
            
            // Check if it's an image file
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif', '.ico', '.heic', '.avif'];
            const fileName = filePath.toLowerCase();
            const isImage = imageExtensions.some(ext => fileName.endsWith(ext));

            if (!isImage) {
              console.log('File is not an image:', fileName);
              showErrorRef.current('不支持的文件', '请拖入图片文件（PNG、JPEG、GIF、BMP、WEBP、SVG、TIFF、ICO、HEIC、AVIF）');
              isProcessingDrop = false;
              return;
            }

            console.log('Loading image from path:', filePath);
            
            // Load the image without showing notification (to avoid duplicates)
            loadImageFromPath(filePath, false)
              .then(() => {
                console.log('Image loaded successfully');
                // Show success notification here instead
                const fileName = filePath.split('/').pop();
                console.log('About to show notification for:', fileName);
                showSuccessRef.current('加载成功', `已打开 ${fileName}`);
                console.log('Notification shown');
              })
              .catch((error) => {
                console.error('Error loading image:', error);
              })
              .finally(() => {
                // Reset processing flag after a short delay
                setTimeout(() => {
                  isProcessingDrop = false;
                  console.log('Drop processing flag reset');
                }, 500);
              });
          } else if (event.payload.type === 'leave') {
            console.log('Drag leave');
            setIsDragging(false);
          }
        });
        
        
        // Store unlisten function at module level
        dragDropUnlistenFn = unlisten;
        
        console.log('Drag and drop listeners set up successfully');
      } catch (error) {
        console.error('Error setting up drag and drop listeners:', error);
        logError('Failed to setup drag and drop', error instanceof Error ? error : new Error(String(error)), 'ImageViewer');
        dragDropListenerRegistered = false; // Allow retry on error
      }
    };

    setupListeners();

    // Cleanup listener on unmount
    // NOTE: We do NOT reset dragDropListenerRegistered here to prevent
    // React StrictMode from creating duplicate listeners during development
    return () => {
      console.log('Component unmounting, cleaning up drag and drop listener');
      if (dragDropUnlistenFn) {
        dragDropUnlistenFn();
        dragDropUnlistenFn = undefined;
      }
      // Do NOT reset dragDropListenerRegistered here - it stays true to prevent re-registration
    };
  }, []); // Empty dependency array - only set up once on mount

  return (
    <div className="image-viewer">
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <Icon name="open" size={64} color="var(--color-accent)" />
            <p className="drag-overlay-text">释放以打开图片</p>
          </div>
        </div>
      )}

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
          onSticker={handleSticker}
          onText={handleText}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onToggleFavorite={handleToggleFavorite}
          onOpenFavorites={handleOpenFavorites}
          disabled={!state.currentImage || state.isLoading}
          hasAlpha={state.currentImage?.hasAlpha || false}
          isFavorite={isCurrentImageFavorite}
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
            <p>点击&ldquo;打开图片&rdquo;、按 Ctrl+O 或拖入图片文件开始</p>
          </div>
        )}

        {/* Image display with adaptive scaling and zoom (Requirement 1.4) */}
        {state.currentImage && !state.isLoading && !state.error && (
          <div 
            className="image-container"
            onWheel={handleWheel}
            onMouseDown={handleImageMouseDown}
            style={{
              cursor: zoom > 1 ? (isImageDragging ? 'grabbing' : 'grab') : 'default',
              overflow: zoom > 1 ? 'hidden' : 'visible',
            }}
          >
            <img
              ref={imageRef}
              src={`data:image/${state.currentImage.format.toLowerCase()};base64,${state.currentImage.data}`}
              alt={state.currentImage.path}
              className="main-image"
              style={{
                width: `${state.currentImage.width * imageScale * zoom}px`,
                height: `${state.currentImage.height * imageScale * zoom}px`,
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isImageDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              onLoad={calculateImageScale}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      {state.currentImage && !state.isLoading && (
        <div className="zoom-controls">
          <button
            className="zoom-button"
            onClick={zoomOut}
            title="缩小 (-)"
            disabled={zoom <= 0.5}
          >
            <Icon name="minus" size={20} />
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="zoom-button"
            onClick={zoomIn}
            title="放大 (+)"
            disabled={zoom >= 5}
          >
            <Icon name="plus" size={20} />
          </button>
          <button
            className="zoom-button"
            onClick={resetZoom}
            title="重置缩放 (1:1)"
            disabled={zoom === 1}
          >
            <Icon name="reset" size={20} />
          </button>
        </div>
      )}

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

      {/* Sticker Dialog */}
      {showStickerDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="StickerDialog"
          onError={(error) => {
            logError("Sticker dialog error", error, "StickerDialog");
            setShowStickerDialog(false);
          }}
        >
          <StickerDialog
            imageData={state.currentImage}
            onConfirm={handleStickerConfirm}
            onCancel={handleStickerCancel}
          />
        </ErrorBoundary>
      )}

      {/* Text Dialog */}
      {showTextDialog && state.currentImage && (
        <ErrorBoundary
          isolationName="TextDialog"
          onError={(error) => {
            logError("Text dialog error", error, "TextDialog");
            setShowTextDialog(false);
          }}
        >
          <TextDialog
            imageData={state.currentImage}
            onConfirm={handleTextConfirm}
            onCancel={handleTextCancel}
          />
        </ErrorBoundary>
      )}

      {/* Favorites Sidebar */}
      <FavoritesSidebar
        isOpen={showFavoritesSidebar}
        onClose={() => setShowFavoritesSidebar(false)}
        onSelectImage={handleSelectFavoriteImage}
        currentImagePath={state.currentImage?.path}
      />

      {/* Add Favorite Dialog */}
      {showAddFavoriteDialog && state.currentImage && (
        <AddFavoriteDialog
          isOpen={showAddFavoriteDialog}
          imagePath={state.currentImage.path}
          onClose={() => setShowAddFavoriteDialog(false)}
          onSuccess={handleAddFavoriteSuccess}
        />
      )}


    </div>
  );
};
