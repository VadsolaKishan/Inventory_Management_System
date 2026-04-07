from rest_framework import serializers

from apps.products.models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'description',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'sku',
            'category',
            'category_name',
            'unit_of_measure',
            'current_stock',
            'reorder_level',
            'is_low_stock',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'current_stock', 'is_low_stock', 'created_at', 'updated_at')


class ProductLocationStockSerializer(serializers.Serializer):
    location_id = serializers.IntegerField(source='location.id')
    location_name = serializers.CharField(source='location.name')
    location_code = serializers.CharField(source='location.code')
    warehouse_id = serializers.IntegerField(source='location.warehouse.id')
    warehouse_name = serializers.CharField(source='location.warehouse.name')
    quantity = serializers.IntegerField()
