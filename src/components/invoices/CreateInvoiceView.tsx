import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import {
  Customer,
  Product,
  Invoice,
  InvoiceLineItem,
  INDIAN_STATES,
  GST_RATES,
  PRODUCT_UNITS,
} from '../../types';
import { calculateLineItem, formatINR, calculateInvoiceSummary } from '../../utils/billing';
import {
  Plus,
  Trash2,
  FileCheck2,
  Save,
  ArrowLeft,
  Calendar,
  Building2,
  Percent,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Truck,
  FileText
} from 'lucide-react';

interface CreateInvoiceViewProps {
  onOpenNewCustomerModal: () => void;
}

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  onOpenNewCustomerModal,
}) => {
  const {
    settings,
    customers,
    products,
    createInvoice,
    setCurrentView,
    setPreviewInvoice,
    addToast,
  } = useBilling();

  const businessState = settings?.state || 'Maharashtra';
  const businessStateCode = settings?.stateCode || '27';
  const prefix = settings?.invoicePrefix || 'BF/2026-27/';
  const nextNum = settings?.nextInvoiceNumber || 105;

  // Invoice Top Details
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`${prefix}${nextNum}`);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(customers[0]?.state || businessState);
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState<string>(customers[0]?.stateCode || businessStateCode);
  const [isInterState, setIsInterState] = useState<boolean>(
    (customers[0]?.state || businessState).toLowerCase() !== businessState.toLowerCase()
  );

  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(settings?.defaultNotes || '');
  const [terms, setTerms] = useState<string>(settings?.defaultTerms || '');

  // Excel Tax Invoice Reference & Dispatch Fields
  const [poNumber, setPoNumber] = useState<string>('');
  const [poDate, setPoDate] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [termsOfDelivery, setTermsOfDelivery] = useState<string>(
    settings?.termsOfDelivery || 'Door Delivery'
  );
  const [itemNote, setItemNote] = useState<string>('For Labour Charges only');
  const [hasItemNote, setHasItemNote] = useState<boolean>(false);
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');

  // Payment at creation
  const [immediatePayment, setImmediatePayment] = useState<number>(0);
  const [immediatePaymentMethod, setImmediatePaymentMethod] = useState<string>('upi');
  const [paymentRef, setPaymentRef] = useState<string>('');

  // Line Items
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: products[0]?.id || '',
      productName: products[0]?.name || 'Standard Networking Hardware',
      type: products[0]?.type || 'product',
      hsnSac: products[0]?.hsnSacCode || '8517',
      quantity: 1,
      unit: products[0]?.unit || 'Pcs',
      unitPrice: products[0]?.sellingPrice || 1000,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 1000,
      gstRate: products[0]?.gstRate || 18,
      cgstRate: 9,
      cgstAmount: 90,
      sgstRate: 9,
      sgstAmount: 90,
      igstRate: 0,
      igstAmount: 0,
      totalAmount: 1180,
    },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // When customer changes, update place of supply & inter-state tax logic
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setPlaceOfSupply(cust.state || businessState);
      setPlaceOfSupplyCode(cust.stateCode || businessStateCode);
      const isInter = (cust.state || businessState).toLowerCase() !== businessState.toLowerCase();
      setIsInterState(isInter);
      recalculateAllItems(items, isInter);
    }
  };

  const handlePlaceOfSupplyChange = (stateName: string) => {
    setPlaceOfSupply(stateName);
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    if (found) {
      setPlaceOfSupplyCode(found.code);
    }
    const isInter = stateName.toLowerCase() !== businessState.toLowerCase();
    setIsInterState(isInter);
    recalculateAllItems(items, isInter);
  };

  // Recalculate line items helper
  const recalculateAllItems = (currentItems: InvoiceLineItem[], interState: boolean) => {
    const updated = currentItems.map((item) => {
      const calc = calculateLineItem(
        item.quantity,
        item.unitPrice,
        item.discountPercent,
        item.gstRate,
        item.isTaxInclusive,
        interState
      );
      return {
        ...item,
        ...calc,
      };
    });
    setItems(updated);
  };

  // Line item change
  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: val };

    // If selecting a product from catalog
    if (field === 'productId') {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        target.productName = prod.name;
        target.type = prod.type;
        target.hsnSac = prod.hsnSacCode;
        target.unitPrice = prod.sellingPrice;
        target.unit = prod.unit;
        target.gstRate = prod.gstRate;
      }
    }

    const calc = calculateLineItem(
      target.quantity,
      target.unitPrice,
      target.discountPercent,
      target.gstRate,
      target.isTaxInclusive,
      isInterState
    );

    updated[index] = { ...target, ...calc };
    setItems(updated);
  };

  const addItemRow = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      productId: '',
      productName: '',
      type: 'product',
      hsnSac: '8517',
      quantity: 1,
      unit: 'Pcs',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 0,
      gstRate: 18,
      cgstRate: isInterState ? 0 : 9,
      cgstAmount: 0,
      sgstRate: isInterState ? 0 : 9,
      sgstAmount: 0,
      igstRate: isInterState ? 18 : 0,
      igstAmount: 0,
      totalAmount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      addToast('An invoice must have at least one line item', 'info');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand Totals Calculation
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalTaxableAmount = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;

  const rawTotal = totalTaxableAmount + totalTax;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;

  const buildInvoicePreviewObject = (status: 'draft' | 'issued'): Invoice => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    return {
      id: `preview-${Date.now()}`,
      invoiceNumber,
      customerId: customer?.id || '',
      customerName: customer?.name || 'Cash Customer',
      customerGstin: customer?.gstin || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || '',
      billingAddress: customer?.billingAddress || `${customer?.city || ''}, ${customer?.state || ''}`,
      placeOfSupply,
      placeOfSupplyCode,
      isInterState,
      invoiceDate,
      dueDate,
      status,
      paymentStatus:
        immediatePayment >= roundedTotal
          ? 'paid'
          : immediatePayment > 0
          ? 'partially_paid'
          : 'unpaid',
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      roundOff,
      totalAmount: roundedTotal,
      amountPaid: immediatePayment,
      balanceDue: Math.max(0, roundedTotal - immediatePayment),
      notes,
      terms,
      poNumber: poNumber.trim() || undefined,
      poDate: poDate || undefined,
      vehicleNumber: vehicleNumber.trim() || undefined,
      termsOfDelivery: termsOfDelivery.trim() || undefined,
      itemNote: hasItemNote && itemNote.trim() ? itemNote.trim() : undefined,
      copyType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handlePreview = () => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      addToast('Please select a customer first.', 'error');
      return;
    }
    const previewData = buildInvoicePreviewObject('draft');
    setPreviewInvoice(previewData);
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      addToast('Please select a customer or create a new one first.', 'error');
      return;
    }

    if (items.some((i) => !i.productName.trim() || i.quantity <= 0)) {
      addToast('Please enter valid product names and positive quantities for all items.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const invoicePayload = {
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerGstin: customer.gstin || '',
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        billingAddress: customer.billingAddress || `${customer.city}, ${customer.state}`,
        placeOfSupply,
        placeOfSupplyCode,
        isInterState,
        invoiceDate,
        dueDate,
        status: asDraft ? ('draft' as const) : ('issued' as const),
        paymentStatus:
          immediatePayment >= roundedTotal
            ? ('paid' as const)
            : immediatePayment > 0
            ? ('partially_paid' as const)
            : ('unpaid' as const),
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        roundOff,
        totalAmount: roundedTotal,
        amountPaid: immediatePayment,
        balanceDue: Math.max(0, roundedTotal - immediatePayment),
        notes,
        terms,
        poNumber: poNumber.trim() || undefined,
        poDate: poDate || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        termsOfDelivery: termsOfDelivery.trim() || undefined,
        itemNote: hasItemNote && itemNote.trim() ? itemNote.trim() : undefined,
        copyType,
        paymentMethod: immediatePayment > 0 ? immediatePaymentMethod : undefined,
        paymentReference: immediatePayment > 0 ? paymentRef : undefined,
      };

      const created = await createInvoice(invoicePayload as any);
      // Open preview modal
      setPreviewInvoice(created);
      setCurrentView('invoices');
    } catch (err: any) {
      addToast(err.message || 'Failed to issue invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCust = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('invoices')}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Generate GST Tax Invoice
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Taxable values, tax rates, and reverse calculations satisfy standard Indian GST format.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-teal-500/50 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-600 dark:text-teal-400 transition-colors flex items-center gap-1.5"
            title="Preview spreadsheet tax invoice"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Invoice</span>
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>{submitting ? 'Generating...' : 'Finalize & Issue Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Invoice Meta Grid */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Invoice Number */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Invoice Number *
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          {/* Customer Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500">Customer *</label>
              <button
                type="button"
                onClick={onOpenNewCustomerModal}
                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
              >
                + New Customer
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Invoice Date</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Dispatch & Excel Tax Invoice Reference Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Transport & Reference Details (Excel Spreadsheet Fields)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* Buyer's Order / Ref No */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Buyer's PO / Ref No.
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO/2026/894"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            {/* Ref Doc Date */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Ref Document Date
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            {/* Vehicle No */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Vehicle No. (if dispatch)
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH-02-CB-1234"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono uppercase"
              />
            </div>

            {/* Terms of Delivery */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Terms of Delivery
              </label>
              <input
                type="text"
                value={termsOfDelivery}
                onChange={(e) => setTermsOfDelivery(e.target.value)}
                placeholder="e.g. Door Delivery / Ex-Godown"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Copy Designation */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Copy Designation
              </label>
              <select
                value={copyType}
                onChange={(e) =>
                  setCopyType(e.target.value as 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE')
                }
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="ORIGINAL">ORIGINAL FOR RECIPIENT</option>
                <option value="DUPLICATE">DUPLICATE FOR TRANSPORTER</option>
                <option value="TRIPLICATE">TRIPLICATE FOR SUPPLIER</option>
              </select>
            </div>
          </div>
        </div>

        {/* GST State & Place of Supply */}
        <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Business Origin</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {businessState} ({businessStateCode})
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Place of Supply (POS) *
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => handlePlaceOfSupplyChange(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                isInterState
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
              }`}
            >
              {isInterState
                ? '📍 Inter-State: IGST will be applied'
                : '📍 Intra-State: CGST & SGST will be split'}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Products & Services ({items.length})
          </h2>
          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item Row</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold font-mono text-[11px]">
                <th className="py-2 px-2 w-64">ITEM & DESCRIPTION</th>
                <th className="py-2 px-2 w-20">HSN/SAC</th>
                <th className="py-2 px-2 w-20">QTY</th>
                <th className="py-2 px-2 w-20">UNIT</th>
                <th className="py-2 px-2 w-24">RATE (₹)</th>
                <th className="py-2 px-2 w-20">DISC %</th>
                <th className="py-2 px-2 w-24">GST RATE</th>
                <th className="py-2 px-2 w-28 text-right">TAXABLE</th>
                <th className="py-2 px-2 w-28 text-right">TOTAL (₹)</th>
                <th className="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {items.map((item, idx) => (
                <tr key={item.id} className="align-top">
                  {/* Item / Product Selector */}
                  <td className="py-2 px-2 font-sans">
                    <div className="space-y-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                      >
                        <option value="">-- Choose from Catalog or Enter Custom --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.type === 'service' ? 'Service' : p.stockQuantity})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name / Custom title"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </td>

                  {/* HSN / SAC */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      placeholder="8517"
                      className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </td>

                  {/* Unit */}
                  <td className="py-2 px-2 font-sans">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      {PRODUCT_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Unit Price */}
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                    />
                  </td>

                  {/* Discount % */}
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(e) =>
                        handleItemChange(idx, 'discountPercent', Number(e.target.value))
                      }
                      className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </td>

                  {/* GST Rate */}
                  <td className="py-2 px-2 font-sans">
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                      className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-teal-700 dark:text-teal-400"
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}% GST
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Taxable Amount */}
                  <td className="py-2 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                    ₹{item.taxableAmount.toFixed(2)}
                  </td>

                  {/* Line Total */}
                  <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    ₹{item.totalAmount.toFixed(2)}
                  </td>

                  {/* Remove */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Optional Footnote below item list (e.g. For Labour Charges only) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/40 p-2.5 rounded-md">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold select-none">
            <input
              type="checkbox"
              checked={hasItemNote}
              onChange={(e) => setHasItemNote(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Add Footnote Below Item Rows (e.g. "For Labour Charges only")
            </span>
          </label>

          {hasItemNote && (
            <div className="flex-1 max-w-md w-full">
              <input
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g. For Labour Charges only"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium italic"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Split: Terms & Payment on Left, Totals Calculation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Payment, Notes & Terms */}
        <div className="lg:col-span-7 space-y-4">
          {/* Immediate Payment Block */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Record Initial Payment (Optional)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={roundedTotal}
                  value={immediatePayment}
                  onChange={(e) => setImmediatePayment(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={immediatePaymentMethod}
                  onChange={(e) => setImmediatePaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="cash">Cash Counter</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Reference / UTR No.
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI/409281729104"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>
            </div>

            {immediatePayment > 0 && (
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  {immediatePayment >= roundedTotal
                    ? 'Invoice will be recorded as Paid in Full'
                    : `Partial payment recorded: Remaining balance of ${formatINR(
                        roundedTotal - immediatePayment
                      )} due`}
                </span>
              </div>
            )}
          </div>

          {/* Notes and Terms */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Customer Notes (Appears on printed invoice)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Warranty remarks, dispatch details..."
                className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Standard Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Right (5 cols): Financial Totals & Tax Summary */}
        <div className="lg:col-span-5 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 font-mono text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans pb-2 border-b border-slate-100 dark:border-slate-800">
            GST Tax Computation
          </h3>

          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Gross Line Total:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-teal-600">
                <span>Total Line Discounts:</span>
                <span>-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Total Taxable Value:</span>
              <span>₹{totalTaxableAmount.toFixed(2)}</span>
            </div>

            {isInterState ? (
              <div className="flex items-center justify-between text-purple-600 font-semibold">
                <span>Integrated GST (IGST):</span>
                <span>₹{totalIgst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-teal-600 font-medium">
                  <span>Central GST (CGST):</span>
                  <span>₹{totalCgst.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-teal-600 font-medium">
                  <span>State GST (SGST):</span>
                  <span>₹{totalSgst.toFixed(2)}</span>
                </div>
              </>
            )}

            {roundOff !== 0 && (
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Round Off:</span>
                <span>
                  {roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 flex items-baseline justify-between font-sans">
            <div>
              <span className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100 block">
                Total Payable Amount
              </span>
              <span className="text-[10px] text-slate-400">Inclusive of all taxes</span>
            </div>
            <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
              {formatINR(roundedTotal)}
            </div>
          </div>

          {immediatePayment > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Balance Due:</span>
              <span className="font-bold text-amber-600">
                {formatINR(Math.max(0, roundedTotal - immediatePayment))}
              </span>
            </div>
          )}

          {/* Statutory Disclaimer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-sans text-slate-400 leading-relaxed">
            <strong>Tax Aid Notice:</strong> BillFlow computes CGST, SGST, and IGST according to configured tax rates. Verify invoice compliance for statutory GSTR-1 filings.
          </div>
        </div>
      </div>
    </div>
  );
};
