use thiserror::Error;

/// Application error types
#[derive(Debug, Error)]
pub enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Unsupported image format: {0}")]
    UnsupportedFormat(String),

    #[error("Invalid image data: {0}")]
    InvalidImageData(String),

    #[error("Invalid parameters: {0}")]
    InvalidParameters(String),

    #[error("Save operation failed: {0}")]
    SaveFailed(String),

    #[error("Operation failed: {0}")]
    OperationFailed(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    ImageError(#[from] image::ImageError),

    #[error("Base64 decode error: {0}")]
    Base64Error(#[from] base64::DecodeError),
}

/// Result type alias for application operations
pub type AppResult<T> = Result<T, AppError>;

/// Convert AppError to a string for Tauri command responses
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

/// Utility functions for error handling
pub mod utils {
    use super::AppError;
    use std::path::Path;

    /// Validate that a file exists
    pub fn validate_file_exists(path: &str) -> Result<(), AppError> {
        if !Path::new(path).exists() {
            return Err(AppError::FileNotFound(path.to_string()));
        }
        Ok(())
    }

    /// Validate that a path is writable
    pub fn validate_writable_path(path: &str) -> Result<(), AppError> {
        let path_obj = Path::new(path);
        
        // Check if parent directory exists and is writable
        if let Some(parent) = path_obj.parent() {
            if !parent.exists() {
                return Err(AppError::PermissionDenied(
                    format!("Directory does not exist: {}", parent.display())
                ));
            }
            
            // Try to check write permissions
            if parent.metadata()
                .map(|m| m.permissions().readonly())
                .unwrap_or(true)
            {
                return Err(AppError::PermissionDenied(
                    format!("Directory is read-only: {}", parent.display())
                ));
            }
        }
        
        Ok(())
    }

    /// Validate positive integer dimensions
    pub fn validate_dimensions(width: u32, height: u32) -> Result<(), AppError> {
        if width == 0 || height == 0 {
            return Err(AppError::InvalidParameters(
                "Width and height must be positive integers".to_string()
            ));
        }
        Ok(())
    }

    /// Validate crop region is within image bounds
    pub fn validate_crop_region(
        x: u32,
        y: u32,
        width: u32,
        height: u32,
        img_width: u32,
        img_height: u32,
    ) -> Result<(), AppError> {
        if x + width > img_width || y + height > img_height {
            return Err(AppError::InvalidParameters(
                format!(
                    "Crop region ({}x{} at {},{}) exceeds image bounds ({}x{})",
                    width, height, x, y, img_width, img_height
                )
            ));
        }
        Ok(())
    }

    /// Validate JPEG quality parameter (1-100)
    pub fn validate_quality(quality: u8) -> Result<(), AppError> {
        if quality < 1 || quality > 100 {
            return Err(AppError::InvalidParameters(
                format!("Quality must be between 1 and 100, got {}", quality)
            ));
        }
        Ok(())
    }
}
