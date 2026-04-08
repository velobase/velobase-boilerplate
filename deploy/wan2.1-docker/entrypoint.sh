#!/bin/bash
set -e

# Model URLs (Wan 2.1)
# Note: These are large files. In production, you should Mount a volume 
# or use a caching proxy instead of downloading every time.

WAN_I2V_14B_URL="https://huggingface.co/Wan-AI/Wan2.1-I2V-14B/resolve/main/wan2.1_i2v_14b.safetensors"
# Add other model URLs as needed (T2V, VAE, CLIP, etc.)

MODEL_DIR="/workspace/models/checkpoints/Wan2.1"
CLIP_DIR="/workspace/models/clip"
VAE_DIR="/workspace/models/vae"

echo "Starting ComfyUI for Wan 2.1..."

# Optional: Download model if not present (Simple check)
# Ideally, map a volume to /workspace/models to avoid re-downloading
if [ ! -f "$MODEL_DIR/wan2.1_i2v_14b.safetensors" ] && [ "$DOWNLOAD_MODELS" = "true" ]; then
    echo "Downloading Wan2.1 I2V 14B model..."
    mkdir -p $MODEL_DIR
    wget -c $WAN_I2V_14B_URL -O $MODEL_DIR/wan2.1_i2v_14b.safetensors
fi

# Run ComfyUI
# --listen to allow external connections (0.0.0.0)
python main.py --listen --port 8188

