FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=on

# 1. System dependencies
# git-lfs is often needed for model downloading
# libgl1-mesa-glx and libglib2.0-0 are for cv2
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    git-lfs \
    python3.10 \
    python3.10-venv \
    python3.10-dev \
    python3-pip \
    build-essential \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3.10 /usr/bin/python

# 2. Setup user and workspace
WORKDIR /workspace

# 3. Clone ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI.git .

# 4. Install Python dependencies
# Torch nightly/stable - using stable compatible with CUDA 12.4
RUN pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu124
RUN pip install -r requirements.txt

# 5. Install Wan2.1 Custom Node (ComfyUI-Wan)
# Note: There are a few variants, verifying the most popular/stable one. 
# Usually Kiijai's wrapper or the official-ish one.
# Let's use the widely used ComfyUI-WanVideoWrapper for now (assuming name)
# or stick to manual install instruction in entrypoint.
RUN cd custom_nodes && \
    git clone https://github.com/Kiijai/ComfyUI-WanVideoWrapper.git && \
    cd ComfyUI-WanVideoWrapper && \
    pip install -r requirements.txt

# 6. Install Manager (Optional but recommended for missing nodes)
RUN cd custom_nodes && \
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git

# 7. Create directory structure for models (to be mounted or downloaded)
RUN mkdir -p models/checkpoints/Wan2.1 \
    models/clip \
    models/vae \
    models/loras

# 8. Entrypoint script to handle model downloads or startup
COPY entrypoint.sh /workspace/entrypoint.sh
RUN chmod +x /workspace/entrypoint.sh

# Expose ComfyUI port
EXPOSE 8188

CMD ["/workspace/entrypoint.sh"]

