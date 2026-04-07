from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.inventory.export_views import (
    AdjustmentsExportView,
    DeliveriesExportView,
    LedgerExportView,
    ProductExportView,
    ReceiptsExportView,
    TransfersExportView,
)
from apps.inventory.views import (
    AlertViewSet,
    CustomerViewSet,
    DashboardViewSet,
    DeliveryViewSet,
    InternalTransferViewSet,
    ReceiptViewSet,
    StockAdjustmentViewSet,
    StockBalanceViewSet,
    StockLedgerViewSet,
    SupplierViewSet,
)

router = DefaultRouter()
router.register('suppliers', SupplierViewSet, basename='suppliers')
router.register('customers', CustomerViewSet, basename='customers')
router.register('receipts', ReceiptViewSet, basename='receipts')
router.register('deliveries', DeliveryViewSet, basename='deliveries')
router.register('transfers', InternalTransferViewSet, basename='transfers')
router.register('adjustments', StockAdjustmentViewSet, basename='adjustments')
router.register('stock-balances', StockBalanceViewSet, basename='stock-balances')
router.register('stock-ledger', StockLedgerViewSet, basename='stock-ledger')
router.register('dashboard', DashboardViewSet, basename='dashboard')
router.register('alerts', AlertViewSet, basename='alerts')

urlpatterns = [
    path('export/products/', ProductExportView.as_view(), name='export-products'),
    path('export/ledger/', LedgerExportView.as_view(), name='export-ledger'),
    path('export/receipts/', ReceiptsExportView.as_view(), name='export-receipts'),
    path('export/deliveries/', DeliveriesExportView.as_view(), name='export-deliveries'),
    path('export/transfers/', TransfersExportView.as_view(), name='export-transfers'),
    path('export/adjustments/', AdjustmentsExportView.as_view(), name='export-adjustments'),
    path('', include(router.urls)),
]
