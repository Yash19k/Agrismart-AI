"""WSGI config for AgriSmart."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agrismart.settings')
application = get_wsgi_application()
