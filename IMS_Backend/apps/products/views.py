from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.inventory.cache_utils import bump_inventory_cache_version
from apps.inventory.models import StockBalance
from apps.products.models import Category, Product
from apps.products.serializers import (
	CategorySerializer,
	ProductLocationStockSerializer,
	ProductSerializer,
)
from apps.users.permissions import IsInventoryManagerOrReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
	queryset = Category.objects.all().order_by('name')
	serializer_class = CategorySerializer
	permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]
	search_fields = ['name', 'description']
	ordering_fields = ['name', 'created_at']


class ProductViewSet(viewsets.ModelViewSet):
	queryset = Product.objects.select_related('category').all().order_by('name')
	serializer_class = ProductSerializer
	permission_classes = [IsAuthenticated, IsInventoryManagerOrReadOnly]
	filterset_fields = ['category']
	search_fields = ['name', 'sku', 'category__name']
	ordering_fields = ['name', 'sku', 'current_stock', 'created_at']

	def perform_create(self, serializer):
		serializer.save()
		bump_inventory_cache_version()

	def perform_update(self, serializer):
		serializer.save()
		bump_inventory_cache_version()

	def perform_destroy(self, instance):
		instance.delete()
		bump_inventory_cache_version()

	@action(detail=True, methods=['get'], url_path='stock-per-location')
	def stock_per_location(self, request, pk=None):
		product = self.get_object()
		balances = StockBalance.objects.select_related('location', 'location__warehouse').filter(
			product=product
		)
		warehouse_id = request.query_params.get('warehouse')
		location_id = request.query_params.get('location')
		if warehouse_id:
			balances = balances.filter(location__warehouse_id=warehouse_id)
		if location_id:
			balances = balances.filter(location_id=location_id)

		serializer = ProductLocationStockSerializer(balances, many=True)
		return Response(
			{
				'product_id': product.id,
				'sku': product.sku,
				'product_name': product.name,
				'stocks': serializer.data,
			},
			status=status.HTTP_200_OK,
		)
