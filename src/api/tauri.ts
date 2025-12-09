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
