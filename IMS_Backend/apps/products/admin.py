from django.contrib import admin

from apps.products.models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	list_display = ('name', 'created_at')
	search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
	list_display = (
		'name',
		'sku',
		'category',
		'unit_of_measure',
		'current_stock',
		'reorder_level',
	)
	list_filter = ('category',)
	search_fields = ('name', 'sku', 'category__name')
