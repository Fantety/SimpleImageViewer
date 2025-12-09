/**
 * Example usage of file system operations
 * 
 * This file demonstrates how to use the file system API functions
 * for opening, saving, and navigating images.
 */

import { 
  getDirectoryImages, 
  openFileDialog, 
  saveFileDialog, 
  saveImage,
  loadImage 
} from '../api/tauri';

/**
 * Example: Open a file dialog and load the selected image
 */
export async function exampleOpenImage() {
  try {
    // Open file dialog
    const filePath = await openFileDialog();
    
    if (filePath) {
      console.log('Selected file:', filePath);
      
      // Load the selected image
      const imageData = await loadImage(filePath);
      console.log('Image loaded:', {
        width: imageData.width,
        height: imageData.height,
        format: imageData.format,
        hasAlpha: imageData.hasAlpha
      });
      
      return imageData;
    } else {
      console.log('No file selected');
      return null;
    }
  } catch (error) {
    console.error('Error opening image:', error);
    throw error;
  }
}

/**
 * Example: Get all images in a directory
 */
export async function exampleGetDirectoryImages(dirPath: string) {
  try {
    const images = await getDirectoryImages(dirPath);
    console.log(`Found ${images.length} images in directory:`, images);
    return images;
  } catch (error) {
    console.error('Error getting directory images:', error);
    throw error;
  }
}

/**
 * Example: Save an image with a file dialog
 */
export async function exampleSaveImage(imageData: any) {
  try {
    // Open save dialog with default name
    const defaultName = `edited_image.${imageData.format.toLowerCase()}`;
    const savePath = await saveFileDialog(defaultName);
    
    if (savePath) {
      console.log('Saving to:', savePath);
      
      // Save the image
      await saveImage(imageData, savePath);
      console.log('Image saved successfully');
      
      return savePath;
    } else {
      console.log('Save cancelled');
      return null;
    }
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

/**
 * Example: Navigate through images in a directory
 */
export async function exampleNavigateImages(dirPath: string) {
  try {
    // Get all images in directory
    const images = await getDirectoryImages(dirPath);
    
    if (images.length === 0) {
      console.log('No images found in directory');
      return;
    }
    
    console.log(`Found ${images.length} images. Loading first image...`);
    
    // Load first image
    const firstImage = await loadImage(images[0]);
    console.log('First image loaded:', {
      path: firstImage.path,
      dimensions: `${firstImage.width}x${firstImage.height}`,
      format: firstImage.format
    });
    
    return {
      images,
      currentImage: firstImage,
      currentIndex: 0
    };
  } catch (error) {
    console.error('Error navigating images:', error);
    throw error;
  }
}
