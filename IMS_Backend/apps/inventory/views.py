from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.inventory.models import (
	Customer,
	Delivery,
	DocumentStatus,
	InternalTransfer,
	Receipt,
	StockAdjustment,
	StockBalance,
	StockLedger,
	Supplier,
)
from apps.inventory.serializers import (
	CustomerSerializer,
	DeliverySerializer,
	InternalTransferSerializer,
	LowStockAlertSerializer,
	ReceiptSerializer,
	StockAdjustmentSerializer,
	StockBalanceSerializer,
	StockLedgerSerializer,
	SupplierSerializer,
)
from apps.inventory.services import StockService
from apps.products.models import Product
from apps.users.permissions import (
	IsManagerOrSuperUser,
	IsManagerOrReadOnly,
	IsManagerOrStaff,
)


DASHBOARD_STATUS_BY_DOCUMENT_TYPE = {
	'receipts': {
		DocumentStatus.DRAFT,
		DocumentStatus.WAITING,
		DocumentStatus.READY,
		DocumentStatus.DONE,
		DocumentStatus.CANCELLED,
	},
	'deliveries': {
		DocumentStatus.DRAFT,
		DocumentStatus.PICKING,
		DocumentStatus.PACKED,
		DocumentStatus.DONE,
		DocumentStatus.CANCELLED,
	},
	'internal': {
		DocumentStatus.DRAFT,
		DocumentStatus.IN_PROGRESS,
		DocumentStatus.DONE,
		DocumentStatus.CANCELLED,
	},
	'adjustments': {
		DocumentStatus.DRAFT,
		DocumentStatus.DONE,
		DocumentStatus.CANCELLED,
	},
}

DASHBOARD_ALL_ALLOWED_STATUSES = {
	DocumentStatus.DRAFT,
	DocumentStatus.DONE,
	DocumentStatus.CANCELLED,
}


class SupplierViewSet(viewsets.ModelViewSet):
	queryset = Supplier.objects.all().order_by('name')
	serializer_class = SupplierSerializer
	permission_classes = [IsAuthenticated, IsManagerOrReadOnly]
	search_fields = ['name', 'email', 'phone']
	ordering_fields = ['name', 'created_at']


class CustomerViewSet(viewsets.ModelViewSet):
	queryset = Customer.objects.all().order_by('name')
	serializer_class = CustomerSerializer
	permission_classes = [IsAuthenticated, IsManagerOrReadOnly]
	search_fields = ['name', 'email', 'phone']
	ordering_fields = ['name', 'created_at']


class StockBalanceViewSet(viewsets.ReadOnlyModelViewSet):
	queryset = StockBalance.objects.select_related('product', 'location', 'location__warehouse').all()
	serializer_class = StockBalanceSerializer
	permission_classes = [IsAuthenticated, IsManagerOrStaff]
	filterset_fields = ['product', 'location', 'location__warehouse']
	search_fields = ['product__name', 'product__sku', 'location__name', 'location__code']
	ordering_fields = ['quantity', 'updated_at']


class StockLedgerViewSet(viewsets.ReadOnlyModelViewSet):
	queryset = StockLedger.objects.select_related('product', 'location', 'performed_by').all()
	serializer_class = StockLedgerSerializer
	permission_classes = [IsAuthenticated, IsManagerOrSuperUser]
	filterset_fields = ['movement_type', 'product', 'location', 'performed_by', 'reference_id']
	search_fields = ['reference_id', 'note', 'product__name', 'product__sku']
	ordering_fields = ['created_at', 'change']


class PostedDocumentProtectionMixin:
	def perform_destroy(self, instance):
		if instance.is_posted:
			raise ValidationError({'detail': 'Posted documents cannot be deleted.'})
		instance.delete()


class StaffApprovalRestrictionMixin:
	staff_restricted_statuses = frozenset({DocumentStatus.DONE})
	staff_restriction_error = 'Only manager can complete operation'

	def _ensure_staff_cannot_set_restricted_status(self, status_value):
		user = self.request.user
		if user.is_superuser:
			return
		if user.role == user.Roles.STAFF and status_value in self.staff_restricted_statuses:
			raise PermissionDenied(self.staff_restriction_error)


