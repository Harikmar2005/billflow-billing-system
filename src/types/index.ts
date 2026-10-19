export interface BusinessSettings {
  id: string;
  businessName: string;
  tradeName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  pan: string;
  isGstRegistered: boolean;
  gstScheme: 'regular' | 'composition' | 'unregistered';
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  defaultNotes: string;
  defaultTerms: string;
  termsOfDelivery?: string;
  isConfigured: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  billingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  createdAt: string;
  updatedAt: string;
  totalBilled?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  invoiceCount?: number;
  isArchived?: boolean;
  status?: 'active' | 'archived';
  archivedAt?: string;
}

export interface ProductRateHistory {
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  reason?: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'product' | 'service';
  sku: string;
  hsnSacCode: string;
  description: string;
  unit: string; // Pcs, Nos, Meter, Box, Kg, Ltr, Mtr, Hours, Set, etc.
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number; // 0, 5, 12, 18, 28
  category?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive' | 'archived';
  sno?: string | number;
  requiresManualRateVerification?: boolean;
  rawFinalRate?: string;
  isIncomplete?: boolean;
  isHistoricalInvoiceReference?: boolean;
  rateHistory?: ProductRateHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomCatalogueImportRow {
  sno?: string | number;
  description: string;
  finalRate: string | number;
  rawRate?: string;
  parsedRate?: number;
  status: 'valid' | 'flagged_rate' | 'incomplete' | 'duplicate';
  flags: string[];
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  productName: string;
  type: 'product' | 'service';
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  standardPrice?: number;
  isPriceOverridden?: boolean;
  overrideReason?: string;
  discountPercent: number;
  discountAmount: number;
  isTaxInclusive: boolean;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  terms: string;
  poNumber?: string;
  poDate?: string;
  vehicleNumber?: string;
  termsOfDelivery?: string;
  itemNote?: string;
  copyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'inventory_purchase'
  | 'transport'
  | 'marketing'
  | 'office_supplies'
  | 'repairs'
  | 'tax_fees'
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  vendorName: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'sale' | 'sale_cancellation' | 'adjustment_add' | 'adjustment_remove';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  reason: string;
  createdAt: string;
}

export interface DashboardMetrics {
  todaySales: number;
  monthlySales: number;
  totalOutstanding: number;
  totalPaid: number;
  overdueCount: number;
  overdueAmount: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  recentInvoices: Invoice[];
  monthlyRevenueSeries: Array<{ month: string; revenue: number; collections: number }>;
  paymentStatusDistribution: Array<{ name: string; count: number; amount: number; color: string }>;
}

export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const PRODUCT_UNITS = [
  'Pcs',
  'Nos',
  'Meter',
  'Box',
  'Kg',
  'Gram',
  'Ltr',
  'Mtr',
  'Sq.Ft',
  'Set',
  'Packet',
  'Hours',
  'Days',
  'Month',
];

// Bill Upload & Auto-Generation Types
export type BillItemMatchStatus =
  | 'exact' // Exact Match
  | 'review' // Possible Match — Review Required
  | 'unmatched' // No Match Found
  | 'rate_diff'; // Rate Difference

export interface ExtractedBillItem {
  id: string;
  rawName: string;
  quantity: number;
  unit?: string;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  hsnSac?: string;
  gstRate?: number;
  lineTotal?: number;
  notes?: string;
}

export interface MatchedBillItem {
  id: string;
  extractedItem: ExtractedBillItem;
  matchedProduct: Product | null;
  matchStatus: BillItemMatchStatus;
  matchConfidence: number; // 0 to 1
  matchReason?: string;
  candidateProducts?: Product[]; // For possible matches requiring review
  quantity: number;
  unit: string;
  billRate: number;
  inventoryRate: number;
  selectedRateSource: 'inventory' | 'bill' | 'custom';
  approvedRate: number;
  isPriceOverridden: boolean;
  overrideReason?: string;
  hsnSac: string;
  gstRate: number;
  discountPercent: number;
  lineTotal: number;
  isResolved: boolean;
}

export interface ExtractedBillData {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerGstin?: string;
  originalInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  placeOfSupply?: string;
  items: ExtractedBillItem[];
  subtotal?: number;
  totalDiscount?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalTax?: number;
  finalTotal?: number;
  notes?: string;
  missingFields?: string[];
  extractionSource?: 'gemini-ocr' | 'pdf-text' | 'sample';
}

export interface SampleCustomerBill {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  data: ExtractedBillData;
}

// ==========================================
// Role-Based Access Control (RBAC) Types
// ==========================================

export type UserRole = 'super_admin' | 'manager' | 'employee';
export type UserStatus = 'active' | 'deactivated';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  ip?: string;
}

export interface DatabaseBackup {
  id: string;
  timestamp: string;
  note: string;
  itemCount: number;
  invoiceCount: number;
  customerCount: number;
  paymentCount: number;
  createdAt: string;
  createdBy: string;
}

export interface AuthSessionResponse {
  token: string;
  user: AppUser;
  expiresAt: string;
}

export interface SetupStatusResponse {
  isSetupRequired: boolean;
  totalUsers: number;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  tempToken: string;
  email: string;
  maskedPhone?: string;
}
