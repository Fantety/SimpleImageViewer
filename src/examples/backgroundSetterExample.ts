/**
 * Background Setter Example
 * 
 * This example demonstrates how to use the background setting functionality
 * to replace transparent areas in an image with a solid color.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { loadImage, setBackground } from '../api/tauri';
import type { ImageData, RGBColor } from '../types/tauri';

/**
 * Example 1: Set white background on a transparent PNG
 */
export async function setWhiteBackground(imagePath: string): Promise<ImageData> {
  // Load the image
  const imageData = await loadImage(imagePath);
  
  // Check if image has transparency (Requirement 5.1)
  if (!imageData.hasAlpha) {
    throw new Error('Image does not have transparency. Background setting is only applicable to transparent images.');
  }
  
  // Set white background (Requirement 5.3, 5.4)
  const whiteColor: RGBColor = { r: 255, g: 255, b: 255 };
  const result = await setBackground(imageData, whiteColor.r, whiteColor.g, whiteColor.b);
  
  // After setting background, the image should no longer have transparency
  console.assert(result.hasAlpha === false, 'Image should no longer have transparency');
  
  return result;
}

/**
 * Example 2: Set custom color background
 */
export async function setCustomBackground(
  imageData: ImageData,
  color: RGBColor
): Promise<ImageData> {
  // Validate that image has transparency (Requirement 5.5)
  if (!imageData.hasAlpha) {
    throw new Error('Cannot set background on non-transparent image');
  }
  
  // Apply the background color
  const result = await setBackground(imageData, color.r, color.g, color.b);
  
  return result;
}

/**
 * Example 3: Try to set background on non-transparent image (should fail)
 */
export async function attemptBackgroundOnOpaqueImage(imagePath: string): Promise<void> {
  try {
    const imageData = await loadImage(imagePath);
    
    // This should throw an error if image doesn't have transparency (Requirement 5.5)
    await setBackground(imageData, 255, 255, 255);
    
    console.error('Expected error for non-transparent image');
  } catch (error) {
    console.log('Correctly rejected non-transparent image:', error);
  }
}

/**
 * Example 4: Common preset colors
 */
export const PRESET_COLORS: Record<string, RGBColor> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  gray: { r: 128, g: 128, b: 128 },
  lightGray: { r: 211, g: 211, b: 211 },
};

/**
 * Example 5: Batch processing with different backgrounds
 */
export async function applyMultipleBackgrounds(
  imageData: ImageData,
  colors: RGBColor[]
): Promise<ImageData[]> {
  if (!imageData.hasAlpha) {
    throw new Error('Image must have transparency');
  }
  
  const results: ImageData[] = [];
  
  for (const color of colors) {
    const result = await setBackground(imageData, color.r, color.g, color.b);
    results.push(result);
  }
  
  return results;
}

/**
 * Example 6: Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error('Invalid hex color format');
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Example 7: Set background from hex color
 */
export async function setBackgroundFromHex(
  imageData: ImageData,
  hexColor: string
): Promise<ImageData> {
  const rgb = hexToRgb(hexColor);
  return setCustomBackground(imageData, rgb);
}

// Usage examples:
// 
// // Set white background
// const result1 = await setWhiteBackground('/path/to/transparent.png');
// 
// // Set custom color
// const result2 = await setCustomBackground(imageData, { r: 128, g: 128, b: 128 });
// 
// // Use preset color
// const result3 = await setCustomBackground(imageData, PRESET_COLORS.blue);
// 
// // From hex color
// const result4 = await setBackgroundFromHex(imageData, '#ff5733');
