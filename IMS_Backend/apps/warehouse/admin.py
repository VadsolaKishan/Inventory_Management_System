from django.contrib import admin

from apps.warehouse.models import Location, Warehouse


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
	list_display = ('name', 'code', 'is_active', 'created_at')
	list_filter = ('is_active',)
	search_fields = ('name', 'code')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
	list_display = ('name', 'code', 'warehouse', 'is_active', 'created_at')
	list_filter = ('warehouse', 'is_active')
	search_fields = ('name', 'code', 'warehouse__name', 'warehouse__code')
