/**
 * Tauri API wrapper for image operations
 */

import { invoke } from '@tauri-apps/api/core';
import type { ImageData } from '../types/tauri';

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
 * @param imageData - ImageData object containing the image to resize
 * @param width - Target width in pixels (must be positive integer)
 * @param height - Target height in pixels (must be positive integer)
 * @param keepAspectRatio - If true, maintains aspect ratio (may result in smaller dimensions)
 * @returns Promise resolving to new ImageData with resized image
 * @throws Error if parameters are invalid or resize operation fails
 */
export async function resizeImage(
  imageData: ImageData,
  width: number,
  height: number,
  keepAspectRatio: boolean
): Promise<ImageData> {
  return await invoke<ImageData>('resize_image', {
    imageData,
    width,
    height,
    keepAspectRatio,
  });
}

/**
 * Convert image to a different format
 * 
 * Supports conversion between: PNG, JPEG, GIF, BMP, WEBP, TIFF, ICO, AVIF
 * Note: SVG and HEIC formats are not supported for conversion
 * 
 * @param imageData - ImageData object containing the image to convert
 * @param targetFormat - Target format (e.g., 'PNG', 'JPEG', 'WEBP')
 * @param options - Optional conversion options (quality for JPEG/WEBP/AVIF: 1-100)
 * @returns Promise resolving to new ImageData with converted image
 * @throws Error if format is unsupported or conversion fails
 */
export async function convertFormat(
  imageData: ImageData,
  targetFormat: string,
  options?: { quality?: number }
): Promise<ImageData> {
  return await invoke<ImageData>('convert_format', {
    imageData,
    targetFormat,
    options: options || null,
  });
}

/**
 * Crop an image to the specified region
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
 * @throws Error if parameters are invalid or crop operation fails
 */
export async function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ImageData> {
  return await invoke<ImageData>('crop_image', {
    imageData,
    x,
    y,
    width,
    height,
  });
}

/**
 * Set background color for transparent images
 * 
 * Replaces transparent pixels with the specified RGB color.
 * Only works on images with an alpha channel (hasAlpha = true).
 * 
 * @param imageData - ImageData object containing the image (must have alpha channel)
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Promise resolving to new ImageData with background applied
 * @throws Error if image doesn't have transparency or operation fails
 */
export async function setBackground(
  imageData: ImageData,
  r: number,
  g: number,
  b: number
): Promise<ImageData> {
  return await invoke<ImageData>('set_background', {
    imageData,
    r,
    g,
    b,
  });
}