class ReceiptViewSet(StaffApprovalRestrictionMixin, PostedDocumentProtectionMixin, viewsets.ModelViewSet):
	serializer_class = ReceiptSerializer
	permission_classes = [IsAuthenticated, IsManagerOrStaff]
	staff_restricted_statuses = frozenset({DocumentStatus.READY, DocumentStatus.DONE})
	staff_restriction_error = 'Staff cannot set this status'
	filterset_fields = ['status', 'supplier', 'destination_location']
	search_fields = ['reference_no', 'supplier__name', 'items__product__name', 'items__product__sku']
	ordering_fields = ['created_at', 'reference_no', 'status']

	def get_queryset(self):
		queryset = Receipt.objects.select_related(
			'supplier',
			'destination_location',
			'destination_location__warehouse',
			'created_by',
		).prefetch_related('items__product')
		category = self.request.query_params.get('category')
		warehouse = self.request.query_params.get('warehouse')
		if category:
			queryset = queryset.filter(items__product__category_id=category).distinct()
		if warehouse:
			queryset = queryset.filter(destination_location__warehouse_id=warehouse)
		return queryset

	def perform_create(self, serializer):
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', DocumentStatus.DRAFT)
		)
		receipt = serializer.save(created_by=self.request.user)
		if receipt.status == DocumentStatus.DONE:
			StockService.process_receipt(receipt)

	def perform_update(self, serializer):
		old_status = serializer.instance.status
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', old_status)
		)
		receipt = serializer.save()
		if old_status != DocumentStatus.DONE and receipt.status == DocumentStatus.DONE:
			StockService.process_receipt(receipt)


class DeliveryViewSet(StaffApprovalRestrictionMixin, PostedDocumentProtectionMixin, viewsets.ModelViewSet):
	serializer_class = DeliverySerializer
	permission_classes = [IsAuthenticated, IsManagerOrStaff]
	staff_restricted_statuses = frozenset({DocumentStatus.DONE})
	staff_restriction_error = 'Only manager can complete operation'
	filterset_fields = ['status', 'customer', 'source_location']
	search_fields = ['reference_no', 'customer__name', 'items__product__name', 'items__product__sku']
	ordering_fields = ['created_at', 'reference_no', 'status']

	def get_queryset(self):
		queryset = Delivery.objects.select_related(
			'customer',
			'source_location',
			'source_location__warehouse',
			'created_by',
		).prefetch_related('items__product')
		category = self.request.query_params.get('category')
		warehouse = self.request.query_params.get('warehouse')
		if category:
			queryset = queryset.filter(items__product__category_id=category).distinct()
		if warehouse:
			queryset = queryset.filter(source_location__warehouse_id=warehouse)
		return queryset

	def perform_create(self, serializer):
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', DocumentStatus.DRAFT)
		)
		delivery = serializer.save(created_by=self.request.user)
		if delivery.status == DocumentStatus.DONE:
			StockService.process_delivery(delivery)

	def perform_update(self, serializer):
		old_status = serializer.instance.status
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', old_status)
		)
		delivery = serializer.save()
		if old_status != DocumentStatus.DONE and delivery.status == DocumentStatus.DONE:
			StockService.process_delivery(delivery)


