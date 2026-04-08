# Wan 2.1 ComfyUI Deployment Guide

这是一套用于在 GPU 机器上部署 Wan 2.1 (ComfyUI) 的 Docker 配置。

## 目录结构

- `Dockerfile`: 构建包含 ComfyUI + Wan2.1 插件的基础镜像。
- `entrypoint.sh`: 启动脚本，支持按需下载模型。

## 1. 准备工作

你需要一台有 GPU 的机器（推荐 NVIDIA RTX 4090 或 A100，显存 >= 24GB）。
确保已安装 `docker` 和 `nvidia-container-toolkit`。

## 2. 构建镜像

```bash
cd deploy/wan2.1-docker
docker build -t comfy-wan2.1 .
```

## 3. 运行容器

### 方案 A: 快速测试 (自动下载模型)
*注意：每次重启容器如果没挂载卷，都会重新下载 30GB+ 模型，仅用于测试。*

```bash
docker run --gpus all -d \
  -p 8188:8188 \
  -e DOWNLOAD_MODELS=true \
  --name comfy-wan-test \
  comfy-wan2.1
```

### 方案 B: 生产部署 (挂载模型目录)
*推荐：先在宿主机下载好模型，然后挂载进去。*

1. **宿主机下载模型**:
   ```bash
   mkdir -p data/models/checkpoints/Wan2.1
   # 在这里使用 wget 或 huggingface-cli 下载 wan2.1_i2v_14b.safetensors
   ```

2. **启动容器**:
   ```bash
   docker run --gpus all -d \
     -p 8188:8188 \
     -v $(pwd)/data/models:/workspace/models \
     --name comfy-wan-prod \
     comfy-wan2.1
   ```

## 4. 验证

访问 `http://<GPU_IP>:8188`，你应该能看到 ComfyUI 界面。
加载一个 Wan2.1 I2V 的 workflow json 即可开始生成。

## 5. 模型下载地址 (参考)

- **Wan2.1-I2V-14B**: https://huggingface.co/Wan-AI/Wan2.1-I2V-14B
- **T5 Encoder**: (通常需要 google/t5-v1_1-xxl)
- **VAE**: Wan2.1 自带或通用 VAE

## 6. 常见问题

- **OOM (爆显存)**: Wan2.1 14B 非常大。如果 24GB 显存不够，尝试在 ComfyUI 启动参数加 `--lowvram` 或使用量化版 (GGUF/FP8) 模型。
- **缺失节点**: 如果导入 Workflow 报错，使用 ComfyUI Manager 安装缺失节点。

