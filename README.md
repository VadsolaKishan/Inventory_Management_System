# Inventory Management System

[![Backend](https://img.shields.io/badge/backend-Django%20%2B%20DRF-0b7285?style=for-the-badge)](IMS_Backend)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-0f766e?style=for-the-badge)](IMS_Frontend)
[![Database](https://img.shields.io/badge/database-PostgreSQL-1d4ed8?style=for-the-badge)](#tech-stack)
[![License](https://img.shields.io/badge/license-MIT-111827?style=for-the-badge)](#license)

Production-ready full-stack Inventory Management System with role-based workflows, stock traceability, and exportable operational reports.

## Why This Project
- Manage complete stock lifecycle from inbound receipt to outbound delivery.
- Control multi-warehouse and location-level inventory with real-time balances.
- Enforce secure authentication with JWT, lockout protection, and OTP reset.
- Give managers and staff role-specific access in a clean web dashboard.

## Key Features

### Authentication and Access Control
- JWT auth with access/refresh tokens and refresh token rotation.
- Role model: `manager` and `staff` with endpoint-level permissions.
- Login lockout after repeated failed attempts.
- OTP-based password reset via email.

### Inventory Workflow Engine
- Receipts: add inbound stock from suppliers.
- Deliveries: dispatch outbound stock to customers.
- Internal transfers: move stock between locations.
- Stock adjustments: reconcile physical vs system quantity.
- Auto reference numbers: `RCPT`, `DLV`, `TRF`, `ADJ`.
- Document statuses: `draft`, `waiting`, `ready`, `picking`, `packed`, `in_progress`, `done`, `cancelled`.

### Visibility, Monitoring, and Reporting
- Real-time stock balance per product/location.
- Complete stock ledger for movement history and audit trail.
- Dashboard with low-stock alerts and aggregates.
- Excel and PDF exports for products, ledger, and operational documents.

## Tech Stack

### Backend (IMS_Backend)
- Python `3.10.11`
- Django `4.2.29`
- Django REST Framework `3.15.2`
- Simple JWT `5.5.1`
- django-filter `24.3`
- PostgreSQL via psycopg `3.2.9`
- WhiteNoise `6.7.0`, Gunicorn `22.0.0`
- Redis `5.2.1` (optional cache backend)
- openpyxl `3.1.5`, reportlab `4.2.5`

### Frontend (IMS_Frontend)
- React `19`
- Vite `8`
- React Router `7`
- Redux Toolkit
- Tailwind CSS `3`
- Axios `1.13.5`
- Recharts, Framer Motion

## Architecture

```text
React SPA (IMS_Frontend)
        |
        | HTTP (JWT)
        v
Django REST API (IMS_Backend)
        |
        +--> PostgreSQL (primary data)
        +--> Redis (optional cache)
        +--> SMTP (OTP email delivery)
```

## Repository Structure

```text
.
|-- IMS_Backend/
|   |-- manage.py
|   |-- requirements.txt
|   |-- seed_master_examples.py
|   |-- config/
|   `-- apps/
|       |-- users/
|       |-- products/
|       |-- warehouse/
|       `-- inventory/
`-- IMS_Frontend/
    |-- package.json
    |-- vite.config.js
    |-- vercel.json
    `-- src/
        |-- pages/
        |-- services/
        |-- store/
        `-- components/
```

## Quick Start

### Prerequisites
- Python `3.10+`
- Node.js `16+`
- PostgreSQL (recommended for local and production)
- Redis (optional)

### 1) Backend Setup

```bash
cd IMS_Backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies and migrate:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend API base URL: `http://127.0.0.1:8000/api/`

### 2) Seed Sample Master Data (Optional)

```bash
cd IMS_Backend
python manage.py shell < seed_master_examples.py
```

This seeds categories, suppliers, and customers.

### 3) Frontend Setup

```bash
cd IMS_Frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Environment Configuration

### Backend `.env` (inside `IMS_Backend`)

```env
DJANGO_SECRET_KEY=replace-with-strong-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
CSRF_TRUSTED_ORIGINS=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/ims_db

JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=1
PAGE_SIZE=20

CORS_ALLOWED_ORIGINS=http://localhost:5173

CACHE_BACKEND=locmem
REDIS_CACHE_URL=redis://localhost:6379/0

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@example.com
```

### Frontend `.env.local` (inside `IMS_Frontend`)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

If not provided, the frontend defaults to `http://127.0.0.1:8000/api`.

## API Surface (High Level)

Base path: `/api/`

### Auth and Users
- `auth/login/`
- `auth/register/`
- `auth/me/`
- `auth/password-reset/request-otp/`
- `auth/password-reset/confirm/`
- `auth/token/refresh/`
- `users/`
- `users/create-manager/`
- `users/create-staff/`

### Master Data
- `categories/`
- `products/`
- `products/{id}/stock-per-location/`
- `warehouses/`
- `locations/`
- `suppliers/`
- `customers/`

### Inventory and Monitoring
- `receipts/`
- `deliveries/`
- `transfers/`
- `adjustments/`
- `stock-balances/`
- `stock-ledger/`
- `dashboard/`
- `alerts/`

### Export Endpoints
- `export/products/`
- `export/ledger/`
- `export/receipts/`
- `export/deliveries/`
- `export/transfers/`
- `export/adjustments/`

Supports filtering, search, ordering, and pagination.

## Role Matrix

| Module | Manager | Staff |
|---|---|---|
| Dashboard, Alerts, Ledger | Full | Read-only/Restricted |
| Products, Warehouses, Adjustments | Full | Restricted |
| Receipts, Deliveries, Transfers | Full | Operational Access |
| User Management | Full | No Access |
| Account/Profile | Full | Full |

## Deployment

### Backend
- Use Gunicorn for app serving.
- WhiteNoise handles static files.
- Set `DJANGO_DEBUG=False` in production.
- Prefer PostgreSQL + Redis.
- Restrict `CORS_ALLOWED_ORIGINS` and `DJANGO_ALLOWED_HOSTS`.

### Frontend
- Vercel-ready via `IMS_Frontend/vercel.json`.
- SPA fallback routes to `index.html`.

## Available Scripts

### Backend

```bash
python manage.py runserver
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic
python manage.py shell < seed_master_examples.py
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Security Checklist
- Never commit real credentials or private keys.
- Rotate all secrets if they were ever exposed.
- Keep `DJANGO_DEBUG=False` for production.
- Enforce HTTPS and secure cookie settings in production.
- Limit allowed origins/hosts to trusted domains.

## License
This project is available under the MIT License.
