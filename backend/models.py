from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class BusinessSettingsModel(Base):
    __tablename__ = "business_settings"

    id = Column(String, primary_key=True, index=True)
    business_name = Column(String, nullable=False)
    trade_name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    address = Column(Text, default="")
    city = Column(String, default="")
    state = Column(String, default="Maharashtra")
    state_code = Column(String, default="27")
    pincode = Column(String, default="")
    gstin = Column(String, default="")
    pan = Column(String, default="")
    is_gst_registered = Column(Boolean, default=True)
    gst_scheme = Column(String, default="regular")
    invoice_prefix = Column(String, default="BF/2026-27/")
    next_invoice_number = Column(Integer, default=101)
    currency = Column(String, default="₹")
    bank_name = Column(String, default="")
    account_number = Column(String, default="")
    ifsc_code = Column(String, default="")
    branch_name = Column(String, default="")
    upi_id = Column(String, default="")
    default_notes = Column(Text, default="")
    default_terms = Column(Text, default="")
    is_configured = Column(Boolean, default=True)

class CustomerModel(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    phone = Column(String, default="")
    email = Column(String, default="")
    billing_address = Column(Text, default="")
    city = Column(String, default="")
    state = Column(String, default="Maharashtra")
    state_code = Column(String, default="27")
    pincode = Column(String, default="")
    gstin = Column(String, default="")
    pan = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    invoices = relationship("InvoiceModel", back_populates="customer")

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, default="product") # product or service
    sku = Column(String, index=True)
    hsn_sac_code = Column(String, default="")
    description = Column(Text, default="")
    unit = Column(String, default="Pcs")
    selling_price = Column(Float, default=0.0)
    purchase_price = Column(Float, default=0.0)
    gst_rate = Column(Float, default=18.0) # 0, 5, 12, 18, 28
    stock_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class InvoiceModel(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String, nullable=False)
    customer_gstin = Column(String, default="")
    customer_phone = Column(String, default="")
    customer_email = Column(String, default="")
    billing_address = Column(Text, default="")
    place_of_supply = Column(String, default="Maharashtra")
    place_of_supply_code = Column(String, default="27")
    is_inter_state = Column(Boolean, default=False)
    invoice_date = Column(String, nullable=False) # YYYY-MM-DD
    due_date = Column(String, nullable=False)
    status = Column(String, default="issued") # draft, issued, cancelled
    payment_status = Column(String, default="unpaid") # unpaid, partially_paid, paid, overdue
    items = Column(JSON, default=list) # Array of line items
    subtotal = Column(Float, default=0.0)
    total_discount = Column(Float, default=0.0)
    total_taxable_amount = Column(Float, default=0.0)
    total_cgst = Column(Float, default=0.0)
    total_sgst = Column(Float, default=0.0)
    total_igst = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)
    round_off = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    notes = Column(Text, default="")
    terms = Column(Text, default="")
    cancellation_reason = Column(Text, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("CustomerModel", back_populates="invoices")
    payments = relationship("PaymentModel", back_populates="invoice")

class PaymentModel(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False, index=True)
    invoice_number = Column(String, nullable=False)
    customer_id = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(String, nullable=False)
    payment_method = Column(String, default="cash") # cash, upi, bank_transfer, card, cheque
    reference_number = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invoice = relationship("InvoiceModel", back_populates="payments")

class ExpenseModel(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    category = Column(String, nullable=False) # rent, utilities, salaries, transport, etc.
    description = Column(Text, default="")
    amount = Column(Float, nullable=False)
    expense_date = Column(String, nullable=False)
    payment_method = Column(String, default="cash")
    vendor_name = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class InventoryMovementModel(Base):
    __tablename__ = "inventory_movements"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False)
    type = Column(String, nullable=False) # sale, sale_cancellation, adjustment_add, adjustment_remove
    quantity = Column(Integer, nullable=False)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reference_id = Column(String, default="")
    reason = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
