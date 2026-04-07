import os

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = int(os.getenv('PAGE_SIZE', '20'))
    page_size_query_param = 'page_size'
    max_page_size = int(os.getenv('MAX_PAGE_SIZE', '100'))
