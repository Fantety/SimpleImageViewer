/**
 * Example: Save Image Functionality
 * 
 * This example demonstrates how to use the save functionality:
 * 1. Load an image
 * 2. Optionally edit it (resize, crop, etc.)
 * 3. Save it to a new location
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { loadImage, saveImage, saveFileDialog, resizeImage } from '../api/tauri';

/**
 * Example 1: Save current image to a new location
 */
export async function saveCurrentImage() {
  try {
    // Load an image
    const imagePath = '/path/to/image.png';
    const imageData = await loadImage(imagePath);
    
    console.log('Loaded image:', {
      path: imageData.path,
      dimensions: `${imageData.width}x${imageData.height}`,
      format: imageData.format,
    });
    
    // Open save dialog to get save location
    const defaultName = imagePath.split('/').pop() || 'image.png';
    const savePath = await saveFileDialog(defaultName);
    
    if (!savePath) {
      console.log('Save cancelled by user');
      return;
    }
    
    // Save the image
    await saveImage(imageData, savePath);
    console.log('Image saved successfully to:', savePath);
    
  } catch (error) {
    console.error('Save failed:', error);
    // Error handling:
    // - Permission denied: User doesn't have write access to the directory
    // - Disk full: Not enough space to save the file
    // - Invalid path: Directory doesn't exist
  }
}

/**
 * Example 2: Edit and save workflow
 */
export async function editAndSaveImage() {
  try {
    // Load an image
    const imagePath = '/path/to/image.png';
    const imageData = await loadImage(imagePath);
    
    console.log('Original image:', {
      dimensions: `${imageData.width}x${imageData.height}`,
    });
    
    // Edit the image (resize to 800x600)
    const editedImage = await resizeImage(imageData, 800, 600, true);
    
    console.log('Edited image:', {
      dimensions: `${editedImage.width}x${editedImage.height}`,
    });
    
    // Save the edited image
    const savePath = await saveFileDialog('resized_image.png');
    
    if (savePath) {
      await saveImage(editedImage, savePath);
      console.log('Edited image saved to:', savePath);
    }
    
  } catch (error) {
    console.error('Edit and save failed:', error);
  }
}

/**
 * Example 3: Save with error handling
 */
export async function saveWithErrorHandling(imageData: any, suggestedName: string) {
  try {
    // Open save dialog
    const savePath = await saveFileDialog(suggestedName);
    
    if (!savePath) {
      return { success: false, cancelled: true };
    }
    
    // Attempt to save
    await saveImage(imageData, savePath);
    
    return {
      success: true,
      path: savePath,
      message: `Image saved successfully to ${savePath.split('/').pop()}`,
    };
    
  } catch (error) {
    // Parse error type and provide user-friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    let userMessage = 'Failed to save image';
    
    if (errorMessage.includes('Permission denied')) {
      userMessage = 'You don\'t have permission to save to this location';
    } else if (errorMessage.includes('not exist')) {
      userMessage = 'The selected directory does not exist';
    } else if (errorMessage.includes('disk') || errorMessage.includes('space')) {
      userMessage = 'Not enough disk space to save the image';
    }
    
    return {
      success: false,
      error: errorMessage,
      userMessage,
    };
  }
}

/**
 * Example 4: Batch save multiple edited images
 */
export async function batchSaveImages(images: any[]) {
  const results = [];
  
  for (const imageData of images) {
    try {
      const fileName = imageData.path.split('/').pop() || 'image.png';
      const savePath = await saveFileDialog(fileName);
      
      if (savePath) {
        await saveImage(imageData, savePath);
        results.push({ success: true, path: savePath });
      } else {
        results.push({ success: false, cancelled: true });
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}
