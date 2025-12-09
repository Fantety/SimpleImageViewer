/**
 * TypeScript types for Tauri backend API
 */

export type ImageFormat = 
  | 'PNG'
  | 'JPEG'
  | 'GIF'
  | 'BMP'
  | 'WEBP'
  | 'SVG'
  | 'TIFF'
  | 'ICO'
  | 'HEIC'
  | 'AVIF';

export interface ImageData {
  path: string;
  width: number;
  height: number;
  format: ImageFormat;
  data: string; // Base64 encoded image data
  hasAlpha: boolean;
}

export interface ConversionOptions {
  quality?: number; // For JPEG, WEBP, AVIF (1-100)
}

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}
