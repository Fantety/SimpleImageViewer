/**
 * Tests for edit operation immutability
 * 
 * Verifies that all edit operations (resize, convert, crop, set_background)
 * create new ImageData objects and do not mutate the original.
 * 
 * Requirements: 2.4, 3.5, 4.5
 */

#[cfg(test)]
mod tests {
    use crate::types::{ImageData, ImageFormat, ConversionOptions};
    use image::{DynamicImage, RgbaImage};
    use base64::{Engine as _, engine::general_purpose};

    /// Helper function to create a test image
    fn create_test_image(width: u32, height: u32) -> ImageData {
        // Create a simple test image
        let img = DynamicImage::ImageRgba8(RgbaImage::new(width, height));
        
        // Encode to PNG
        let mut buffer = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
            .unwrap();
        
        let base64_data = general_purpose::STANDARD.encode(&buffer);
        
        ImageData {
            path: "/test/image.png".to_string(),
            width,
            height,
            format: ImageFormat::PNG,
            data: base64_data,
            has_alpha: true,
        }
    }

    /// Helper function to clone ImageData for comparison
    fn clone_image_data(img: &ImageData) -> ImageData {
        ImageData {
            path: img.path.clone(),
            width: img.width,
            height: img.height,
            format: img.format.clone(),
            data: img.data.clone(),
            has_alpha: img.has_alpha,
        }
    }

    /// Helper function to compare ImageData objects
    fn are_equal(img1: &ImageData, img2: &ImageData) -> bool {
        img1.path == img2.path
            && img1.width == img2.width
            && img1.height == img2.height
            && img1.format == img2.format
            && img1.data == img2.data
            && img1.has_alpha == img2.has_alpha
    }

    #[tokio::test]
    async fn test_resize_immutability() {
        // Create original image
        let original = create_test_image(100, 100);
        let original_snapshot = clone_image_data(&original);
        
        // Perform resize operation
        let result = crate::resize_image(original.clone(), 50, 50, false).await;
        
        // Verify operation succeeded
        assert!(result.is_ok(), "Resize operation should succeed");
        let resized = result.unwrap();
        
        // Verify original was not mutated
        assert!(
            are_equal(&original, &original_snapshot),
            "Original ImageData should not be mutated by resize operation"
        );
        
        // Verify a new object was created (different dimensions)
        assert_ne!(
            resized.width, original.width,
            "Resized image should have different dimensions"
        );
        assert_eq!(resized.width, 50, "Resized image should have correct width");
        assert_eq!(resized.height, 50, "Resized image should have correct height");
    }

    #[tokio::test]
    async fn test_convert_format_immutability() {
        // Create original image
        let original = create_test_image(100, 100);
        let original_snapshot = clone_image_data(&original);
        
        // Perform format conversion
        let result = crate::convert_format(
            original.clone(),
            "JPEG".to_string(),
            Some(ConversionOptions { quality: Some(90) }),
        ).await;
        
        // Verify operation succeeded
        assert!(result.is_ok(), "Format conversion should succeed");
        let converted = result.unwrap();
        
        // Verify original was not mutated
        assert!(
            are_equal(&original, &original_snapshot),
            "Original ImageData should not be mutated by format conversion"
        );
        
        // Verify a new object was created (different format)
        assert_ne!(
            converted.format, original.format,
            "Converted image should have different format"
        );
        assert_eq!(converted.format, ImageFormat::JPEG, "Converted image should be JPEG");
    }

    #[tokio::test]
    async fn test_crop_immutability() {
        // Create original image
        let original = create_test_image(100, 100);
        let original_snapshot = clone_image_data(&original);
        
        // Perform crop operation
        let result = crate::crop_image(original.clone(), 10, 10, 50, 50).await;
        
        // Verify operation succeeded
        assert!(result.is_ok(), "Crop operation should succeed");
        let cropped = result.unwrap();
        
        // Verify original was not mutated
        assert!(
            are_equal(&original, &original_snapshot),
            "Original ImageData should not be mutated by crop operation"
        );
        
        // Verify a new object was created (different dimensions)
        assert_ne!(
            cropped.width, original.width,
            "Cropped image should have different dimensions"
        );
        assert_eq!(cropped.width, 50, "Cropped image should have correct width");
        assert_eq!(cropped.height, 50, "Cropped image should have correct height");
    }

    #[tokio::test]
    async fn test_set_background_immutability() {
        // Create original image with transparency
        let original = create_test_image(100, 100);
        let original_snapshot = clone_image_data(&original);
        
        // Perform set background operation
        let result = crate::set_background(original.clone(), 255, 255, 255).await;
        
        // Verify operation succeeded
        assert!(result.is_ok(), "Set background operation should succeed");
        let with_background = result.unwrap();
        
        // Verify original was not mutated
        assert!(
            are_equal(&original, &original_snapshot),
            "Original ImageData should not be mutated by set background operation"
        );
        
        // Verify a new object was created (hasAlpha should be false after background is set)
        assert_ne!(
            with_background.has_alpha, original.has_alpha,
            "Image with background should not have alpha channel"
        );
        assert!(!with_background.has_alpha, "Image with background should have hasAlpha = false");
    }

    #[tokio::test]
    async fn test_multiple_operations_immutability() {
        // Create original image
        let original = create_test_image(100, 100);
        let original_snapshot = clone_image_data(&original);
        
        // Perform multiple operations in sequence
        let resized = crate::resize_image(original.clone(), 80, 80, false).await.unwrap();
        let cropped = crate::crop_image(resized, 10, 10, 50, 50).await.unwrap();
        let converted = crate::convert_format(
            cropped,
            "JPEG".to_string(),
            Some(ConversionOptions { quality: Some(90) }),
        ).await.unwrap();
        
        // Verify original was not mutated through the chain
        assert!(
            are_equal(&original, &original_snapshot),
            "Original ImageData should remain unchanged after multiple operations"
        );
        
        // Verify final result has expected properties
        assert_eq!(converted.width, 50, "Final image should have correct width");
        assert_eq!(converted.height, 50, "Final image should have correct height");
        assert_eq!(converted.format, ImageFormat::JPEG, "Final image should be JPEG");
    }
}
