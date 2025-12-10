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

export interface StickerData {
  id: string;
  imageData: string; // Base64 encoded image data (without data URL prefix)
  originalDataUrl: string; // Full data URL for display
  x: number; // Position X in image coordinates
  y: number; // Position Y in image coordinates
  width: number; // Width in image coordinates
  height: number; // Height in image coordinates
  rotation: number; // Rotation in degrees
  zIndex: number; // Layer order
}

// API-compatible sticker data (matches Rust backend)
export interface StickerApiData {
  image_data: string; // Base64 encoded image data
  x: number; // Position X in image coordinates
  y: number; // Position Y in image coordinates
  width: number; // Width in image coordinates
  height: number; // Height in image coordinates
  rotation: number; // Rotation in degrees
}
