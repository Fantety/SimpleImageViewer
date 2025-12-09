/**
 * Tests for ImageData immutability utilities
 * 
 * These tests verify that the immutability guarantees are maintained
 * for all edit operations.
 * 
 * Note: This file is prepared for future test framework integration.
 * Currently serves as documentation and manual verification.
 */

import type { ImageData } from '../types/tauri';
import {
  deepCopyImageData,
  areImageDataEqual,
  verifyImmutability,
  createImmutableSnapshot,
  validateEditImmutability,
} from './imageData';

/**
 * Create a sample ImageData object for testing
 */
function createSampleImageData(): ImageData {
  return {
    path: '/test/image.png',
    width: 800,
    height: 600,
    format: 'PNG',
    data: 'base64encodeddata',
    hasAlpha: true,
  };
}

/**
 * Test: deepCopyImageData creates a new object with same values
 */
export function testDeepCopyImageData(): boolean {
  const original = createSampleImageData();
  const copy = deepCopyImageData(original);
  
  // Should not be the same reference
  if (original === copy) {
    console.error('deepCopyImageData: Failed - same reference');
    return false;
  }
  
  // Should have equal values
  if (!areImageDataEqual(original, copy)) {
    console.error('deepCopyImageData: Failed - values not equal');
    return false;
  }
  
  // Modifying copy should not affect original
  copy.width = 1000;
  if (original.width === 1000) {
    console.error('deepCopyImageData: Failed - original was mutated');
    return false;
  }
  
  console.log('✓ deepCopyImageData: Passed');
  return true;
}

/**
 * Test: areImageDataEqual correctly compares ImageData objects
 */
export function testAreImageDataEqual(): boolean {
  const img1 = createSampleImageData();
  const img2 = createSampleImageData();
  const img3 = { ...img1, width: 1000 };
  
  // Same values should be equal
  if (!areImageDataEqual(img1, img2)) {
    console.error('areImageDataEqual: Failed - identical objects not equal');
    return false;
  }
  
  // Different values should not be equal
  if (areImageDataEqual(img1, img3)) {
    console.error('areImageDataEqual: Failed - different objects marked as equal');
    return false;
  }
  
  console.log('✓ areImageDataEqual: Passed');
  return true;
}

/**
 * Test: verifyImmutability detects same reference
 */
export function testVerifyImmutability(): boolean {
  const original = createSampleImageData();
  const copy = deepCopyImageData(original);
  
  // Different references should pass
  if (!verifyImmutability(original, copy)) {
    console.error('verifyImmutability: Failed - different references should pass');
    return false;
  }
  
  // Same reference should fail
  if (verifyImmutability(original, original)) {
    console.error('verifyImmutability: Failed - same reference should fail');
    return false;
  }
  
  console.log('✓ verifyImmutability: Passed');
  return true;
}

/**
 * Test: createImmutableSnapshot creates frozen copy
 */
export function testCreateImmutableSnapshot(): boolean {
  const original = createSampleImageData();
  const snapshot = createImmutableSnapshot(original);
  
  // Should not be the same reference
  if (original === snapshot) {
    console.error('createImmutableSnapshot: Failed - same reference');
    return false;
  }
  
  // Should have equal values
  if (!areImageDataEqual(original, snapshot as ImageData)) {
    console.error('createImmutableSnapshot: Failed - values not equal');
    return false;
  }
  
  // Should be frozen (attempting to modify should fail in strict mode or be ignored)
  try {
    (snapshot as any).width = 1000;
    // In non-strict mode, the assignment is silently ignored
    if (snapshot.width === 1000) {
      console.error('createImmutableSnapshot: Failed - snapshot was mutated');
      return false;
    }
  } catch (e) {
    // In strict mode, this throws an error, which is expected
  }
  
  console.log('✓ createImmutableSnapshot: Passed');
  return true;
}

/**
 * Test: validateEditImmutability detects mutations
 */
export function testValidateEditImmutability(): boolean {
  const original = createSampleImageData();
  const snapshot = deepCopyImageData(original);
  const result = { ...original, width: 1000 };
  
  // Valid case: original not mutated, new object created
  const validResult = validateEditImmutability(snapshot, original, result);
  if (!validResult.isValid) {
    console.error('validateEditImmutability: Failed - valid case marked as invalid');
    return false;
  }
  
  // Invalid case: same reference returned
  const invalidResult1 = validateEditImmutability(snapshot, original, original);
  if (invalidResult1.isValid) {
    console.error('validateEditImmutability: Failed - same reference not detected');
    return false;
  }
  
  // Invalid case: original was mutated
  const mutatedOriginal = createSampleImageData();
  const mutatedSnapshot = deepCopyImageData(mutatedOriginal);
  mutatedOriginal.width = 1000; // Simulate mutation
  const invalidResult2 = validateEditImmutability(mutatedSnapshot, mutatedOriginal, result);
  if (invalidResult2.isValid) {
    console.error('validateEditImmutability: Failed - mutation not detected');
    return false;
  }
  
  console.log('✓ validateEditImmutability: Passed');
  return true;
}

/**
 * Run all tests
 */
export function runAllTests(): boolean {
  console.log('Running ImageData immutability tests...\n');
  
  const results = [
    testDeepCopyImageData(),
    testAreImageDataEqual(),
    testVerifyImmutability(),
    testCreateImmutableSnapshot(),
    testValidateEditImmutability(),
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n${passed}/${total} tests passed`);
  
  return passed === total;
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).imageDataTests = {
    runAllTests,
    testDeepCopyImageData,
    testAreImageDataEqual,
    testVerifyImmutability,
    testCreateImmutableSnapshot,
    testValidateEditImmutability,
  };
}
