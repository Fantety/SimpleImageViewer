#[cfg(test)]
mod tests {
    use crate::error::{AppError, utils};

    #[test]
    fn test_validate_dimensions_valid() {
        assert!(utils::validate_dimensions(100, 200).is_ok());
        assert!(utils::validate_dimensions(1, 1).is_ok());
        assert!(utils::validate_dimensions(u32::MAX, u32::MAX).is_ok());
    }

    #[test]
    fn test_validate_dimensions_invalid() {
        assert!(utils::validate_dimensions(0, 100).is_err());
        assert!(utils::validate_dimensions(100, 0).is_err());
        assert!(utils::validate_dimensions(0, 0).is_err());
    }

    #[test]
    fn test_validate_crop_region_valid() {
        assert!(utils::validate_crop_region(0, 0, 100, 100, 200, 200).is_ok());
        assert!(utils::validate_crop_region(50, 50, 50, 50, 200, 200).is_ok());
        assert!(utils::validate_crop_region(0, 0, 200, 200, 200, 200).is_ok());
    }

    #[test]
    fn test_validate_crop_region_invalid() {
        // Exceeds width
        assert!(utils::validate_crop_region(150, 0, 100, 100, 200, 200).is_err());
        // Exceeds height
        assert!(utils::validate_crop_region(0, 150, 100, 100, 200, 200).is_err());
        // Exceeds both
        assert!(utils::validate_crop_region(100, 100, 150, 150, 200, 200).is_err());
    }

    #[test]
    fn test_validate_quality_valid() {
        assert!(utils::validate_quality(1).is_ok());
        assert!(utils::validate_quality(50).is_ok());
        assert!(utils::validate_quality(100).is_ok());
    }

    #[test]
    fn test_validate_quality_invalid() {
        assert!(utils::validate_quality(0).is_err());
        assert!(utils::validate_quality(101).is_err());
        assert!(utils::validate_quality(255).is_err());
    }

    #[test]
    fn test_error_conversion_to_string() {
        let error = AppError::FileNotFound("test.png".to_string());
        let error_string: String = error.into();
        assert!(error_string.contains("File not found"));
        assert!(error_string.contains("test.png"));
    }

    #[test]
    fn test_error_types() {
        let errors = vec![
            AppError::FileNotFound("test.png".to_string()),
            AppError::UnsupportedFormat("XYZ".to_string()),
            AppError::InvalidImageData("corrupted".to_string()),
            AppError::InvalidParameters("bad params".to_string()),
            AppError::SaveFailed("disk full".to_string()),
            AppError::OperationFailed("unknown".to_string()),
            AppError::PermissionDenied("readonly".to_string()),
        ];

        for error in errors {
            let error_string = error.to_string();
            assert!(!error_string.is_empty());
        }
    }
}
