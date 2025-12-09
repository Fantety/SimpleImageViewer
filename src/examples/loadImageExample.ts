/**
 * Example usage of the loadImage API
 * 
 * This file demonstrates how to use the image loading functionality
 * in the frontend application.
 */

import { loadImage } from '../api/tauri';
import type { ImageData } from '../types/tauri';

/**
 * Example: Load an image and display its metadata
 */
export async function loadAndDisplayImage(filePath: string): Promise<void> {
  try {
    // Load the image
    const imageData: ImageData = await loadImage(filePath);
    
    // Log metadata
    console.log('Image loaded successfully:');
    console.log(`  Path: ${imageData.path}`);
    console.log(`  Dimensions: ${imageData.width}x${imageData.height}`);
    console.log(`  Format: ${imageData.format}`);
    console.log(`  Has transparency: ${imageData.hasAlpha}`);
    
    // Create an image element to display
    const img = document.createElement('img');
    img.src = `data:image/${imageData.format.toLowerCase()};base64,${imageData.data}`;
    img.alt = `Image from ${imageData.path}`;
    
    // You can now append this to the DOM
    // document.body.appendChild(img);
    
    return;
  } catch (error) {
    console.error('Failed to load image:', error);
    throw error;
  }
}

/**
 * Example: Load multiple images
 */
export async function loadMultipleImages(filePaths: string[]): Promise<ImageData[]> {
  const results: ImageData[] = [];
  
  for (const path of filePaths) {
    try {
      const imageData = await loadImage(path);
      results.push(imageData);
    } catch (error) {
      console.error(`Failed to load ${path}:`, error);
      // Continue with other images
    }
  }
  
  return results;
}

/**
 * Example: Check if an image has transparency
 */
export async function checkImageTransparency(filePath: string): Promise<boolean> {
  try {
    const imageData = await loadImage(filePath);
    return imageData.hasAlpha;
  } catch (error) {
    console.error('Failed to check transparency:', error);
    return false;
  }
}
