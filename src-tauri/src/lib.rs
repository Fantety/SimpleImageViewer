// Module declarations
pub mod types;
pub mod error;
pub mod favorites;
pub mod ocr;

#[cfg(test)]
mod error_test;

#[cfg(test)]
mod image_loader_test;

#[cfg(test)]
mod file_system_test;

#[cfg(test)]
mod resize_test;

#[cfg(test)]
mod format_conversion_test;

#[cfg(test)]
mod crop_test;

#[cfg(test)]
mod background_test;

#[cfg(test)]
mod immutability_test;

#[cfg(test)]
mod favorites_test;

// Re-export commonly used types
pub use types::{ImageData, ImageFormat, ConversionOptions, RGBColor};
pub use error::{AppError, AppResult};
pub use favorites::{FavoriteImage, FavoritesConfig};

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

/// Convert image to a different format
/// 
/// Supports conversion between all supported formats (PNG, JPEG, GIF, BMP, WEBP, TIFF, ICO, AVIF)
/// For lossy formats (JPEG, WEBP, AVIF), quality parameter can be specified (1-100)
/// 
/// Note: SVG and HEIC formats are not supported for conversion
#[tauri::command]
async fn convert_format(
    image_data: ImageData,
    target_format: String,
    options: Option<ConversionOptions>,
) -> Result<ImageData, String> {
    // Parse target format
    let target_format_enum = match target_format.to_uppercase().as_str() {
        "PNG" => ImageFormat::PNG,
        "JPEG" | "JPG" => ImageFormat::JPEG,
        "GIF" => ImageFormat::GIF,
        "BMP" => ImageFormat::BMP,
        "WEBP" => ImageFormat::WEBP,
        "TIFF" | "TIF" => ImageFormat::TIFF,
        "ICO" => ImageFormat::ICO,
        "AVIF" => ImageFormat::AVIF,
        _ => {
            return Err(AppError::UnsupportedFormat(
                format!("Unsupported target format: {}", target_format)
            ).into());
        }
    };
    
    // Validate that we can convert to this format
    if target_format_enum == ImageFormat::SVG || target_format_enum == ImageFormat::HEIC {
        return Err(AppError::UnsupportedFormat(
            format!("Cannot convert to {} format", target_format_enum)
        ).into());
    }
    
    // Validate quality parameter if provided
    if let Some(ref opts) = options {
        if let Some(quality) = opts.quality {
            if quality < 1 || quality > 100 {
                return Err(AppError::InvalidParameters(
                    "Quality parameter must be between 1 and 100".to_string()
                ).into());
            }
        }
    }
    
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Convert to target format
    let mut output_buffer = Vec::new();
    let img_format = target_format_enum.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot encode to {} format", target_format_enum)
        ))?;
    
    // Handle quality parameter for lossy formats
    match target_format_enum {
        ImageFormat::JPEG => {
            let quality = options
                .as_ref()
                .and_then(|o| o.quality)
                .unwrap_or(90); // Default quality for JPEG
            
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut output_buffer,
                quality,
            );
            encoder.encode_image(&img)
                .map_err(AppError::ImageError)?;
        }
        ImageFormat::WEBP => {
            // Note: The image crate's WebP encoder doesn't support quality parameter directly
            // We'll use the default encoding
            img.write_to(&mut std::io::Cursor::new(&mut output_buffer), img_format)
                .map_err(AppError::ImageError)?;
        }
        ImageFormat::AVIF => {
            // Note: AVIF encoding with quality parameter may not be fully supported
            // We'll use the default encoding
            img.write_to(&mut std::io::Cursor::new(&mut output_buffer), img_format)
                .map_err(AppError::ImageError)?;
        }
        _ => {
            // For lossless formats, just encode normally
            img.write_to(&mut std::io::Cursor::new(&mut output_buffer), img_format)
                .map_err(AppError::ImageError)?;
        }
    }
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in converted image
    let has_alpha = detect_alpha_channel(&img);
    
    // Update file path extension to match new format
    let new_path = update_file_extension(&image_data.path, &target_format_enum);
    
    // Return new ImageData with updated format
    Ok(ImageData {
        path: new_path,
        width: image_data.width,
        height: image_data.height,
        format: target_format_enum,
        data: base64_data,
        has_alpha,
    })
}

