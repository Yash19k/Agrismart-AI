# ==============================================================================
# AgriSmart AI Backend Production Dockerfile
# Optimized for Python 3.11 with CPU-only PyTorch and Gunicorn
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr and writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PROJECT_ROOT=/workspace \
    MODEL_DIR=/workspace/model

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install CPU PyTorch wheel first to prevent massive CUDA bloat (~4GB saved)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy dependencies and install Python packages
COPY app/requirements.txt /workspace/app/requirements.txt
RUN pip install --no-cache-dir -r /workspace/app/requirements.txt

# Copy backend application and ML model artifacts
COPY app/ /workspace/app/
COPY model/ /workspace/model/

# Set working directory to app (where manage.py lives)
WORKDIR /workspace/app

# Ensure entrypoint script is executable
RUN chmod +x /workspace/app/entrypoint.sh

# Collect static files during image build for faster startup
RUN python manage.py collectstatic --noinput --clear

# Expose standard application port
EXPOSE 8000

# Health check probe for Docker / ECS
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health/ || exit 1

ENTRYPOINT ["/workspace/app/entrypoint.sh"]
