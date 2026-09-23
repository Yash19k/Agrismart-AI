#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> AgriSmart Backend Root Build Starting..."

# Upgrade pip
pip install --upgrade pip

# Install CPU PyTorch wheel first to optimize build time and slug size (~4GB saved)
pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install application and production dependencies
pip install -r requirements.txt

# Collect static files for WhiteNoise
echo "==> Collecting static assets..."
python app/manage.py collectstatic --no-input

# Apply database migrations
echo "==> Applying database migrations..."
python app/manage.py migrate --no-input

echo "==> Build complete!"
