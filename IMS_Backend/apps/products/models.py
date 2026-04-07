from django.db import models


class Category(models.Model):
	name = models.CharField(max_length=120, unique=True)
	description = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_product_categories'
		ordering = ['name']

	def __str__(self):
		return self.name


class Product(models.Model):
	name = models.CharField(max_length=200, db_index=True)
	sku = models.CharField(max_length=60, unique=True)
	category = models.ForeignKey(
		Category,
		on_delete=models.PROTECT,
		related_name='products',
	)
	unit_of_measure = models.CharField(max_length=30)
	current_stock = models.PositiveIntegerField(default=0, db_index=True)
	reorder_level = models.PositiveIntegerField(default=0, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_products'
		ordering = ['name']

	def __str__(self):
		return f'{self.name} ({self.sku})'

	@property
	def is_low_stock(self):
		return self.current_stock <= self.reorder_level
