// Module declarations
pub mod types;
pub mod error;

#[cfg(test)]
mod error_test;

#[cfg(test)]
mod image_loader_test;

#[cfg(test)]
mod file_system_test;

#[cfg(test)]
mod resize_test;

// Re-export commonly used types
pub use types::{ImageData, ImageFormat, ConversionOptions, RGBColor};
pub use error::{AppError, AppResult};

use base64::{Engine as _, engine::general_purpose};
use image::{DynamicImage, GenericImageView, ImageReader};
use std::fs;
use std::path::Path;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Load an image from the specified file path
/// 
/// Supports: PNG, JPEG, GIF, BMP, WEBP, SVG, TIFF, ICO, HEIC, AVIF
/// 
/// Returns ImageData containing:
/// - path: original file path
/// - width, height: image dimensions
/// - format: detected image format
/// - data: Base64 encoded image data
/// - hasAlpha: whether the image has transparency
#[tauri::command]
async fn load_image(path: String) -> Result<ImageData, String> {
    // Validate file exists
    error::utils::validate_file_exists(&path)?;
    
    // Read the file into memory
    let file_bytes = fs::read(&path)
        .map_err(AppError::IoError)?;
    
    // Detect format from file extension and content
    let path_obj = Path::new(&path);
    let extension = path_obj
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    // Handle SVG separately as it's not supported by the image crate for decoding
    if extension == "svg" {
        return load_svg_image(path, file_bytes);
    }
    
    // Handle HEIC separately (not supported by image crate)
    if extension == "heic" || extension == "heif" {
        return Err(AppError::UnsupportedFormat(
            "HEIC format is not yet supported".to_string()
        ).into());
    }
    
    // Load image using the image crate
    let img = ImageReader::open(&path)
        .map_err(AppError::IoError)?
        .decode()
        .map_err(AppError::ImageError)?;
    
    // Extract metadata
    let (width, height) = img.dimensions();
    let has_alpha = detect_alpha_channel(&img);
    
    // Detect format
    let format = detect_image_format(&path, &extension)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&file_bytes);
    
    Ok(ImageData {
        path,
        width,
        height,
        format,
        data: base64_data,
        has_alpha,
    })
}

/// Load SVG image (special handling since image crate doesn't decode SVG)
fn load_svg_image(path: String, file_bytes: Vec<u8>) -> Result<ImageData, String> {
    // For SVG, we can't easily determine dimensions without a full SVG parser
    // We'll use placeholder dimensions and let the frontend handle rendering
    // SVG files are typically small and can be embedded directly
    
    let base64_data = general_purpose::STANDARD.encode(&file_bytes);
    
    // SVG doesn't have a fixed size, we'll use 0x0 to indicate it needs to be determined by the renderer
    Ok(ImageData {
        path,
        width: 0,
        height: 0,
        format: ImageFormat::SVG,
        data: base64_data,
        has_alpha: true, // SVG can have transparency
    })
}

/// Detect if an image has an alpha (transparency) channel
fn detect_alpha_channel(img: &DynamicImage) -> bool {
    use image::DynamicImage::*;
    
    match img {
        ImageLuma8(_) | ImageRgb8(_) | ImageRgb16(_) | ImageRgb32F(_) => false,
        ImageLumaA8(img_data) => {
            // Check if any pixel has alpha < 255
            img_data.pixels().any(|p| p.0[1] < 255)
        }
        ImageRgba8(img_data) => {
            // Check if any pixel has alpha < 255
            img_data.pixels().any(|p| p.0[3] < 255)
        }
        ImageRgba16(img_data) => {
            // Check if any pixel has alpha < 65535
            img_data.pixels().any(|p| p.0[3] < 65535)
        }
        ImageRgba32F(img_data) => {
            // Check if any pixel has alpha < 1.0
            img_data.pixels().any(|p| p.0[3] < 1.0)
        }
        _ => false,
    }
}

/// Detect image format from file path and extension
fn detect_image_format(path: &str, extension: &str) -> Result<ImageFormat, AppError> {
    let format = match extension {
        "png" => ImageFormat::PNG,
        "jpg" | "jpeg" => ImageFormat::JPEG,
        "gif" => ImageFormat::GIF,
        "bmp" => ImageFormat::BMP,
        "webp" => ImageFormat::WEBP,
        "svg" => ImageFormat::SVG,
        "tiff" | "tif" => ImageFormat::TIFF,
        "ico" => ImageFormat::ICO,
        "heic" | "heif" => ImageFormat::HEIC,
        "avif" => ImageFormat::AVIF,
        _ => {
            // Try to guess from image crate
            let img_format = ImageReader::open(path)
                .ok()
                .and_then(|reader| reader.format())
                .and_then(ImageFormat::from_image_format);
            
            img_format.ok_or_else(|| {
                AppError::UnsupportedFormat(format!("Unknown format: {}", extension))
            })?
        }
    };
    
    Ok(format)
}

