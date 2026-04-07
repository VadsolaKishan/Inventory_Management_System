from django.db import models


class Warehouse(models.Model):
	name = models.CharField(max_length=120)
	code = models.CharField(max_length=30, unique=True)
	address = models.TextField(blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_warehouses'
		ordering = ['name']

	def __str__(self):
		return f'{self.name} ({self.code})'


class Location(models.Model):
	warehouse = models.ForeignKey(
		Warehouse,
		on_delete=models.CASCADE,
		related_name='locations',
	)
	name = models.CharField(max_length=120)
	code = models.CharField(max_length=30)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'ims_warehouse_locations'
		ordering = ['warehouse__name', 'name']
		constraints = [
			models.UniqueConstraint(
				fields=['warehouse', 'name'],
				name='unique_location_name_per_warehouse',
			),
			models.UniqueConstraint(
				fields=['warehouse', 'code'],
				name='unique_location_code_per_warehouse',
			),
		]

	def __str__(self):
		return f'{self.warehouse.code} - {self.name}'
