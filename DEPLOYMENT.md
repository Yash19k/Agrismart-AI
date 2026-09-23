# AgriSmart AI — Backend Deployment Guide

This guide provides instructions for deploying the AgriSmart AI backend to production across multiple platforms.

---

## 🏗️ Architecture Overview

- **Framework**: Django 4.2+ & Django REST Framework
- **WSGI Server**: Gunicorn (2 workers, 4 threads recommended)
- **Static Asset Serving**: WhiteNoise with gzip & Brotli compression
- **Database**: PostgreSQL (managed cloud or container) via `DATABASE_URL`, with automatic SQLite fallback
- **ML Inference**: PyTorch ConvNeXt-Tiny (disease detection), XGBoost (irrigation), scikit-learn (crop recommendation)
- **Monitoring & Probes**: `/api/health/` and `/health/` endpoints for HTTP liveness/readiness probes

---

## ⚙️ Environment Variables

| Variable | Description | Example / Default | Required in Production |
|---|---|---|---|
| `SECRET_KEY` | Django cryptographic signing key | Unique 50+ char random string | **Yes** |
| `DEBUG` | Enable/disable debug mode | `False` | **Yes (must be False)** |
| `ALLOWED_HOSTS` | Comma-separated allowed domain names | `api.agrismart.com,.onrender.com` | **Yes** |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/dbname` | Recommended (uses SQLite if unset) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins | `https://agrismart.vercel.app` | **Yes** |
| `CSRF_TRUSTED_ORIGINS`| Comma-separated CSRF trusted origins | `https://agrismart.vercel.app` | **Yes** |
| `WEATHER_API_KEY` | WeatherAPI token for live climate data | `093b53ee057a4907ab9104918261209` | Yes |
| `WEATHER_PROVIDER` | Weather provider (`weatherapi` or `open-meteo`)| `weatherapi` | No |
| `GROQ_API_KEY` | Groq API Key for AI Agronomist assistant | `gsk_...` | For AI Assistant |
| `GROQ_MODEL` | Groq LLM model name | `openai/gpt-oss-120b` | No |
| `PORT` | Listening port for web server | `8000` | Automatically set by PaaS |
| `MODEL_DIR` | Custom path to ML model directory | `/workspace/model` | No (defaults to `<PROJECT_ROOT>/model`) |

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Production-Ready / Local Staging)

Run the full stack with PostgreSQL and Django backend in containers:

```bash
# 1. Clone repository & configure environment
cp .env.example .env
# Edit .env with your secrets

# 2. Build and launch services
docker compose up -d --build

# 3. Check container logs
docker compose logs -f backend

# 4. Verify health check
curl http://localhost:8000/api/health/
```

To stop:
```bash
docker compose down
```

---

### Option 2: Render (Recommended Cloud Platform)

Render provides native Python hosting with automatic SSL, background builds, and managed PostgreSQL.

#### Method A: 1-Click Blueprint (Recommended)
1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect this repository; Render will automatically detect [`render.yaml`](file:///c:/Users/ronny/Desktop/agrismart/render.yaml) and configure both the Web Service and PostgreSQL database.
5. Provide your `WEATHER_API_KEY`, `GROQ_API_KEY`, and frontend URL in the dashboard prompts.

#### Method B: Manual Web Service
- **Environment**: Python
- **Build Command**:
  ```bash
  pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt && python app/manage.py collectstatic --noinput && python app/manage.py migrate --noinput
  ```
- **Start Command**:
  ```bash
  gunicorn --chdir app agrismart.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120
  ```
- **Health Check Path**: `/api/health/`

---

### Option 3: Railway / Heroku

Both Railway and Heroku detect the root [`Procfile`](file:///c:/Users/ronny/Desktop/agrismart/Procfile) and [`requirements.txt`](file:///c:/Users/ronny/Desktop/agrismart/requirements.txt):

1. Link your GitHub repository to Railway or Heroku.
2. Attach a PostgreSQL plugin/addon; it will automatically populate `DATABASE_URL`.
3. Add environment variables (`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, etc.).
4. Deploy! The release phase runs `python app/manage.py migrate --noinput` automatically.

---

### Option 4: AWS ECS / GCP Cloud Run / Azure Container Apps

The project includes a multi-platform [`Dockerfile`](file:///c:/Users/ronny/Desktop/agrismart/Dockerfile) configured with CPU-optimized PyTorch.

1. **Build and tag Docker image**:
   ```bash
   docker build -t your-registry/agrismart-backend:latest .
   ```

2. **Push image**:
   ```bash
   docker push your-registry/agrismart-backend:latest
   ```

3. **Deploy to container service**:
   - Set memory minimum to **1.5 GB - 2 GB** to ensure headroom for the PyTorch ConvNeXt-Tiny weights and concurrent inference.
   - Configure health check probe to `GET /api/health/` on port `8000`.

---

## 🔍 Verification & Health Checks

Once deployed, verify your service:

```bash
# General health probe
curl https://your-backend-domain.com/api/health/

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-09-23T18:15:00Z",
#   "environment": "production",
#   "database": "healthy",
#   "models_dir_present": true,
#   "version": "1.0.0"
# }

# Weather health probe
curl https://your-backend-domain.com/api/weather/health/
```

To run Django's built-in deployment audit locally:
```bash
cd app
python manage.py check --deploy
```
