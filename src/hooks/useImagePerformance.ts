/**
 * Performance optimization hook for image rendering
 * 
 * Provides utilities for:
 * - Detecting large images that may need optimization
 * - Calculating optimal render sizes
 * - Managing memory-efficient image display
 * 
 * Requirement 8.5: Optimize large image loading performance
 */

import { useMemo } from 'react';
import type { ImageData } from '../types/tauri';

interface ImagePerformanceMetrics {
  isLargeImage: boolean;
  shouldOptimize: boolean;
  estimatedMemoryMB: number;
  renderWidth: number;
  renderHeight: number;
}

/**
 * Threshold for considering an image "large" (in pixels)
 * Images larger than 4K (3840 x 2160 = 8.3MP) are considered large
 */
const LARGE_IMAGE_THRESHOLD = 8_300_000; // 8.3 megapixels

/**
 * Maximum render size for very large images (in pixels)
 * Limits rendering to 4K resolution for performance
 */
const MAX_RENDER_SIZE = 3840;

/**
 * Hook to calculate performance metrics for an image
 * 
 * @param imageData - The image data to analyze
 * @param containerWidth - Width of the container (for scaling calculations)
 * @param containerHeight - Height of the container (for scaling calculations)
 * @returns Performance metrics and optimization recommendations
 */
export function useImagePerformance(
  imageData: ImageData | null,
  containerWidth: number = 1920,
  containerHeight: number = 1080
): ImagePerformanceMetrics {
  return useMemo(() => {
    if (!imageData) {
      return {
        isLargeImage: false,
        shouldOptimize: false,
        estimatedMemoryMB: 0,
        renderWidth: 0,
        renderHeight: 0,
      };
    }

    const { width, height, hasAlpha } = imageData;
    const totalPixels = width * height;
    
    // Calculate estimated memory usage
    // RGBA = 4 bytes per pixel, RGB = 3 bytes per pixel
    const bytesPerPixel = hasAlpha ? 4 : 3;
    const estimatedMemoryBytes = totalPixels * bytesPerPixel;
    const estimatedMemoryMB = estimatedMemoryBytes / (1024 * 1024);

    // Determine if this is a large image
    const isLargeImage = totalPixels > LARGE_IMAGE_THRESHOLD;

    // Calculate optimal render size
    let renderWidth = width;
    let renderHeight = height;

    if (isLargeImage) {
      // Scale down very large images for rendering
      const scale = Math.min(
        MAX_RENDER_SIZE / width,
        MAX_RENDER_SIZE / height,
        1 // Don't scale up
      );
      
      renderWidth = Math.floor(width * scale);
      renderHeight = Math.floor(height * scale);
    }

    // Also consider container size for adaptive scaling
    const containerScale = Math.min(
      containerWidth / renderWidth,
      containerHeight / renderHeight,
      1 // Don't scale up
    );

    renderWidth = Math.floor(renderWidth * containerScale);
    renderHeight = Math.floor(renderHeight * containerScale);

    return {
      isLargeImage,
      shouldOptimize: isLargeImage,
      estimatedMemoryMB,
      renderWidth,
      renderHeight,
    };
  }, [imageData, containerWidth, containerHeight]);
}

/**
 * Utility function to check if an image should use progressive loading
 * 
 * @param imageData - The image data to check
 * @returns true if progressive loading is recommended
 */
export function shouldUseProgressiveLoading(imageData: ImageData | null): boolean {
  if (!imageData) {
    return false;
  }

  const totalPixels = imageData.width * imageData.height;
  return totalPixels > LARGE_IMAGE_THRESHOLD;
}

/**
 * Utility function to estimate loading time for an image
 * 
 * @param imageData - The image data to estimate
 * @returns Estimated loading time in milliseconds
 */
export function estimateLoadingTime(imageData: ImageData | null): number {
  if (!imageData) {
    return 0;
  }

  const totalPixels = imageData.width * imageData.height;
  const bytesPerPixel = imageData.hasAlpha ? 4 : 3;
  const estimatedBytes = totalPixels * bytesPerPixel;

  // Rough estimate: 100 MB/s processing speed
  const processingSpeed = 100 * 1024 * 1024; // bytes per second
  const estimatedSeconds = estimatedBytes / processingSpeed;

  return Math.max(estimatedSeconds * 1000, 100); // Minimum 100ms
}
