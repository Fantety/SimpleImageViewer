// Module declarations
pub mod types;
pub mod error;
pub mod favorites;

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
pub use types::{ImageData, ImageFormat, ConversionOptions, RGBColor, StickerData, TextData};
pub use error::{AppError, AppResult};
pub use favorites::{FavoriteImage, FavoritesConfig};

use base64::{Engine as _, engine::general_purpose};
use image::{DynamicImage, GenericImageView, ImageReader, Rgba};
// Note: imageproc is available for future use if needed
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

/// Apply stickers to an image
/// 
/// Composites multiple sticker images onto a base image at specified positions,
/// sizes, and rotations. Stickers are applied in the order they appear in the array,
/// with later stickers appearing on top of earlier ones.
/// 
/// @param image_data - The base image to apply stickers to
/// @param stickers - Array of sticker data containing position, size, rotation, and image data
/// @returns New ImageData with stickers applied
#[tauri::command]
async fn apply_stickers(
    image_data: ImageData,
    stickers: Vec<StickerData>,
) -> Result<ImageData, String> {
    if stickers.is_empty() {
        return Err(AppError::InvalidParameters(
            "No stickers provided".to_string()
        ).into());
    }

    // Decode Base64 data for the base image
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode base image Base64: {}", e)))?;
    
    // Load base image from decoded data
    let base_img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Convert to RGBA8 for compositing
    let mut base_rgba = base_img.to_rgba8();
    
    // Apply each sticker
    for (index, sticker) in stickers.iter().enumerate() {
        // Validate sticker parameters
        if sticker.width == 0 || sticker.height == 0 {
            return Err(AppError::InvalidParameters(
                format!("Sticker {} has invalid dimensions", index)
            ).into());
        }
        
        // Decode sticker image data
        let sticker_decoded = general_purpose::STANDARD
            .decode(&sticker.image_data)
            .map_err(|e| AppError::InvalidImageData(
                format!("Failed to decode sticker {} Base64: {}", index, e)
            ))?;
        
        // Load sticker image
        let sticker_img = image::load_from_memory(&sticker_decoded)
            .map_err(|e| AppError::ImageError(
                image::ImageError::IoError(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Failed to load sticker {}: {}", index, e)
                ))
            ))?;
        
        // Resize sticker to target dimensions
        let resized_sticker = sticker_img.resize_exact(
            sticker.width,
            sticker.height,
            image::imageops::FilterType::Lanczos3
        );
        
        // Convert sticker to RGBA8 for processing
        let sticker_rgba = resized_sticker.to_rgba8();
        
        // Calculate rotation parameters
        let rotation_radians = sticker.rotation * std::f32::consts::PI / 180.0;
        let cos_angle = rotation_radians.cos();
        let sin_angle = rotation_radians.sin();
        
        // Calculate the center of the sticker in the base image
        let center_x = sticker.x as f32 + (sticker.width as f32 / 2.0);
        let center_y = sticker.y as f32 + (sticker.height as f32 / 2.0);
        
        // Calculate the bounds of the rotated sticker
        let half_width = sticker.width as f32 / 2.0;
        let half_height = sticker.height as f32 / 2.0;
        
        // For each pixel in the base image, check if it should receive a rotated sticker pixel
        for base_y in 0..base_rgba.height() {
            for base_x in 0..base_rgba.width() {
                // Translate to sticker center coordinates
                let dx = base_x as f32 - center_x;
                let dy = base_y as f32 - center_y;
                
                // Apply inverse rotation to find source pixel in original sticker
                let src_x = dx * cos_angle + dy * sin_angle + half_width;
                let src_y = -dx * sin_angle + dy * cos_angle + half_height;
                
                // Check if the source coordinates are within the sticker bounds
                if src_x >= 0.0 && src_x < sticker.width as f32 && 
                   src_y >= 0.0 && src_y < sticker.height as f32 {
                    
                    // Use bilinear interpolation for smooth rotation
                    let x0 = src_x.floor() as u32;
                    let y0 = src_y.floor() as u32;
                    let x1 = (x0 + 1).min(sticker.width - 1);
                    let y1 = (y0 + 1).min(sticker.height - 1);
                    
                    let fx = src_x - x0 as f32;
                    let fy = src_y - y0 as f32;
                    
                    // Get the four surrounding pixels
                    let p00 = sticker_rgba.get_pixel(x0, y0);
                    let p10 = sticker_rgba.get_pixel(x1, y0);
                    let p01 = sticker_rgba.get_pixel(x0, y1);
                    let p11 = sticker_rgba.get_pixel(x1, y1);
                    
                    // Bilinear interpolation
                    let interpolated_pixel = Rgba([
                        ((p00.0[0] as f32 * (1.0 - fx) + p10.0[0] as f32 * fx) * (1.0 - fy) +
                         (p01.0[0] as f32 * (1.0 - fx) + p11.0[0] as f32 * fx) * fy) as u8,
                        ((p00.0[1] as f32 * (1.0 - fx) + p10.0[1] as f32 * fx) * (1.0 - fy) +
                         (p01.0[1] as f32 * (1.0 - fx) + p11.0[1] as f32 * fx) * fy) as u8,
                        ((p00.0[2] as f32 * (1.0 - fx) + p10.0[2] as f32 * fx) * (1.0 - fy) +
                         (p01.0[2] as f32 * (1.0 - fx) + p11.0[2] as f32 * fx) * fy) as u8,
                        ((p00.0[3] as f32 * (1.0 - fx) + p10.0[3] as f32 * fx) * (1.0 - fy) +
                         (p01.0[3] as f32 * (1.0 - fx) + p11.0[3] as f32 * fx) * fy) as u8,
                    ]);
                    
                    // Apply alpha blending
                    let base_pixel = base_rgba.get_pixel_mut(base_x, base_y);
                    let sticker_alpha = interpolated_pixel.0[3] as f32 / 255.0;
                    let inv_alpha = 1.0 - sticker_alpha;
                    
                    // Blend RGB channels
                    base_pixel.0[0] = ((base_pixel.0[0] as f32 * inv_alpha) + (interpolated_pixel.0[0] as f32 * sticker_alpha)) as u8;
                    base_pixel.0[1] = ((base_pixel.0[1] as f32 * inv_alpha) + (interpolated_pixel.0[1] as f32 * sticker_alpha)) as u8;
                    base_pixel.0[2] = ((base_pixel.0[2] as f32 * inv_alpha) + (interpolated_pixel.0[2] as f32 * sticker_alpha)) as u8;
                    
                    // Combine alpha channels
                    let combined_alpha = (base_pixel.0[3] as f32 / 255.0) * inv_alpha + sticker_alpha;
                    base_pixel.0[3] = (combined_alpha * 255.0) as u8;
                }
            }
        }
    }
    
    // Convert back to DynamicImage
    let result_img = DynamicImage::ImageRgba8(base_rgba);
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot encode {} format", image_data.format)
        ))?;
    
    result_img.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in result image
    let has_alpha = detect_alpha_channel(&result_img);
    
    // Return new ImageData with stickers applied
    Ok(ImageData {
        path: image_data.path,
        width: image_data.width,
        height: image_data.height,
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

/// Apply text overlays to an image
/// 
/// Renders text onto the image at specified positions with customizable styling.
/// Each text element can have its own font, size, color, and rotation.
/// 
/// @param image_data - The base image to apply text to
/// @param texts - Array of text data with positioning and styling information
/// @returns New ImageData with text applied
#[tauri::command]
async fn apply_texts(
    image_data: ImageData,
    texts: Vec<TextData>,
) -> Result<ImageData, String> {
    if texts.is_empty() {
        return Err(AppError::InvalidParameters(
            "No texts provided".to_string()
        ).into());
    }

    // Decode Base64 data for the base image
    let decoded_data = general_purpose::STANDARD
        .decode(&image_data.data)
        .map_err(|e| AppError::InvalidImageData(format!("Failed to decode base image Base64: {}", e)))?;
    
    // Load base image from decoded data
    let base_img = image::load_from_memory(&decoded_data)
        .map_err(AppError::ImageError)?;
    
    // Convert to RGBA8 for text rendering
    let mut base_rgba = base_img.to_rgba8();
    
    // Apply each text
    for (index, text_data) in texts.iter().enumerate() {
        // Validate text parameters
        if text_data.text.is_empty() {
            continue; // Skip empty text
        }
        
        if text_data.font_size == 0 {
            return Err(AppError::InvalidParameters(
                format!("Text {} has invalid font size", index)
            ).into());
        }
        
        // Parse color
        let color = parse_hex_color(&text_data.color)
            .map_err(|e| AppError::InvalidParameters(
                format!("Text {} has invalid color '{}': {}", index, text_data.color, e)
            ))?;
        
        // Render text using font files
        render_text_on_image(
            &mut base_rgba,
            &text_data.text,
            text_data.x,
            text_data.y,
            text_data.font_size,
            color,
            text_data.rotation,
        )?;
    }
    
    // Convert back to DynamicImage
    let result_img = DynamicImage::ImageRgba8(base_rgba);
    
    // Encode to the same format as the original
    let mut output_buffer = Vec::new();
    let format = image_data.format.to_image_format()
        .ok_or_else(|| AppError::UnsupportedFormat(
            format!("Cannot encode {} format", image_data.format)
        ))?;
    
    result_img.write_to(&mut std::io::Cursor::new(&mut output_buffer), format)
        .map_err(AppError::ImageError)?;
    
    // Encode to Base64
    let base64_data = general_purpose::STANDARD.encode(&output_buffer);
    
    // Detect alpha channel in result image
    let has_alpha = detect_alpha_channel(&result_img);
    
    // Return new ImageData with text applied
    Ok(ImageData {
        path: image_data.path,
        width: image_data.width,
        height: image_data.height,
        format: image_data.format,
        data: base64_data,
        has_alpha,
    })
}

/// Parse hex color string to RGB values
fn parse_hex_color(hex: &str) -> Result<(u8, u8, u8), String> {
    let hex = hex.trim_start_matches('#');
    
    if hex.len() != 6 {
        return Err("Color must be in #RRGGBB format".to_string());
    }
    
    let r = u8::from_str_radix(&hex[0..2], 16)
        .map_err(|_| "Invalid red component")?;
    let g = u8::from_str_radix(&hex[2..4], 16)
        .map_err(|_| "Invalid green component")?;
    let b = u8::from_str_radix(&hex[4..6], 16)
        .map_err(|_| "Invalid blue component")?;
    
    Ok((r, g, b))
}

/// Render text on image using font files from src-tauri/fonts directory
fn render_text_on_image(
    image: &mut image::RgbaImage,
    text: &str,
    x: u32,
    y: u32,
    font_size: u32,
    color: (u8, u8, u8),
    _rotation: f32, // TODO: Implement rotation
) -> Result<(), String> {
    use ab_glyph::PxScale;
    use imageproc::drawing::draw_text_mut;
    
    // Try to load a font from the fonts directory
    let font = load_font_from_directory()?;
    
    // Set font scale
    let scale = PxScale::from(font_size as f32);
    let text_color = image::Rgba([color.0, color.1, color.2, 255]);
    
    // Draw text using imageproc
    draw_text_mut(
        image,
        text_color,
        x as i32,
        y as i32,
        scale,
        &font,
        text,
    );
    
    println!("Successfully rendered text '{}' using font", text);
    Ok(())
}

/// Load font from fonts directory (bundled with the app)
fn load_font_from_directory() -> Result<ab_glyph::FontArc, String> {
    use ab_glyph::FontArc;
    use std::fs;
    use std::path::Path;
    
    // Try development location first
    let dev_fonts_dir = Path::new("src-tauri/fonts");
    if dev_fonts_dir.exists() {
        return load_font_from_path(dev_fonts_dir);
    }
    
    // For bundled app, try relative to executable
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or("Failed to get executable directory")?;
    
    // Try fonts directory relative to executable
    let bundled_fonts_dir = exe_dir.join("fonts");
    if bundled_fonts_dir.exists() {
        return load_font_from_path(&bundled_fonts_dir);
    }
    
    // Try other possible locations
    let possible_paths = vec![
        Path::new("fonts"),                    // Current directory
        Path::new("../fonts"),                 // Parent directory
        Path::new("./fonts"),                  // Explicit current directory
    ];
    
    for path in &possible_paths {
        if path.exists() {
            return load_font_from_path(path);
        }
    }
    
    Err(format!("Fonts directory not found. Tried locations: {:?}, {:?}, and other standard paths. Please ensure font files are bundled with the application.", 
               dev_fonts_dir, bundled_fonts_dir))
}

/// Load font from a specific directory path
fn load_font_from_path(fonts_dir: &Path) -> Result<ab_glyph::FontArc, String> {
    use ab_glyph::FontArc;
    use std::fs;
    
    // Supported font file extensions
    let font_extensions = vec!["ttf", "otf", "ttc", "woff", "woff2"];
    
    // Try to read font files from the directory
    let entries = fs::read_dir(fonts_dir)
        .map_err(|e| format!("Failed to read fonts directory: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            
            // Check if it's a font file
            if let Some(extension) = path.extension() {
                if let Some(ext_str) = extension.to_str() {
                    if font_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        // Try to load this font file
                        match fs::read(&path) {
                            Ok(font_data) => {
                                match FontArc::try_from_vec(font_data) {
                                    Ok(font) => {
                                        println!("Successfully loaded font: {:?}", path.file_name());
                                        return Ok(font);
                                    }
                                    Err(e) => {
                                        println!("Failed to parse font {:?}: {}", path.file_name(), e);
                                        continue;
                                    }
                                }
                            }
                            Err(e) => {
                                println!("Failed to read font file {:?}: {}", path.file_name(), e);
                                continue;
                            }
                        }
                    }
                }
            }
        }
    }
    
    Err(format!("No valid font files found in '{}' directory. Please add .ttf, .otf, .ttc, .woff, or .woff2 files.", fonts_dir.display()))
}







/// Get command line arguments
#[tauri::command]
async fn get_command_line_args() -> Result<Vec<String>, String> {
    let args: Vec<String> = std::env::args().collect();
    // Skip the first argument (program name) and return the rest
    Ok(args.into_iter().skip(1).collect())
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
            apply_stickers,
            apply_texts,
            get_all_favorites,
            add_favorite,
            remove_favorite,
            is_favorite,
            search_favorites_by_tags,
            get_all_tags,
            file_exists,
            get_command_line_args
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
