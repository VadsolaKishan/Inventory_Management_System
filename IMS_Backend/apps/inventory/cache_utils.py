import hashlib
from urllib.parse import urlencode

from django.core.cache import cache


INVENTORY_CACHE_VERSION_KEY = 'inventory:cache:version'


def _stable_querystring(params):
    tuples = []
    for key in sorted(params.keys()):
        values = params.getlist(key)
        for value in values:
            tuples.append((key, value))
    return urlencode(tuples, doseq=True)


def get_inventory_cache_version():
    version = cache.get(INVENTORY_CACHE_VERSION_KEY)
    if version is None:
        cache.set(INVENTORY_CACHE_VERSION_KEY, 1, timeout=None)
        return 1
    return int(version)


def bump_inventory_cache_version():
    try:
        cache.incr(INVENTORY_CACHE_VERSION_KEY)
    except ValueError:
        cache.set(INVENTORY_CACHE_VERSION_KEY, 2, timeout=None)


def build_inventory_cache_key(prefix, request, user_scope='global'):
    version = get_inventory_cache_version()
    querystring = _stable_querystring(request.query_params)
    digest = hashlib.sha256(querystring.encode('utf-8')).hexdigest()
    return f'inventory:{prefix}:v{version}:scope:{user_scope}:{digest}'
