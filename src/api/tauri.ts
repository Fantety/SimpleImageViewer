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

/**
 * Rotate an image by 90 degrees
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * @param imageData - ImageData object containing the image to rotate
 * @param clockwise - If true, rotate 90° clockwise; if false, rotate 90° counter-clockwise
 * @returns Promise resolving to new ImageData with rotated image
 * @throws Error if rotation fails or immutability is violated
 */
export async function rotateImage(
  imageData: ImageData,
  clockwise: boolean
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the rotate operation
  const result = await invoke<ImageData>('rotate_image', {
    imageData,
    clockwise,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during rotate operation');
  }
  
  return result;
}

// ============================================================================
// Favorites Management API
// ============================================================================

export interface FavoriteImage {
  path: string;
  tags: string[];
  added_at: number;
}

/**
 * Get all favorite images
 * 
 * @returns Promise resolving to array of favorite images
 */
export async function getAllFavorites(): Promise<FavoriteImage[]> {
  return await invoke<FavoriteImage[]>('get_all_favorites');
}

/**
 * Add an image to favorites with tags
 * 
 * @param path - Image file path
 * @param tags - Array of tags to associate with the image
 */
export async function addFavorite(path: string, tags: string[]): Promise<void> {
  return await invoke<void>('add_favorite', { path, tags });
}

/**
 * Remove an image from favorites
 * 
 * @param path - Image file path
 * @returns Promise resolving to true if removed, false if not found
 */
export async function removeFavorite(path: string): Promise<boolean> {
  return await invoke<boolean>('remove_favorite', { path });
}

/**
 * Check if an image is favorited
 * 
 * @param path - Image file path
 * @returns Promise resolving to true if favorited, false otherwise
 */
export async function isFavorite(path: string): Promise<boolean> {
  return await invoke<boolean>('is_favorite', { path });
}

/**
 * Search favorites by tags
 * 
 * @param tags - Array of tags to search for
 * @returns Promise resolving to array of matching favorite images
 */
export async function searchFavoritesByTags(tags: string[]): Promise<FavoriteImage[]> {
  return await invoke<FavoriteImage[]>('search_favorites_by_tags', { tags });
}

/**
 * Get all unique tags from favorites
 * 
 * @returns Promise resolving to array of unique tags
 */
export async function getAllTags(): Promise<string[]> {
  return await invoke<string[]>('get_all_tags');
}

/**
 * Check if a file exists
 * 
 * @param path - File path to check
 * @returns Promise resolving to true if file exists, false otherwise
 */
export async function fileExists(path: string): Promise<boolean> {
  return await invoke<boolean>('file_exists', { path });
}

/**
 * Apply stickers to an image
 * 
 * Ensures immutability: creates a snapshot of the original ImageData before the operation
 * and verifies it was not mutated after the operation completes.
 * 
 * @param imageData - ImageData object containing the base image
 * @param stickers - Array of sticker data to apply to the image
 * @returns Promise resolving to new ImageData with stickers applied
 * @throws Error if sticker application fails or immutability is violated
 */
export async function applyStickers(
  imageData: ImageData,
  stickers: Array<{
    image_data: string; // Base64 encoded sticker image
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the sticker application operation
  const result = await invoke<ImageData>('apply_stickers', {
    imageData,
    stickers,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during sticker application');
  }
  
  return result;
}

/**
 * Apply text overlays to an image
 * 
 * Renders text onto the image at specified positions with customizable styling.
 * Each text element can have its own font, size, color, and rotation.
 * 
 * @param imageData - The base image to apply text to
 * @param texts - Array of text data with positioning and styling information
 * @returns Promise resolving to new ImageData with text applied
 * @throws Error if text rendering fails or invalid parameters
 */
export async function applyTexts(
  imageData: ImageData,
  texts: Array<{
    text: string;
    x: number;
    y: number;
    font_size: number;
    font_family: string;
    color: string; // Hex format: #RRGGBB
    rotation: number;
  }>
): Promise<ImageData> {
  // Create a snapshot of the original for immutability verification
  const originalSnapshot = deepCopyImageData(imageData);
  
  // Perform the text application operation
  const result = await invoke<ImageData>('apply_texts', {
    imageData,
    texts,
  });
  
  // Verify that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, imageData)) {
    throw new Error('Immutability violation: original ImageData was mutated during text application');
  }
  
  return result;
}