class InternalTransferViewSet(StaffApprovalRestrictionMixin, PostedDocumentProtectionMixin, viewsets.ModelViewSet):
	serializer_class = InternalTransferSerializer
	permission_classes = [IsAuthenticated, IsManagerOrStaff]
	staff_restricted_statuses = frozenset({DocumentStatus.DONE})
	staff_restriction_error = 'Only manager can complete operation'
	filterset_fields = ['status', 'from_location', 'to_location']
	search_fields = ['reference_no', 'items__product__name', 'items__product__sku']
	ordering_fields = ['created_at', 'reference_no', 'status']

	def _ensure_transfer_has_stock(self, transfer):
		if not transfer.has_sufficient_source_stock():
			raise ValidationError({'detail': 'Insufficient stock for transfer'})

	def get_queryset(self):
		queryset = InternalTransfer.objects.select_related(
			'from_location',
			'to_location',
			'from_location__warehouse',
			'to_location__warehouse',
			'created_by',
		).prefetch_related('items__product')
		category = self.request.query_params.get('category')
		warehouse = self.request.query_params.get('warehouse')
		if category:
			queryset = queryset.filter(items__product__category_id=category).distinct()
		if warehouse:
			queryset = queryset.filter(
				Q(from_location__warehouse_id=warehouse)
				| Q(to_location__warehouse_id=warehouse)
			)
		return queryset

	def perform_create(self, serializer):
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', DocumentStatus.DRAFT)
		)
		transfer = serializer.save(created_by=self.request.user)
		if transfer.status == DocumentStatus.DONE:
			self._ensure_transfer_has_stock(transfer)
			StockService.process_transfer(transfer)

	def perform_update(self, serializer):
		old_status = serializer.instance.status
		self._ensure_staff_cannot_set_restricted_status(
			serializer.validated_data.get('status', old_status)
		)
		transfer = serializer.save()
		if old_status != DocumentStatus.DONE and transfer.status == DocumentStatus.DONE:
			self._ensure_transfer_has_stock(transfer)
			StockService.process_transfer(transfer)


class StockAdjustmentViewSet(PostedDocumentProtectionMixin, viewsets.ModelViewSet):
	serializer_class = StockAdjustmentSerializer
	permission_classes = [IsAuthenticated, IsManagerOrSuperUser]
	filterset_fields = ['status', 'product', 'location']
	search_fields = ['reference_no', 'product__name', 'product__sku']
	ordering_fields = ['created_at', 'reference_no', 'status']

	def get_queryset(self):
		queryset = StockAdjustment.objects.select_related(
			'product',
			'product__category',
			'location',
			'location__warehouse',
			'created_by',
		)
		category = self.request.query_params.get('category')
		warehouse = self.request.query_params.get('warehouse')
		if category:
			queryset = queryset.filter(product__category_id=category)
		if warehouse:
			queryset = queryset.filter(location__warehouse_id=warehouse)
		return queryset

	def perform_create(self, serializer):
		adjustment = serializer.save(created_by=self.request.user)
		if adjustment.status == DocumentStatus.DONE:
			StockService.process_adjustment(adjustment)

	def perform_update(self, serializer):
		old_status = serializer.instance.status
		adjustment = serializer.save()
		if (
			old_status != DocumentStatus.DONE and adjustment.status == DocumentStatus.DONE
		) or (adjustment.status == DocumentStatus.DONE and not adjustment.is_posted):
			StockService.process_adjustment(adjustment)


