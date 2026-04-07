from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.inventory.models import (
    Customer,
    Delivery,
    DeliveryItem,
    DocumentStatus,
    InternalTransfer,
    InternalTransferItem,
    Receipt,
    ReceiptItem,
    StockAdjustment,
    StockBalance,
    StockLedger,
    Supplier,
)
from apps.products.models import Product


RECEIPT_STATUS_FLOW = (
    DocumentStatus.DRAFT,
    DocumentStatus.WAITING,
    DocumentStatus.READY,
    DocumentStatus.DONE,
)

DELIVERY_STATUS_FLOW = (
    DocumentStatus.DRAFT,
    DocumentStatus.PICKING,
    DocumentStatus.PACKED,
    DocumentStatus.DONE,
)

TRANSFER_STATUS_FLOW = (
    DocumentStatus.DRAFT,
    DocumentStatus.IN_PROGRESS,
    DocumentStatus.DONE,
)


def pretty_status(value):
    return str(value).replace('_', ' ').title()


def validate_status_choice(status_value, flow, document_label):
    allowed_statuses = {*flow, DocumentStatus.CANCELLED}
    if status_value not in allowed_statuses:
        allowed = ', '.join(pretty_status(item) for item in allowed_statuses)
        raise serializers.ValidationError(
            {
                'status': (
                    f'{document_label} status must be one of: {allowed}.'
                )
            }
        )


def validate_status_transition(instance, next_status, flow, document_label):
    if instance is None:
        return

    current_status = instance.status
    if current_status == next_status:
        return

    if current_status in {DocumentStatus.DONE, DocumentStatus.CANCELLED}:
        raise serializers.ValidationError(
            {
                'status': (
                    f'{document_label} in {pretty_status(current_status)} status '
                    'cannot be changed.'
                )
            }
        )

    if next_status == DocumentStatus.CANCELLED:
        return

    try:
        current_index = flow.index(current_status)
        next_index = flow.index(next_status)
    except ValueError:
        raise serializers.ValidationError(
            {
                'status': (
                    f'Invalid status transition for {document_label}. '
                    f'Current status: {pretty_status(current_status)}.'
                )
            }
        )

    if next_index != current_index + 1:
        expected_next = flow[current_index + 1] if current_index + 1 < len(flow) else None
        expected_text = pretty_status(expected_next) if expected_next else 'no further transition'
        raise serializers.ValidationError(
            {
                'status': (
                    f'Invalid status transition for {document_label}. '
                    f'Expected next status: {expected_text}.'
                )
            }
        )


def enforce_staff_status_guard(request, status_value, blocked_statuses, message):
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or user.is_superuser:
        return

    if user.role == user.Roles.STAFF and status_value in blocked_statuses:
        raise PermissionDenied(message)


def validate_unique_products(items):
    product_ids = [item['product'].id for item in items]
    if len(product_ids) != len(set(product_ids)):
        raise serializers.ValidationError('A product can only appear once in items.')


def validate_positive_quantities(items):
    for item in items:
        if item['quantity'] <= 0:
            raise serializers.ValidationError('Item quantity must be greater than zero.')


def validate_transfer_source_stock(from_location, items):
    if not from_location:
        return

    for item in items:
        product = item['product'] if isinstance(item, dict) else item.product
        quantity = item['quantity'] if isinstance(item, dict) else item.quantity
        available = (
            StockBalance.objects.filter(product=product, location=from_location)
            .values_list('quantity', flat=True)
            .first()
            or 0
        )

        if available < quantity:
            raise serializers.ValidationError({'detail': 'Insufficient stock for transfer'})


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = (
            'id',
            'name',
            'email',
            'phone',
            'address',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id',
            'name',
            'email',
            'phone',
            'address',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class StockBalanceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    location_code = serializers.CharField(source='location.code', read_only=True)
    warehouse_id = serializers.IntegerField(source='location.warehouse.id', read_only=True)
    warehouse_name = serializers.CharField(source='location.warehouse.name', read_only=True)

    class Meta:
        model = StockBalance
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'location',
            'location_name',
            'location_code',
            'warehouse_id',
            'warehouse_name',
            'quantity',
            'updated_at',
        )


class StockLedgerSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    user = serializers.CharField(source='performed_by.username', read_only=True)
    quantity_change = serializers.IntegerField(source='change', read_only=True)
    operation_type = serializers.CharField(source='movement_type', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = StockLedger
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'location',
            'location_name',
            'change',
            'quantity_change',
            'movement_type',
            'operation_type',
            'reference_id',
            'user',
            'note',
            'created_at',
            'timestamp',
        )


class ReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = ReceiptItem
        fields = ('id', 'product', 'product_name', 'product_sku', 'quantity')
        read_only_fields = ('id',)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value


class DeliveryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = DeliveryItem
        fields = ('id', 'product', 'product_name', 'product_sku', 'quantity')
        read_only_fields = ('id',)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value


class InternalTransferItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = InternalTransferItem
        fields = ('id', 'product', 'product_name', 'product_sku', 'quantity')
        read_only_fields = ('id',)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value


class ReceiptSerializer(serializers.ModelSerializer):
    allowed_status_flow = RECEIPT_STATUS_FLOW
    items = ReceiptItemSerializer(many=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    destination_location_name = serializers.CharField(source='destination_location.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Receipt
        fields = (
            'id',
            'reference_no',
            'supplier',
            'supplier_name',
            'destination_location',
            'destination_location_name',
            'status',
            'notes',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
            'items',
        )
        read_only_fields = (
            'id',
            'reference_no',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        validate_unique_products(value)
        validate_positive_quantities(value)
        return value

    def validate_status(self, value):
        validate_status_choice(value, self.allowed_status_flow, 'Receipt')
        return value

    def validate(self, attrs):
        status_value = attrs.get('status', getattr(self.instance, 'status', DocumentStatus.DRAFT))
        validate_status_transition(self.instance, status_value, self.allowed_status_flow, 'Receipt')
        enforce_staff_status_guard(
            request=self.context.get('request'),
            status_value=status_value,
            blocked_statuses={DocumentStatus.READY, DocumentStatus.DONE},
            message='Staff cannot set this status',
        )
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        receipt = Receipt.objects.create(**validated_data)
        ReceiptItem.objects.bulk_create(
            [ReceiptItem(receipt=receipt, **item_data) for item_data in items_data]
        )
        return receipt

    def update(self, instance, validated_data):
        if instance.is_posted:
            raise serializers.ValidationError('Posted receipt cannot be modified.')

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            validate_unique_products(items_data)
            instance.items.all().delete()
            ReceiptItem.objects.bulk_create(
                [ReceiptItem(receipt=instance, **item_data) for item_data in items_data]
            )

        return instance


class DeliverySerializer(serializers.ModelSerializer):
    allowed_status_flow = DELIVERY_STATUS_FLOW
    items = DeliveryItemSerializer(many=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    source_location_name = serializers.CharField(source='source_location.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Delivery
        fields = (
            'id',
            'reference_no',
            'customer',
            'customer_name',
            'source_location',
            'source_location_name',
            'status',
            'notes',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
            'items',
        )
        read_only_fields = (
            'id',
            'reference_no',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        validate_unique_products(value)
        validate_positive_quantities(value)
        return value

    def validate_status(self, value):
        validate_status_choice(value, self.allowed_status_flow, 'Delivery')
        return value

    def validate(self, attrs):
        status_value = attrs.get('status', getattr(self.instance, 'status', DocumentStatus.DRAFT))
        validate_status_transition(self.instance, status_value, self.allowed_status_flow, 'Delivery')
        enforce_staff_status_guard(
            request=self.context.get('request'),
            status_value=status_value,
            blocked_statuses={DocumentStatus.DONE},
            message='Only manager can complete operation',
        )
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        delivery = Delivery.objects.create(**validated_data)
        DeliveryItem.objects.bulk_create(
            [DeliveryItem(delivery=delivery, **item_data) for item_data in items_data]
        )
        return delivery

    def update(self, instance, validated_data):
        if instance.is_posted:
            raise serializers.ValidationError('Posted delivery cannot be modified.')

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            validate_unique_products(items_data)
            instance.items.all().delete()
            DeliveryItem.objects.bulk_create(
                [DeliveryItem(delivery=instance, **item_data) for item_data in items_data]
            )

        return instance


class InternalTransferSerializer(serializers.ModelSerializer):
    allowed_status_flow = TRANSFER_STATUS_FLOW
    items = InternalTransferItemSerializer(many=True)
    from_location_name = serializers.CharField(source='from_location.name', read_only=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = InternalTransfer
        fields = (
            'id',
            'reference_no',
            'from_location',
            'from_location_name',
            'to_location',
            'to_location_name',
            'status',
            'notes',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
            'items',
        )
        read_only_fields = (
            'id',
            'reference_no',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
        )

    def validate(self, attrs):
        from_location = attrs.get('from_location', getattr(self.instance, 'from_location', None))
        to_location = attrs.get('to_location', getattr(self.instance, 'to_location', None))
        if from_location and to_location and from_location == to_location:
            raise serializers.ValidationError(
                {'to_location': 'Destination location must be different from source location.'}
            )

        status_value = attrs.get('status', getattr(self.instance, 'status', DocumentStatus.DRAFT))
        validate_status_transition(self.instance, status_value, self.allowed_status_flow, 'Transfer')
        enforce_staff_status_guard(
            request=self.context.get('request'),
            status_value=status_value,
            blocked_statuses={DocumentStatus.DONE},
            message='Only manager can complete operation',
        )

        items = attrs.get('items')
        if items is None and self.instance is not None:
            items = list(self.instance.items.select_related('product'))
        if items:
            validate_transfer_source_stock(from_location, items)
        return attrs

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        validate_unique_products(value)
        validate_positive_quantities(value)
        return value

    def validate_status(self, value):
        validate_status_choice(value, self.allowed_status_flow, 'Transfer')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        transfer = InternalTransfer.objects.create(**validated_data)
        InternalTransferItem.objects.bulk_create(
            [InternalTransferItem(transfer=transfer, **item_data) for item_data in items_data]
        )
        return transfer

    def update(self, instance, validated_data):
        if instance.is_posted:
            raise serializers.ValidationError('Posted transfer cannot be modified.')

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            validate_unique_products(items_data)
            instance.items.all().delete()
            InternalTransferItem.objects.bulk_create(
                [InternalTransferItem(transfer=instance, **item_data) for item_data in items_data]
            )

        return instance


class StockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockAdjustment
        fields = (
            'id',
            'reference_no',
            'product',
            'product_name',
            'product_sku',
            'location',
            'location_name',
            'counted_quantity',
            'system_quantity',
            'difference',
            'status',
            'notes',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
        )
        read_only_fields = (
            'id',
            'reference_no',
            'system_quantity',
            'difference',
            'status',
            'created_by',
            'created_by_username',
            'is_posted',
            'created_at',
            'updated_at',
            'validated_at',
        )

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        validated_data['status'] = DocumentStatus.DONE
        return StockAdjustment.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if instance.is_posted:
            raise serializers.ValidationError('Posted adjustment cannot be modified.')
        return super().update(instance, validated_data)


class LowStockAlertSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    current_stock = serializers.SerializerMethodField()
    shortage = serializers.SerializerMethodField()
    is_out_of_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'sku',
            'category_name',
            'current_stock',
            'reorder_level',
            'shortage',
            'is_out_of_stock',
        )

    def _stock_value(self, obj):
        return int(getattr(obj, 'alert_stock', obj.current_stock) or 0)

    def get_current_stock(self, obj):
        return self._stock_value(obj)

    def get_shortage(self, obj):
        return max(obj.reorder_level - self._stock_value(obj), 0)

    def get_is_out_of_stock(self, obj):
        return self._stock_value(obj) == 0
