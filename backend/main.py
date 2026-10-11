import os
import datetime
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import engine, Base, get_db
from .models import (
    BusinessSettingsModel, CustomerModel, ProductModel,
    InvoiceModel, PaymentModel, ExpenseModel, InventoryMovementModel
)
from .schemas import (
    BusinessSettingsSchema, CustomerCreate, CustomerUpdate,
    ProductCreate, ProductUpdate, StockAdjustPayload,
    InvoiceCreate, PaymentCreate, ExpenseCreate, CancelInvoicePayload
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BillFlow API — Smart Billing for India",
    description="GST-compliant billing, customer ledger, inventory tracking, and payment processing REST API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def seed_business():
    db = next(get_db())
    if db.query(BusinessSettingsModel).count() == 0:
        settings = BusinessSettingsModel(
            id="biz-settings-1",
            business_name="Apex Infotech & Hardware Solutions",
            trade_name="Apex Retail & Networks",
            email="billing@apexinfotech.in",
            phone="+91 98201 54321",
            address="Shop No. 12, Ground Floor, Lamington Road",
            city="Mumbai",
            state="Maharashtra",
            state_code="27",
            pincode="400007",
            gstin="27AABCA1234F1Z9",
            pan="AABCA1234F",
            is_gst_registered=True,
            gst_scheme="regular",
            invoice_prefix="BF/2026-27/",
            next_invoice_number=101,
            bank_name="HDFC Bank Ltd",
            account_number="50200049281734",
            ifsc_code="HDFC0000060",
            branch_name="Fort, Mumbai",
            upi_id="apexinfotech@hdfcbank"
        )
        db.add(settings)
        db.commit()

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "engine": "fastapi-sqlite-gst",
        "currency": "INR (₹)",
        "locale": "en-IN",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# Business Settings
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(BusinessSettingsModel).first()
    return settings

@app.put("/api/settings")
def update_settings(payload: BusinessSettingsSchema, db: Session = Depends(get_db)):
    settings = db.query(BusinessSettingsModel).first()
    if not settings:
        settings = BusinessSettingsModel(id="biz-settings-1")
        db.add(settings)
    for key, val in payload.dict(exclude_unset=True).items():
        setattr(settings, key, val)
    db.commit()
    db.refresh(settings)
    return settings

# Customers
@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    customers = db.query(CustomerModel).all()
    results = []
    for c in customers:
        invoices = db.query(InvoiceModel).filter(InvoiceModel.customer_id == c.id, InvoiceModel.status != "cancelled").all()
        total_billed = sum(i.total_amount for i in invoices)
        total_paid = sum(i.amount_paid for i in invoices)
        results.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "billingAddress": c.billing_address,
            "city": c.city,
            "state": c.state,
            "stateCode": c.state_code,
            "pincode": c.pincode,
            "gstin": c.gstin,
            "pan": c.pan,
            "totalBilled": total_billed,
            "totalPaid": total_paid,
            "outstandingBalance": total_billed - total_paid,
            "invoiceCount": len(invoices),
            "createdAt": c.created_at.isoformat() if c.created_at else None
        })
    return results

