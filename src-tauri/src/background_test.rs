#[cfg(test)]
mod tests {
    use crate::{set_background, ImageData, ImageFormat};
    use base64::{Engine as _, engine::general_purpose};
    use image::{DynamicImage, ImageBuffer, Rgba};

    /// Helper function to create a test image with transparency
    fn create_test_image_with_alpha() -> ImageData {
        // Create a 10x10 RGBA image with some transparent pixels
        let mut img = ImageBuffer::new(10, 10);
        
        // Fill with semi-transparent red
        for pixel in img.pixels_mut() {
            *pixel = Rgba([255, 0, 0, 128]); // Semi-transparent red
        }
        
        // Make some pixels fully transparent
        for x in 0..5 {
            for y in 0..5 {
                img.put_pixel(x, y, Rgba([0, 0, 0, 0])); // Fully transparent
            }
        }
        
        // Encode to PNG
        let mut buffer = Vec::new();
        DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
            .unwrap();
        
        let base64_data = general_purpose::STANDARD.encode(&buffer);
        
        ImageData {
            path: "test.png".to_string(),
            width: 10,
            height: 10,
            format: ImageFormat::PNG,
            data: base64_data,
            has_alpha: true,
        }
    }

    /// Helper function to create a test image without transparency
    fn create_test_image_without_alpha() -> ImageData {
        // Create a 10x10 RGB image (no alpha)
        let img = ImageBuffer::from_fn(10, 10, |_, _| {
            image::Rgb([255, 0, 0]) // Solid red
        });
        
        // Encode to JPEG (doesn't support alpha)
        let mut buffer = Vec::new();
        DynamicImage::ImageRgb8(img)
            .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Jpeg)
            .unwrap();
        
        let base64_data = general_purpose::STANDARD.encode(&buffer);
        
        ImageData {
            path: "test.jpg".to_string(),
            width: 10,
            height: 10,
            format: ImageFormat::JPEG,
            data: base64_data,
            has_alpha: false,
        }
    }

    #[tokio::test]
    async fn test_set_background_basic() {
        let image_data = create_test_image_with_alpha();
        
        // Set white background
        let result = set_background(image_data, 255, 255, 255).await;
        
        assert!(result.is_ok());
        let result_image = result.unwrap();
        
        // After setting background, image should no longer have alpha
        assert_eq!(result_image.has_alpha, false);
        assert_eq!(result_image.width, 10);
        assert_eq!(result_image.height, 10);
    }

    #[tokio::test]
    async fn test_set_background_rejects_non_transparent() {
        let image_data = create_test_image_without_alpha();
        
        // Try to set background on non-transparent image
        let result = set_background(image_data, 255, 255, 255).await;
        
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("does not have transparency"));
    }

    #[tokio::test]
    async fn test_set_background_different_colors() {
        let image_data = create_test_image_with_alpha();
        
        // Test with different colors
        let colors = vec![
            (255, 255, 255), // White
            (0, 0, 0),       // Black
            (255, 0, 0),     // Red
            (0, 255, 0),     // Green
            (0, 0, 255),     // Blue
        ];
        
        for (r, g, b) in colors {
            let result = set_background(image_data.clone(), r, g, b).await;
            assert!(result.is_ok(), "Failed to set background with color ({}, {}, {})", r, g, b);
            
            let result_image = result.unwrap();
            assert_eq!(result_image.has_alpha, false);
        }
    }

    #[tokio::test]
    async fn test_set_background_preserves_dimensions() {
        let image_data = create_test_image_with_alpha();
        let original_width = image_data.width;
        let original_height = image_data.height;
        
        let result = set_background(image_data, 128, 128, 128).await;
        
        assert!(result.is_ok());
        let result_image = result.unwrap();
        
        assert_eq!(result_image.width, original_width);
        assert_eq!(result_image.height, original_height);
    }

    #[tokio::test]
    async fn test_set_background_preserves_format() {
        let image_data = create_test_image_with_alpha();
        let original_format = image_data.format.clone();
        
        let result = set_background(image_data, 200, 200, 200).await;
        
        assert!(result.is_ok());
        let result_image = result.unwrap();
        
        assert_eq!(result_image.format, original_format);
    }

    #[tokio::test]
    async fn test_set_background_alpha_blending() {
        // Create an image with known semi-transparent pixels
        let mut img = ImageBuffer::new(2, 2);
        
        // Pixel 1: Fully transparent (should become pure background)
        img.put_pixel(0, 0, Rgba([255, 0, 0, 0]));
        
        // Pixel 2: Fully opaque (should remain unchanged)
        img.put_pixel(1, 0, Rgba([255, 0, 0, 255]));
        
        // Pixel 3: 50% transparent (should blend with background)
        img.put_pixel(0, 1, Rgba([255, 0, 0, 128]));
        
        // Pixel 4: 25% transparent (should blend with background)
        img.put_pixel(1, 1, Rgba([255, 0, 0, 192]));
        
        // Encode to PNG
        let mut buffer = Vec::new();
        DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Png)
            .unwrap();
        
        let base64_data = general_purpose::STANDARD.encode(&buffer);
        
        let image_data = ImageData {
            path: "test_blend.png".to_string(),
            width: 2,
            height: 2,
            format: ImageFormat::PNG,
            data: base64_data,
            has_alpha: true,
        };
        
        // Set white background (255, 255, 255)
        let result = set_background(image_data, 255, 255, 255).await;
        
        assert!(result.is_ok());
        let result_image = result.unwrap();
        
        // Verify the result has no alpha
        assert_eq!(result_image.has_alpha, false);
        
        // Decode the result to verify pixel values
        let decoded_data = general_purpose::STANDARD.decode(&result_image.data).unwrap();
        let result_img = image::load_from_memory(&decoded_data).unwrap();
        let result_rgba = result_img.to_rgba8();
        
        // Pixel 1 (fully transparent): should be white (255, 255, 255)
        let pixel1 = result_rgba.get_pixel(0, 0);
        assert!(pixel1.0[0] >= 250 && pixel1.0[1] >= 250 && pixel1.0[2] >= 250, 
                "Fully transparent pixel should become white background");
        
        // Pixel 2 (fully opaque red): should remain red (255, 0, 0)
        let pixel2 = result_rgba.get_pixel(1, 0);
        assert!(pixel2.0[0] >= 250 && pixel2.0[1] <= 5 && pixel2.0[2] <= 5,
                "Fully opaque pixel should remain unchanged");
        
        // All pixels should be fully opaque now
        assert_eq!(pixel1.0[3], 255);
        assert_eq!(pixel2.0[3], 255);
    }
}
