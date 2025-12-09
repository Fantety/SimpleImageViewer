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
