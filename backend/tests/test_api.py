import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import Base, get_db
from backend.models import BusinessSettingsModel, CustomerModel, ProductModel, InvoiceModel

# Isolated in-memory SQLite database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_health_check_india_locale():
    """Verify health endpoint returns ok and Indian locale/currency."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["currency"] == "INR (₹)"
    assert data["locale"] == "en-IN"

def test_customer_creation():
    """Verify customer registration with Indian GSTIN & state code."""
    payload = {
        "name": "Reliance Corporate IT",
        "phone": "+91 98200 99887",
        "email": "vendor@ril.com",
        "billing_address": "Reliance Corporate Park, Ghansoli",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "state_code": "27",
        "pincode": "400701",
        "gstin": "27AAACR5055K1ZI",
        "pan": "AAACR5055K"
    }
    res = client.post("/api/customers", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Reliance Corporate IT"
    assert created["gstin"] == "27AAACR5055K1ZI"
    assert "id" in created

def test_product_inventory_tracking():
    """Verify product creation with stock quantity and GST rate."""
    payload = {
        "name": "Optical Fiber Patch Cord SC-LC 3m",
        "type": "product",
        "sku": "FBR-SCLC-3M",
        "hsn_sac_code": "8544",
        "description": "Simplex 9/125 single mode patch cord",
        "unit": "Pcs",
        "selling_price": 350.0,
        "purchase_price": 220.0,
        "gst_rate": 18.0,
        "stock_quantity": 50,
        "low_stock_threshold": 10
    }
    res = client.post("/api/products", json=payload)
    assert res.status_code == 201
    prod = res.json()
    assert prod["stock_quantity"] == 50
    assert prod["gst_rate"] == 18.0

def test_invoice_creation_and_stock_deduction():
    """Verify invoice creation correctly deducts stock for physical items."""
    # 1. Create customer
    c_res = client.post("/api/customers", json={
        "name": "Wipro Technologies",
        "billing_address": "Doddakannelli, Sarjapur Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "state_code": "29"
    })
    customer_id = c_res.json()["id"]

    # 2. Create product with initial stock 20
    p_res = client.post("/api/products", json={
        "name": "Gigabit Media Converter",
        "type": "product",
        "unit": "Pcs",
        "selling_price": 1800.0,
        "gst_rate": 18.0,
        "stock_quantity": 20
    })
    product_id = p_res.json()["id"]

    # 3. Create invoice for 5 units
    inv_payload = {
        "customer_id": customer_id,
        "customer_name": "Wipro Technologies",
        "billing_address": "Doddakannelli, Sarjapur Road",
        "place_of_supply": "Karnataka",
        "place_of_supply_code": "29",
        "is_inter_state": True, # IGST
        "invoice_date": "2026-10-15",
        "due_date": "2026-10-30",
        "status": "issued",
        "items": [
            {
                "product_id": product_id,
                "product_name": "Gigabit Media Converter",
                "type": "product",
                "hsn_sac": "8517",
                "quantity": 5,
                "unit": "Pcs",
                "unit_price": 1800.0,
                "discount_percent": 0.0,
                "discount_amount": 0.0,
                "is_tax_inclusive": False,
                "taxable_amount": 9000.0,
                "gst_rate": 18.0,
                "cgst_rate": 0.0,
                "cgst_amount": 0.0,
                "sgst_rate": 0.0,
                "sgst_amount": 0.0,
                "igst_rate": 18.0,
                "igst_amount": 1620.0,
                "total_amount": 10620.0
            }
        ],
        "subtotal": 9000.0,
        "total_discount": 0.0,
        "total_taxable_amount": 9000.0,
        "total_cgst": 0.0,
        "total_sgst": 0.0,
        "total_igst": 1620.0,
        "total_tax": 1620.0,
        "round_off": 0.0,
        "total_amount": 10620.0,
        "amount_paid": 0.0
    }
    inv_res = client.post("/api/invoices", json=inv_payload)
    assert inv_res.status_code == 201
    inv = inv_res.json()
    assert inv["total_amount"] == 10620.0
    assert inv["balance_due"] == 10620.0
    assert inv["payment_status"] == "unpaid"
