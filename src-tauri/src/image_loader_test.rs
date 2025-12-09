#[cfg(test)]
mod tests {
    use crate::{load_image, ImageFormat};
    use std::fs;
    use std::path::PathBuf;

    /// Helper function to create a test PNG image
    fn create_test_png() -> PathBuf {
        use image::{ImageBuffer, Rgba};
        
        let temp_dir = std::env::temp_dir();
        let test_path = temp_dir.join("test_image.png");
        
        // Create a simple 10x10 red image with transparency
        let img = ImageBuffer::from_fn(10, 10, |x, _y| {
            if x < 5 {
                Rgba([255u8, 0u8, 0u8, 255u8]) // Opaque red
            } else {
                Rgba([255u8, 0u8, 0u8, 128u8]) // Semi-transparent red
            }
        });
        
        img.save(&test_path).unwrap();
        test_path
    }

    /// Helper function to create a test JPEG image
    fn create_test_jpeg() -> PathBuf {
        use image::{ImageBuffer, Rgb};
        
        let temp_dir = std::env::temp_dir();
        let test_path = temp_dir.join("test_image.jpg");
        
        // Create a simple 10x10 blue image
        let img = ImageBuffer::from_fn(10, 10, |_, _| {
            Rgb([0u8, 0u8, 255u8])
        });
        
        img.save(&test_path).unwrap();
        test_path
    }

    #[tokio::test]
    async fn test_load_png_with_alpha() {
        let test_path = create_test_png();
        let path_str = test_path.to_str().unwrap().to_string();
        
        let result = load_image(path_str).await;
        assert!(result.is_ok(), "Failed to load PNG: {:?}", result.err());
        
        let image_data = result.unwrap();
        assert_eq!(image_data.width, 10);
        assert_eq!(image_data.height, 10);
        assert_eq!(image_data.format, ImageFormat::PNG);
        assert!(image_data.has_alpha, "PNG should have alpha channel");
        assert!(!image_data.data.is_empty(), "Base64 data should not be empty");
        
        // Cleanup
        fs::remove_file(test_path).ok();
    }

    #[tokio::test]
    async fn test_load_jpeg_no_alpha() {
        let test_path = create_test_jpeg();
        let path_str = test_path.to_str().unwrap().to_string();
        
        let result = load_image(path_str).await;
        assert!(result.is_ok(), "Failed to load JPEG: {:?}", result.err());
        
        let image_data = result.unwrap();
        assert_eq!(image_data.width, 10);
        assert_eq!(image_data.height, 10);
        assert_eq!(image_data.format, ImageFormat::JPEG);
        assert!(!image_data.has_alpha, "JPEG should not have alpha channel");
        assert!(!image_data.data.is_empty(), "Base64 data should not be empty");
        
        // Cleanup
        fs::remove_file(test_path).ok();
    }

    #[tokio::test]
    async fn test_load_nonexistent_file() {
        let result = load_image("/nonexistent/path/image.png".to_string()).await;
        assert!(result.is_err(), "Should fail for nonexistent file");
        
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("File not found"), "Error should mention file not found");
    }

    #[tokio::test]
    async fn test_load_invalid_image_data() {
        let temp_dir = std::env::temp_dir();
        let test_path = temp_dir.join("invalid_image.png");
        
        // Create a file with invalid image data
        fs::write(&test_path, b"This is not a valid image").unwrap();
        
        let result = load_image(test_path.to_str().unwrap().to_string()).await;
        assert!(result.is_err(), "Should fail for invalid image data");
        
        // Cleanup
        fs::remove_file(test_path).ok();
    }

    #[tokio::test]
    async fn test_base64_encoding() {
        let test_path = create_test_png();
        let path_str = test_path.to_str().unwrap().to_string();
        
        let result = load_image(path_str).await;
        assert!(result.is_ok());
        
        let image_data = result.unwrap();
        
        // Verify Base64 data can be decoded
        use base64::{Engine as _, engine::general_purpose};
        let decoded = general_purpose::STANDARD.decode(&image_data.data);
        assert!(decoded.is_ok(), "Base64 data should be valid");
        
        // Cleanup
        fs::remove_file(test_path).ok();
    }
}
