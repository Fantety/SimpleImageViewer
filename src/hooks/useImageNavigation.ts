import { useCallback } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { loadImage } from '../api/tauri';

/**
 * Custom hook for image navigation functionality
 */
export function useImageNavigation() {
  const {
    state,
    navigateImage,
    setCurrentImage,
    setLoading,
    setError,
    addToHistory,
  } = useAppState();

  /**
   * Navigate to the previous image in the directory
   */
  const goToPrevious = useCallback(async () => {
    if (state.directoryImages.length === 0) {
      return;
    }

    // Calculate the previous index
    const prevIndex = state.currentImageIndex <= 0
      ? state.directoryImages.length - 1
      : state.currentImageIndex - 1;

    const imagePath = state.directoryImages[prevIndex];

    try {
      setLoading(true);
      setError(null);
      
      // Update the index first
      navigateImage('prev');
      
      // Load the image
      const imageData = await loadImage(imagePath);
      
      // Set as current image and add to history
      setCurrentImage(imageData);
      addToHistory(imageData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    state.directoryImages,
    state.currentImageIndex,
    navigateImage,
    setCurrentImage,
    setLoading,
    setError,
    addToHistory,
  ]);

  /**
   * Navigate to the next image in the directory
   */
  const goToNext = useCallback(async () => {
    if (state.directoryImages.length === 0) {
      return;
    }

    // Calculate the next index
    const nextIndex = (state.currentImageIndex + 1) % state.directoryImages.length;
    const imagePath = state.directoryImages[nextIndex];

    try {
      setLoading(true);
      setError(null);
      
      // Update the index first
      navigateImage('next');
      
      // Load the image
      const imageData = await loadImage(imagePath);
      
      // Set as current image and add to history
      setCurrentImage(imageData);
      addToHistory(imageData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    state.directoryImages,
    state.currentImageIndex,
    navigateImage,
    setCurrentImage,
    setLoading,
    setError,
    addToHistory,
  ]);

  /**
   * Check if navigation is possible
   */
  const canNavigate = state.directoryImages.length > 1;
  const hasPrevious = canNavigate;
  const hasNext = canNavigate;

  return {
    goToPrevious,
    goToNext,
    canNavigate,
    hasPrevious,
    hasNext,
    currentIndex: state.currentImageIndex,
    totalImages: state.directoryImages.length,
  };
}
