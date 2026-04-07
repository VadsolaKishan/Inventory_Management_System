from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.warehouse.views import LocationViewSet, WarehouseViewSet

router = DefaultRouter()
router.register('warehouses', WarehouseViewSet, basename='warehouses')
router.register('locations', LocationViewSet, basename='locations')

urlpatterns = [
    path('', include(router.urls)),
]
