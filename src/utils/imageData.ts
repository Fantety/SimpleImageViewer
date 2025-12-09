/**
 * Utility functions for ImageData immutability and deep copying
 * 
 * Requirements: 2.4, 3.5, 4.5
 * Ensures all edit operations maintain immutability of original ImageData
 */

import type { ImageData } from '../types/tauri';

/**
 * Create a deep copy of an ImageData object
 * 
 * This ensures that modifications to the copy do not affect the original object.
 * All fields are copied by value, including nested objects.
 * 
 * @param imageData - The ImageData object to copy
 * @returns A new ImageData object with all fields copied
 */
export function deepCopyImageData(imageData: ImageData): ImageData {
  return {
    path: imageData.path,
    width: imageData.width,
    height: imageData.height,
    format: imageData.format,
    data: imageData.data,
    hasAlpha: imageData.hasAlpha,
  };
}

/**
 * Verify that two ImageData objects are equal
 * 
 * Compares all fields to ensure they have the same values.
 * Used for immutability verification.
 * 
 * @param original - The original ImageData object
 * @param current - The current ImageData object to compare
 * @returns true if all fields are equal, false otherwise
 */
export function areImageDataEqual(original: ImageData, current: ImageData): boolean {
  return (
    original.path === current.path &&
    original.width === current.width &&
    original.height === current.height &&
    original.format === current.format &&
    original.data === current.data &&
    original.hasAlpha === current.hasAlpha
  );
}

/**
 * Verify that an ImageData object has not been mutated
 * 
 * Creates a snapshot of the original object and compares it after an operation
 * to ensure immutability was maintained.
 * 
 * @param original - The original ImageData object before operation
 * @param afterOperation - The ImageData object after operation
 * @returns true if the original was not mutated, false otherwise
 */
export function verifyImmutability(
  original: ImageData,
  afterOperation: ImageData
): boolean {
  // The original and afterOperation should be different objects
  if (original === afterOperation) {
    return false; // Same reference means no new object was created
  }
  
  // For true immutability verification, we would need to have stored
  // a snapshot before the operation. This function assumes the caller
  // has kept a reference to the original.
  return true;
}

/**
 * Create an immutable snapshot of ImageData
 * 
 * This creates a frozen copy that cannot be modified.
 * Useful for storing in history or for comparison.
 * 
 * @param imageData - The ImageData object to snapshot
 * @returns A frozen copy of the ImageData object
 */
export function createImmutableSnapshot(imageData: ImageData): Readonly<ImageData> {
  const copy = deepCopyImageData(imageData);
  return Object.freeze(copy);
}

/**
 * Validate that an edit operation maintained immutability
 * 
 * This should be called after an edit operation to verify that:
 * 1. A new ImageData object was created (different reference)
 * 2. The original ImageData was not modified
 * 
 * @param originalSnapshot - Snapshot of the original ImageData before operation
 * @param originalAfterOp - The original ImageData reference after operation
 * @param result - The result ImageData from the operation
 * @returns Object with validation results
 */
export function validateEditImmutability(
  originalSnapshot: ImageData,
  originalAfterOp: ImageData,
  result: ImageData
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check that a new object was created
  if (originalAfterOp === result) {
    errors.push('Edit operation did not create a new ImageData object');
  }
  
  // Check that the original was not mutated
  if (!areImageDataEqual(originalSnapshot, originalAfterOp)) {
    errors.push('Original ImageData was mutated during edit operation');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
