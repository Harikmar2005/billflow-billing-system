# BillFlow — Smart Billing Software for India (FastAPI Backend)

FastAPI REST API service with SQLite persistence via SQLAlchemy and Gemini AI Sales Intelligence for Indian small businesses, retail shops, wholesalers, and freelancers.

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.10+
- virtualenv or conda

### 2. Virtual Environment Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` or export:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
export DATABASE_URL="sqlite:///./billflow.db"
```

### 4. Running the Development Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation will be available at:
`http://localhost:8000/docs`

### 5. Running Automated Tests
```bash
pytest backend/tests/test_api.py -v
```

## 🏗️ Architecture & Core Endpoints

- `GET /api/health` - Service health, Indian Rupee currency (₹) and GST status
- `GET /api/settings` - Business profile, GSTIN, Bank details & UPI ID
- `PUT /api/settings` - Update business profile & GST registration
- `GET /api/metrics` - Real-time metrics computed directly from database
- `GET /api/customers` - Customer directory with outstanding receivables ledger
- `POST /api/customers` - Register new customer with State & GSTIN validation
- `GET /api/products` - Inventory catalog with HSN/SAC codes, stock & GST rates
- `POST /api/products` - Add item to catalog
- `POST /api/products/{id}/adjust-stock` - Adjust inventory with audit trail
- `GET /api/invoices` - Tax invoices list with payment status & GST breakup
- `POST /api/invoices` - Issue GST-compliant Tax Invoice
- `POST /api/invoices/{id}/cancel` - Official cancellation with reason & stock restoration
- `GET /api/payments` - Payment receipts list
- `POST /api/payments` - Record payment receipt against invoice
- `GET /api/expenses` - Operating expense records
- `POST /api/expenses` - Record business expense with GST Input Tax Credit (ITC)
- `POST /api/assistant` - Gemini AI Natural-language sales & tax assistant