/// Get list of image files in a directory
/// 
/// Returns a list of file paths for all supported image formats in the specified directory
#[tauri::command]
async fn get_directory_images(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    
    // Validate directory exists
    if !path.exists() {
        return Err(AppError::FileNotFound(dir_path).into());
    }
    
    if !path.is_dir() {
        return Err(AppError::InvalidParameters(
            "Path is not a directory".to_string()
        ).into());
    }
    
    // Read directory entries
    let entries = fs::read_dir(path)
        .map_err(AppError::IoError)?;
    
    // Supported image extensions
    let supported_extensions = [
        "png", "jpg", "jpeg", "gif", "bmp", "webp", 
        "svg", "tiff", "tif", "ico", "heic", "heif", "avif"
    ];
    
    // Filter and collect image files
    let mut image_files: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().is_file()
        })
        .filter(|entry| {
            entry.path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| supported_extensions.contains(&ext.to_lowercase().as_str()))
                .unwrap_or(false)
        })
        .filter_map(|entry| {
            entry.path().to_str().map(|s| s.to_string())
        })
        .collect();
    
    // Sort alphabetically for consistent ordering
    image_files.sort();
    
    Ok(image_files)
}

/// Open file dialog to select an image file
/// 
/// Returns the selected file path, or None if the user cancelled
#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path = app.dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "tiff", "tif", "ico", "heic", "heif", "avif"])
        .blocking_pick_file();
    
    Ok(file_path.and_then(|path| {
        path.as_path().map(|p| p.to_string_lossy().to_string())
    }))
}

/// Open save file dialog
/// 
/// Returns the selected save path, or None if the user cancelled
#[tauri::command]
async fn save_file_dialog(app: tauri::AppHandle, default_name: String) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path = app.dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "tiff", "tif", "ico", "avif"])
        .set_file_name(&default_name)
        .blocking_save_file();
    
    Ok(file_path.and_then(|path| {
        path.as_path().map(|p| p.to_string_lossy().to_string())
    }))
}

/// Save image data to a file
/// 
/// Decodes the Base64 image data and writes it to the specified path
#[tauri::command]
async fn save_image(image_data: ImageData, path: String) -> Result<(), String> {
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Validate the parent directory exists
    let path_obj = Path::new(&path);
    if let Some(parent) = path_obj.parent() {
        if !parent.exists() {
            return Err(AppError::FileNotFound(
                format!("Directory does not exist: {}", parent.display())
            ).into());
        }
    }
    
    // Write to file
    fs::write(&path, decoded_data)
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::PermissionDenied {
                AppError::PermissionDenied(format!("Cannot write to: {}", path))
            } else {
                AppError::SaveFailed(format!("Failed to save image: {}", e))
            }
        })?;
    
    Ok(())
}

/// Resize an image to the specified dimensions
/// 
/// If keep_aspect_ratio is true, the image will be resized to fit within the specified
/// dimensions while maintaining the original aspect ratio. The actual dimensions may be
/// smaller than requested to preserve the aspect ratio.
/// 
/// If keep_aspect_ratio is false, the image will be resized to exactly the specified dimensions.
#[tauri::command]
async fn resize_image(
    image_data: ImageData,
    width: u32,
    height: u32,
    keep_aspect_ratio: bool,
) -> Result<ImageData, String> {
    // Validate input parameters
    if width == 0 || height == 0 {
        return Err(AppError::InvalidParameters(
            "Width and height must be positive integers".to_string()
        ).into());
    }
    
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Calculate target dimensions
    let (target_width, target_height) = if keep_aspect_ratio {
        calculate_aspect_ratio_dimensions(
            image_data.width,
            image_data.height,
            width,
            height,
        )
    } else {
        (width, height)
    };
    
    // Resize the image using Lanczos3 filter for high quality
    let resized = img.resize(target_width, target_height, image::imageops::FilterType::Lanczos3);
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot resize {} format", image_data.format)
        ))?;
    
    resized.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in resized image
    let has_alpha = detect_alpha_channel(&resized);
    
    // Return new ImageData with updated dimensions
    Ok(ImageData {
        path: image_data.path,
        width: target_width,
        height: target_height,
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

/// Calculate dimensions that maintain aspect ratio
/// 
/// Given original dimensions and target dimensions, calculates the largest size
/// that fits within the target while maintaining the original aspect ratio.
fn calculate_aspect_ratio_dimensions(
    original_width: u32,
    original_height: u32,
    target_width: u32,
    target_height: u32,
) -> (u32, u32) {
    let original_ratio = original_width as f64 / original_height as f64;
    let target_ratio = target_width as f64 / target_height as f64;
    
    if original_ratio > target_ratio {
        // Width is the limiting factor
        let new_width = target_width;
        let new_height = (target_width as f64 / original_ratio).round() as u32;
        (new_width, new_height.max(1))
    } else {
        // Height is the limiting factor
        let new_height = target_height;
        let new_width = (target_height as f64 * original_ratio).round() as u32;
        (new_width.max(1), new_height)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            load_image,
            get_directory_images,
            open_file_dialog,
            save_file_dialog,
            save_image,
            resize_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
