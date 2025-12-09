use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use ocrs::{ImageSource, OcrEngine, OcrEngineParams};
use rten::Model;

/// Get the path to bundled OCR models
fn get_model_path(model_name: &str) -> AppResult<PathBuf> {
    // In development, models are in src-tauri/models/
    // In production, they're bundled as resources
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("models")
        .join(model_name);
    
    if dev_path.exists() {
        return Ok(dev_path);
    }
    
    // Try production resource path
    // Note: In production, Tauri bundles resources to a specific location
    // We'll need to handle this through Tauri's resource resolver
    Err(AppError::InvalidParameters(format!(
        "Model file not found: {}. Please ensure OCR models are bundled with the application.",
        model_name
    )))
}

/// Perform OCR on an image
pub fn perform_ocr(image_path: &Path) -> AppResult<String> {
    // Load the image and convert to RGB8
    let img = image::open(image_path)
        .map_err(|e| AppError::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to load image: {}", e)
        )))?
        .into_rgb8();

    // Load OCR models
    let detection_model_path = get_model_path("text-detection.rten")?;
    let recognition_model_path = get_model_path("text-recognition.rten")?;
    
    let detection_model = Model::load_file(&detection_model_path)
        .map_err(|e| AppError::InvalidParameters(format!("Failed to load detection model: {}", e)))?;
    
    let recognition_model = Model::load_file(&recognition_model_path)
        .map_err(|e| AppError::InvalidParameters(format!("Failed to load recognition model: {}", e)))?;

    // Initialize OCR engine with loaded models
    let engine = OcrEngine::new(OcrEngineParams {
        detection_model: Some(detection_model),
        recognition_model: Some(recognition_model),
        ..Default::default()
    })
    .map_err(|e| AppError::InvalidParameters(format!("Failed to initialize OCR engine: {}", e)))?;

    // Prepare image source from bytes
    let img_source = ImageSource::from_bytes(img.as_raw(), img.dimensions())
        .map_err(|e| AppError::InvalidParameters(format!("Failed to create image source: {}", e)))?;

    // Prepare input for OCR
    let ocr_input = engine.prepare_input(img_source)
        .map_err(|e| AppError::InvalidParameters(format!("Failed to prepare OCR input: {}", e)))?;

    // Extract all text as a single string
    let text = engine.get_text(&ocr_input)
        .map_err(|e| AppError::InvalidParameters(format!("OCR failed: {}", e)))?;

    Ok(text)
}
