use serde::{Deserialize, Serialize};

/// Supported image formats
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum ImageFormat {
    PNG,
    JPEG,
    GIF,
    BMP,
    WEBP,
    SVG,
    TIFF,
    ICO,
    HEIC,
    AVIF,
}

impl ImageFormat {
    /// Convert from image crate's ImageFormat
    pub fn from_image_format(format: image::ImageFormat) -> Option<Self> {
        match format {
            image::ImageFormat::Png => Some(ImageFormat::PNG),
            image::ImageFormat::Jpeg => Some(ImageFormat::JPEG),
            image::ImageFormat::Gif => Some(ImageFormat::GIF),
            image::ImageFormat::Bmp => Some(ImageFormat::BMP),
            image::ImageFormat::WebP => Some(ImageFormat::WEBP),
            image::ImageFormat::Tiff => Some(ImageFormat::TIFF),
            image::ImageFormat::Ico => Some(ImageFormat::ICO),
            image::ImageFormat::Avif => Some(ImageFormat::AVIF),
            _ => None,
        }
    }

    /// Convert to image crate's ImageFormat
    pub fn to_image_format(&self) -> Option<image::ImageFormat> {
        match self {
            ImageFormat::PNG => Some(image::ImageFormat::Png),
            ImageFormat::JPEG => Some(image::ImageFormat::Jpeg),
            ImageFormat::GIF => Some(image::ImageFormat::Gif),
            ImageFormat::BMP => Some(image::ImageFormat::Bmp),
            ImageFormat::WEBP => Some(image::ImageFormat::WebP),
            ImageFormat::TIFF => Some(image::ImageFormat::Tiff),
            ImageFormat::ICO => Some(image::ImageFormat::Ico),
            ImageFormat::AVIF => Some(image::ImageFormat::Avif),
            ImageFormat::SVG => None, // SVG is not supported by image crate for encoding
            ImageFormat::HEIC => None, // HEIC is not supported by image crate
        }
    }
}

/// Core image data structure containing image metadata and encoded data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageData {
    /// File path of the image
    pub path: String,
    /// Image width in pixels
    pub width: u32,
    /// Image height in pixels
    pub height: u32,
    /// Image format
    pub format: ImageFormat,
    /// Base64 encoded image data
    pub data: String,
    /// Whether the image has an alpha (transparency) channel
    #[serde(rename = "hasAlpha")]
    pub has_alpha: bool,
}

/// Options for format conversion operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionOptions {
    /// Quality parameter for lossy formats (JPEG, WEBP, AVIF)
    /// Valid range: 1-100
    pub quality: Option<u8>,
}

/// RGB color representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RGBColor {
    /// Red component (0-255)
    pub r: u8,
    /// Green component (0-255)
    pub g: u8,
    /// Blue component (0-255)
    pub b: u8,
}
