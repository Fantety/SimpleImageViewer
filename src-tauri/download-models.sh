#!/bin/bash
# Download OCR models for the application

set -e

MODELS_DIR="$(dirname "$0")/models"
mkdir -p "$MODELS_DIR"

echo "Downloading OCR models..."

if [ ! -f "$MODELS_DIR/text-detection.rten" ]; then
    echo "Downloading text-detection.rten..."
    curl -o "$MODELS_DIR/text-detection.rten" https://ocrs-models.s3-accelerate.amazonaws.com/text-detection.rten
else
    echo "text-detection.rten already exists, skipping..."
fi

if [ ! -f "$MODELS_DIR/text-recognition.rten" ]; then
    echo "Downloading text-recognition.rten..."
    curl -o "$MODELS_DIR/text-recognition.rten" https://ocrs-models.s3-accelerate.amazonaws.com/text-recognition.rten
else
    echo "text-recognition.rten already exists, skipping..."
fi

echo "Models downloaded successfully!"
