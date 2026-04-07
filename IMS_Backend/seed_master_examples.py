from apps.inventory.models import Customer, Supplier
from apps.products.models import Category


CATEGORIES = [
    {
        "name": "Raw Materials",
        "description": "Steel, chemicals, and production input materials.",
    },
    {
        "name": "Finished Goods",
        "description": "Products ready to deliver to customers.",
    },
    {
        "name": "Packaging",
        "description": "Boxes, labels, wraps, and packing consumables.",
    },
]

SUPPLIERS = [
    {
        "name": "Global Steel Traders",
        "email": "sales@globalsteel.example.com",
        "phone": "1002003001",
        "address": "Industrial Area, Block A",
    },
    {
        "name": "Prime Packaging Ltd",
        "email": "contact@primepack.example.com",
        "phone": "1002003002",
        "address": "Logistics Park, Building 4",
    },
    {
        "name": "Electro Source Co",
        "email": "support@electrosource.example.com",
        "phone": "1002003003",
        "address": "Tech Estate, Sector 9",
    },
]

CUSTOMERS = [
    {
        "name": "Metro Retail Store",
        "email": "orders@metroretail.example.com",
        "phone": "2003004001",
        "address": "Downtown Market, Shop 15",
    },
    {
        "name": "City Wholesale Hub",
        "email": "buy@citywholesale.example.com",
        "phone": "2003004002",
        "address": "Wholesale Complex, Gate 2",
    },
    {
        "name": "Online Mart",
        "email": "procurement@onlinemart.example.com",
        "phone": "2003004003",
        "address": "E-Commerce Fulfillment Center",
    },
]


def upsert_category(payload):
    category, created = Category.objects.get_or_create(
        name=payload["name"],
        defaults={"description": payload.get("description", "")},
    )
    if not created and category.description != payload.get("description", ""):
        category.description = payload.get("description", "")
        category.save(update_fields=["description", "updated_at"])
    return category, created


def upsert_supplier(payload):
    supplier, created = Supplier.objects.get_or_create(
        name=payload["name"],
        defaults={
            "email": payload.get("email", ""),
            "phone": payload.get("phone", ""),
            "address": payload.get("address", ""),
        },
    )
    if not created:
        supplier.email = payload.get("email", supplier.email)
        supplier.phone = payload.get("phone", supplier.phone)
        supplier.address = payload.get("address", supplier.address)
        supplier.save(update_fields=["email", "phone", "address", "updated_at"])
    return supplier, created


def upsert_customer(payload):
    customer, created = Customer.objects.get_or_create(
        name=payload["name"],
        defaults={
            "email": payload.get("email", ""),
            "phone": payload.get("phone", ""),
            "address": payload.get("address", ""),
        },
    )
    if not created:
        customer.email = payload.get("email", customer.email)
        customer.phone = payload.get("phone", customer.phone)
        customer.address = payload.get("address", customer.address)
        customer.save(update_fields=["email", "phone", "address", "updated_at"])
    return customer, created


category_created = 0
for item in CATEGORIES:
    _, created = upsert_category(item)
    if created:
        category_created += 1

supplier_created = 0
for item in SUPPLIERS:
    _, created = upsert_supplier(item)
    if created:
        supplier_created += 1

customer_created = 0
for item in CUSTOMERS:
    _, created = upsert_customer(item)
    if created:
        customer_created += 1

print("Seed completed")
print(f"Categories: total={Category.objects.count()}, new={category_created}")
print(f"Suppliers: total={Supplier.objects.count()}, new={supplier_created}")
print(f"Customers: total={Customer.objects.count()}, new={customer_created}")
