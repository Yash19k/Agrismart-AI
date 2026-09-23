web: gunicorn --chdir app agrismart.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120 --access-logfile - --error-logfile -
release: python app/manage.py migrate --noinput
