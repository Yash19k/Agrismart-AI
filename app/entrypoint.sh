#!/usr/bin/env sh
set -e

echo "==> AgriSmart Backend Starting..."

# Wait for PostgreSQL if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
    echo "==> DATABASE_URL detected. Waiting for database to be ready..."
    # Simple python one-liner check for db connection
    python -c "
import os, sys, time
try:
    import dj_database_url, psycopg2
    cfg = dj_database_url.parse(os.environ['DATABASE_URL'])
    for _ in range(30):
        try:
            conn = psycopg2.connect(
                dbname=cfg.get('NAME'),
                user=cfg.get('USER'),
                password=cfg.get('PASSWORD'),
                host=cfg.get('HOST'),
                port=cfg.get('PORT', 5432)
            )
            conn.close()
            print('==> Database connection established.')
            sys.exit(0)
        except Exception:
            time.sleep(1)
    print('==> Database connection timed out.')
except Exception as e:
    print(f'==> Database wait skipped: {e}')
" || true
fi

# Run database migrations
echo "==> Running Django database migrations..."
python manage.py migrate --noinput

# Collect static files into STATIC_ROOT
echo "==> Collecting static assets..."
python manage.py collectstatic --noinput --clear

# Default PORT fallback
PORT="${PORT:-8000}"

echo "==> Starting Gunicorn on port ${PORT}..."
exec gunicorn agrismart.wsgi:application \
    --bind "0.0.0.0:${PORT}" \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
