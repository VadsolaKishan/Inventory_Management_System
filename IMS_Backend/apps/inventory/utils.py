import uuid
from django.utils import timezone


def generate_reference(prefix: str) -> str:
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    suffix = uuid.uuid4().hex[:6].upper()
    return f'{prefix}-{timestamp}-{suffix}'
