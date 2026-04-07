from django.contrib import admin

from apps.inventory.models import (
	Customer,
	Delivery,
	DeliveryItem,
	InternalTransfer,
	InternalTransferItem,
	Receipt,
	ReceiptItem,
	StockAdjustment,
	StockBalance,
	StockLedger,
	Supplier,
)


class ReceiptItemInline(admin.TabularInline):
	model = ReceiptItem
	extra = 1


class DeliveryItemInline(admin.TabularInline):
	model = DeliveryItem
	extra = 1


class InternalTransferItemInline(admin.TabularInline):
	model = InternalTransferItem
	extra = 1


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
	list_display = ('name', 'email', 'phone', 'created_at')
	search_fields = ('name', 'email', 'phone')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
	list_display = ('name', 'email', 'phone', 'created_at')
	search_fields = ('name', 'email', 'phone')


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
	list_display = ('reference_no', 'supplier', 'destination_location', 'status', 'is_posted', 'created_at')
	list_filter = ('status', 'is_posted', 'destination_location__warehouse')
	search_fields = ('reference_no', 'supplier__name')
	inlines = [ReceiptItemInline]


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
	list_display = ('reference_no', 'customer', 'source_location', 'status', 'is_posted', 'created_at')
	list_filter = ('status', 'is_posted', 'source_location__warehouse')
	search_fields = ('reference_no', 'customer__name')
	inlines = [DeliveryItemInline]


@admin.register(InternalTransfer)
class InternalTransferAdmin(admin.ModelAdmin):
	list_display = ('reference_no', 'from_location', 'to_location', 'status', 'is_posted', 'created_at')
	list_filter = ('status', 'is_posted')
	search_fields = ('reference_no',)
	inlines = [InternalTransferItemInline]


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
	list_display = (
		'reference_no',
		'product',
		'location',
		'status',
		'counted_quantity',
		'system_quantity',
		'difference',
		'is_posted',
	)
	list_filter = ('status', 'is_posted', 'location__warehouse')
	search_fields = ('reference_no', 'product__name', 'product__sku')


@admin.register(StockBalance)
class StockBalanceAdmin(admin.ModelAdmin):
	list_display = ('product', 'location', 'quantity', 'updated_at')
	list_filter = ('location__warehouse',)
	search_fields = ('product__name', 'product__sku', 'location__name')


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
	list_display = ('created_at', 'movement_type', 'reference_id', 'product', 'location', 'change')
	list_filter = ('movement_type', 'location__warehouse')
	search_fields = ('reference_id', 'product__name', 'product__sku', 'note')
