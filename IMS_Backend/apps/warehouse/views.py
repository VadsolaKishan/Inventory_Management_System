from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsInventoryManagerOrReadOnly
from apps.warehouse.models import Location, Warehouse
from apps.warehouse.serializers import LocationSerializer, WarehouseSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
	queryset = Warehouse.objects.all().order_by('name')
	serializer_class = WarehouseSerializer
	permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]
	filterset_fields = ['is_active']
	search_fields = ['name', 'code', 'address']
	ordering_fields = ['name', 'code', 'created_at']


class LocationViewSet(
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.CreateModelMixin,
	mixins.UpdateModelMixin,
	mixins.DestroyModelMixin,
	viewsets.GenericViewSet,
):
	queryset = Location.objects.select_related('warehouse').all().order_by('warehouse__name', 'name')
	serializer_class = LocationSerializer
	permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]
	filterset_fields = ['warehouse', 'is_active']
	search_fields = ['name', 'code', 'warehouse__name', 'warehouse__code']
	ordering_fields = ['name', 'code', 'created_at']
