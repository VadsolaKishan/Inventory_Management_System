from django.conf import settings
from django.db import models

from apps.inventory.utils import generate_reference
from apps.products.models import Product
from apps.warehouse.models import Location


class DocumentStatus(models.TextChoices):
	DRAFT = 'draft', 'Draft'
	WAITING = 'waiting', 'Waiting'
	READY = 'ready', 'Ready'
	PICKING = 'picking', 'Picking'
	PACKED = 'packed', 'Packed'
	IN_PROGRESS = 'in_progress', 'In Progress'
	DONE = 'done', 'Done'
	CANCELLED = 'cancelled', 'Cancelled'


class MovementType(models.TextChoices):
	RECEIPT = 'receipt', 'Receipt'
	DELIVERY = 'delivery', 'Delivery'
	TRANSFER = 'transfer', 'Transfer'
	ADJUSTMENT = 'adjustment', 'Adjustment'


class Supplier(models.Model):
	name = models.CharField(max_length=150)
	email = models.EmailField(blank=True)
	phone = models.CharField(max_length=30, blank=True)
	address = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_suppliers'
		ordering = ['name']

	def __str__(self):
		return self.name


class Customer(models.Model):
	name = models.CharField(max_length=150)
	email = models.EmailField(blank=True)
	phone = models.CharField(max_length=30, blank=True)
	address = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_customers'
		ordering = ['name']

	def __str__(self):
		return self.name


class StockBalance(models.Model):
	product = models.ForeignKey(
		Product,
		on_delete=models.CASCADE,
		related_name='stock_balances',
	)
	location = models.ForeignKey(
		Location,
		on_delete=models.CASCADE,
		related_name='stock_balances',
	)
	quantity = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_stock_balances'
		constraints = [
			models.UniqueConstraint(
				fields=['product', 'location'],
				name='unique_stock_balance_product_location',
			)
		]
		ordering = ['product__name', 'location__name']

	def __str__(self):
		return f'{self.product.sku} @ {self.location.code}: {self.quantity}'


class StockLedger(models.Model):
	product = models.ForeignKey(
		Product,
		on_delete=models.CASCADE,
		related_name='stock_ledger_entries',
	)
	performed_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='inventory_stock_ledger_entries',
	)
	location = models.ForeignKey(
		Location,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='stock_ledger_entries',
	)
	change = models.IntegerField()
	movement_type = models.CharField(max_length=20, choices=MovementType.choices)
	reference_id = models.CharField(max_length=60)
	note = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'ims_stock_ledger_entries'
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['movement_type', 'reference_id']),
			models.Index(fields=['created_at']),
		]

	def __str__(self):
		return f'{self.get_movement_type_display()} {self.reference_id} ({self.change})'


class DocumentBase(models.Model):
	reference_prefix = 'DOC'

	reference_no = models.CharField(max_length=40, unique=True, editable=False)
	status = models.CharField(
		max_length=20,
		choices=DocumentStatus.choices,
		default=DocumentStatus.DRAFT,
	)
	notes = models.TextField(blank=True)
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='%(class)s_created',
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	validated_at = models.DateTimeField(null=True, blank=True)
	is_posted = models.BooleanField(default=False)

	class Meta:
		abstract = True
		ordering = ['-created_at']

	def save(self, *args, **kwargs):
		if not self.reference_no:
			self.reference_no = generate_reference(self.reference_prefix)
		super().save(*args, **kwargs)


class Receipt(DocumentBase):
	reference_prefix = 'RCPT'

	supplier = models.ForeignKey(
		Supplier,
		on_delete=models.PROTECT,
		related_name='receipts',
	)
	destination_location = models.ForeignKey(
		Location,
		on_delete=models.PROTECT,
		related_name='incoming_receipts',
	)

	class Meta(DocumentBase.Meta):
		db_table = 'ims_receipts'

	def __str__(self):
		return self.reference_no


class ReceiptItem(models.Model):
	receipt = models.ForeignKey(
		Receipt,
		on_delete=models.CASCADE,
		related_name='items',
	)
	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='receipt_items',
	)
	quantity = models.PositiveIntegerField()

	class Meta:
		db_table = 'ims_receipt_items'
		constraints = [
			models.UniqueConstraint(
				fields=['receipt', 'product'],
				name='unique_receipt_item_product',
			)
		]

	def __str__(self):
		return f'{self.receipt.reference_no} - {self.product.sku}'


class Delivery(DocumentBase):
	reference_prefix = 'DLV'

	customer = models.ForeignKey(
		Customer,
		on_delete=models.PROTECT,
		related_name='deliveries',
	)
	source_location = models.ForeignKey(
		Location,
		on_delete=models.PROTECT,
		related_name='outgoing_deliveries',
	)

	class Meta(DocumentBase.Meta):
		db_table = 'ims_deliveries'

	def __str__(self):
		return self.reference_no


class DeliveryItem(models.Model):
	delivery = models.ForeignKey(
		Delivery,
		on_delete=models.CASCADE,
		related_name='items',
	)
	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='delivery_items',
	)
	quantity = models.PositiveIntegerField()

	class Meta:
		db_table = 'ims_delivery_items'
		constraints = [
			models.UniqueConstraint(
				fields=['delivery', 'product'],
				name='unique_delivery_item_product',
			)
		]

	def __str__(self):
		return f'{self.delivery.reference_no} - {self.product.sku}'


class InternalTransfer(DocumentBase):
	reference_prefix = 'TRF'

	from_location = models.ForeignKey(
		Location,
		on_delete=models.PROTECT,
		related_name='transfers_out',
	)
	to_location = models.ForeignKey(
		Location,
		on_delete=models.PROTECT,
		related_name='transfers_in',
	)

	class Meta(DocumentBase.Meta):
		db_table = 'ims_internal_transfers'

	def __str__(self):
		return self.reference_no

	def has_sufficient_source_stock(self, items=None):
		if not self.from_location_id:
			return False

		transfer_items = items
		if transfer_items is None:
			transfer_items = self.items.select_related('product')

		for item in transfer_items:
			product = item.product if hasattr(item, 'product') else item.get('product')
			quantity = item.quantity if hasattr(item, 'quantity') else item.get('quantity', 0)

			available = (
				StockBalance.objects.filter(product=product, location=self.from_location)
				.values_list('quantity', flat=True)
				.first()
				or 0
			)
			if available < quantity:
				return False

		return True


class InternalTransferItem(models.Model):
	transfer = models.ForeignKey(
		InternalTransfer,
		on_delete=models.CASCADE,
		related_name='items',
	)
	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='transfer_items',
	)
	quantity = models.PositiveIntegerField()

	class Meta:
		db_table = 'ims_internal_transfer_items'
		constraints = [
			models.UniqueConstraint(
				fields=['transfer', 'product'],
				name='unique_transfer_item_product',
			)
		]

	def __str__(self):
		return f'{self.transfer.reference_no} - {self.product.sku}'


class StockAdjustment(DocumentBase):
	reference_prefix = 'ADJ'

	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='stock_adjustments',
	)
	location = models.ForeignKey(
		Location,
		on_delete=models.PROTECT,
		related_name='stock_adjustments',
	)
	counted_quantity = models.PositiveIntegerField()
	system_quantity = models.PositiveIntegerField(default=0)
	difference = models.IntegerField(default=0)

	class Meta(DocumentBase.Meta):
		db_table = 'ims_stock_adjustments'

	def __str__(self):
		return self.reference_no
