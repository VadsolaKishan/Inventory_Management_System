from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.cache_utils import bump_inventory_cache_version
from apps.inventory.models import (
    Delivery,
    DocumentStatus,
    InternalTransfer,
    MovementType,
    Receipt,
    StockAdjustment,
    StockBalance,
    StockLedger,
)
from apps.products.models import Product


class StockService:
    @staticmethod
    def _get_locked_balance(product, location):
        balance, _ = StockBalance.objects.get_or_create(
            product=product,
            location=location,
            defaults={'quantity': 0},
        )
        return StockBalance.objects.select_for_update().get(pk=balance.pk)

    @staticmethod
    def _refresh_product_stock(product_ids):
        unique_product_ids = sorted({int(product_id) for product_id in product_ids if product_id})
        if not unique_product_ids:
            return

        totals = dict(
            StockBalance.objects.filter(product_id__in=unique_product_ids)
            .values('product_id')
            .annotate(total_quantity=Coalesce(Sum('quantity'), 0))
            .values_list('product_id', 'total_quantity')
        )

        products = list(Product.objects.filter(id__in=unique_product_ids).only('id', 'current_stock'))
        for product in products:
            product.current_stock = int(totals.get(product.id, 0) or 0)

        if products:
            Product.objects.bulk_update(products, ['current_stock'])

    @staticmethod
    def _create_ledger_entry(
        product,
        location,
        change,
        movement_type,
        reference_id,
        note='',
        performed_by=None,
    ):
        StockLedger.objects.create(
            product=product,
            performed_by=performed_by,
            location=location,
            change=change,
            movement_type=movement_type,
            reference_id=reference_id,
            note=note,
        )

    @classmethod
    def process_receipt(cls, receipt: Receipt):
        if receipt.is_posted or receipt.status != DocumentStatus.DONE:
            return receipt

        items = list(receipt.items.select_related('product'))
        if not items:
            raise ValidationError({'items': 'Receipt requires at least one item before validation.'})

        with transaction.atomic():
            affected_products = set()
            for item in items:
                if item.quantity <= 0:
                    raise ValidationError({'items': 'Receipt item quantity must be greater than zero.'})

                balance = cls._get_locked_balance(item.product, receipt.destination_location)
                balance.quantity += item.quantity
                balance.save(update_fields=['quantity', 'updated_at'])

                cls._create_ledger_entry(
                    product=item.product,
                    location=receipt.destination_location,
                    change=item.quantity,
                    movement_type=MovementType.RECEIPT,
                    reference_id=receipt.reference_no,
                    note='Incoming stock receipt',
                    performed_by=receipt.created_by,
                )
                affected_products.add(item.product_id)

            receipt.is_posted = True
            receipt.validated_at = timezone.now()
            receipt.save(update_fields=['is_posted', 'validated_at', 'updated_at'])
            cls._refresh_product_stock(affected_products)
            bump_inventory_cache_version()

        return receipt

    @classmethod
    def post_receipt(cls, receipt: Receipt):
        return cls.process_receipt(receipt)

    @classmethod
    def process_delivery(cls, delivery: Delivery):
        if delivery.is_posted or delivery.status != DocumentStatus.DONE:
            return delivery

        items = list(delivery.items.select_related('product'))
        if not items:
            raise ValidationError({'items': 'Delivery requires at least one item before validation.'})

        with transaction.atomic():
            affected_products = set()
            for item in items:
                if item.quantity <= 0:
                    raise ValidationError({'items': 'Delivery item quantity must be greater than zero.'})

                balance = cls._get_locked_balance(item.product, delivery.source_location)
                if balance.quantity < item.quantity:
                    raise ValidationError(
                        {
                            'detail': (
                                f'Insufficient stock for {item.product.sku} at '
                                f'{delivery.source_location.code}. '
                                f'Available: {balance.quantity}, requested: {item.quantity}.'
                            )
                        }
                    )
                balance.quantity -= item.quantity
                balance.save(update_fields=['quantity', 'updated_at'])

                cls._create_ledger_entry(
                    product=item.product,
                    location=delivery.source_location,
                    change=-item.quantity,
                    movement_type=MovementType.DELIVERY,
                    reference_id=delivery.reference_no,
                    note='Outgoing delivery',
                    performed_by=delivery.created_by,
                )
                affected_products.add(item.product_id)

            delivery.is_posted = True
            delivery.validated_at = timezone.now()
            delivery.save(update_fields=['is_posted', 'validated_at', 'updated_at'])
            cls._refresh_product_stock(affected_products)
            bump_inventory_cache_version()

        return delivery

    @classmethod
    def post_delivery(cls, delivery: Delivery):
        return cls.process_delivery(delivery)

    @classmethod
    def process_transfer(cls, transfer: InternalTransfer):
        if transfer.is_posted or transfer.status != DocumentStatus.DONE:
            return transfer

        if transfer.from_location_id == transfer.to_location_id:
            raise ValidationError({'to_location': 'Destination location must be different from source location.'})

        items = list(transfer.items.select_related('product'))
        if not items:
            raise ValidationError({'items': 'Transfer requires at least one item before validation.'})

        with transaction.atomic():
            affected_products = set()
            for item in items:
                if item.quantity <= 0:
                    raise ValidationError({'items': 'Transfer item quantity must be greater than zero.'})

                source_balance = cls._get_locked_balance(item.product, transfer.from_location)
                target_balance = cls._get_locked_balance(item.product, transfer.to_location)

                if source_balance.quantity < item.quantity:
                    raise ValidationError({'detail': 'Insufficient stock for transfer'})

                source_balance.quantity -= item.quantity
                target_balance.quantity += item.quantity
                source_balance.save(update_fields=['quantity', 'updated_at'])
                target_balance.save(update_fields=['quantity', 'updated_at'])

                cls._create_ledger_entry(
                    product=item.product,
                    location=transfer.from_location,
                    change=-item.quantity,
                    movement_type=MovementType.TRANSFER,
                    reference_id=transfer.reference_no,
                    note=(
                        f'Transfer {item.quantity} units '
                        f'from {transfer.from_location.code} to {transfer.to_location.code} '
                        '(source location log)'
                    ),
                    performed_by=transfer.created_by,
                )
                cls._create_ledger_entry(
                    product=item.product,
                    location=transfer.to_location,
                    change=item.quantity,
                    movement_type=MovementType.TRANSFER,
                    reference_id=transfer.reference_no,
                    note=(
                        f'Transfer {item.quantity} units '
                        f'from {transfer.from_location.code} to {transfer.to_location.code} '
                        '(destination location log)'
                    ),
                    performed_by=transfer.created_by,
                )
                affected_products.add(item.product_id)

            transfer.is_posted = True
            transfer.validated_at = timezone.now()
            transfer.save(update_fields=['is_posted', 'validated_at', 'updated_at'])
            cls._refresh_product_stock(affected_products)
            bump_inventory_cache_version()

        return transfer

    @classmethod
    def post_transfer(cls, transfer: InternalTransfer):
        return cls.process_transfer(transfer)

    @classmethod
    def process_adjustment(cls, adjustment: StockAdjustment):
        if adjustment.is_posted:
            return adjustment

        if adjustment.status != DocumentStatus.DONE:
            adjustment.status = DocumentStatus.DONE
            adjustment.save(update_fields=['status', 'updated_at'])

        with transaction.atomic():
            balance = cls._get_locked_balance(adjustment.product, adjustment.location)
            system_quantity = balance.quantity
            counted_quantity = adjustment.counted_quantity
            difference = counted_quantity - system_quantity

            balance.quantity = counted_quantity
            balance.save(update_fields=['quantity', 'updated_at'])

            cls._create_ledger_entry(
                product=adjustment.product,
                location=adjustment.location,
                change=difference,
                movement_type=MovementType.ADJUSTMENT,
                reference_id=adjustment.reference_no,
                note='Stock adjustment',
                performed_by=adjustment.created_by,
            )

            adjustment.system_quantity = system_quantity
            adjustment.difference = difference
            adjustment.is_posted = True
            adjustment.validated_at = timezone.now()
            adjustment.save(
                update_fields=[
                    'system_quantity',
                    'difference',
                    'is_posted',
                    'validated_at',
                    'updated_at',
                ]
            )
            cls._refresh_product_stock({adjustment.product_id})
            bump_inventory_cache_version()

        return adjustment

    @classmethod
    def post_adjustment(cls, adjustment: StockAdjustment):
        return cls.process_adjustment(adjustment)