class DashboardViewSet(viewsets.ViewSet):
	permission_classes = [IsAuthenticated, IsManagerOrSuperUser]

	def list(self, request):
		document_type = request.query_params.get('document_type')
		status_filter = request.query_params.get('status')
		warehouse = request.query_params.get('warehouse')
		category = request.query_params.get('category')

		if document_type and document_type not in DASHBOARD_STATUS_BY_DOCUMENT_TYPE:
			raise ValidationError({'document_type': 'Invalid document type'})

		if status_filter:
			allowed_statuses = (
				DASHBOARD_STATUS_BY_DOCUMENT_TYPE[document_type]
				if document_type
				else DASHBOARD_ALL_ALLOWED_STATUSES
			)
			if status_filter not in allowed_statuses:
				raise ValidationError(
					{'status': 'Status must match the selected document type workflow'}
				)

		products = Product.objects.select_related('category').all()
		if category:
			products = products.filter(category_id=category)
		if warehouse:
			products = products.filter(stock_balances__location__warehouse_id=warehouse).distinct()

		if warehouse:
			products_with_stock = products.annotate(
				stock_quantity=Coalesce(
					Sum(
						'stock_balances__quantity',
						filter=Q(stock_balances__location__warehouse_id=warehouse),
					),
					0,
				)
			)
		else:
			products_with_stock = products.annotate(stock_quantity=F('current_stock'))

		receipts = Receipt.objects.all()
		deliveries = Delivery.objects.all()
		transfers = InternalTransfer.objects.all()
		adjustments = StockAdjustment.objects.all()

		if status_filter:
			if not document_type or document_type == 'receipts':
				receipts = receipts.filter(status=status_filter)
			if not document_type or document_type == 'deliveries':
				deliveries = deliveries.filter(status=status_filter)
			if not document_type or document_type == 'internal':
				transfers = transfers.filter(status=status_filter)
			if not document_type or document_type == 'adjustments':
				adjustments = adjustments.filter(status=status_filter)

		if warehouse:
			receipts = receipts.filter(destination_location__warehouse_id=warehouse)
			deliveries = deliveries.filter(source_location__warehouse_id=warehouse)
			transfers = transfers.filter(
				Q(from_location__warehouse_id=warehouse)
				| Q(to_location__warehouse_id=warehouse)
			)
			adjustments = adjustments.filter(location__warehouse_id=warehouse)

		if category:
			receipts = receipts.filter(items__product__category_id=category).distinct()
			deliveries = deliveries.filter(items__product__category_id=category).distinct()
			transfers = transfers.filter(items__product__category_id=category).distinct()
			adjustments = adjustments.filter(product__category_id=category)

		def pending_queryset(queryset):
			return queryset.exclude(status__in=[DocumentStatus.DONE, DocumentStatus.CANCELLED])

		def doc_count(doc_key, queryset):
			if document_type and document_type != doc_key:
				return 0
			return queryset.count()

		payload = {
			'totals': {
				'products_in_stock': products_with_stock.filter(stock_quantity__gt=0).count(),
				'units_in_stock': products_with_stock.aggregate(total_units=Sum('stock_quantity'))['total_units'] or 0,
				'low_stock': products_with_stock.filter(
					stock_quantity__gt=0,
					stock_quantity__lte=F('reorder_level'),
				).count(),
				'out_of_stock': products_with_stock.filter(stock_quantity=0).count(),
			},
			'pending': {
				'receipts': doc_count('receipts', pending_queryset(receipts)),
				'deliveries': doc_count('deliveries', pending_queryset(deliveries)),
				'internal_transfers': doc_count('internal', pending_queryset(transfers)),
				'adjustments': doc_count('adjustments', pending_queryset(adjustments)),
			},
			'documents': {
				'receipts': doc_count('receipts', receipts),
				'deliveries': doc_count('deliveries', deliveries),
				'internal_transfers': doc_count('internal', transfers),
				'adjustments': doc_count('adjustments', adjustments),
			},
			'filters': {
				'document_type': document_type,
				'status': status_filter,
				'warehouse': warehouse,
				'category': category,
			},
		}
		return Response(payload, status=status.HTTP_200_OK)


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = LowStockAlertSerializer
	permission_classes = [IsAuthenticated, IsManagerOrSuperUser]

	def get_queryset(self):
		queryset = Product.objects.select_related('category').filter(reorder_level__gt=0)
		category = self.request.query_params.get('category')
		warehouse = self.request.query_params.get('warehouse')
		out_of_stock_only = self.request.query_params.get('out_of_stock')

		if category:
			queryset = queryset.filter(category_id=category)

		if warehouse:
			queryset = queryset.annotate(
				alert_stock=Coalesce(
					Sum(
						'stock_balances__quantity',
						filter=Q(stock_balances__location__warehouse_id=warehouse),
					),
					0,
				)
			).filter(alert_stock__lte=F('reorder_level'))
			if out_of_stock_only == 'true':
				queryset = queryset.filter(alert_stock=0)
			return queryset.order_by('alert_stock', 'name').distinct()

		queryset = queryset.filter(current_stock__lte=F('reorder_level'))
		if out_of_stock_only == 'true':
			queryset = queryset.filter(current_stock=0)
		return queryset.order_by('current_stock', 'name')
