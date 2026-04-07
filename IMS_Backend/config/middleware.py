import logging
import time

from django.conf import settings


logger = logging.getLogger('apps.performance.api')


class APIPerformanceLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000

        if request.path.startswith('/api/'):
            threshold_ms = getattr(settings, 'API_SLOW_REQUEST_THRESHOLD_MS', 500)
            if duration_ms >= threshold_ms:
                logger.warning(
                    'Slow API request method=%s path=%s status=%s duration_ms=%.2f',
                    request.method,
                    request.get_full_path(),
                    getattr(response, 'status_code', 'unknown'),
                    duration_ms,
                )

        return response
