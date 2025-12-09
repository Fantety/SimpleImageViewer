#[cfg(test)]
mod tests {
    use crate::*;
    use std::fs;

    #[tokio::test]
    async fn test_get_directory_images_empty_dir() {
        // Create a temporary directory
        let temp_dir = std::env::temp_dir().join("test_empty_dir");
        fs::create_dir_all(&temp_dir).unwrap();
        
        let result = get_directory_images(temp_dir.to_string_lossy().to_string()).await;
        
        // Clean up
        fs::remove_dir_all(&temp_dir).unwrap();
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_get_directory_images_nonexistent() {
        let result = get_directory_images("/nonexistent/path/12345".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[tokio::test]
    async fn test_get_directory_images_not_a_directory() {
        // Create a temporary file
        let temp_file = std::env::temp_dir().join("test_file.txt");
        fs::write(&temp_file, "test").unwrap();
        
        let result = get_directory_images(temp_file.to_string_lossy().to_string()).await;
        
        // Clean up
        fs::remove_file(&temp_file).unwrap();
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a directory"));
    }

    #[tokio::test]
    async fn test_save_image_success() {
        // Create a simple test image data
        let test_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        let image_data = ImageData {
            path: "test.png".to_string(),
            width: 1,
            height: 1,
            format: ImageFormat::PNG,
            data: test_data.to_string(),
            has_alpha: false,
        };
        
        // Save to temp file
        let temp_file = std::env::temp_dir().join("test_save_image.png");
        let result = save_image(image_data, temp_file.to_string_lossy().to_string()).await;
        
        assert!(result.is_ok());
        assert!(temp_file.exists());
        
        // Clean up
        fs::remove_file(&temp_file).unwrap();
    }

    #[tokio::test]
    async fn test_save_image_invalid_directory() {
        let test_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        let image_data = ImageData {
            path: "test.png".to_string(),
            width: 1,
            height: 1,
            format: ImageFormat::PNG,
            data: test_data.to_string(),
            has_alpha: false,
        };
        
        // Try to save to non-existent directory
        let result = save_image(image_data, "/nonexistent/path/12345/test.png".to_string()).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not exist"));
    }

    #[tokio::test]
    async fn test_save_image_invalid_base64() {
        let image_data = ImageData {
            path: "test.png".to_string(),
            width: 1,
            height: 1,
            format: ImageFormat::PNG,
            data: "invalid-base64!!!".to_string(),
            has_alpha: false,
        };
        
        let temp_file = std::env::temp_dir().join("test_invalid.png");
        let result = save_image(image_data, temp_file.to_string_lossy().to_string()).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("decode"));
    }

    #[tokio::test]
    async fn test_get_directory_images_filters_correctly() {
        // Create a temporary directory with mixed files
        let temp_dir = std::env::temp_dir().join("test_filter_dir");
        fs::create_dir_all(&temp_dir).unwrap();
        
        // Create some image files
        fs::write(temp_dir.join("image1.png"), "test").unwrap();
        fs::write(temp_dir.join("image2.jpg"), "test").unwrap();
        fs::write(temp_dir.join("image3.gif"), "test").unwrap();
        
        // Create some non-image files
        fs::write(temp_dir.join("document.txt"), "test").unwrap();
        fs::write(temp_dir.join("data.json"), "test").unwrap();
        
        let result = get_directory_images(temp_dir.to_string_lossy().to_string()).await;
        
        // Clean up
        fs::remove_dir_all(&temp_dir).unwrap();
        
        assert!(result.is_ok());
        let images = result.unwrap();
        assert_eq!(images.len(), 3);
        
        // Verify only image files are included
        assert!(images.iter().any(|p| p.ends_with("image1.png")));
        assert!(images.iter().any(|p| p.ends_with("image2.jpg")));
        assert!(images.iter().any(|p| p.ends_with("image3.gif")));
        assert!(!images.iter().any(|p| p.ends_with("document.txt")));
        assert!(!images.iter().any(|p| p.ends_with("data.json")));
    }
}
