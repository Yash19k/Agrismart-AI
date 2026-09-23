"""System & Health Views — app/agrismart/views.py"""
from datetime import datetime
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for load balancers, orchestrators, and monitoring services.
    Returns 200 OK if service and database are operational.
    """
    db_status = "healthy"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    # Check model artifact presence
    model_dir = getattr(settings, 'MODEL_DIR', None)
    models_available = model_dir.exists() if model_dir else False

    is_healthy = db_status == "healthy"
    status_code = 200 if is_healthy else 503

    payload = {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "environment": "development" if settings.DEBUG else "production",
        "database": db_status,
        "models_dir_present": models_available,
        "version": "1.0.0",
    }
    return JsonResponse(payload, status=status_code)