/// Update file path extension to match the new format
fn update_file_extension(path: &str, format: &ImageFormat) -> String {
    let path_obj = Path::new(path);
    let stem = path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    
    let extension = match format {
        ImageFormat::PNG => "png",
        ImageFormat::JPEG => "jpg",
        ImageFormat::GIF => "gif",
        ImageFormat::BMP => "bmp",
        ImageFormat::WEBP => "webp",
        ImageFormat::TIFF => "tiff",
        ImageFormat::ICO => "ico",
        ImageFormat::AVIF => "avif",
        ImageFormat::SVG => "svg",
        ImageFormat::HEIC => "heic",
    };
    
    if let Some(parent) = path_obj.parent() {
        parent.join(format!("{}.{}", stem, extension))
            .to_string_lossy()
            .to_string()
    } else {
        format!("{}.{}", stem, extension)
    }
}

/// Crop an image to the specified region
/// 
/// Extracts a rectangular region from the image. If the crop region extends beyond
/// the image boundaries, it will be automatically constrained to fit within the image.
/// 
/// @param image_data - The image to crop
/// @param x - X coordinate of the top-left corner of the crop region
/// @param y - Y coordinate of the top-left corner of the crop region
/// @param width - Width of the crop region
/// @param height - Height of the crop region
/// @returns New ImageData containing only the cropped region
#[tauri::command]
async fn crop_image(
    image_data: ImageData,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<ImageData, String> {
    // Validate input parameters
    if width == 0 || height == 0 {
        return Err(AppError::InvalidParameters(
            "Width and height must be positive integers".to_string()
        ).into());
    }
    
    // Constrain crop region to image boundaries
    let constrained_x = x.min(image_data.width.saturating_sub(1));
    let constrained_y = y.min(image_data.height.saturating_sub(1));
    
    // Calculate maximum available width and height from the constrained position
    let max_width = image_data.width.saturating_sub(constrained_x);
    let max_height = image_data.height.saturating_sub(constrained_y);
    
    let constrained_width = width.min(max_width).max(1);
    let constrained_height = height.min(max_height).max(1);
    
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Crop the image
    let cropped = img.crop_imm(constrained_x, constrained_y, constrained_width, constrained_height);
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot crop {} format", image_data.format)
        ))?;
    
    cropped.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in cropped image
    let has_alpha = detect_alpha_channel(&cropped);
    
    // Return new ImageData with updated dimensions
    Ok(ImageData {
        path: image_data.path,
        width: constrained_width,
        height: constrained_height,
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

/// Set background color for transparent images
/// 
/// Replaces transparent pixels with the specified RGB color.
/// Only works on images with an alpha channel (hasAlpha = true).
/// 
/// @param image_data - The image to process (must have alpha channel)
/// @param r - Red component (0-255)
/// @param g - Green component (0-255)
/// @param b - Blue component (0-255)
/// @returns New ImageData with background applied to transparent areas
#[tauri::command]
async fn set_background(
    image_data: ImageData,
    r: u8,
    g: u8,
    b: u8,
) -> Result<ImageData, String> {
    // Validate that the image has an alpha channel
    if !image_data.has_alpha {
        return Err(AppError::InvalidParameters(
            "Image does not have transparency. Background setting is only applicable to transparent images.".to_string()
        ).into());
    }
    
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Convert to RGBA8 for processing
    let mut rgba_img = img.to_rgba8();
    
    // Apply background color to transparent pixels
    for pixel in rgba_img.pixels_mut() {
        let alpha = pixel.0[3];
        
        if alpha < 255 {
            // Blend the background color with the existing pixel based on alpha
            let alpha_f = alpha as f32 / 255.0;
            let inv_alpha = 1.0 - alpha_f;
            
            // Alpha blending: result = foreground * alpha + background * (1 - alpha)
            pixel.0[0] = ((pixel.0[0] as f32 * alpha_f) + (r as f32 * inv_alpha)) as u8;
            pixel.0[1] = ((pixel.0[1] as f32 * alpha_f) + (g as f32 * inv_alpha)) as u8;
            pixel.0[2] = ((pixel.0[2] as f32 * alpha_f) + (b as f32 * inv_alpha)) as u8;
            pixel.0[3] = 255; // Set alpha to fully opaque
        }
    }
    
    // Convert back to DynamicImage
    let result_img = DynamicImage::ImageRgba8(rgba_img);
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot process {} format", image_data.format)
        ))?;
    
    result_img.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // After applying background, the image no longer has transparency
    let has_alpha = false;
    
    // Return new ImageData with background applied
    Ok(ImageData {
        path: image_data.path,
        width: image_data.width,
        height: image_data.height,
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

/// Rotate an image by 90 degrees clockwise or counter-clockwise
/// 
/// @param image_data - ImageData object containing the image to rotate
/// @param clockwise - If true, rotate 90° clockwise; if false, rotate 90° counter-clockwise
/// @returns New ImageData with rotated image (width and height are swapped)
#[tauri::command]
async fn rotate_image(
    image_data: ImageData,
    clockwise: bool,
) -> Result<ImageData, String> {
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Rotate the image
    let rotated = if clockwise {
        img.rotate90()
    } else {
        img.rotate270()
    };
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot rotate {} format", image_data.format)
        ))?;
    
    rotated.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in rotated image
    let has_alpha = detect_alpha_channel(&rotated);
    
    // Return new ImageData with swapped dimensions
    Ok(ImageData {
        path: image_data.path,
        width: rotated.width(),
        height: rotated.height(),
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

// ============================================================================
// Favorites Management Commands
// ============================================================================

/// Get all favorite images
#[tauri::command]
async fn get_all_favorites() -> Result<Vec<FavoriteImage>, String> {
    let config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    Ok(config.get_all())
}

/// Add an image to favorites with tags
#[tauri::command]
async fn add_favorite(path: String, tags: Vec<String>) -> Result<(), String> {
    let mut config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    
    config.add_favorite(path, tags);
    config.save()
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Remove an image from favorites
#[tauri::command]
async fn remove_favorite(path: String) -> Result<bool, String> {
    let mut config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    
    let removed = config.remove_favorite(&path);
    
    if removed {
        config.save()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(removed)
}

/// Check if an image is favorited
#[tauri::command]
async fn is_favorite(path: String) -> Result<bool, String> {
    let config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    Ok(config.is_favorite(&path))
}

/// Search favorites by tags
#[tauri::command]
async fn search_favorites_by_tags(tags: Vec<String>) -> Result<Vec<FavoriteImage>, String> {
    let config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    Ok(config.search_by_tags(&tags))
}

/// Get all unique tags from favorites
#[tauri::command]
async fn get_all_tags() -> Result<Vec<String>, String> {
    let config = FavoritesConfig::load()
        .map_err(|e| e.to_string())?;
    Ok(config.get_all_tags())
}

/// Check if a file exists
#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Perform OCR on an image
#[tauri::command]
async fn ocr_image(image_data: ImageData) -> Result<String, String> {
    // Decode Base64 data
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode Base64: {}", e)))?;
    
    // Load image from decoded data
    let img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Save to temporary file for OCR
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("ocr_temp_{}.png", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis()));
    
    img.save(&temp_path)
        .map_err(|e| AppError::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to save temp image: {}", e)
        )))?;
    
    // Perform OCR using platform-specific implementation
    let text = ocr::perform_ocr(&temp_path)
        .map_err(|e| e.to_string())?;
    
    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);
    
    Ok(text.trim().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            load_image,
            get_directory_images,
            open_file_dialog,
            save_file_dialog,
            save_image,
            resize_image,
            convert_format,
            crop_image,
            set_background,
            rotate_image,
            get_all_favorites,
            add_favorite,
            remove_favorite,
            is_favorite,
            search_favorites_by_tags,
            get_all_tags,
            file_exists,
            ocr_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
