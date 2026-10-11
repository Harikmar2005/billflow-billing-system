from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

class BusinessSettingsSchema(BaseModel):
    business_name: str
    trade_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: str = "Maharashtra"
    state_code: str = "27"
    pincode: Optional[str] = ""
    gstin: Optional[str] = ""
    pan: Optional[str] = ""
    is_gst_registered: bool = True
    gst_scheme: str = "regular"
    invoice_prefix: str = "BF/2026-27/"
    next_invoice_number: int = 101
    currency: str = "₹"
    bank_name: Optional[str] = ""
    account_number: Optional[str] = ""
    ifsc_code: Optional[str] = ""
    branch_name: Optional[str] = ""
    upi_id: Optional[str] = ""
    default_notes: Optional[str] = ""
    default_terms: Optional[str] = ""

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    billing_address: Optional[str] = ""
    city: Optional[str] = ""
    state: str = "Maharashtra"
    state_code: str = "27"
    pincode: Optional[str] = ""
    gstin: Optional[str] = ""
    pan: Optional[str] = ""

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    type: str = "product" # product, service
    sku: Optional[str] = None
    hsn_sac_code: Optional[str] = ""
    description: Optional[str] = ""
    unit: str = "Pcs"
    selling_price: float = 0.0
    purchase_price: float = 0.0
    gst_rate: float = 18.0
    stock_quantity: int = 0
    low_stock_threshold: int = 5

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    sku: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    selling_price: Optional[float] = None
    purchase_price: Optional[float] = None
    gst_rate: Optional[float] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None

class StockAdjustPayload(BaseModel):
    quantity_delta: int
    reason: str

class InvoiceItemSchema(BaseModel):
    id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: str
    type: str = "product"
    hsn_sac: Optional[str] = ""
    quantity: float
    unit: str = "Pcs"
    unit_price: float
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    is_tax_inclusive: bool = False
    taxable_amount: float
    gst_rate: float = 18.0
    cgst_rate: float = 9.0
    cgst_amount: float = 0.0
    sgst_rate: float = 9.0
    sgst_amount: float = 0.0
    igst_rate: float = 0.0
    igst_amount: float = 0.0
    total_amount: float

class InvoiceCreate(BaseModel):
    customer_id: str
    customer_name: str
    customer_gstin: Optional[str] = ""
    customer_phone: Optional[str] = ""
    customer_email: Optional[str] = ""
    billing_address: str
    place_of_supply: str
    place_of_supply_code: str
    is_inter_state: bool
    invoice_date: str
    due_date: str
    status: str = "issued"
    items: List[InvoiceItemSchema]
    subtotal: float
    total_discount: float = 0.0
    total_taxable_amount: float
    total_cgst: float = 0.0
    total_sgst: float = 0.0
    total_igst: float = 0.0
    total_tax: float
    round_off: float = 0.0
    total_amount: float
    amount_paid: float = 0.0
    notes: Optional[str] = ""
    terms: Optional[str] = ""

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    payment_date: str
    payment_method: str = "cash"
    reference_number: Optional[str] = ""
    notes: Optional[str] = ""

class ExpenseCreate(BaseModel):
    category: str
    description: Optional[str] = ""
    amount: float
    expense_date: str
    payment_method: str = "cash"
    vendor_name: Optional[str] = ""

class CancelInvoicePayload(BaseModel):
    reason: str
