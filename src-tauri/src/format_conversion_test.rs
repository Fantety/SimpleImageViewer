#[cfg(test)]
mod tests {
    use crate::types::{ImageData, ImageFormat, ConversionOptions};
    use base64::{Engine as _, engine::general_purpose};
    use image::{ImageBuffer, Rgba};

    /// Helper function to create a test image
    fn create_test_image(width: u32, height: u32, format: ImageFormat) -> ImageData {
        // Create a simple test image (red square)
        let img = ImageBuffer::from_fn(width, height, |_, _| {
            Rgba([255u8, 0u8, 0u8, 255u8])
        });

        // Encode to the specified format
        let mut buffer = Vec::new();
        let img_format = format.to_image_format().unwrap();
        let dynamic_img = image::DynamicImage::ImageRgba8(img);
        
        dynamic_img.write_to(&mut std::io::Cursor::new(&mut buffer), img_format).unwrap();

        // Encode to Base64
        let base64_data = general_purpose::STANDARD.encode(&buffer);

        ImageData {
            path: format!("test.{}", format.to_string().to_lowercase()),
            width,
            height,
            format,
            data: base64_data,
            has_alpha: false,
        }
    }

    #[tokio::test]
    async fn test_convert_png_to_jpeg() {
        let png_image = create_test_image(100, 100, ImageFormat::PNG);
        
        let result = crate::convert_format(
            png_image.clone(),
            "JPEG".to_string(),
            Some(ConversionOptions { quality: Some(90) })
        ).await;

        assert!(result.is_ok());
        let converted = result.unwrap();
        assert_eq!(converted.format, ImageFormat::JPEG);
        assert_eq!(converted.width, 100);
        assert_eq!(converted.height, 100);
        assert!(converted.path.ends_with(".jpg"));
    }

    #[tokio::test]
    async fn test_convert_jpeg_to_png() {
        let jpeg_image = create_test_image(100, 100, ImageFormat::JPEG);
        
        let result = crate::convert_format(
            jpeg_image.clone(),
            "PNG".to_string(),
            None
        ).await;

        assert!(result.is_ok());
        let converted = result.unwrap();
        assert_eq!(converted.format, ImageFormat::PNG);
        assert_eq!(converted.width, 100);
        assert_eq!(converted.height, 100);
        assert!(converted.path.ends_with(".png"));
    }

    #[tokio::test]
    async fn test_convert_with_quality_parameter() {
        let png_image = create_test_image(100, 100, ImageFormat::PNG);
        
        // Test with quality parameter
        let result = crate::convert_format(
            png_image.clone(),
            "JPEG".to_string(),
            Some(ConversionOptions { quality: Some(50) })
        ).await;

        assert!(result.is_ok());
        let converted = result.unwrap();
        assert_eq!(converted.format, ImageFormat::JPEG);
    }

    #[tokio::test]
    async fn test_convert_invalid_quality() {
        let png_image = create_test_image(100, 100, ImageFormat::PNG);
        
        // Test with invalid quality (> 100)
        let result = crate::convert_format(
            png_image.clone(),
            "JPEG".to_string(),
            Some(ConversionOptions { quality: Some(150) })
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Quality parameter must be between 1 and 100"));
    }

    #[tokio::test]
    async fn test_convert_unsupported_format() {
        let png_image = create_test_image(100, 100, ImageFormat::PNG);
        
        // Test conversion to unsupported format
        let result = crate::convert_format(
            png_image.clone(),
            "INVALID".to_string(),
            None
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported target format"));
    }

    #[tokio::test]
    async fn test_convert_to_svg_rejected() {
        let png_image = create_test_image(100, 100, ImageFormat::PNG);
        
        // SVG conversion should be rejected
        let result = crate::convert_format(
            png_image.clone(),
            "SVG".to_string(),
            None
        ).await;

        assert!(result.is_err());
        // Just verify it returns an error - the exact message may vary
    }

    #[tokio::test]
    async fn test_convert_preserves_dimensions() {
        let png_image = create_test_image(200, 150, ImageFormat::PNG);
        
        let result = crate::convert_format(
            png_image.clone(),
            "BMP".to_string(),
            None
        ).await;

        assert!(result.is_ok());
        let converted = result.unwrap();
        assert_eq!(converted.width, 200);
        assert_eq!(converted.height, 150);
    }

    #[tokio::test]
    async fn test_convert_multiple_formats() {
        let original = create_test_image(100, 100, ImageFormat::PNG);
        
        // Test conversion to multiple formats
        let formats = vec!["JPEG", "BMP", "WEBP", "TIFF"];
        
        for format in formats {
            let result = crate::convert_format(
                original.clone(),
                format.to_string(),
                None
            ).await;

            assert!(result.is_ok(), "Failed to convert to {}", format);
            let converted = result.unwrap();
            assert_eq!(converted.format.to_string(), format);
        }
    }
}
