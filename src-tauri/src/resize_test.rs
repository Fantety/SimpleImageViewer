#[cfg(test)]
mod tests {
    use crate::types::{ImageData, ImageFormat};
    use crate::resize_image;
    use base64::{Engine as _, engine::general_purpose};
    use image::{ImageBuffer, Rgba};

    /// Helper function to create a test image
    fn create_test_image(width: u32, height: u32) -> ImageData {
        // Create a simple test image
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |x, y| {
            if (x + y) % 2 == 0 {
                Rgba([255u8, 0u8, 0u8, 255u8]) // Red
            } else {
                Rgba([0u8, 0u8, 255u8, 255u8]) // Blue
            }
        });

        // Encode to PNG
        let mut buffer = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
            .unwrap();

        let base64_data = general_purpose::STANDARD.encode(&buffer);

        ImageData {
            path: "test.png".to_string(),
            width,
            height,
            format: ImageFormat::PNG,
            data: base64_data,
            has_alpha: false,
        }
    }

    #[tokio::test]
    async fn test_resize_without_aspect_ratio() {
        let image = create_test_image(100, 100);
        let result = resize_image(image, 50, 75, false).await;

        assert!(result.is_ok());
        let resized = result.unwrap();
        assert_eq!(resized.width, 50);
        assert_eq!(resized.height, 75);
    }

    #[tokio::test]
    async fn test_resize_with_aspect_ratio() {
        let image = create_test_image(100, 50);
        let result = resize_image(image, 200, 200, true).await;

        assert!(result.is_ok());
        let resized = result.unwrap();
        // Should maintain 2:1 aspect ratio, so height should be 100
        assert_eq!(resized.width, 200);
        assert_eq!(resized.height, 100);
    }

    #[tokio::test]
    async fn test_resize_invalid_dimensions() {
        let image = create_test_image(100, 100);
        
        // Test zero width
        let result = resize_image(image.clone(), 0, 50, false).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("positive integers"));

        // Test zero height
        let result = resize_image(image, 50, 0, false).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("positive integers"));
    }

    #[tokio::test]
    async fn test_resize_preserves_format() {
        let image = create_test_image(100, 100);
        let original_format = image.format.clone();
        
        let result = resize_image(image, 50, 50, false).await;
        assert!(result.is_ok());
        
        let resized = result.unwrap();
        assert_eq!(resized.format, original_format);
    }

    #[tokio::test]
    async fn test_resize_aspect_ratio_calculation() {
        // Test landscape image
        let image = create_test_image(200, 100);
        let result = resize_image(image, 100, 100, true).await;
        assert!(result.is_ok());
        let resized = result.unwrap();
        assert_eq!(resized.width, 100);
        assert_eq!(resized.height, 50); // Maintains 2:1 ratio

        // Test portrait image
        let image = create_test_image(100, 200);
        let result = resize_image(image, 100, 100, true).await;
        assert!(result.is_ok());
        let resized = result.unwrap();
        assert_eq!(resized.width, 50); // Maintains 1:2 ratio
        assert_eq!(resized.height, 100);
    }
}
