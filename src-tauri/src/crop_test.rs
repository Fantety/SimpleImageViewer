#[cfg(test)]
mod tests {
    use crate::types::{ImageData, ImageFormat};
    use base64::{Engine as _, engine::general_purpose};
    use image::{ImageBuffer, Rgba};

    /// Helper function to create a test image
    fn create_test_image(width: u32, height: u32) -> ImageData {
        // Create a simple test image with a gradient
        let img = ImageBuffer::from_fn(width, height, |x, y| {
            let r = (x * 255 / width) as u8;
            let g = (y * 255 / height) as u8;
            let b = 128;
            Rgba([r, g, b, 255])
        });

        // Encode to PNG
        let mut buffer = Vec::new();
        img.write_to(
            &mut std::io::Cursor::new(&mut buffer),
            image::ImageFormat::Png,
        )
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
    async fn test_crop_basic() {
        let image_data = create_test_image(100, 100);

        // Crop a 50x50 region from the center
        let result = crate::crop_image(image_data, 25, 25, 50, 50).await;

        assert!(result.is_ok());
        let cropped = result.unwrap();
        assert_eq!(cropped.width, 50);
        assert_eq!(cropped.height, 50);
        assert_eq!(cropped.format, ImageFormat::PNG);
    }

    #[tokio::test]
    async fn test_crop_boundary_constraint() {
        let image_data = create_test_image(100, 100);

        // Try to crop beyond image boundaries
        let result = crate::crop_image(image_data, 80, 80, 50, 50).await;

        assert!(result.is_ok());
        let cropped = result.unwrap();
        
        // Should be constrained to fit within image
        assert!(cropped.width <= 20); // Max available from x=80
        assert!(cropped.height <= 20); // Max available from y=80
    }

    #[tokio::test]
    async fn test_crop_zero_dimensions() {
        let image_data = create_test_image(100, 100);

        // Try to crop with zero width
        let result = crate::crop_image(image_data.clone(), 10, 10, 0, 50).await;
        assert!(result.is_err());

        // Try to crop with zero height
        let result = crate::crop_image(image_data, 10, 10, 50, 0).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_crop_full_image() {
        let image_data = create_test_image(100, 100);

        // Crop the entire image
        let result = crate::crop_image(image_data.clone(), 0, 0, 100, 100).await;

        assert!(result.is_ok());
        let cropped = result.unwrap();
        assert_eq!(cropped.width, image_data.width);
        assert_eq!(cropped.height, image_data.height);
    }

    #[tokio::test]
    async fn test_crop_preserves_format() {
        let image_data = create_test_image(100, 100);
        let original_format = image_data.format.clone();

        let result = crate::crop_image(image_data, 10, 10, 50, 50).await;

        assert!(result.is_ok());
        let cropped = result.unwrap();
        assert_eq!(cropped.format, original_format);
    }

    #[tokio::test]
    async fn test_crop_small_region() {
        let image_data = create_test_image(100, 100);

        // Crop a very small 1x1 region
        let result = crate::crop_image(image_data, 50, 50, 1, 1).await;

        assert!(result.is_ok());
        let cropped = result.unwrap();
        assert_eq!(cropped.width, 1);
        assert_eq!(cropped.height, 1);
    }
}