@app.post("/api/customers", status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    new_c = CustomerModel(
        id=f"cust-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        name=payload.name,
        phone=payload.phone or "",
        email=payload.email or "",
        billing_address=payload.billing_address or "",
        city=payload.city or "",
        state=payload.state,
        state_code=payload.state_code,
        pincode=payload.pincode or "",
        gstin=payload.gstin or "",
        pan=payload.pan or ""
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return new_c

# Products
@app.get("/api/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(ProductModel).all()
    return [{
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "sku": p.sku,
        "hsnSacCode": p.hsn_sac_code,
        "description": p.description,
        "unit": p.unit,
        "sellingPrice": p.selling_price,
        "purchasePrice": p.purchase_price,
        "gstRate": p.gst_rate,
        "stockQuantity": p.stock_quantity,
        "lowStockThreshold": p.low_stock_threshold
    } for p in products]

@app.post("/api/products", status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    new_p = ProductModel(
        id=f"prod-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        name=payload.name,
        type=payload.type,
        sku=payload.sku or f"SKU-{int(datetime.datetime.utcnow().timestamp())}",
        hsn_sac_code=payload.hsn_sac_code or "",
        description=payload.description or "",
        unit=payload.unit,
        selling_price=payload.selling_price,
        purchase_price=payload.purchase_price,
        gst_rate=payload.gst_rate,
        stock_quantity=0 if payload.type == "service" else payload.stock_quantity,
        low_stock_threshold=payload.low_stock_threshold
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return new_p

# Invoices
@app.get("/api/invoices")
def list_invoices(db: Session = Depends(get_db)):
    invoices = db.query(InvoiceModel).order_by(InvoiceModel.created_at.desc()).all()
    return [{
        "id": i.id,
        "invoiceNumber": i.invoice_number,
        "customerId": i.customer_id,
        "customerName": i.customer_name,
        "customerGstin": i.customer_gstin,
        "customerPhone": i.customer_phone,
        "placeOfSupply": i.place_of_supply,
        "placeOfSupplyCode": i.place_of_supply_code,
        "isInterState": i.is_inter_state,
        "invoiceDate": i.invoice_date,
        "dueDate": i.due_date,
        "status": i.status,
        "paymentStatus": i.payment_status,
        "items": i.items,
        "subtotal": i.subtotal,
        "totalDiscount": i.total_discount,
        "totalTaxableAmount": i.total_taxable_amount,
        "totalCgst": i.total_cgst,
        "totalSgst": i.total_sgst,
        "totalIgst": i.total_igst,
        "totalTax": i.total_tax,
        "roundOff": i.round_off,
        "totalAmount": i.total_amount,
        "amountPaid": i.amount_paid,
        "balanceDue": i.balance_due,
        "notes": i.notes,
        "terms": i.terms,
        "createdAt": i.created_at.isoformat() if i.created_at else None
    } for i in invoices]

@app.post("/api/invoices", status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    settings = db.query(BusinessSettingsModel).first()
    prefix = settings.invoice_prefix if settings else "BF/2026-27/"
    next_num = settings.next_invoice_number if settings else 101

    invoice_number = f"{prefix}{next_num}"
    if settings:
        settings.next_invoice_number = next_num + 1

    balance_due = max(0.0, payload.total_amount - payload.amount_paid)
    payment_status = "paid" if balance_due == 0 else "partially_paid" if payload.amount_paid > 0 else "unpaid"

    new_inv = InvoiceModel(
        id=f"inv-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        invoice_number=invoice_number,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        customer_gstin=payload.customer_gstin or "",
        customer_phone=payload.customer_phone or "",
        billing_address=payload.billing_address,
        place_of_supply=payload.place_of_supply,
        place_of_supply_code=payload.place_of_supply_code,
        is_inter_state=payload.is_inter_state,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        status=payload.status,
        payment_status=payment_status,
        items=[item.dict() for item in payload.items],
        subtotal=payload.subtotal,
        total_discount=payload.total_discount,
        total_taxable_amount=payload.total_taxable_amount,
        total_cgst=payload.total_cgst,
        total_sgst=payload.total_sgst,
        total_igst=payload.total_igst,
        total_tax=payload.total_tax,
        round_off=payload.round_off,
        total_amount=payload.total_amount,
        amount_paid=payload.amount_paid,
        balance_due=balance_due,
        notes=payload.notes or "",
        terms=payload.terms or ""
    )

    # Deduct stock for physical items
    if payload.status == "issued":
        for itm in payload.items:
            if itm.type == "product" and itm.product_id:
                p = db.query(ProductModel).filter(ProductModel.id == itm.product_id).first()
                if p:
                    prev = p.stock_quantity
                    p.stock_quantity = max(0, prev - int(itm.quantity))
                    db.add(InventoryMovementModel(
                        id=f"mov-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
                        product_id=p.id,
                        product_name=p.name,
                        type="sale",
                        quantity=-int(itm.quantity),
                        previous_stock=prev,
                        new_stock=p.stock_quantity,
                        reference_id=invoice_number,
                        reason=f"Invoice {invoice_number} issued"
                    ))

    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    return new_inv

@app.post("/api/invoices/{invoice_id}/cancel")
def cancel_invoice(invoice_id: str, payload: CancelInvoicePayload, db: Session = Depends(get_db)):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "cancelled":
        raise HTTPException(status_code=400, detail="Invoice is already cancelled")

    inv.status = "cancelled"
    inv.cancellation_reason = payload.reason
    inv.cancelled_at = datetime.datetime.utcnow()

    # Restore stock
    for itm in inv.items:
        if itm.get("type") == "product" and itm.get("productId"):
            p = db.query(ProductModel).filter(ProductModel.id == itm.get("productId")).first()
            if p:
                prev = p.stock_quantity
                p.stock_quantity = prev + int(itm.get("quantity", 0))
                db.add(InventoryMovementModel(
                    id=f"mov-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
                    product_id=p.id,
                    product_name=p.name,
                    type="sale_cancellation",
                    quantity=int(itm.get("quantity", 0)),
                    previous_stock=prev,
                    new_stock=p.stock_quantity,
                    reference_id=inv.invoice_number,
                    reason=f"Stock restored upon cancellation: {payload.reason}"
                ))

    db.commit()
    db.refresh(inv)
    return inv
