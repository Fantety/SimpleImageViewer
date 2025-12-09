/**
 * Tauri API wrapper for image operations
 * 
 * All edit operations ensure immutability by:
 * 1. Creating deep copies of input ImageData
 * 2. Verifying that original ImageData is not mutated
 * 3. Returning new ImageData objects
 */

import { invoke } from '@tauri-apps/api/core';
import type { ImageData } from '../types/tauri';
import { deepCopyImageData, areImageDataEqual } from '../utils/imageData';

/**
 * Load an image from the specified file path
 * 
 * Supports: PNG, JPEG, GIF, BMP, WEBP, SVG, TIFF, ICO, HEIC, AVIF
 * 
 * @param path - File path to the image
 * @returns Promise resolving to ImageData containing metadata and Base64 encoded data
 * @throws Error if file not found, unsupported format, or invalid image data
 */
export async function loadImage(path: string): Promise<ImageData> {
  return await invoke<ImageData>('load_image', { path });
}

/**
 * Get list of image files in a directory
 * 
 * @param dirPath - Directory path to scan for images
 * @returns Promise resolving to array of image file paths
 * @throws Error if directory not found or not accessible
 */
export async function getDirectoryImages(dirPath: string): Promise<string[]> {
  return await invoke<string[]>('get_directory_images', { dirPath });
}

/**
 * Open file dialog to select an image file
 * 
 * @returns Promise resolving to selected file path, or null if cancelled
 */
export async function openFileDialog(): Promise<string | null> {
  return await invoke<string | null>('open_file_dialog');
}

/**
 * Open save file dialog
 * 
 * @param defaultName - Default file name to suggest
 * @returns Promise resolving to selected save path, or null if cancelled
 */
export async function saveFileDialog(defaultName: string): Promise<string | null> {
  return await invoke<string | null>('save_file_dialog', { defaultName });
}

/**
 * Save image data to a file
 * 
 * @param imageData - ImageData object containing the image to save
 * @param path - File path where the image should be saved
 * @throws Error if save fails (permission denied, disk full, etc.)
 */
export async function saveImage(imageData: ImageData, path: string): Promise<void> {
  return await invoke<void>('save_image', { imageData, path });
}

/**
 * Resize an image to the specified dimensions
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * @param imageData - ImageData object containing the image to resize
 * @param width - Target width in pixels (must be positive integer)
 * @param height - Target height in pixels (must be positive integer)
 * @param keepAspectRatio - If true, maintains aspect ratio (may result in smaller dimensions)
 * @returns Promise resolving to new ImageData with resized image
 * @throws Error if parameters are invalid, resize operation fails, or immutability is violated
 */
export async function resizeImage(
  imageData: ImageData,
  width: number,
  height: number,
  keepAspectRatio: boolean
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the resize operation
  const result = await invoke<ImageData>('resize_image', {
    imageData,
    width,
    height,
    keepAspectRatio,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during resize operation');
  }
  
  return result;
}

/**
 * Convert image to a different format
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * Supports conversion between: PNG, JPEG, GIF, BMP, WEBP, TIFF, ICO, AVIF
 * Note: SVG and HEIC formats are not supported for conversion
 * 
 * @param imageData - ImageData object containing the image to convert
 * @param targetFormat - Target format (e.g., 'PNG', 'JPEG', 'WEBP')
 * @param options - Optional conversion options (quality for JPEG/WEBP/AVIF: 1-100)
 * @returns Promise resolving to new ImageData with converted image
 * @throws Error if format is unsupported, conversion fails, or immutability is violated
 */
export async function convertFormat(
  imageData: ImageData,
  targetFormat: string,
  options?: { quality?: number }
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the format conversion operation
  const result = await invoke<ImageData>('convert_format', {
    imageData,
    targetFormat,
    options: options || null,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during format conversion');
  }
  
  return result;
}

/**
 * Crop an image to the specified region
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * Extracts a rectangular region from the image. If the crop region extends beyond
 * the image boundaries, it will be automatically constrained to fit within the image.
 * 
 * @param imageData - ImageData object containing the image to crop
 * @param x - X coordinate of the top-left corner of the crop region
 * @param y - Y coordinate of the top-left corner of the crop region
 * @param width - Width of the crop region (must be positive integer)
 * @param height - Height of the crop region (must be positive integer)
 * @returns Promise resolving to new ImageData with cropped image
 * @throws Error if parameters are invalid, crop operation fails, or immutability is violated
 */
export async function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the crop operation
  const result = await invoke<ImageData>('crop_image', {
    imageData,
    x,
    y,
    width,
    height,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during crop operation');
  }
  
  return result;
}

/**
 * Set background color for transparent images
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * Replaces transparent pixels with the specified RGB color.
 * Only works on images with an alpha channel (hasAlpha = true).
 * 
 * @param imageData - ImageData object containing the image (must have alpha channel)
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Promise resolving to new ImageData with background applied
 * @throws Error if image doesn't have transparency, operation fails, or immutability is violated
 */
export async function setBackground(
  imageData: ImageData,
  r: number,
  g: number,
  b: number
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the set background operation
  const result = await invoke<ImageData>('set_background', {
    imageData,
    r,
    g,
    b,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during set background operation');
  }
  
  return result;
}
